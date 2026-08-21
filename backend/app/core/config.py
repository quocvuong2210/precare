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

    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "precare_minio"
    MINIO_SECRET_KEY: str = "precare_minio_secret"
    MINIO_BUCKET_NAME: str = "precare-paraclinical-files"
    MINIO_SECURE: bool = False

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
