from typing import Any, Dict, Literal, Optional
from uuid import UUID
from pydantic import BaseModel, Field

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
        description="Optional biometric_data UUID for local rule-only fallback persistence",
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
    anomaly_probability: Optional[float] = None
    fallback_used: bool = False
    fallback_mode: FallbackMode = "none"
    diagnostic_notice: Optional[str] = None
    rule_version: Optional[str] = None
    model_version: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)


class AnalysisHealthResponse(BaseModel):
    status: str
    analysis_service_reachable: bool
    details: Dict[str, Any] = Field(default_factory=dict)
