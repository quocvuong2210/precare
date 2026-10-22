# backend/app/services/otp_service.py
import secrets
from datetime import datetime, timedelta
import redis.asyncio as aioredis
from jose import jwt

from app.core.config import settings

# Kết nối Async Redis client
redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)

class OTPService:
    @staticmethod
    def generate_otp_code(length: int = 6) -> str:
        """Sinh chuỗi 6 chữ số ngẫu nhiên chuẩn an toàn mật mã (CSPRNG)"""
        return "".join([str(secrets.randbelow(10)) for _ in range(length)])

    @staticmethod
    async def can_send_otp(email: str) -> tuple[bool, int]:
        """
        Kiểm tra cooldown 60 giây.
        Trả về (Có được gửi không, số giây còn phải chờ).
        """
        cooldown_key = f"otp_cooldown:{email.lower()}"
        ttl = await redis_client.ttl(cooldown_key)
        if ttl > 0:
            return False, ttl
        return True, 0

    @classmethod
    async def create_and_store_otp(cls, email: str) -> str:
        """
        Tạo mã OTP mới, lưu vào Redis với TTL 300s và bật cooldown 60s.
        """
        email_clean = email.lower()
        otp_code = cls.generate_otp_code(6)

        otp_key = f"otp:{email_clean}"
        cooldown_key = f"otp_cooldown:{email_clean}"
        attempts_key = f"otp_attempts:{email_clean}"

        # 1. Lưu OTP (TTL 300 giây = 5 phút)
        await redis_client.set(otp_key, otp_code, ex=settings.OTP_EXPIRE_SECONDS)

        # 2. Đặt cooldown (60 giây)
        await redis_client.set(cooldown_key, "1", ex=settings.OTP_COOLDOWN_SECONDS)

        # 3. Reset số lần thử sai
        await redis_client.set(attempts_key, 0, ex=settings.OTP_EXPIRE_SECONDS)

        return otp_code

    @classmethod
    async def verify_otp(cls, email: str, user_otp: str) -> tuple[bool, str]:
        """
        Kiểm tra mã OTP.
        Trả về (thành công, thông báo lỗi nếu có).
        """
        email_clean = email.lower()
        otp_key = f"otp:{email_clean}"
        attempts_key = f"otp_attempts:{email_clean}"

        # Lấy OTP hiện tại từ Redis
        stored_otp = await redis_client.get(otp_key)
        if not stored_otp:
            return False, "Mã xác minh đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới."

        # Kiểm tra số lần thử sai
        attempts = await redis_client.incr(attempts_key)
        if attempts > settings.OTP_MAX_ATTEMPTS:
            # Vượt quá số lần thử -> Xóa luôn OTP để chống đoán mò
            await redis_client.delete(otp_key)
            await redis_client.delete(attempts_key)
            return False, "Bạn đã nhập sai quá số lần cho phép. Vui lòng gửi lại mã mới."

        if stored_otp != user_otp.strip():
            remaining = settings.OTP_MAX_ATTEMPTS - attempts
            return False, f"Mã xác minh không chính xác. Bạn còn {remaining} lần thử."

        # Xác thực thành công -> Dọn dẹp OTP
        await redis_client.delete(otp_key)
        await redis_client.delete(attempts_key)

        return True, ""

    @staticmethod
    def create_verification_token(email: str) -> str:
        """
        Sinh token ngắn hạn (15 phút) chứng minh email này đã được xác thực,
        dùng để gửi kèm trong request tạo tài khoản / đăng ký bác sĩ.
        """
        expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode = {
            "sub": email.lower(),
            "scope": "email_verification",
            "exp": expire
        }
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def verify_verification_token(token: str, expected_email: str) -> bool:
        """Kiểm tra token xác minh có hợp lệ và khớp email hay không"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            if payload.get("scope") != "email_verification":
                return False
            return payload.get("sub") == expected_email.lower()
        except Exception:
            return False