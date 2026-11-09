# backend/app/services/storage_service.py
import io
import uuid
import os
from datetime import timedelta
from minio import Minio
from minio.error import S3Error
from app.core.config import settings


class MinioStorageService:
    def __init__(self):
        # Tự động lấy cấu hình từ config/env
        self.endpoint = settings.MINIO_ENDPOINT
        self.access_key = settings.MINIO_ACCESS_KEY
        self.secret_key = settings.MINIO_SECRET_KEY
        self.secure = settings.MINIO_SECURE
        # Bucket mặc định theo API contract: precare-paraclinical-docs
        self.bucket_name = getattr(settings, "MINIO_BUCKET_NAME", "precare-paraclinical-docs")

        self.client = Minio(
            endpoint=self.endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        """Khởi tạo Bucket Private nếu chưa tồn tại"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
        except S3Error as e:
            # Ghi log nếu gặp lỗi kết nối storage
            print(f"[MinIO] Cảnh báo khởi tạo Bucket: {e}")

    def upload_raw_file(
        self,
        file_bytes: bytes,
        patient_id: uuid.UUID,
        pregnancy_profile_id: uuid.UUID,
        file_uuid: uuid.UUID,
        original_filename: str,
        content_type: str
    ) -> str:
        """
        Lưu trữ file gốc với quy ước định danh bất biến (Immutable Storage Key):
        paraclinical-documents/{patient_id}/{pregnancy_profile_id}/{file_uuid}.{ext}
        """
        ext = os.path.splitext(original_filename)[1].lower()
        if not ext:
            if "pdf" in content_type:
                ext = ".pdf"
            elif "png" in content_type:
                ext = ".png"
            else:
                ext = ".jpg"

        storage_key = f"paraclinical-documents/{patient_id}/{pregnancy_profile_id}/{file_uuid}{ext}"
        data_stream = io.BytesIO(file_bytes)
        file_size = len(file_bytes)

        self.client.put_object(
            bucket_name=self.bucket_name,
            object_name=storage_key,
            data=data_stream,
            length=file_size,
            content_type=content_type
        )
        return storage_key

    def generate_presigned_view_url(self, storage_key: str, expires_in_seconds: int = 1800) -> str:
        """Sinh Presigned URL truy cập riêng tư có chữ ký HMAC (mặc định 30 phút)"""
        return self.client.get_presigned_url(
            method="GET",
            bucket_name=self.bucket_name,
            object_name=storage_key,
            expires=timedelta(seconds=expires_in_seconds)
        )

    def delete_file(self, storage_key: str) -> bool:
        """Xóa file khỏi Object Storage khi người dùng hủy bỏ hoặc xóa file nhầm"""
        try:
            self.client.remove_object(self.bucket_name, storage_key)
            return True
        except S3Error:
            return False


storage_service = MinioStorageService()