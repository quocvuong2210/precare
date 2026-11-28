"""
Clinical Rule Engine (3-Level Red-Flag Evaluation) & Result Persistence.

Evaluates fetal biometrics against LMS reference tables (INTERGROWTH-21st / Hadlock)
and persists results to `analysis_results` with explicit `rules_version`.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.services.growth_reference_service import evaluate_biometric_zscore

RULES_VERSION = "hadlock-intergrowth-v1.0"
RULE_ONLY_MODEL_VERSION = "rule-engine-only"
MANDATORY_DISCLAIMER = (
    "Kết quả phân tích từ hệ thống hỗ trợ ra quyết định lâm sàng PreCare. "
    "Bác sĩ chuyên khoa giữ quyền chẩn đoán cuối cùng."
)

_WARNING_ANOMALY_PROB: Dict[str, float] = {
    "green": 0.05,
    "yellow": 0.50,
    "red": 0.90,
}


@dataclass(frozen=True)
class RuleEvaluationSummary:
    warning_level: str
    flags: List[str]
    explanation_doctor: str
    explanation_patient: str
    anomaly_probability: float


def evaluate_rules_3_level(
    *,
    bpd_percentile: Optional[float] = None,
    hc_percentile: Optional[float] = None,
    ac_percentile: Optional[float] = None,
    fl_percentile: Optional[float] = None,
    efw_percentile: Optional[float] = None,
    nt_mm: Optional[float] = None,
    afi_cm: Optional[float] = None,
    previous_efw_percentile: Optional[float] = None,
) -> RuleEvaluationSummary:
    """
    Evaluate 3-level clinical warning ('green' | 'yellow' | 'red') from percentiles & markers.

    Red (Urgent):
      - EFW < 3rd percentile (Severe FGR)
      - AC < 3rd percentile (Severe FGR / malnutrition)
      - NT >= 3.0 mm
      - AFI < 5.0 cm (oligohydramnios) or AFI > 24.0 cm (polyhydramnios)
    Yellow (Monitor):
      - EFW < 10th or > 90th percentile (FGR/SGA or LGA)
      - AC < 10th or > 90th percentile
      - Trajectory drop > 20 percentile points vs previous exam
      - BPD / HC / FL < 5th or > 95th percentile
    Green (Normal):
      - All evaluated markers within normal thresholds
    """
    flags: List[str] = []
    red_doctor: List[str] = []
    red_patient: List[str] = []
    yellow_doctor: List[str] = []
    yellow_patient: List[str] = []

    # --- RED LEVEL CHECKS ---
    if efw_percentile is not None and efw_percentile < 3.0:
        flags.append("EFW_BELOW_P3")
        red_doctor.append(
            f"CỜ ĐỎ LÂM SÀNG: EFW ở bách phân vị {efw_percentile}% (< 3rd percentile) — Nghi ngờ FGR nặng."
        )
        red_patient.append(
            "Cân nặng ước tính của thai nhi thấp hơn đáng kể so với chuẩn (dưới bách phân vị thứ 3). Cần bác sĩ chuyên khoa đánh giá sớm."
        )

    if ac_percentile is not None and ac_percentile < 3.0:
        flags.append("AC_BELOW_P3")
        red_doctor.append(
            f"CỜ ĐỎ LÂM SÀNG: AC ở bách phân vị {ac_percentile}% (< 3rd percentile) — Dấu hiệu suy dinh dưỡng thai nhi nghiêm trọng."
        )
        red_patient.append(
            "Chu vi vòng bụng của bé nhỏ hơn nhiều so với tuổi thai. Cần được bác sĩ theo dõi sát."
        )

    if nt_mm is not None and nt_mm >= 3.0:
        flags.append("NT_ELEVATED")
        red_doctor.append(
            f"CỜ ĐỎ LÂM SÀNG: Độ mờ da gáy NT = {nt_mm:.2f} mm (>= 3.0 mm) — Cần tầm soát bất thường nhiễm sắc thể / tim bẩm sinh."
        )
        red_patient.append(
            "Chỉ số độ mờ da gáy cao hơn ngưỡng tham chiếu. Bác sĩ sẽ tư vấn các xét nghiệm sàng lọc chuyên sâu."
        )

    if afi_cm is not None:
        if afi_cm < 5.0:
            flags.append("OLIGOHYDRAMNIOS")
            red_doctor.append(
                f"CỜ ĐỎ LÂM SÀNG: Chỉ số ối AFI = {afi_cm:.1f} cm (< 5.0 cm) — Thiểu ối."
            )
            red_patient.append(
                "Lượng nước ối thấp hơn mức bình thường. Cần kiểm tra và theo dõi y tế kịp thời."
            )
        elif afi_cm > 24.0:
            flags.append("POLYHYDRAMNIOS")
            red_doctor.append(
                f"CỜ ĐỎ LÂM SÀNG: Chỉ số ối AFI = {afi_cm:.1f} cm (> 24.0 cm) — Đa ối."
            )
            red_patient.append(
                "Lượng nước ối cao hơn mức bình thường. Cần bác sĩ đánh giá nguyên nhân và theo dõi."
            )

    # --- YELLOW LEVEL CHECKS ---
    if efw_percentile is not None:
        if 3.0 <= efw_percentile < 10.0:
            flags.append("EFW_FGR_P3_P10")
            yellow_doctor.append(
                f"CẢNH BÁO VÀNG: EFW ở bách phân vị {efw_percentile}% (< 10th percentile) — Nguy cơ SGA / FGR nhẹ."
            )
            yellow_patient.append(
                f"Cân nặng ước tính của bé ở mức nhẹ ({efw_percentile}%). Nên tái khám đúng hẹn để theo dõi đà tăng trưởng."
            )
        elif efw_percentile > 90.0:
            flags.append("EFW_LGA_ABOVE_P90")
            yellow_doctor.append(
                f"CẢNH BÁO VÀNG: EFW ở bách phân vị {efw_percentile}% (> 90th percentile) — Thai to so với tuổi thai (LGA)."
            )
            yellow_patient.append(
                f"Cân nặng ước tính của bé lớn hơn mức trung bình ({efw_percentile}%). Bác sĩ sẽ theo dõi thêm đường huyết và dinh dưỡng."
            )

    if ac_percentile is not None:
        if 3.0 <= ac_percentile < 10.0:
            flags.append("AC_BELOW_P10")
            yellow_doctor.append(
                f"CẢNH BÁO VÀNG: AC ở bách phân vị {ac_percentile}% (< 10th percentile)."
            )
            yellow_patient.append(
                f"Chu vi vòng bụng của bé hơi nhỏ so với chuẩn ({ac_percentile}%)."
            )
        elif ac_percentile > 90.0:
            flags.append("AC_ABOVE_P90")
            yellow_doctor.append(
                f"CẢNH BÁO VÀNG: AC ở bách phân vị {ac_percentile}% (> 90th percentile)."
            )
            yellow_patient.append(
                f"Chu vi vòng bụng của bé lớn hơn mức trung bình ({ac_percentile}%)."
            )

    if previous_efw_percentile is not None and efw_percentile is not None:
        drop = previous_efw_percentile - efw_percentile
        if drop > 20.0:
            flags.append("TRAJECTORY_DROP_GT_20")
            yellow_doctor.append(
                f"CẢNH BÁO QUỸ ĐẠO: Bách phân vị EFW giảm {drop:.1f} điểm "
                f"(từ {previous_efw_percentile:.1f}% xuống {efw_percentile:.1f}%, > 20 điểm)."
            )
            yellow_patient.append(
                "Tốc độ tăng trưởng cân nặng của bé chậm lại so với lần siêu âm trước. Cần tái khám theo lịch bác sĩ."
            )

    if any(p is not None and (p < 5.0 or p > 95.0) for p in [bpd_percentile, hc_percentile, fl_percentile]):
        flags.append("CRANIAL_OR_FEMUR_OUT_OF_RANGE")
        yellow_doctor.append(
            "CẢNH BÁO VÀNG: Chỉ số đầu (BPD/HC) hoặc xương đùi (FL) nằm ngoài khoảng bách phân vị 5% - 95%."
        )
        yellow_patient.append(
            "Một số chỉ số kích thước đầu hoặc xương đùi có sự chênh lệch nhẹ so với tuổi thai."
        )

    # --- AGGREGATE 3-LEVEL RESULT ---
    if red_doctor:
        warning_level = "red"
        doctor_text = " | ".join(red_doctor + yellow_doctor)
        patient_text = " ".join(red_patient)
    elif yellow_doctor:
        warning_level = "yellow"
        doctor_text = " | ".join(yellow_doctor)
        patient_text = " ".join(yellow_patient)
    else:
        warning_level = "green"
        doctor_text = (
            "BÌNH THƯỜNG: Tất cả các chỉ số sinh trắc được đánh giá nằm trong giới hạn chuẩn theo tuổi thai."
        )
        patient_text = (
            "Các chỉ số phát triển của thai nhi đều nằm trong giới hạn bình thường khỏe mạnh."
        )

    return RuleEvaluationSummary(
        warning_level=warning_level,
        flags=flags,
        explanation_doctor=doctor_text,
        explanation_patient=patient_text,
        anomaly_probability=_WARNING_ANOMALY_PROB[warning_level],
    )


def _evaluate_metric_with_fallback(
    db: Session,
    standard: str,
    metric: str,
    ga_days: int,
    raw_value: Optional[Decimal],
) -> Tuple[Optional[Decimal], Optional[Decimal]]:
    """Evaluate a biometric metric against preferred standard, falling back to Hadlock if out of range."""
    if raw_value is None:
        return None, None
    val = float(raw_value)
    res = evaluate_biometric_zscore(db, standard=standard, metric=metric, ga_days=ga_days, value=val)
    if res is None and standard != "hadlock":
        res = evaluate_biometric_zscore(db, standard="hadlock", metric=metric, ga_days=ga_days, value=val)
    if res is None:
        return None, None
    return Decimal(f"{res['z_score']:.2f}"), Decimal(f"{res['percentile']:.2f}")


def get_causal_previous_efw_percentile(
    db: Session,
    pregnancy_profile_id: UUID,
    current_biometric_id: UUID,
    current_ga_days: int,
) -> Optional[float]:
    """
    Strictly causal predecessor lookup: returns the EFW percentile from the most
    recent non-deleted BiometricData visit with `gestational_age_days < current_ga_days`.
    Prevents future data leakage when historical records are backfilled out of order.
    """
    prev_result = (
        db.query(AnalysisResult)
        .join(BiometricData, AnalysisResult.biometric_data_id == BiometricData.id)
        .filter(
            AnalysisResult.pregnancy_profile_id == pregnancy_profile_id,
            AnalysisResult.biometric_data_id != current_biometric_id,
            AnalysisResult.efw_percentile.isnot(None),
            BiometricData.is_deleted.is_(False),
            BiometricData.gestational_age_days < current_ga_days,
        )
        .order_by(
            BiometricData.gestational_age_days.desc(),
            AnalysisResult.analyzed_at.desc(),
        )
        .first()
    )
    if prev_result is not None and prev_result.efw_percentile is not None:
        return float(prev_result.efw_percentile)
    return None


def evaluate_and_save_biometric_rules(
    db: Session,
    biometric_data_id: UUID,
    standard: str = "intergrowth_21st",
    nt_mm: Optional[float] = None,
    afi_cm: Optional[float] = None,
    previous_efw_percentile: Optional[float] = None,
) -> Tuple[AnalysisResult, List[str]]:
    """
    Evaluate a BiometricData record using the 3-level Clinical Rule Engine,
    save the result into `analysis_results` with `rules_version`, and return (AnalysisResult, flags).
    """
    bio = (
        db.query(BiometricData)
        .filter(
            BiometricData.id == biometric_data_id,
            BiometricData.is_deleted.is_(False),
        )
        .first()
    )
    if bio is None:
        raise LookupError(f"BiometricData {biometric_data_id} not found.")

    ga_days = bio.gestational_age_days

    bpd_z, bpd_p = _evaluate_metric_with_fallback(db, standard, "bpd", ga_days, bio.bpd)
    hc_z, hc_p = _evaluate_metric_with_fallback(db, standard, "hc", ga_days, bio.hc)
    ac_z, ac_p = _evaluate_metric_with_fallback(db, standard, "ac", ga_days, bio.ac)
    fl_z, fl_p = _evaluate_metric_with_fallback(db, standard, "fl", ga_days, bio.fl)
    efw_z, efw_p = _evaluate_metric_with_fallback(db, standard, "efw", ga_days, bio.efw)

    prev_efw_p = previous_efw_percentile
    if prev_efw_p is None:
        prev_efw_p = get_causal_previous_efw_percentile(
            db=db,
            pregnancy_profile_id=bio.pregnancy_profile_id,
            current_biometric_id=bio.id,
            current_ga_days=ga_days,
        )

    summary = evaluate_rules_3_level(
        bpd_percentile=float(bpd_p) if bpd_p is not None else None,
        hc_percentile=float(hc_p) if hc_p is not None else None,
        ac_percentile=float(ac_p) if ac_p is not None else None,
        fl_percentile=float(fl_p) if fl_p is not None else None,
        efw_percentile=float(efw_p) if efw_p is not None else None,
        nt_mm=nt_mm,
        afi_cm=afi_cm,
        previous_efw_percentile=prev_efw_p,
    )

    record = AnalysisResult(
        pregnancy_profile_id=bio.pregnancy_profile_id,
        checkup_id=bio.checkup_id,
        biometric_data_id=bio.id,
        model_version=RULE_ONLY_MODEL_VERSION,
        rules_version=RULES_VERSION,
        bpd_zscore=bpd_z,
        bpd_percentile=bpd_p,
        hc_zscore=hc_z,
        hc_percentile=hc_p,
        ac_zscore=ac_z,
        ac_percentile=ac_p,
        fl_zscore=fl_z,
        fl_percentile=fl_p,
        efw_zscore=efw_z,
        efw_percentile=efw_p,
        anomaly_probability=Decimal(f"{summary.anomaly_probability:.4f}"),
        warning_level=summary.warning_level,
        explanation_doctor=summary.explanation_doctor,
        explanation_patient=summary.explanation_patient,
        disclaimer_text=MANDATORY_DISCLAIMER,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record, summary.flags


def list_profile_analysis_results(
    db: Session,
    pregnancy_profile_id: UUID,
) -> List[AnalysisResult]:
    """List all saved analysis results for a pregnancy profile ordered newest first."""
    return (
        db.query(AnalysisResult)
        .filter(AnalysisResult.pregnancy_profile_id == pregnancy_profile_id)
        .order_by(AnalysisResult.analyzed_at.desc())
        .all()
    )
