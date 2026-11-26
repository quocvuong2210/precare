import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AnalysisResult(Base):
    """Persisted clinical rule & ML evaluation result with explicit rules_version and model_version."""

    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pregnancy_profile_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pregnancy_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    checkup_id = Column(
        UUID(as_uuid=True),
        ForeignKey("checkups.id", ondelete="CASCADE"),
        nullable=False,
    )
    biometric_data_id = Column(
        UUID(as_uuid=True),
        ForeignKey("biometric_data.id", ondelete="RESTRICT"),
        nullable=False,
    )

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
    efw_zscore = Column(Numeric(4, 2), nullable=True)
    efw_percentile = Column(Numeric(5, 2), nullable=True)

    anomaly_probability = Column(Numeric(5, 4), nullable=False)
    warning_level = Column(String(20), nullable=False)
    explanation_doctor = Column(Text, nullable=False)
    explanation_patient = Column(Text, nullable=False)
    disclaimer_text = Column(Text, nullable=False)

    analyzed_at = Column(DateTime(timezone=True), default=_utcnow)

    __table_args__ = (
        CheckConstraint("warning_level IN ('green', 'yellow', 'red')", name="chk_analysis_warning_level"),
    )
