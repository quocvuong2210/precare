import uuid
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Numeric, String, DateTime, Boolean, ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base


class BiometricData(Base):
    __tablename__ = "biometric_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_file_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_files.id", ondelete="SET NULL"), nullable=True)
    gestational_age_days = Column(Integer, nullable=False)
    
    # 5 chỉ số siêu âm vàng (Golden Biometrics)
    bpd = Column(Numeric(5, 2), nullable=True)  # Biparietal Diameter (mm)
    hc = Column(Numeric(5, 2), nullable=True)   # Head Circumference (mm)
    ac = Column(Numeric(5, 2), nullable=True)   # Abdominal Circumference (mm)
    fl = Column(Numeric(5, 2), nullable=True)   # Femur Length (mm)
    efw = Column(Numeric(6, 2), nullable=True)  # Estimated Fetal Weight (gram)
    
    status = Column(String(50), default="pending_verification", nullable=False)  # 'pending_verification', 'verified'
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Soft-delete y tế (PRC-37)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    checkup = relationship("Checkup", back_populates="biometrics")
    pregnancy_profile = relationship("PregnancyProfile", back_populates="biometric_records")
    verifier = relationship("User", foreign_keys=[verified_by])

    __table_args__ = (
        CheckConstraint("status IN ('pending_verification', 'verified')", name="chk_biometrics_status"),
        CheckConstraint(
            "(bpd IS NULL OR (bpd >= 10.0 AND bpd <= 120.0)) AND "
            "(hc IS NULL OR (hc >= 50.0 AND hc <= 400.0)) AND "
            "(ac IS NULL OR (ac >= 50.0 AND ac <= 450.0)) AND "
            "(fl IS NULL OR (fl >= 5.0 AND fl <= 95.0)) AND "
            "(efw IS NULL OR (efw >= 50.0 AND efw <= 6000.0))",
            name="chk_biometrics_positive"
        ),
    )