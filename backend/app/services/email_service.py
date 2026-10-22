# backend/app/services/email_service.py
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import aiosmtplib

from app.core.config import settings

logger = logging.getLogger("precare.email")

# Đường dẫn tới thư mục template
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
jinja_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)), autoescape=True)

async def send_otp_email(to_email: str, otp_code: str, expire_seconds: int = 300) -> bool:
    """
    Gửi email chứa mã OTP xác minh tài khoản với template HTML đẹp mắt.
    """
    expire_minutes = max(1, expire_seconds // 60)

    try:
        # 1. Render template HTML
        template = jinja_env.get_template("email_otp.html")
        html_content = template.render(
            email=to_email,
            otp_code=otp_code,
            expire_minutes=expire_minutes
        )

        # 2. Tạo message MIME
        message = MIMEMultipart("alternative")
        message["Subject"] = f"[{otp_code}] Mã xác minh đăng ký tài khoản PreCare"
        message["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
        message["To"] = to_email

        # Bản plain-text fallback cho client không hỗ trợ HTML
        plain_text = f"Mã xác minh PreCare của bạn là: {otp_code}. Mã có hiệu lực trong {expire_minutes} phút."
        message.attach(MIMEText(plain_text, "plain", "utf-8"))
        message.attach(MIMEText(html_content, "html", "utf-8"))

        # 3. Gửi qua SMTP server (bất đồng bộ)
        if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
            logger.warning(
                f"[DEV MODE] Chưa cấu hình SMTP_USER/PASSWORD. "
                f"Mã OTP gửi đến {to_email} là: >>> {otp_code} <<<"
            )
            return True

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=settings.SMTP_TLS,
        )
        logger.info(f"Đã gửi email OTP thành công tới: {to_email}")
        return True

    except Exception as e:
        logger.error(f"Lỗi khi gửi email OTP tới {to_email}: {str(e)}", exc_info=True)
        # Trong môi trường production, có thể raise exception hoặc log cảnh báo
        return False