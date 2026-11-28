from datetime import datetime
from typing import Any, Dict, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

WarningLevel = Literal["green", "yellow", "red"]
FallbackMode = Literal["none", "analysis_service_rules", "backend_rule_only"]


class InternalAnalysisRequest(BaseModel):
    gestational_age_days: int = Field(..., ge=14, le=310, description="Gestational age in days")
    bpd: Optional[float] = Field(None, gt=0, description="Biparietal Diameter (mm)")
    hc: Optional[float] = Field(None, gt=0, description="Head Circumference (mm)")
    ac: Optional[float] = Field(None, gt=0, description="Abdominal Circumference (mm)")
    fl: Optional[float] = Field(None, gt=0, description="Femur Length (mm)")
    efw: Optional[float] = Field(None, gt=0, description="Estimated Fetal Weight (g)")
    biometric_data_id: Optional[UUID] = Field(
        None,
        description="Optional biometric_data UUID for local rule-only fallback or L5 persistence",
    )
    simulated_model_level: Optional[str] = Field(
        None,
        description="Optional mock level (green/yellow/red) for testing ML elevation",
    )
    simulated_model_risk: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Optional mock anomaly probability (0.0 - 1.0)",
    )


class InternalAnalysisResponse(BaseModel):
    warning_level: WarningLevel
    rule_warning_level: Optional[WarningLevel] = None
    model_warning_level: Optional[WarningLevel] = None
    safety_override_applied: bool = False
    anomaly_probability: Optional[float] = None
    fallback_used: bool = False
    fallback_mode: FallbackMode = "none"
    diagnostic_notice: Optional[str] = None
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    analysis_result_id: Optional[UUID] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class L5FuseAndSaveRequest(BaseModel):
    biometric_data_id: UUID
    standard: str = Field(
        default="intergrowth_21st",
        description="Reference standard ('intergrowth_21st' or 'hadlock')",
    )
    nt_mm: Optional[float] = Field(None, gt=0, description="Nuchal Translucency (mm)")
    afi_cm: Optional[float] = Field(None, gt=0, description="Amniotic Fluid Index (cm)")
    previous_efw_percentile: Optional[float] = Field(None, ge=0.0, le=100.0)
    model_warning_level: Optional[WarningLevel] = None
    model_anomaly_probability: Optional[float] = Field(None, ge=0.0, le=1.0)
    model_version: Optional[str] = Field(None, max_length=100)
    rules_version: Optional[str] = Field(None, max_length=100)
    fallback_mode: FallbackMode = "none"


class AnalysisTraceabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    pregnancy_profile_id: UUID
    checkup_id: UUID
    biometric_data_id: UUID
    model_version: str
    rules_version: str
    warning_level: WarningLevel
    anomaly_probability: float
    explanation_doctor: str
    explanation_patient: str
    disclaimer_text: str
    analyzed_at: datetime


class AnalysisHealthResponse(BaseModel):
    status: str
    analysis_service_reachable: bool
    details: Dict[str, Any] = Field(default_factory=dict)
