import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    String,
    DateTime,
    Boolean,
    CheckConstraint,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GrowthReference(Base):
    """LMS reference curve parameters & percentiles for INTERGROWTH-21st and Hadlock."""

    __tablename__ = "growth_references"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    standard = Column(String(50), nullable=False)
    metric = Column(String(20), nullable=False)
    ga_days = Column(Integer, nullable=False)
    unit = Column(String(10), nullable=False)

    l_value = Column(Numeric(10, 6), nullable=False)
    m_value = Column(Numeric(12, 4), nullable=False)
    s_value = Column(Numeric(10, 6), nullable=False)

    p3 = Column(Numeric(12, 4), nullable=False)
    p10 = Column(Numeric(12, 4), nullable=False)
    p50 = Column(Numeric(12, 4), nullable=False)
    p90 = Column(Numeric(12, 4), nullable=False)
    p97 = Column(Numeric(12, 4), nullable=False)

    version = Column(String(50), nullable=False, default="v1.0")
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    __table_args__ = (
        UniqueConstraint("standard", "metric", "ga_days", "version", name="uq_growth_ref_std_metric_ga_ver"),
        CheckConstraint("standard IN ('intergrowth_21st', 'hadlock')", name="chk_growth_ref_standard"),
        CheckConstraint("metric IN ('crl', 'bpd', 'hc', 'ac', 'fl', 'efw')", name="chk_growth_ref_metric"),
        CheckConstraint("unit IN ('mm', 'g')", name="chk_growth_ref_unit"),
        CheckConstraint("ga_days >= 14 AND ga_days <= 310", name="chk_growth_ref_ga_days"),
        CheckConstraint("m_value > 0 AND s_value > 0", name="chk_growth_ref_ms_positive"),
        Index("idx_growth_references_lookup", "standard", "metric", "ga_days"),
    )
