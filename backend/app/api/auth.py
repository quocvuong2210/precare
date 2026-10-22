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

