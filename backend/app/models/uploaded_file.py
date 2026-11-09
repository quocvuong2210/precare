# backend/app/models/uploaded_file.py
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, BigInteger, Text, DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    checkup_id = Column(
        UUID(as_uuid=True),
        ForeignKey("checkups.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    file_url = Column(String(512), nullable=False)            # MinIO / S3 Storage Key
    file_type = Column(String(50), nullable=False)           # 'application/pdf', 'image/jpeg', 'image/png'
    file_name = Column(String(255), nullable=True)           # Tên file gốc người dùng tải lên
    file_size_bytes = Column(BigInteger, nullable=True)       # Dung lượng file (bytes)
    document_type = Column(
        String(50),
        default="ultrasound_report",
        nullable=False
    )
    status = Column(
        String(50),
        default="pending",
        nullable=False,
        index=True
    )
    celery_task_id = Column(String(100), nullable=True, index=True)
    error_message = Column(Text, nullable=True)
    ocr_raw_payload = Column(JSONB, nullable=True)           # Celery Worker sẽ ghi ở Story 4.2
    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pregnancy_profile = relationship("PregnancyProfile", back_populates="uploaded_files")
    checkup = relationship("Checkup", back_populates="uploaded_files")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    __table_args__ = (
        CheckConstraint(
            "document_type IN ('ultrasound_report', 'blood_test', 'urinalysis', 'other')",
            name="chk_uploaded_files_doc_type"
        ),
        CheckConstraint(
            "status IN ('pending', 'processing', 'extracted', 'verified', 'failed')",
            name="chk_uploaded_files_status"
        ),
        Index("idx_uploaded_files_profile", "pregnancy_profile_id"),
        Index("idx_uploaded_files_checkup", "checkup_id"),
        Index("idx_uploaded_files_status", "status"),
        Index("idx_uploaded_files_task", "celery_task_id"),
    )