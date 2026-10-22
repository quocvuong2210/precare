# backend/app/api/routes/auth.py
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.core import security
from app.core.config import settings
from app.core.audit import log_audit_event
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse
from app.schemas.token import Token

# email
from app.schemas.auth import SendOTPRequest, SendOTPResponse, VerifyOTPRequest, VerifyOTPResponse
from app.services.otp_service import OTPService
from app.services.email_service import send_otp_email

# refresh token
from datetime import datetime, timezone
import secrets
# Import thêm 2 models mới (đã có sẵn trong backend/app/models)
from app.models.refresh_token import RefreshToken
from app.models.password_reset import PasswordReset
# Import thêm schemas mới vừa tạo ở Bước 1
from app.schemas.auth import (
    RefreshTokenRequest, TokenRefreshResponse,
    ForgotPasswordRequest, ResetPasswordRequest,
    StandardResponse, LogoutRequest
)

  

router = APIRouter()

@router.post("/register", response_model=UserResponse)
def register(
    request: Request,
    user_in: UserCreate,
    verification_token: str | None = None,  # Token nhận được từ bước verify-otp
    db: Session = Depends(get_db)
) -> Any:
    """
    Bước 3: Tạo tài khoản sau khi đã xác minh email.
    Lưu ý: Đối với tài khoản bác sĩ, tài khoản mặc định chưa kích hoạt (is_active = False)
    để chờ hội đồng xét duyệt chuyên môn theo đúng quy trình PreCare.
    """
    email = user_in.email.lower()
    # Kiểm tra token xác minh email (nếu bắt buộc cho role doctor)
    if user_in.role == "doctor":
        if not verification_token or not OTPService.verify_verification_token(verification_token, email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email chưa được xác thực qua OTP hoặc phiên xác thực đã hết hạn."
            )
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Tài khoản bác sĩ để is_active=False chờ phê duyệt hồ sơ
    is_active = False if user_in.role == "doctor" else True
    user = User(
        email=email,
        password_hash=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        phone_number=user_in.phone_number,
        is_active=is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_event(
        db=db,
        action="REGISTER",
        target_table="users",
        target_id=user.id,
        user_id=user.id,
        request=request
    )
    return user

@router.post("/login", response_model=Token)
def login_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản chưa được kích hoạt hoặc hồ sơ chuyên môn đang chờ xét duyệt.",
        )
        
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    log_audit_event(
        db=db,
        action="LOGIN",
        target_table="users",
        target_id=user.id,
        user_id=user.id,
        request=request
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    return current_user

# Email OTP routes
@router.post("/send-otp", response_model=SendOTPResponse)
async def send_otp(
    request: Request,
    payload: SendOTPRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Any:
    """
    Bước 1: Gửi mã OTP 6 số tới email của bác sĩ với template HTML đẹp mắt.
    Có giới hạn chống spam: Phải chờ 60 giây giữa các lần gửi.
    """
    email = payload.email.lower()
    # 1. Kiểm tra tài khoản đã tồn tại và đang hoạt động chưa
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user and existing_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Địa chỉ email này đã được đăng ký và kích hoạt trong hệ thống."
        )
    # 2. Kiểm tra cooldown 60 giây chống spam
    can_send, remaining_seconds = await OTPService.can_send_otp(email)
    if not can_send:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Vui lòng đợi {remaining_seconds} giây trước khi yêu cầu gửi lại mã."
        )
    # 3. Tạo mã OTP mới và lưu vào Redis (TTL 300s = 5 phút)
    otp_code = await OTPService.create_and_store_otp(email)
    # 4. Gửi email thông qua BackgroundTasks (Phản hồi API cực nhanh, không bị nghẽn)
    background_tasks.add_task(
        send_otp_email,
        to_email=email,
        otp_code=otp_code,
        expire_seconds=settings.OTP_EXPIRE_SECONDS
    )
    return {
        "status": "success",
        "message": f"Mã xác minh đã được gửi đến {email}. Mã có hiệu lực trong 5 phút.",
        "expires_in": settings.OTP_EXPIRE_SECONDS,
        "retry_after": settings.OTP_COOLDOWN_SECONDS
    }

# Bước 2: Xác minh mã OTP 6 số người dùng nhập từ email.

@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(
    request: Request,
    payload: VerifyOTPRequest
) -> Any:
    """
    Bước 2: Xác minh mã OTP 6 số người dùng nhập từ email.
    Nếu chính xác, trả về verification_token để chuyển sang bước điền hồ sơ.
    """
    email = payload.email.lower()
    is_valid, error_msg = await OTPService.verify_otp(email, payload.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    # Sinh verification token có thời hạn 15 phút
    verification_token = OTPService.create_verification_token(email)
    return {
        "status": "success",
        "message": "Xác minh email thành công! Bạn có thể tiếp tục hoàn thiện hồ sơ.",
        "verification_token": verification_token
    }

@router.post("/refresh", response_model=TokenRefreshResponse)
def refresh_access_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db)
) -> Any:
    # 1. Băm token gửi lên để tìm trong CSDL
    incoming_hash = security.hash_token(payload.refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.token_hash == incoming_hash,
        RefreshToken.is_revoked == False
    ).first()
    now_utc = datetime.now(timezone.utc)
    # 2. Kiểm tra tính hợp lệ và hạn dùng của Refresh Token
    if not token_record or token_record.expires_at <= now_utc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token không hợp lệ hoặc đã hết hạn"
        )
    user = token_record.user
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại hoặc đã bị khóa"
        )
    # 3. Token Rotation: Thu hồi (Revoke) token cũ
    token_record.is_revoked = True
    # 4. Sinh cặp token mới
    new_raw_refresh = security.generate_secure_token()
    new_refresh_hash = security.hash_token(new_raw_refresh)
    refresh_expires_at = now_utc + timedelta(days=7) # Refresh token có hạn 7 ngày
    # Lưu token mới vào DB
    new_token_record = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_hash,
        device_info=request.headers.get("user-agent", "Unknown"),
        ip_address=request.client.host if request.client else "127.0.0.1",
        expires_at=refresh_expires_at,
        is_revoked=False
    )
    db.add(new_token_record)
    # Cấp access token mới có hạn 30 phút (1800 giây) theo đúng Contract
    access_token_expires = timedelta(seconds=1800)
    new_access_token = security.create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    db.commit()
    return {
        "success": True,
        "data": {
            "access_token": new_access_token,
            "refresh_token": new_raw_refresh,
            "token_type": "Bearer",
            "expires_in": 1800
        }
    }
# ==============================================================================
# 2. API YÊU CẦU OTP QUÊN MẬT KHẨU (POST /api/v1/auth/forgot-password)
# Sinh OTP 6 chữ số, lưu hash vào bảng password_resets và gửi email
# ==============================================================================
@router.post("/forgot-password", response_model=StandardResponse)
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Any:
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    # Chuẩn bảo mật: Nếu không tìm thấy email, vẫn báo gửi thành công để chống dò email
    if not user:
        return {
            "success": True,
            "message": "Mã OTP đã được gửi đến email của bạn nếu tài khoản tồn tại"
        }
    # 1. Sinh mã OTP 6 chữ số ngẫu nhiên
    otp_code = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    otp_hash = security.hash_token(otp_code)
    # 2. Vô hiệu hóa các mã OTP khôi phục cũ chưa dùng của tài khoản này
    db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.is_used == False
    ).update({"is_used": True})
    # 3. Tạo bản ghi khôi phục mới với thời hạn 15 phút (900 giây)
    now_utc = datetime.now(timezone.utc)
    reset_entry = PasswordReset(
        user_id=user.id,
        reset_code_hash=otp_hash,
        expires_at=now_utc + timedelta(minutes=15),
        is_used=False
    )
    db.add(reset_entry)
    db.commit()
    # 4. Gửi email chứa OTP ngầm qua BackgroundTasks
    background_tasks.add_task(
        send_otp_email,
        to_email=user.email,
        otp_code=otp_code,
        expire_seconds=900
    )
    log_audit_event(
        db=db,
        action="FORGOT_PASSWORD_REQUEST",
        target_table="users",
        target_id=user.id,
        user_id=user.id,
        request=request
    )
    return {
        "success": True,
        "message": "Mã OTP đã được gửi đến email của bạn"
    }
# ==============================================================================
# 3. API ĐẶT LẠI MẬT KHẨU BẰNG OTP (POST /api/v1/auth/reset-password)
# Xác thực OTP, cập nhật mật khẩu mới và thu hồi toàn bộ Refresh Tokens cũ
# ==============================================================================
@router.post("/reset-password", response_model=StandardResponse)
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
) -> Any:
    email_clean = payload.email.lower().strip()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Thông tin email hoặc mã xác minh không chính xác"
        )
    # 1. Băm OTP gửi lên để so khớp với DB
    otp_hash = security.hash_token(payload.otp_code)
    now_utc = datetime.now(timezone.utc)
    reset_record = db.query(PasswordReset).filter(
        PasswordReset.user_id == user.id,
        PasswordReset.reset_code_hash == otp_hash,
        PasswordReset.is_used == False,
        PasswordReset.expires_at > now_utc
    ).order_by(PasswordReset.created_at.desc()).first()
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không hợp lệ hoặc đã hết hạn (chỉ có hiệu lực trong 15 phút)"
        )
    # 2. Cập nhật mật khẩu mới đã băm bcrypt
    user.password_hash = security.get_password_hash(payload.new_password)
    reset_record.is_used = True
    # 3. Thu hồi toàn bộ Refresh Token đang hoạt động (đăng xuất khỏi tất cả các thiết bị)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.is_revoked == False
    ).update({"is_revoked": True})
    db.commit()
    log_audit_event(
        db=db,
        action="RESET_PASSWORD_SUCCESS",
        target_table="users",
        target_id=user.id,
        user_id=user.id,
        request=request
    )
    return {
        "success": True,
        "message": "Đặt lại mật khẩu thành công"
    }
# ==============================================================================
# 4. API ĐĂNG XUẤT (POST /api/v1/auth/logout)
# Thu hồi Refresh Token để kết thúc phiên đăng nhập an toàn
# ==============================================================================
@router.post("/logout", response_model=StandardResponse)
def logout(
    request: Request,
    payload: LogoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    token_hash = security.hash_token(payload.refresh_token)
    
    # Tìm và đánh dấu thu hồi refresh token của user hiện tại
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.token_hash == token_hash
    ).update({"is_revoked": True})
    
    db.commit()
    log_audit_event(
        db=db,
        action="LOGOUT",
        target_table="users",
        target_id=current_user.id,
        user_id=current_user.id,
        request=request
    )
    return {
        "success": True,
        "message": "Đăng xuất thành công"
    }