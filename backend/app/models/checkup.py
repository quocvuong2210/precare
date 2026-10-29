import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Numeric, Text, Date, DateTime, Boolean, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class Checkup(Base):
    __tablename__ = "checkups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    checkup_date = Column(Date, nullable=False, index=True)
    gestational_age_days = Column(Integer, nullable=False, index=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Soft-delete y tế (PRC-37)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pregnancy_profile = relationship("PregnancyProfile", back_populates="checkups")
    doctor = relationship("User", foreign_keys=[doctor_id])
    biometrics = relationship("BiometricData", back_populates="checkup", cascade="all, delete-orphan", uselist=False)

    __table_args__ = (
        CheckConstraint("gestational_age_days >= 0 AND gestational_age_days <= 315", name="chk_gestational_age_range"),
        CheckConstraint("weight_kg IS NULL OR (weight_kg >= 30.0 AND weight_kg <= 200.0)", name="chk_weight_positive"),
        CheckConstraint(
            "(blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR "
            "(blood_pressure_systolic > blood_pressure_diastolic AND blood_pressure_systolic >= 60 AND blood_pressure_systolic <= 250 AND blood_pressure_diastolic >= 40 AND blood_pressure_diastolic <= 150)",
            name="chk_blood_pressure"
        ),
        Index("idx_checkups_not_deleted", "pregnancy_profile_id", postgresql_where=(is_deleted == False)),
    )