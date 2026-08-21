from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.engines.rule_engine import rule_engine
from app.engines.model_engine import model_engine
from app.core.config import settings

router = APIRouter(prefix="/api/v1")

class AnalysisRequest(BaseModel):
    gestational_age_days: int = Field(..., description="Tuổi thai tính theo ngày (VD: 210 = 30 tuần)", ge=70, le=300)
    bpd: Optional[float] = Field(None, description="Đường kính lưỡng đỉnh (mm)")
    hc: Optional[float] = Field(None, description="Chu vi đầu (mm)")
    ac: Optional[float] = Field(None, description="Chu vi bụng (mm)")
    fl: Optional[float] = Field(None, description="Chiều dài xương đùi (mm)")
    efw: Optional[float] = Field(None, description="Cân nặng ước tính (g)")
    simulated_model_level: Optional[str] = Field(None, description="Green/Yellow/Red mock input for testing ML elevation")
    simulated_model_risk: Optional[float] = Field(None, description="Xác suất bất thường (0.0 - 1.0)")

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.SERVICE_NAME,
        "rule_version": settings.RULE_VERSION,
        "model_version": settings.MODEL_VERSION
    }

@router.post("/rules")
def evaluate_rules(req: AnalysisRequest):
    """
    Ruần túy gọi Rule Engine (Hadlock + Red Flag rules).
    Fallback endpoint dành cho Backend nếu mô hình ML gặp sự cố.
    """
    try:
        return rule_engine.analyze(
            gestational_age_days=req.gestational_age_days,
            bpd=req.bpd, hc=req.hc, ac=req.ac, fl=req.fl, efw=req.efw
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rule Engine Error: {str(e)}")

@router.post("/predict")
def predict_and_fuse(req: AnalysisRequest):
    """
    Endpoint chính: Kết hợp Luật Lâm Sàng + Mô Hình RACA-Net qua Safety Fusion: max(rule, model).
    """
    try:
        return model_engine.predict(
            gestational_age_days=req.gestational_age_days,
            bpd=req.bpd, hc=req.hc, ac=req.ac, fl=req.fl, efw=req.efw,
            simulated_model_level=req.simulated_model_level,
            simulated_model_risk=req.simulated_model_risk
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis Engine Error: {str(e)}")
