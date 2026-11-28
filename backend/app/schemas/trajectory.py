from datetime import date
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.growth_reference import (
    BiometricMetric,
    GrowthReferenceItemResponse,
    GrowthStandard,
)


class TrajectoryPoint(BaseModel):
    biometric_data_id: UUID
    checkup_id: UUID
    checkup_date: Optional[date] = None
    ga_days: int = Field(..., ge=14, le=310)
    ga_formatted: str
    value: float
    z_score: Optional[float] = None
    percentile: Optional[float] = None
    classification: Optional[str] = None
    warning_level: Optional[str] = None

    # Delta vs LMS median (P50 / M)
    delta_from_median: Optional[float] = None
    delta_from_median_pct: Optional[float] = None

    # Delta vs immediately preceding measurement in chronological order
    delta_value_from_prev: Optional[float] = None
    delta_ga_days_from_prev: Optional[int] = None
    growth_velocity_per_week: Optional[float] = None
    delta_percentile_from_prev: Optional[float] = None
    is_trajectory_drop_alert: bool = False


class TrajectorySummary(BaseModel):
    total_points: int = 0
    latest_ga_days: Optional[int] = None
    latest_value: Optional[float] = None
    latest_percentile: Optional[float] = None
    latest_z_score: Optional[float] = None
    overall_delta_value: Optional[float] = None
    overall_delta_percentile: Optional[float] = None
    has_trajectory_drop_alert: bool = False


class TrajectoryResponse(BaseModel):
    pregnancy_profile_id: UUID
    patient_id: UUID
    metric: BiometricMetric
    standard: GrowthStandard
    unit: str
    lms_version: str
    measurements: List[TrajectoryPoint] = Field(default_factory=list)
    summary: TrajectorySummary
    lms_curve: List[GrowthReferenceItemResponse] = Field(default_factory=list)
