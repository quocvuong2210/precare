import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
import requests
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

from app.api.internal_analysis import (
    fuse_and_save_l5_analysis,
    list_analysis_version_traceability,
)
from app.core.database import Base
from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.deletion_request import DeletionRequest  # noqa: F401
from app.models.growth_reference import GrowthReference
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.schemas.analysis import InternalAnalysisRequest, L5FuseAndSaveRequest
from app.services.analysis_client import evaluate_with_fallback
from app.services.clinical_rule_engine import RULE_ONLY_MODEL_VERSION, RULES_VERSION
from app.services.growth_reference_seeder import seed_growth_references
from app.services.safety_fusion_service import (
    UNAVAILABLE_MODEL_VERSION,
    UNKNOWN_MODEL_VERSION,
    fuse_warning_levels,
    resolve_version_traceability,
)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(
        bind=engine,
        tables=[
            User.__table__,
            PregnancyProfile.__table__,
            Checkup.__table__,
            UploadedFile.__table__,
            BiometricData.__table__,
            GrowthReference.__table__,
            AnalysisResult.__table__,
        ],
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    seed_growth_references(session)
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _create_sample_biometric(session, *, ga_days: int = 210, efw: float = 1550.0, ac: float = 260.0):
    user = User(
        id=uuid.uuid4(),
        email=f"patient-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hashed",
        full_name="Test Patient",
        role="pregnant_woman",
        is_active=True,
    )
    doctor = User(
        id=uuid.uuid4(),
        email=f"doctor-{uuid.uuid4().hex[:8]}@example.com",
        password_hash="hashed",
        full_name="Test Doctor",
        role="doctor",
        is_active=True,
    )
    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=user.id,
        primary_doctor_id=doctor.id,
        lmp=date(2026, 1, 1),
        edd=date(2026, 10, 8),
        status="active",
    )
    checkup = Checkup(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        doctor_id=doctor.id,
        checkup_date=date(2026, 7, 30),
        gestational_age_days=ga_days,
    )
    bio = BiometricData(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        checkup_id=checkup.id,
        gestational_age_days=ga_days,
        bpd=Decimal("76.00"),
        hc=Decimal("275.00"),
        ac=Decimal(f"{ac:.2f}"),
        fl=Decimal("58.00"),
        efw=Decimal(f"{efw:.2f}"),
        status="verified",
    )
    session.add_all([user, doctor, profile, checkup, bio])
    session.commit()
    return doctor, profile, bio


def test_fuse_warning_levels_exhaustive_matrix():
    # Rule RED -> always RED
    for model_lvl in ("green", "yellow", "red"):
        decision = fuse_warning_levels("red", model_lvl)
        assert decision.final_warning_level == "red"
        assert decision.elevated_by_model is False
        assert decision.downgrade_blocked is (model_lvl != "red")

    # Rule YELLOW -> YELLOW unless ML elevates to RED
    assert fuse_warning_levels("yellow", "green").final_warning_level == "yellow"
    assert fuse_warning_levels("yellow", "green").downgrade_blocked is True
    assert fuse_warning_levels("yellow", "yellow").final_warning_level == "yellow"
    elevated = fuse_warning_levels("yellow", "red")
    assert elevated.final_warning_level == "red"
    assert elevated.elevated_by_model is True

    # Rule GREEN -> follows ML elevation
    assert fuse_warning_levels("green", "green").final_warning_level == "green"
    g_to_y = fuse_warning_levels("green", "yellow")
    assert g_to_y.final_warning_level == "yellow"
    assert g_to_y.elevated_by_model is True
    g_to_r = fuse_warning_levels("green", "red")
    assert g_to_r.final_warning_level == "red"
    assert g_to_r.elevated_by_model is True


def test_fuse_warning_levels_blocks_reported_downgrade():
    decision = fuse_warning_levels(
        rule_level="red",
        model_level="green",
        reported_final_level="green",
    )
    assert decision.final_warning_level == "red"
    assert decision.downgrade_blocked is True


def test_resolve_version_traceability_normalization():
    t_ml = resolve_version_traceability("  1.0.0-racanet-v1  ", "hadlock-v1", fallback_mode="none")
    assert t_ml.model_version == "1.0.0-racanet-v1"
    assert t_ml.rules_version == "hadlock-v1"
    assert t_ml.is_ml_active is True

    t_rules = resolve_version_traceability(None, None, fallback_mode="analysis_service_rules")
    assert t_rules.model_version == RULE_ONLY_MODEL_VERSION
    assert t_rules.rules_version == RULES_VERSION
    assert t_rules.is_ml_active is False

    t_unavail = resolve_version_traceability("   ", None, fallback_mode="backend_rule_only")
    assert t_unavail.model_version == UNAVAILABLE_MODEL_VERSION
    assert t_unavail.is_ml_active is False

    t_unknown = resolve_version_traceability(None, None, fallback_mode="none")
    assert t_unknown.model_version == UNKNOWN_MODEL_VERSION
    assert t_unknown.is_ml_active is False

    long_ver = "v" * 150
    t_trunc = resolve_version_traceability(long_ver, long_ver, fallback_mode="none")
    assert len(t_trunc.model_version) == 100
    assert len(t_trunc.rules_version) == 100


def test_evaluate_with_fallback_enforces_l5_max_override():
    req = InternalAnalysisRequest(gestational_age_days=210, efw=600.0)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.raise_for_status.return_value = None
    # Simulate buggy upstream response trying to downgrade red rule to green
    mock_resp.json.return_value = {
        "rule_result": {"warning_level": "red"},
        "raw_model_level": "green",
        "final_warning_level": "green",
        "anomaly_probability": 0.05,
        "rules_version": "1.0.0-hadlock-intergrowth",
        "model_version": "1.0.0-racanet-v1",
    }

    with patch("app.services.analysis_client.requests.post", return_value=mock_resp):
        result = evaluate_with_fallback(req)

    assert result.warning_level == "red"
    assert result.rule_warning_level == "red"
    assert result.model_warning_level == "green"
    assert result.safety_override_applied is True
    assert result.model_version == "1.0.0-racanet-v1"
    assert result.rule_version == "1.0.0-hadlock-intergrowth"


def test_fuse_and_save_and_traceability_query(db_session):
    doctor, profile, bio = _create_sample_biometric(db_session, ga_days=210, efw=1550.0, ac=260.0)

    # Normal biometrics (rule=green), ML elevates to RED
    payload = L5FuseAndSaveRequest(
        biometric_data_id=bio.id,
        model_warning_level="red",
        model_anomaly_probability=0.91,
        model_version="1.0.0-racanet-v2",
        rules_version="1.0.0-hadlock-intergrowth",
        fallback_mode="none",
    )
    saved = fuse_and_save_l5_analysis(payload=payload, db=db_session, current_user=doctor)
    assert saved.warning_level == "red"
    assert saved.model_version == "1.0.0-racanet-v2"
    assert saved.rules_version == "1.0.0-hadlock-intergrowth"
    assert float(saved.anomaly_probability) == pytest.approx(0.91, abs=1e-4)
    assert "L5 Safety Fusion" in saved.explanation_doctor

    # Traceability query by model_version
    matched = list_analysis_version_traceability(
        pregnancy_profile_id=profile.id,
        model_version="1.0.0-racanet-v2",
        rules_version=None,
        warning_level=None,
        limit=50,
        db=db_session,
        current_user=doctor,
    )
    assert len(matched) == 1
    assert matched[0].id == saved.id

    unmatched = list_analysis_version_traceability(
        pregnancy_profile_id=profile.id,
        model_version="non-existent-version",
        rules_version=None,
        warning_level=None,
        limit=50,
        db=db_session,
        current_user=doctor,
    )
    assert len(unmatched) == 0
