# backend/app/models/pregnancy_profile.py
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Date, DateTime, ForeignKey, CheckConstraint, Index, Boolean
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

class PregnancyProfile(Base):
    __tablename__ = "pregnancy_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    lmp = Column(Date, nullable=True)
    q1_ultrasound_date = Column(Date, nullable=True)
    q1_gestational_weeks = Column(Integer, nullable=True)
    q1_gestational_days = Column(Integer, nullable=True)
    crl_mm = Column(Numeric(5, 2), nullable=True)
    edd = Column(Date, nullable=False)
    status = Column(String(50), default="active", nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

     # Cờ Soft-delete y tế và Ẩn danh hóa NCKH (PRC-37)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    is_anonymized = Column(Boolean, default=False, nullable=False)
    is_purged_from_research = Column(Boolean, default=False, nullable=False)

    # Relationships
    patient = relationship("User", foreign_keys=[patient_id], backref="patient_pregnancy_profiles")
    primary_doctor = relationship("User", foreign_keys=[primary_doctor_id], backref="doctor_pregnancy_profiles")
    checkups = relationship("Checkup", back_populates="pregnancy_profile", cascade="all, delete-orphan", order_by="Checkup.checkup_date")
    biometric_records = relationship("BiometricData", back_populates="pregnancy_profile", cascade="all, delete-orphan")
    deletion_requests = relationship("DeletionRequest", back_populates="pregnancy_profile", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed', 'terminated')", name="chk_pregnancy_status"),
        CheckConstraint("q1_gestational_days IS NULL OR (q1_gestational_days >= 0 AND q1_gestational_days <= 6)", name="chk_gestational_days"),
        CheckConstraint("q1_gestational_weeks IS NULL OR (q1_gestational_weeks >= 0 AND q1_gestational_weeks <= 42)", name="chk_gestational_weeks"),
        CheckConstraint("crl_mm IS NULL OR crl_mm > 0", name="chk_crl_positive"),
        Index("uq_active_pregnancy_per_patient", "patient_id", unique=True, postgresql_where=(status == 'active')),
    )