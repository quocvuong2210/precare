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
    