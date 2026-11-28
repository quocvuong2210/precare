from unittest.mock import MagicMock, patch
import requests

from app.schemas.analysis import InternalAnalysisRequest
from app.services.analysis_client import (
    check_analysis_service_health,
    evaluate_with_fallback,
)


def _mock_response(status_code: int, json_data: dict) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_data
    if status_code >= 400:
        resp.raise_for_status.side_effect = requests.HTTPError(f"HTTP {status_code}")
    else:
        resp.raise_for_status.return_value = None
    return resp


def test_evaluate_predict_success():
    req = InternalAnalysisRequest(gestational_age_days=210, bpd=76.0, hc=275.0, ac=260.0, fl=58.0, efw=1550.0)
    mock_resp = _mock_response(
        200,
        {
            "warning_level": "green",
            "anomaly_probability": 0.05,
            "rule_version": "hadlock-v1",
            "model_version": "raca-net-v1",
        },
    )

    with patch("app.services.analysis_client.requests.post", return_value=mock_resp) as mock_post:
        result = evaluate_with_fallback(req)

    assert mock_post.call_count == 1
    assert mock_post.call_args[0][0].endswith("/api/v1/predict")
    assert result.warning_level == "green"
    assert result.anomaly_probability == 0.05
    assert result.fallback_used is False
    assert result.fallback_mode == "none"
    assert result.rule_version == "hadlock-v1"
    assert result.model_version == "raca-net-v1"


def test_evaluate_predict_fails_fallback_to_rules():
    req = InternalAnalysisRequest(gestational_age_days=210, ac=220.0, efw=1100.0)
    rules_resp = _mock_response(
        200,
        {
            "warning_level": "red",
            "rule_version": "hadlock-v1",
        },
    )

    with patch(
        "app.services.analysis_client.requests.post",
        side_effect=[requests.Timeout("predict timed out"), rules_resp],
    ) as mock_post:
        result = evaluate_with_fallback(req)

    assert mock_post.call_count == 2
    assert mock_post.call_args_list[0][0][0].endswith("/api/v1/predict")
    assert mock_post.call_args_list[1][0][0].endswith("/api/v1/rules")
    assert result.warning_level == "red"
    assert result.fallback_used is True
    assert result.fallback_mode == "analysis_service_rules"
    assert "ML prediction unavailable" in (result.diagnostic_notice or "")


def test_evaluate_both_endpoints_fail_backend_rule_only_fallback():
    req = InternalAnalysisRequest(gestational_age_days=210, efw=1500.0)

    with patch(
        "app.services.analysis_client.requests.post",
        side_effect=requests.ConnectionError("Connection refused"),
    ) as mock_post:
        result = evaluate_with_fallback(req, db=None)

    assert mock_post.call_count == 2
    assert result.warning_level == "yellow"
    assert result.fallback_used is True
    assert result.fallback_mode == "backend_rule_only"
    assert result.model_version == "unavailable"
    assert result.details.get("manual_review_required") is True


def test_health_check_reachable_and_unreachable():
    ok_resp = _mock_response(200, {"status": "healthy", "service": "analysis_service"})
    with patch("app.services.analysis_client.requests.get", return_value=ok_resp):
        health_ok = check_analysis_service_health()
    assert health_ok.status == "healthy"
    assert health_ok.analysis_service_reachable is True

    with patch(
        "app.services.analysis_client.requests.get",
        side_effect=requests.ConnectionError("unreachable"),
    ):
        health_down = check_analysis_service_health()
    assert health_down.status == "degraded"
    assert health_down.analysis_service_reachable is False
