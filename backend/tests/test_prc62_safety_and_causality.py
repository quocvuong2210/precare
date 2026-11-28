"""
PRC-62: Independent Unit Test Suite verifying:
  1. L5 Safety Fusion Constraint: final_warning_level = max(rule_level, model_level)
     (ML may elevate warnings, never downgrade clinical red/yellow flags).
  2. Time-Series Temporal Causality:
     - Forward trajectory drop detection (t1 -> t2).
     - Strict no-future-leakage when historical visits are backfilled out of order.
     - Most-recent causal predecessor selection (t1 < t2 < t3).
     - Cross-pregnancy isolation and soft-deleted record exclusion.
"""

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

from app.core.database import Base
from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.growth_reference import GrowthReference
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.schemas.analysis import InternalAnalysisRequest
from app.services.analysis_client import evaluate_with_fallback
from app.services.clinical_rule_engine import (
    evaluate_and_save_biometric_rules,
    get_causal_previous_efw_percentile,
)
from app.services.growth_reference_seeder import seed_growth_references
from app.services.safety_fusion_service import (
    fuse_and_save_analysis_result,
    fuse_warning_levels,
    normalize_warning_level,
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


def _seed_profile(session, *, suffix: str = "a"):
    patient = User(
        id=uuid.uuid4(),
        email=f"patient-{suffix}-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="hashed",
        full_name=f"Patient {suffix.upper()}",
        role="pregnant_woman",
        is_active=True,
    )
    doctor = User(
        id=uuid.uuid4(),
        email=f"doctor-{suffix}-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="hashed",
        full_name=f"Doctor {suffix.upper()}",
        role="doctor",
        is_active=True,
    )
    session.add_all([patient, doctor])
    session.flush()

    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=patient.id,
        primary_doctor_id=doctor.id,
        lmp=date(2026, 1, 1),
        edd=date(2026, 10, 8),
        status="active",
    )
    session.add(profile)
    session.flush()
    return doctor, profile


def _add_visit(
    session,
    *,
    profile_id: uuid.UUID,
    doctor_id: uuid.UUID,
    ga_days: int,
    efw: float,
    ac: float = 240.0,
    bpd: float = 72.0,
    hc: float = 265.0,
    fl: float = 54.0,
    is_deleted: bool = False,
) -> BiometricData:
    checkup = Checkup(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile_id,
        doctor_id=doctor_id,
        checkup_date=date(2026, 7, 1),
        gestational_age_days=ga_days,
    )
    session.add(checkup)
    session.flush()

    bio = BiometricData(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile_id,
        checkup_id=checkup.id,
        gestational_age_days=ga_days,
        bpd=Decimal(f"{bpd:.2f}"),
        hc=Decimal(f"{hc:.2f}"),
        ac=Decimal(f"{ac:.2f}"),
        fl=Decimal(f"{fl:.2f}"),
        efw=Decimal(f"{efw:.2f}"),
        status="verified",
        is_deleted=is_deleted,
    )
    session.add(bio)
    session.commit()
    return bio


# ==============================================================================
# PART A: Safety Fusion Constraint max(rule, model)
# ==============================================================================


@pytest.mark.parametrize(
    ("rule_level", "model_level", "expected_final", "expected_elevated", "expected_blocked"),
    [
        ("green", "green", "green", False, False),
        ("green", "yellow", "yellow", True, False),
        ("green", "red", "red", True, False),
        ("yellow", "green", "yellow", False, True),
        ("yellow", "yellow", "yellow", False, False),
        ("yellow", "red", "red", True, False),
        ("red", "green", "red", False, True),
        ("red", "yellow", "red", False, True),
        ("red", "red", "red", False, False),
    ],
)
def test_max_rule_model_matrix_invariant(
    rule_level,
    model_level,
    expected_final,
    expected_elevated,
    expected_blocked,
):
    decision = fuse_warning_levels(rule_level=rule_level, model_level=model_level)
    assert decision.final_warning_level == expected_final
    assert decision.elevated_by_model is expected_elevated
    assert decision.downgrade_blocked is expected_blocked


def test_warning_normalization_handles_dirty_and_unknown_inputs():
    assert normalize_warning_level(" RED ") == "red"
    assert normalize_warning_level("Yellow") == "yellow"
    assert normalize_warning_level(None, default="green") == "green"
    # Unrecognized string must conservatively default to yellow, never green
    assert normalize_warning_level("critical_unknown") == "yellow"


def test_upstream_downgrade_attempt_is_overridden_in_client():
    req = InternalAnalysisRequest(gestational_age_days=210, efw=600.0)
    buggy_resp = MagicMock()
    buggy_resp.status_code = 200
    buggy_resp.raise_for_status.return_value = None
    buggy_resp.json.return_value = {
        "rule_result": {"warning_level": "red"},
        "raw_model_level": "green",
        "final_warning_level": "green",  # Buggy downgrade from upstream ML service
        "anomaly_probability": 0.03,
        "rules_version": "hadlock-v1",
        "model_version": "racanet-v1",
    }

    with patch("app.services.analysis_client.requests.post", return_value=buggy_resp):
        res = evaluate_with_fallback(req)

    assert res.warning_level == "red"
    assert res.rule_warning_level == "red"
    assert res.model_warning_level == "green"
    assert res.safety_override_applied is True


def test_db_persistence_preserves_rule_red_against_ml_green(db_session):
    doctor, profile = _seed_profile(db_session, suffix="red")
    # GA 28w (196d), EFW = 600g (< 3rd percentile -> Clinical RED)
    bio = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=600.0,
        ac=180.0,
    )

    record, fusion, _ = fuse_and_save_analysis_result(
        db=db_session,
        biometric_data_id=bio.id,
        model_warning_level="green",
        model_anomaly_probability=0.02,
        model_version="racanet-v1",
    )
    assert fusion.rule_warning_level == "red"
    assert fusion.final_warning_level == "red"
    assert fusion.downgrade_blocked is True
    assert record.warning_level == "red"
    # Anomaly probability must also never drop below rule probability (0.90)
    assert float(record.anomaly_probability) >= 0.90


def test_db_persistence_allows_ml_elevation_from_green_to_red(db_session):
    doctor, profile = _seed_profile(db_session, suffix="elev")
    # GA 28w (196d), EFW = 1200g (normal ~60th-70th percentile -> Clinical GREEN)
    bio = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=1200.0,
        ac=238.0,
    )

    record, fusion, _ = fuse_and_save_analysis_result(
        db=db_session,
        biometric_data_id=bio.id,
        model_warning_level="red",
        model_anomaly_probability=0.93,
        model_version="racanet-v2",
    )
    assert fusion.rule_warning_level == "green"
    assert fusion.final_warning_level == "red"
    assert fusion.elevated_by_model is True
    assert record.warning_level == "red"
    assert float(record.anomaly_probability) == pytest.approx(0.93, abs=1e-4)


# ==============================================================================
# PART B: Time-Series Temporal Causality (No Future Leakage)
# ==============================================================================


def test_forward_causal_trajectory_detects_drop_t1_to_t2(db_session):
    doctor, profile = _seed_profile(db_session, suffix="fwd")

    # t1 = 28w (196d): high-normal EFW (1200g, >60th percentile -> green)
    bio_t1 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=1200.0,
        ac=238.0,
    )
    res_t1, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t1.id)
    assert res_t1.warning_level == "green"

    # t2 = 32w (224d): lower-normal EFW (1620g, ~20th-30th percentile -> drop >20 pts -> yellow)
    bio_t2 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=224,
        efw=1620.0,
        ac=268.0,
        bpd=80.0,
        hc=292.0,
        fl=60.0,
    )
    res_t2, flags_t2 = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t2.id)
    assert float(res_t1.efw_percentile) - float(res_t2.efw_percentile) > 20.0
    assert res_t2.warning_level == "yellow"
    assert any("20" in f or "bách phân vị" in f.lower() for f in flags_t2)


def test_no_future_data_leakage_when_older_visit_backfilled_later(db_session):
    """
    Causal invariant: If t2 (32w) is evaluated FIRST, and an earlier visit t1 (28w)
    is backfilled and evaluated LATER (so t1.analyzed_at > t2.analyzed_at),
    t1 MUST NOT see t2 as its predecessor!
    """
    doctor, profile = _seed_profile(db_session, suffix="backfill")

    # Evaluate t2 (32w, ~25th percentile) FIRST
    bio_t2 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=224,
        efw=1620.0,
        ac=268.0,
        bpd=80.0,
        hc=292.0,
        fl=60.0,
    )
    res_t2, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t2.id)
    assert res_t2.warning_level == "green"

    # Backfill t1 (28w, ~70th percentile) AFTER t2
    bio_t1 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=1200.0,
        ac=238.0,
    )
    prev_for_t1 = get_causal_previous_efw_percentile(
        db=db_session,
        pregnancy_profile_id=profile.id,
        current_biometric_id=bio_t1.id,
        current_ga_days=196,
    )
    assert prev_for_t1 is None, "Future visit t2 (224d) leaked into past visit t1 (196d)!"

    res_t1, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t1.id)
    assert res_t1.warning_level == "green"


def test_most_recent_causal_predecessor_selected_across_three_visits(db_session):
    """
    With t1=24w (~75th), t2=28w (~25th), t3=32w (~22nd):
    t3 must compare against t2 (25th -> 22nd, diff=3 <= 20 -> green),
    NOT skip t2 and compare against t1 (75th -> 22nd).
    """
    doctor, profile = _seed_profile(db_session, suffix="chain3")

    # t1 = 24w (168d), EFW = 750g (high-normal)
    bio_t1 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=168,
        efw=750.0,
        ac=205.0,
        bpd=61.0,
        hc=225.0,
        fl=44.0,
    )
    res_t1, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t1.id)

    # t2 = 28w (196d), EFW = 1030g (lower-normal, drops >20 pts from t1)
    bio_t2 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=1030.0,
        ac=230.0,
    )
    res_t2, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t2.id)
    assert float(res_t1.efw_percentile) - float(res_t2.efw_percentile) > 20.0
    assert res_t2.warning_level == "yellow"

    # t3 = 32w (224d), EFW = 1620g (stabilized near t2's percentile -> no >20 drop vs t2)
    bio_t3 = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=224,
        efw=1620.0,
        ac=268.0,
        bpd=80.0,
        hc=292.0,
        fl=60.0,
    )
    prev_for_t3 = get_causal_previous_efw_percentile(
        db=db_session,
        pregnancy_profile_id=profile.id,
        current_biometric_id=bio_t3.id,
        current_ga_days=224,
    )
    assert prev_for_t3 == pytest.approx(float(res_t2.efw_percentile), abs=0.01)

    res_t3, flags_t3 = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_t3.id)
    assert res_t3.warning_level == "green"
    assert flags_t3 == []


def test_cross_pregnancy_causal_isolation(db_session):
    doctor_a, profile_a = _seed_profile(db_session, suffix="iso_a")
    doctor_b, profile_b = _seed_profile(db_session, suffix="iso_b")

    # Pregnancy A has a high-percentile visit at 28w
    bio_a = _add_visit(
        db_session,
        profile_id=profile_a.id,
        doctor_id=doctor_a.id,
        ga_days=196,
        efw=1200.0,
        ac=238.0,
    )
    evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_a.id)

    # Pregnancy B has a normal visit at 32w; must NOT inherit Pregnancy A's percentile
    bio_b = _add_visit(
        db_session,
        profile_id=profile_b.id,
        doctor_id=doctor_b.id,
        ga_days=224,
        efw=1620.0,
        ac=268.0,
        bpd=80.0,
        hc=292.0,
        fl=60.0,
    )
    prev_for_b = get_causal_previous_efw_percentile(
        db=db_session,
        pregnancy_profile_id=profile_b.id,
        current_biometric_id=bio_b.id,
        current_ga_days=224,
    )
    assert prev_for_b is None

    res_b, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_b.id)
    assert res_b.warning_level == "green"


def test_soft_deleted_prior_visit_excluded_from_causal_chain(db_session):
    doctor, profile = _seed_profile(db_session, suffix="softdel")

    # Soft-deleted prior visit at 28w
    bio_deleted = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        efw=1200.0,
        ac=238.0,
        is_deleted=False,
    )
    evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_deleted.id)
    bio_deleted.is_deleted = True
    db_session.commit()

    # Subsequent visit at 32w must ignore the soft-deleted record
    bio_next = _add_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=224,
        efw=1620.0,
        ac=268.0,
        bpd=80.0,
        hc=292.0,
        fl=60.0,
    )
    prev_for_next = get_causal_previous_efw_percentile(
        db=db_session,
        pregnancy_profile_id=profile.id,
        current_biometric_id=bio_next.id,
        current_ga_days=224,
    )
    assert prev_for_next is None

    res_next, _ = evaluate_and_save_biometric_rules(db=db_session, biometric_data_id=bio_next.id)
    assert res_next.warning_level == "green"
