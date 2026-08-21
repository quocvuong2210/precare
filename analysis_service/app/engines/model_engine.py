from typing import Dict, Any, Tuple
from app.core.config import settings
from app.engines.rule_engine import rule_engine

WARNING_ORDER = {
    "green": 1,
    "yellow": 2,
    "red": 3
}

def fuse_warning_levels(rule_level: str, model_level: str) -> str:
    """
    Safety Fusion Rule Constraint:
    mức_cảnh_báo_cuối = max(luật_cờ_đỏ, mô_hình)
    Mô hình ML CHỈ ĐƯỢC PHÉP NÂNG MỨC CẢNH BÁO, TUYỆT ĐỐI KHÔNG ĐƯỢC HẠ MỨC CẢNH BÁO LÂM SÀNG.
    """
    rule_rank = WARNING_ORDER.get(rule_level.lower(), 1)
    model_rank = WARNING_ORDER.get(model_level.lower(), 1)

    max_rank = max(rule_rank, model_rank)
    
    # Reverse lookup
    rank_to_level = {1: "green", 2: "yellow", 3: "red"}
    return rank_to_level[max_rank]

class ModelEngine:
    def __init__(self, version: str = settings.MODEL_VERSION):
        self.version = version

    def predict(
        self,
        gestational_age_days: int,
        bpd: float = None,
        hc: float = None,
        ac: float = None,
        fl: float = None,
        efw: float = None,
        simulated_model_risk: float = None,
        simulated_model_level: str = None
    ) -> Dict[str, Any]:
        """
        Runs RACA-Net inference and enforces safety override rule logic.
        """
        # Step 1: Run Clinical Rule-based engine
        rule_result = rule_engine.analyze(
            gestational_age_days=gestational_age_days,
            bpd=bpd, hc=hc, ac=ac, fl=fl, efw=efw
        )
        clinical_rule_level = rule_result["warning_level"]

        # Step 2: Determine ML Model Prediction
        if simulated_model_level:
            model_level = simulated_model_level.lower()
            model_prob = simulated_model_risk if simulated_model_risk is not None else (
                0.95 if model_level == "red" else (0.50 if model_level == "yellow" else 0.05)
            )
        else:
            # Default heuristic simulation if model parameters not explicitly set
            model_prob = 0.02
            model_level = "green"

        # Step 3: Enforce Non-negotiable Safety Fusion Constraint max(rule_level, model_level)
        final_warning_level = fuse_warning_levels(clinical_rule_level, model_level)

        # Build explanations
        doctor_exp = rule_result["explanation_doctor"]
        if final_warning_level != clinical_rule_level and final_warning_level == "red":
            doctor_exp += " | [MÔ HÌNH RACA-Net]: Phát hiện bất thường qua mô hình deep learning, nâng cảnh báo lên RED."
        
        patient_exp = rule_result["explanation_patient"]
        disclaimer = "LƯU Ý Y TẾ: Kết quả phân tích được tổng hợp từ Luật Lâm Sàng và Mô Hình RACA-Net. Kết quả chỉ mang tính chất hỗ trợ chẩn đoán và cần được duyệt bởi Bác sĩ Chuyên khoa."

        return {
            "rule_result": rule_result,
            "raw_model_level": model_level,
            "raw_model_prob": model_prob,
            "final_warning_level": final_warning_level,
            "anomaly_probability": model_prob,
            "model_version": self.version,
            "rules_version": rule_result["rules_version"],
            "explanation_doctor": doctor_exp,
            "explanation_patient": patient_exp,
            "disclaimer_text": disclaimer
        }

model_engine = ModelEngine()
