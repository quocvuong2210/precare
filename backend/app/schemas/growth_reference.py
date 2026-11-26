from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

GrowthStandard = Literal["intergrowth_21st", "hadlock"]
BiometricMetric = Literal["crl", "bpd", "hc", "ac", "fl", "efw"]
BiometricUnit = Literal["mm", "g"]
PercentileClassification = Literal[
    "below_p3",
    "p3_to_p10",
    "normal",
    "above_p90",
    "above_p97",
]


class GrowthReferenceItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    standard: GrowthStandard
    metric: BiometricMetric
    ga_days: int
    unit: BiometricUnit
    l_value: float
    m_value: float
    s_value: float
    p3: float
    p10: float
    p50: float
    p90: float
    p97: float
    version: str


class GrowthReferenceCurveResponse(BaseModel):
    standard: GrowthStandard
    metric: BiometricMetric
    unit: BiometricUnit
    version: str
    points: List[GrowthReferenceItemResponse]


class ZScoreEvaluateRequest(BaseModel):
    standard: GrowthStandard = "intergrowth_21st"
    metric: BiometricMetric
    ga_days: int = Field(..., ge=14, le=310)
    value: float = Field(..., gt=0)


class ZScoreEvaluateResponse(BaseModel):
    standard: GrowthStandard
    metric: BiometricMetric
    ga_days: int
    unit: BiometricUnit
    value: float
    z_score: float
    percentile: float
    classification: PercentileClassification
    reference: GrowthReferenceItemResponse
