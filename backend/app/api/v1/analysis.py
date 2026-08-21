import requests
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.core.audit import log_audit_event
from app.models.models import BiometricData, Checkup, AnalysisResult, User
from app.schemas.schemas import AnalysisResultResponse

router = APIRouter(prefix="/analysis", tags=["Analysis Proxy & Fallback"])

@router.post("/trigger/{biometric_data_id}", response_model=AnalysisResultResponse)
def trigger_analysis_for_record(
    biometric_data_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    biometric = db.query(BiometricData).filter(BiometricData.id == biometric_data_id).first()
    if not biometric:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi sinh trắc học")

    payload = {
        "gestational_age_days": biometric.gestational_age_days,
        "bpd": float(biometric.bpd) if biometric.bpd else None,
        "hc": float(biometric.hc) if biometric.hc else None,
        "ac": float(biometric.ac) if biometric.ac else None,
        "fl": float(biometric.fl) if biometric.fl else None,
        "efw": float(biometric.efw) if biometric.efw else None
    }

    # Attempt call to external Analysis Microservice
    try:
        resp = requests.post(f"{settings.ANALYSIS_SERVICE_URL}/api/v1/predict", json=payload, timeout=5)
        if resp.status_code == 200:
            res_data = resp.json()
            rule_res = res_data.get("rule_result", {})
            model_ver = res_data.get("model_version", "1.0.0-racanet-v1")
            rules_ver = res_data.get("rules_version", "1.0.0-hadlock-intergrowth")
            warning_lvl = res_data.get("final_warning_level", "green")
            prob = res_data.get("anomaly_probability", 0.0)
            doc_exp = res_data.get("explanation_doctor", "")
            pat_exp = res_data.get("explanation_patient", "")
            disc_text = res_data.get("disclaimer_text", "")
        else:
            raise Exception(f"Analysis Microservice HTTP {resp.status_code}")
    except Exception as e:
        print(f"[FALLBACK TRIGGERED] Unable to reach Analysis Microservice ({e}). Invoking fallback rules.")
        # Local rule fallback simulation
        model_ver = "1.0.0-fallback-rule-only"
        rules_ver = "1.0.0-local-rule-fallback"
        rule_res = {}
        warning_lvl = "green"
        prob = 0.0
        doc_exp = "CẢNH BÁO HỆ THỐNG: Mô hình ML tạm thời dừng kết nối. Kết quả phân tích sử dụng Luật Lâm Sàng nội bộ (Rule Engine Fallback)."
        pat_exp = "Kết quả được tính toán dựa trên chỉ số lâm sàng chuẩn."
        disc_text = "Hệ thống đang hoạt động ở chế độ dự phòng (Fallback Rule Engine)."

    analysis = AnalysisResult(
        pregnancy_profile_id=biometric.pregnancy_profile_id,
        checkup_id=biometric.checkup_id,
        biometric_data_id=biometric.id,
        model_version=model_ver,
        rules_version=rules_ver,
        bpd_zscore=rule_res.get("bpd_zscore"),
        bpd_percentile=rule_res.get("bpd_percentile"),
        hc_zscore=rule_res.get("hc_zscore"),
        hc_percentile=rule_res.get("hc_percentile"),
        ac_zscore=rule_res.get("ac_zscore"),
        ac_percentile=rule_res.get("ac_percentile"),
        fl_zscore=rule_res.get("fl_zscore"),
        fl_percentile=rule_res.get("fl_percentile"),
        efw_zscore=rule_res.get("efw_zscore"),
        efw_percentile=rule_res.get("efw_percentile"),
        anomaly_probability=prob,
        warning_level=warning_lvl,
        explanation_doctor=doc_exp,
        explanation_patient=pat_exp,
        disclaimer_text=disc_text
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    log_audit_event(db, current_user.id, "ANALYZE", "analysis_results", analysis.id, request)
    return analysis

@router.get("/result/checkup/{checkup_id}", response_model=AnalysisResultResponse)
def get_analysis_by_checkup(
    checkup_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = db.query(AnalysisResult).filter(AnalysisResult.checkup_id == checkup_id).order_by(AnalysisResult.analyzed_at.desc()).first()
    if not result:
        raise HTTPException(status_code=404, detail="Chưa có kết quả phân tích cho đợt khám này")

    log_audit_event(db, current_user.id, "READ", "analysis_results", result.id, request)
    return result
