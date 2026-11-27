import logging
from typing import Any, Dict, Optional
import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.analysis import (
    AnalysisHealthResponse,
    InternalAnalysisRequest,
    InternalAnalysisResponse,
    WarningLevel,
)
from app.services.clinical_rule_engine import evaluate_and_save_biometric_rules

logger = logging.getLogger(__name__)

ANALYSIS_TIMEOUT_SECONDS = 5.0


def _normalize_warning_level(raw_level: Optional[str]) -> WarningLevel:
    if not raw_level:
        return "green"
    normalized = str(raw_level).strip().lower()
    if normalized in ("green", "yellow", "red"):
        return normalized  # type: ignore[return-value]
    return "yellow"


def _build_analysis_payload(req: InternalAnalysisRequest) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "gestational_age_days": req.gestational_age_days,
        "bpd": req.bpd,
        "hc": req.hc,
        "ac": req.ac,
        "fl": req.fl,
        "efw": req.efw,
    }
    if req.simulated_model_level is not None:
        payload["simulated_model_level"] = req.simulated_model_level
    if req.simulated_model_risk is not None:
        payload["simulated_model_risk"] = req.simulated_model_risk
    return payload


def _parse_analysis_service_response(
    data: Dict[str, Any],
    fallback_used: bool,
    fallback_mode: str,
    diagnostic_notice: Optional[str] = None,
) -> InternalAnalysisResponse:
    raw_level = data.get("warning_level") or data.get("final_warning_level") or data.get("level")
    return InternalAnalysisResponse(
        warning_level=_normalize_warning_level(raw_level),
        anomaly_probability=data.get("anomaly_probability"),
        fallback_used=fallback_used,
        fallback_mode=fallback_mode,  # type: ignore[arg-type]
        diagnostic_notice=diagnostic_notice,
        rule_version=data.get("rule_version") or data.get("rules_version"),
        model_version=data.get("model_version"),
        details=data,
    )


def _backend_rule_only_fallback(
    req: InternalAnalysisRequest,
    db: Optional[Session],
    reason: str,
) -> InternalAnalysisResponse:
    """
    Deterministic rule-only fallback inside Backend when analysis_service is unreachable.
    If biometric_data_id and db are provided, delegates to clinical_rule_engine.
    """
    if req.biometric_data_id is not None and db is not None:
        try:
            record, flags = evaluate_and_save_biometric_rules(
                db=db,
                biometric_data_id=req.biometric_data_id,
            )
            return InternalAnalysisResponse(
                warning_level=_normalize_warning_level(record.warning_level),
                anomaly_probability=float(record.anomaly_probability),
                fallback_used=True,
                fallback_mode="backend_rule_only",
                diagnostic_notice=(
                    f"Analysis service unavailable ({reason}). "
                    "Evaluated using backend deterministic clinical rules."
                ),
                rule_version=record.rules_version,
                model_version=record.model_version,
                details={
                    "analysis_result_id": str(record.id),
                    "flags": flags,
                    "explanation_doctor": record.explanation_doctor,
                },
            )
        except Exception as exc:
            logger.warning(
                "Backend clinical_rule_engine fallback failed",
                extra={"biometric_data_id": str(req.biometric_data_id), "error": str(exc)},
            )

    return InternalAnalysisResponse(
        warning_level="yellow",
        anomaly_probability=None,
        fallback_used=True,
        fallback_mode="backend_rule_only",
        diagnostic_notice=(
            f"Analysis service unavailable ({reason}). "
            "Returned conservative rule-only notice for manual clinician review."
        ),
        rule_version="backend-fallback-v1",
        model_version="unavailable",
        details={
            "gestational_age_days": req.gestational_age_days,
            "manual_review_required": True,
        },
    )


def evaluate_with_fallback(
    req: InternalAnalysisRequest,
    db: Optional[Session] = None,
    timeout: float = ANALYSIS_TIMEOUT_SECONDS,
) -> InternalAnalysisResponse:
    """
    Call analysis_service /api/v1/predict, falling back to /api/v1/rules,
    and finally to backend rule-only evaluation if analysis_service is unreachable.
    """
    base_url = settings.ANALYSIS_SERVICE_URL.rstrip("/")
    payload = _build_analysis_payload(req)

    # 1. Primary: /api/v1/predict (Rules + RACA-Net with Safety Fusion)
    try:
        resp = requests.post(f"{base_url}/api/v1/predict", json=payload, timeout=timeout)
        resp.raise_for_status()
        return _parse_analysis_service_response(
            data=resp.json(),
            fallback_used=False,
            fallback_mode="none",
        )
    except requests.RequestException as predict_exc:
        logger.warning(
            "Analysis service /predict failed; attempting /rules fallback",
            extra={"error": str(predict_exc)},
        )
        predict_error = str(predict_exc)

    # 2. Secondary: /api/v1/rules (Deterministic Hadlock/Intergrowth rules on analysis_service)
    try:
        resp = requests.post(f"{base_url}/api/v1/rules", json=payload, timeout=timeout)
        resp.raise_for_status()
        return _parse_analysis_service_response(
            data=resp.json(),
            fallback_used=True,
            fallback_mode="analysis_service_rules",
            diagnostic_notice=(
                f"ML prediction unavailable ({predict_error}). "
                "Evaluated using analysis_service deterministic rules."
            ),
        )
    except requests.RequestException as rules_exc:
        logger.error(
            "Analysis service /rules fallback also failed; using backend rule-only fallback",
            extra={"error": str(rules_exc)},
        )
        return _backend_rule_only_fallback(req=req, db=db, reason=str(rules_exc))


def check_analysis_service_health(timeout: float = ANALYSIS_TIMEOUT_SECONDS) -> AnalysisHealthResponse:
    base_url = settings.ANALYSIS_SERVICE_URL.rstrip("/")
    try:
        resp = requests.get(f"{base_url}/api/v1/health", timeout=timeout)
        resp.raise_for_status()
        return AnalysisHealthResponse(
            status="healthy",
            analysis_service_reachable=True,
            details=resp.json(),
        )
    except requests.RequestException as exc:
        logger.warning("Analysis service health check failed", extra={"error": str(exc)})
        return AnalysisHealthResponse(
            status="degraded",
            analysis_service_reachable=False,
            details={"error": str(exc)},
        )
