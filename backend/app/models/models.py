import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, Numeric, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'doctor', 'pregnant_woman', 'admin'
    phone_number = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('doctor', 'pregnant_woman', 'admin')", name="users_role_check"),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False)
    target_table = Column(String(100), nullable=False)
    target_id = Column(UUID(as_uuid=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    accessed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class PregnancyProfile(Base):
    __tablename__ = "pregnancy_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    primary_doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    lmp = Column(Date, nullable=True)
    q1_ultrasound_date = Column(Date, nullable=True)
    q1_gestational_weeks = Column(Integer, nullable=True)
    q1_gestational_days = Column(Integer, nullable=True)
    edd = Column(Date, nullable=False)
    status = Column(String(50), default="active")  # 'active', 'completed', 'terminated'
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("User", foreign_keys=[patient_id])
    primary_doctor = relationship("User", foreign_keys=[primary_doctor_id])

    __table_args__ = (
        CheckConstraint("status IN ('active', 'completed', 'terminated')", name="pregnancy_profiles_status_check"),
    )

class Checkup(Base):
    __tablename__ = "checkups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    checkup_date = Column(Date, nullable=False)
    gestational_age_days = Column(Integer, nullable=False)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    pregnancy_profile = relationship("PregnancyProfile")
    doctor = relationship("User")

class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="SET NULL"), nullable=True)
    file_url = Column(String(512), nullable=False)
    file_type = Column(String(50), nullable=False)
    status = Column(String(50), default="pending")  # 'pending', 'processing', 'extracted', 'verified', 'failed'
    ocr_raw_payload = Column(JSONB, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('pending', 'processing', 'extracted', 'verified', 'failed')", name="uploaded_files_status_check"),
    )

class BiometricData(Base):
    __tablename__ = "biometric_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_file_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_files.id", ondelete="SET NULL"), nullable=True)
    gestational_age_days = Column(Integer, nullable=False)
    bpd = Column(Numeric(5, 2), nullable=True)
    hc = Column(Numeric(5, 2), nullable=True)
    ac = Column(Numeric(5, 2), nullable=True)
    fl = Column(Numeric(5, 2), nullable=True)
    efw = Column(Numeric(6, 2), nullable=True)
    status = Column(String(50), default="pending_verification")  # 'pending_verification', 'verified'
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('pending_verification', 'verified')", name="biometric_data_status_check"),
    )

class OCRCorrectionLog(Base):
    __tablename__ = "ocr_correction_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uploaded_file_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    original_payload = Column(JSONB, nullable=False)
    corrected_payload = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="CASCADE"), nullable=False)
    biometric_data_id = Column(UUID(as_uuid=True), ForeignKey("biometric_data.id", ondelete="RESTRICT"), nullable=False)
    model_version = Column(String(100), nullable=False)
    rules_version = Column(String(100), nullable=False)
    bpd_zscore = Column(Numeric(4, 2), nullable=True)
    bpd_percentile = Column(Numeric(5, 2), nullable=True)
    hc_zscore = Column(Numeric(4, 2), nullable=True)
    hc_percentile = Column(Numeric(5, 2), nullable=True)
    ac_zscore = Column(Numeric(4, 2), nullable=True)
    ac_percentile = Column(Numeric(5, 2), nullable=True)
    fl_zscore = Column(Numeric(4, 2), nullable=True)
    fl_percentile = Column(Numeric(5, 2), nullable=True)
    efw_zscore Column(Numeric(4, 2), nullable=True)
    efw_percentile = Column(Numeric(5, 2), nullable=True)
    anomaly_probability = Column(Numeric(5, 4), nullable=False)
    warning_level = Column(String(20), nullable=False)  # 'green', 'yellow', 'red'
    explanation_doctor = Column(Text, nullable=False)
    explanation_patient = Column(Text, nullable=False)
    disclaimer_text = Column(Text, nullable=False)
    analyzed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("warning_level IN ('green', 'yellow', 'red')", name="analysis_results_warning_level_check"),
    )

class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(UUID(as_uuid=True), ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"), nullable=False)
    checkup_id = Column(UUID(as_uuid=True), ForeignKey("checkups.id", ondelete="CASCADE"), nullable=False)
    analysis_result_id = Column(UUID(as_uuid=True), ForeignKey("analysis_results.id", ondelete="RESTRICT"), nullable=False)
    report_type = Column(String(50), nullable=False)  # 'doctor_professional', 'patient_simplified'
    pdf_url = Column(String(512), nullable=False)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    generated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("report_type IN ('doctor_professional', 'patient_simplified')", name="medical_reports_type_check"),
    )

class MappingVerificationQueue(Base):
    __tablename__ = "mapping_verification_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_file_id = Column(UUID(as_uuid=True), ForeignKey("uploaded_files.id", ondelete="CASCADE"), nullable=False)
    raw_label = Column(String(255), nullable=False)
    mapped_attribute = Column(String(50), nullable=True)  # 'bpd', 'hc', 'ac', 'fl', 'efw'
    status = Column(String(50), default="pending")  # 'pending', 'approved', 'rejected'
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("mapped_attribute IN ('bpd', 'hc', 'ac', 'fl', 'efw')", name="mapping_queue_attribute_check"),
        CheckConstraint("status IN ('pending', 'approved', 'rejected')", name="mapping_queue_status_check"),
    )

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    type = Column(String(50), nullable=False)  # 'checkup_reminder', 'new_analysis', 'system'
    scheduled_for = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("type IN ('checkup_reminder', 'new_analysis', 'system')", name="notifications_type_check"),
    )
