import logging
from typing import Any, Dict, Optional
import requests
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.analysis import (
    AnalysisHealthResponse,
    FallbackMode,
    InternalAnalysisRequest,
    InternalAnalysisResponse,
)
from app.services.clinical_rule_engine import evaluate_and_save_biometric_rules
from app.services.safety_fusion_service import (
    fuse_and_save_analysis_result,
    fuse_warning_levels,
    normalize_warning_level,
    resolve_version_traceability,
)

logger = logging.getLogger(__name__)

ANALYSIS_TIMEOUT_SECONDS = 5.0


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
    fallback_mode: FallbackMode,
    diagnostic_notice: Optional[str] = None,
) -> InternalAnalysisResponse:
    reported_final = data.get("final_warning_level") or data.get("warning_level") or data.get("level")
    rule_result = data.get("rule_result") if isinstance(data.get("rule_result"), dict) else {}
    rule_level = rule_result.get("warning_level") or reported_final
    model_level = data.get("raw_model_level") or reported_final

    fusion = fuse_warning_levels(
        rule_level=rule_level,
        model_level=model_level,
        reported_final_level=reported_final,
    )
    trace = resolve_version_traceability(
        model_version=data.get("model_version"),
        rules_version=data.get("rule_version") or data.get("rules_version"),
        fallback_mode=fallback_mode,
    )

    return InternalAnalysisResponse(
        warning_level=fusion.final_warning_level,
        rule_warning_level=fusion.rule_warning_level,
        model_warning_level=fusion.model_warning_level,
        safety_override_applied=fusion.elevated_by_model or fusion.downgrade_blocked,
        anomaly_probability=data.get("anomaly_probability"),
        fallback_used=fallback_used,
        fallback_mode=fallback_mode,
        diagnostic_notice=diagnostic_notice,
        rule_version=trace.rules_version,
        model_version=trace.model_version,
        details=data,
    )


def _persist_fused_result_if_requested(
    req: InternalAnalysisRequest,
    db: Optional[Session],
    parsed: InternalAnalysisResponse,
) -> InternalAnalysisResponse:
    if req.biometric_data_id is None or db is None:
        return parsed
    try:
        record, fusion, trace = fuse_and_save_analysis_result(
            db=db,
            biometric_data_id=req.biometric_data_id,
            model_warning_level=parsed.model_warning_level or parsed.warning_level,
            model_anomaly_probability=parsed.anomaly_probability,
            model_version=parsed.model_version,
            rules_version=parsed.rule_version,
            fallback_mode=parsed.fallback_mode,
            model_explanation_doctor=(
                parsed.details.get("explanation_doctor")
                if isinstance(parsed.details, dict)
                else None
            ),
            model_explanation_patient=(
                parsed.details.get("explanation_patient")
                if isinstance(parsed.details, dict)
                else None
            ),
        )
        parsed.warning_level = fusion.final_warning_level
        parsed.rule_warning_level = fusion.rule_warning_level
        parsed.model_warning_level = fusion.model_warning_level
        parsed.safety_override_applied = fusion.elevated_by_model or fusion.downgrade_blocked
        parsed.rule_version = trace.rules_version
        parsed.model_version = trace.model_version
        parsed.analysis_result_id = record.id
    except Exception as exc:
        logger.warning(
            "Failed to persist L5 fused analysis result",
            extra={"biometric_data_id": str(req.biometric_data_id), "error": str(exc)},
        )
    return parsed


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
            level = normalize_warning_level(record.warning_level, default="yellow")
            trace = resolve_version_traceability(
                model_version=record.model_version,
                rules_version=record.rules_version,
                fallback_mode="backend_rule_only",
            )
            return InternalAnalysisResponse(
                warning_level=level,
                rule_warning_level=level,
                model_warning_level=level,
                safety_override_applied=False,
                anomaly_probability=float(record.anomaly_probability),
                fallback_used=True,
                fallback_mode="backend_rule_only",
                diagnostic_notice=(
                    f"Analysis service unavailable ({reason}). "
                    "Evaluated using backend deterministic clinical rules."
                ),
                rule_version=trace.rules_version,
                model_version=trace.model_version,
                analysis_result_id=record.id,
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

    trace = resolve_version_traceability(
        model_version="unavailable",
        rules_version="backend-fallback-v1",
        fallback_mode="backend_rule_only",
    )
    return InternalAnalysisResponse(
        warning_level="yellow",
        rule_warning_level="yellow",
        model_warning_level="yellow",
        safety_override_applied=False,
        anomaly_probability=None,
        fallback_used=True,
        fallback_mode="backend_rule_only",
        diagnostic_notice=(
            f"Analysis service unavailable ({reason}). "
            "Returned conservative rule-only notice for manual clinician review."
        ),
        rule_version=trace.rules_version,
        model_version=trace.model_version,
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
    Enforces L5 max(rule, model) safety fusion and model_version traceability.
    """
    base_url = settings.ANALYSIS_SERVICE_URL.rstrip("/")
    payload = _build_analysis_payload(req)

    # 1. Primary: /api/v1/predict (Rules + RACA-Net with Safety Fusion)
    try:
        resp = requests.post(f"{base_url}/api/v1/predict", json=payload, timeout=timeout)
        resp.raise_for_status()
        parsed = _parse_analysis_service_response(
            data=resp.json(),
            fallback_used=False,
            fallback_mode="none",
        )
        return _persist_fused_result_if_requested(req=req, db=db, parsed=parsed)
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
        parsed = _parse_analysis_service_response(
            data=resp.json(),
            fallback_used=True,
            fallback_mode="analysis_service_rules",
            diagnostic_notice=(
                f"ML prediction unavailable ({predict_error}). "
                "Evaluated using analysis_service deterministic rules."
            ),
        )
        return _persist_fused_result_if_requested(req=req, db=db, parsed=parsed)
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
