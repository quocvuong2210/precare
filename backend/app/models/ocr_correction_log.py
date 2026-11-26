# backend/app/models/ocr_correction_log.py
from sqlalchemy import Column, BigInteger, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base


class OcrCorrectionLog(Base):
    __tablename__ = "ocr_correction_logs"

    id = Column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
        index=True,
    )
    uploaded_file_id = Column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    original_payload = Column(
        JSONB().with_variant(JSON, "sqlite"),
        nullable=False,
    )
    corrected_payload = Column(
        JSONB().with_variant(JSON, "sqlite"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    uploaded_file = relationship("UploadedFile", foreign_keys=[uploaded_file_id])
    user = relationship("User", foreign_keys=[user_id])
