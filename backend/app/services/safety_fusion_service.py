"""
Layer L5: Safety Fusion & Model Version Traceability Service.

Enforces the non-negotiable PreCare clinical safety invariant:
    final_warning_level = max(rule_warning_level, model_warning_level)

The ML model (RACA-Net) is ONLY permitted to elevate a clinical warning level
(e.g., green -> yellow, green -> red, yellow -> red). It is strictly forbidden
from downgrading or suppressing any deterministic clinical rule warning.

Also enforces strict traceability of `model_version` and `rules_version`
across all persisted `AnalysisResult` records and internal analysis responses.
"""

from dataclasses import dataclass
from decimal import Decimal
import logging
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.schemas.analysis import FallbackMode, WarningLevel
from app.services.clinical_rule_engine import (
    MANDATORY_DISCLAIMER,
    RULE_ONLY_MODEL_VERSION,
    RULES_VERSION,
    _evaluate_metric_with_fallback,
    evaluate_rules_3_level,
    get_causal_previous_efw_percentile,
)

logger = logging.getLogger(__name__)

MAX_VERSION_LENGTH = 100
UNAVAILABLE_MODEL_VERSION = "unavailable"
UNKNOWN_MODEL_VERSION = "unknown-model-version"

WARNING_ORDER: dict[str, int] = {
    "green": 1,
    "yellow": 2,
    "red": 3,
}

RANK_TO_WARNING: dict[int, WarningLevel] = {
    1: "green",
    2: "yellow",
    3: "red",
}


@dataclass(frozen=True)
class FusionDecision:
    """Result of L5 max(rule, model) safety fusion."""

    final_warning_level: WarningLevel
    rule_warning_level: WarningLevel
    model_warning_level: WarningLevel
    elevated_by_model: bool
    downgrade_blocked: bool


@dataclass(frozen=True)
class VersionTraceability:
    """Validated and normalized version identifiers for auditability."""

    model_version: str
    rules_version: str
    is_ml_active: bool


def normalize_warning_level(
    raw_level: Optional[str],
    default: WarningLevel = "green",
) -> WarningLevel:
    """Normalize a raw warning string into one of 'green', 'yellow', or 'red'."""
    if not raw_level:
        return default
    normalized = str(raw_level).strip().lower()
    if normalized in WARNING_ORDER:
        return normalized  # type: ignore[return-value]
    return "yellow"


def fuse_warning_levels(
    rule_level: Optional[str],
    model_level: Optional[str],
    reported_final_level: Optional[str] = None,
) -> FusionDecision:
    """
    Enforce L5 Safety Fusion Constraint:
        final_warning_level = max(rule_level, model_level)

    If `reported_final_level` (e.g., returned by an external ML service) is lower
    than `max(rule_level, model_level)`, it is overridden and `downgrade_blocked`
    is flagged True.
    """
    norm_rule = normalize_warning_level(rule_level, default="green")
    norm_model = normalize_warning_level(model_level, default=norm_rule)

    rule_rank = WARNING_ORDER[norm_rule]
    model_rank = WARNING_ORDER[norm_model]
    max_rank = max(rule_rank, model_rank)
    final_level = RANK_TO_WARNING[max_rank]

    elevated_by_model = model_rank > rule_rank
    downgrade_blocked = model_rank < rule_rank

    if reported_final_level is not None:
        norm_reported = normalize_warning_level(reported_final_level, default=final_level)
        if WARNING_ORDER[norm_reported] < max_rank:
            downgrade_blocked = True
            logger.warning(
                "L5 safety override blocked an attempted warning downgrade",
                extra={
                    "rule_level": norm_rule,
                    "model_level": norm_model,
                    "reported_final_level": norm_reported,
                    "enforced_final_level": final_level,
                },
            )

    return FusionDecision(
        final_warning_level=final_level,
        rule_warning_level=norm_rule,
        model_warning_level=norm_model,
        elevated_by_model=elevated_by_model,
        downgrade_blocked=downgrade_blocked,
    )


def _clean_version(raw_version: Optional[str]) -> Optional[str]:
    if raw_version is None:
        return None
    cleaned = str(raw_version).strip()
    if not cleaned:
        return None
    return cleaned[:MAX_VERSION_LENGTH]


def resolve_version_traceability(
    model_version: Optional[str],
    rules_version: Optional[str],
    fallback_mode: FallbackMode = "none",
) -> VersionTraceability:
    """
    Normalize and validate `model_version` and `rules_version` for strict auditability.
    Ensures persisted/returned version strings are never empty and fit VARCHAR(100).
    """
    cleaned_rules = _clean_version(rules_version) or RULES_VERSION
    cleaned_model = _clean_version(model_version)

    if cleaned_model is None:
        if fallback_mode == "analysis_service_rules":
            cleaned_model = RULE_ONLY_MODEL_VERSION
        elif fallback_mode == "backend_rule_only":
            cleaned_model = UNAVAILABLE_MODEL_VERSION
        else:
            cleaned_model = UNKNOWN_MODEL_VERSION

    is_ml_active = cleaned_model not in {
        RULE_ONLY_MODEL_VERSION,
        UNAVAILABLE_MODEL_VERSION,
        UNKNOWN_MODEL_VERSION,
    }

    return VersionTraceability(
        model_version=cleaned_model,
        rules_version=cleaned_rules,
        is_ml_active=is_ml_active,
    )


def fuse_and_save_analysis_result(
    db: Session,
    biometric_data_id: UUID,
    *,
    standard: str = "intergrowth_21st",
    nt_mm: Optional[float] = None,
    afi_cm: Optional[float] = None,
    previous_efw_percentile: Optional[float] = None,
    model_warning_level: Optional[str] = None,
    model_anomaly_probability: Optional[float] = None,
    model_version: Optional[str] = None,
    rules_version: Optional[str] = None,
    fallback_mode: FallbackMode = "none",
    model_explanation_doctor: Optional[str] = None,
    model_explanation_patient: Optional[str] = None,
) -> Tuple[AnalysisResult, FusionDecision, VersionTraceability]:
    """
    Evaluate deterministic clinical rules for `biometric_data_id`, fuse with ML
    prediction via `max(rule_level, model_level)`, enforce `model_version` &
    `rules_version` traceability, and persist the `AnalysisResult` record.
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

    rule_summary = evaluate_rules_3_level(
        bpd_percentile=float(bpd_p) if bpd_p is not None else None,
        hc_percentile=float(hc_p) if hc_p is not None else None,
        ac_percentile=float(ac_p) if ac_p is not None else None,
        fl_percentile=float(fl_p) if fl_p is not None else None,
        efw_percentile=float(efw_p) if efw_p is not None else None,
        nt_mm=nt_mm,
        afi_cm=afi_cm,
        previous_efw_percentile=prev_efw_p,
    )

    fusion = fuse_warning_levels(
        rule_level=rule_summary.warning_level,
        model_level=model_warning_level or rule_summary.warning_level,
    )
    trace = resolve_version_traceability(
        model_version=model_version,
        rules_version=rules_version,
        fallback_mode=fallback_mode,
    )

    final_prob = rule_summary.anomaly_probability
    if model_anomaly_probability is not None:
        clamped_model_prob = max(0.0, min(1.0, float(model_anomaly_probability)))
        final_prob = max(final_prob, clamped_model_prob)

    doctor_exp = rule_summary.explanation_doctor
    if model_explanation_doctor:
        doctor_exp = f"{doctor_exp} | {model_explanation_doctor}"
    elif fusion.elevated_by_model:
        doctor_exp = (
            f"{doctor_exp} | [L5 Safety Fusion - {trace.model_version}]: "
            f"Mô hình ML nâng mức cảnh báo từ {fusion.rule_warning_level.upper()} "
            f"lên {fusion.final_warning_level.upper()}."
        )
    elif fusion.downgrade_blocked:
        doctor_exp = (
            f"{doctor_exp} | [L5 Safety Fusion]: Giữ nguyên cảnh báo lâm sàng "
            f"{fusion.final_warning_level.upper()} (không cho phép mô hình hạ mức cảnh báo)."
        )

    patient_exp = rule_summary.explanation_patient
    if model_explanation_patient:
        patient_exp = model_explanation_patient
    elif fusion.elevated_by_model and fusion.final_warning_level == "red":
        patient_exp = (
            "Kết quả theo dõi có dấu hiệu cần bác sĩ kiểm tra chuyên sâu sớm. "
            "Vui lòng liên hệ cơ sở y tế theo lịch hẹn hoặc khi có dấu hiệu bất thường."
        )

    record = AnalysisResult(
        pregnancy_profile_id=bio.pregnancy_profile_id,
        checkup_id=bio.checkup_id,
        biometric_data_id=bio.id,
        model_version=trace.model_version,
        rules_version=trace.rules_version,
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
        anomaly_probability=Decimal(f"{final_prob:.4f}"),
        warning_level=fusion.final_warning_level,
        explanation_doctor=doctor_exp,
        explanation_patient=patient_exp,
        disclaimer_text=MANDATORY_DISCLAIMER,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.info(
        "L5 analysis result persisted",
        extra={
            "analysis_result_id": str(record.id),
            "biometric_data_id": str(bio.id),
            "model_version": trace.model_version,
            "rules_version": trace.rules_version,
            "rule_level": fusion.rule_warning_level,
            "model_level": fusion.model_warning_level,
            "final_warning_level": fusion.final_warning_level,
            "safety_override_applied": fusion.elevated_by_model or fusion.downgrade_blocked,
        },
    )

    return record, fusion, trace


def list_analysis_results_by_version(
    db: Session,
    *,
    pregnancy_profile_id: Optional[UUID] = None,
    model_version: Optional[str] = None,
    rules_version: Optional[str] = None,
    warning_level: Optional[WarningLevel] = None,
    limit: int = 50,
) -> List[AnalysisResult]:
    """
    Query persisted `AnalysisResult` records for version traceability & audit.
    """
    query = db.query(AnalysisResult)
    if pregnancy_profile_id is not None:
        query = query.filter(AnalysisResult.pregnancy_profile_id == pregnancy_profile_id)
    if model_version is not None:
        query = query.filter(AnalysisResult.model_version == model_version.strip())
    if rules_version is not None:
        query = query.filter(AnalysisResult.rules_version == rules_version.strip())
    if warning_level is not None:
        query = query.filter(AnalysisResult.warning_level == warning_level)

    return (
        query.order_by(AnalysisResult.analyzed_at.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )
