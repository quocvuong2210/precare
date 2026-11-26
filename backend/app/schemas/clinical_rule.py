from datetime import datetime
from typing import List, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.growth_reference import GrowthStandard

WarningLevel = Literal["green", "yellow", "red"]


class ClinicalRuleEvaluateRequest(BaseModel):
    biometric_data_id: UUID
    standard: GrowthStandard = "intergrowth_21st"
    nt_mm: Optional[float] = Field(None, ge=0.0, le=20.0, description="Nuchal Translucency (mm)")
    afi_cm: Optional[float] = Field(None, ge=0.0, le=50.0, description="Amniotic Fluid Index (cm)")
    previous_efw_percentile: Optional[float] = Field(
        None,
        ge=0.0,
        le=100.0,
        description="Optional override for previous EFW percentile to evaluate trajectory drop",
    )


class ClinicalRuleEvaluateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pregnancy_profile_id: UUID
    checkup_id: UUID
    biometric_data_id: UUID
    model_version: str
    rules_version: str
    bpd_zscore: Optional[float] = None
    bpd_percentile: Optional[float] = None
    hc_zscore: Optional[float] = None
    hc_percentile: Optional[float] = None
    ac_zscore: Optional[float] = None
    ac_percentile: Optional[float] = None
    fl_zscore: Optional[float] = None
    fl_percentile: Optional[float] = None
    efw_zscore: Optional[float] = None
    efw_percentile: Optional[float] = None
    anomaly_probability: float
    warning_level: WarningLevel
    explanation_doctor: str
    explanation_patient: str
    disclaimer_text: str
    analyzed_at: datetime
    flags: List[str] = Field(default_factory=list)
