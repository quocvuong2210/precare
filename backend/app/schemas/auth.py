# backend/app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class SendOTPRequest(BaseModel):
    email: EmailStr = Field(..., example="bacsi.nguyen@precare.vn", description="Email đăng ký của bác sĩ")
    role: Optional[str] = Field("doctor", description="Vai trò đăng ký: doctor | pregnant_woman")

class SendOTPResponse(BaseModel):
    status: str = "success"
    message: str
    expires_in: int = Field(300, description="Thời gian hiệu lực mã OTP (giây)")
    retry_after: int = Field(60, description="Thời gian chờ để gửi lại mã (giây)")

class VerifyOTPRequest(BaseModel):
    email: EmailStr = Field(..., example="bacsi.nguyen@precare.vn")
    otp: str = Field(..., min_length=6, max_length=6, example="941026", description="Mã OTP gồm 6 chữ số")

class VerifyOTPResponse(BaseModel):
    status: str = "success"
    message: str
    verification_token: str = Field(..., description="Token chứng minh email đã xác thực, dùng cho bước đăng ký tiếp theo")

# --- Schemas cho API Refresh Token ---
class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token dạng chuỗi hex ngẫu nhiên")
class TokenRefreshData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = 1800  # 30 phút (tính bằng giây)
class TokenRefreshResponse(BaseModel):
    success: bool = True
    data: TokenRefreshData
# --- Schemas cho API Quên Mật Khẩu (Forgot Password) ---
class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com", description="Email cần khôi phục mật khẩu")
class VerifyResetOTPRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    otp_code: str = Field(..., min_length=6, max_length=6, example="654321", description="Mã OTP 6 chữ số")
# --- Schemas cho API Đặt Lại Mật Khẩu (Reset Password) ---
class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., example="user@example.com")
    otp_code: str = Field(..., min_length=6, max_length=6, example="654321", description="Mã OTP 6 chữ số")
    new_password: str = Field(..., min_length=6, example="NewPassword123@", description="Mật khẩu mới")
# --- Schemas phản hồi thông báo chung ---
class StandardResponse(BaseModel):
    success: bool = True
    message: str
class LogoutRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token cần thu hồi khi đăng xuất")