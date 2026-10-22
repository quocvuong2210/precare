import os
from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "PreCare Backend Gateway"
    DATABASE_URL: str = "postgresql+psycopg2://precare_admin:precare_secret_2026@localhost:5432/precare_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    ANALYSIS_SERVICE_URL: str = "http://localhost:8001"
    
    JWT_SECRET_KEY: str = "precare_super_secret_jwt_key_2026_change_in_prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Cấu hình OTP & Email
    OTP_EXPIRE_SECONDS: int = 300          # 5 phút (theo đúng UI)
    OTP_COOLDOWN_SECONDS: int = 60         # 60 giây đếm ngược để gửi lại
    OTP_MAX_ATTEMPTS: int = 5              # Tối đa 5 lần thử sai chống brute-force
    
    # Cấu hình SMTP gửi mail
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "no-reply@precare.vn"
    EMAILS_FROM_NAME: str = "PreCare - Hệ Thống Y Tế Thai Sản"

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "precare_minio"
    MINIO_SECRET_KEY: str = "precare_minio_secret"
    MINIO_BUCKET_NAME: str = "precare-paraclinical-files"
    MINIO_SECURE: bool = False

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
