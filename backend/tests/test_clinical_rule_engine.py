import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

from app.api.clinical_rule import evaluate_biometric_rules, get_profile_rule_evaluations
from app.core.database import Base
from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.deletion_request import DeletionRequest
from app.models.growth_reference import GrowthReference
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.schemas.clinical_rule import ClinicalRuleEvaluateRequest
from app.services.clinical_rule_engine import (
    MANDATORY_DISCLAIMER,
    RULES_VERSION,
    evaluate_rules_3_level,
)
from app.services.growth_reference_seeder import seed_growth_references


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


def test_evaluate_rules_3_level_green_yellow_red():
    # Green: all normal
    res_green = evaluate_rules_3_level(
        bpd_percentile=50.0,
        hc_percentile=48.0,
        ac_percentile=55.0,
        fl_percentile=52.0,
        efw_percentile=50.0,
    )
    assert res_green.warning_level == "green"
    assert res_green.flags == []

    # Yellow: EFW in [3, 10)
    res_fgr_mild = evaluate_rules_3_level(efw_percentile=7.5, ac_percentile=15.0)
    assert res_fgr_mild.warning_level == "yellow"
    assert "EFW_FGR_P3_P10" in res_fgr_mild.flags

    # Yellow: Trajectory drop > 20 percentile points even when current EFW is normal (45%)
    res_drop = evaluate_rules_3_level(efw_percentile=45.0, previous_efw_percentile=70.0)
    assert res_drop.warning_level == "yellow"
    assert "TRAJECTORY_DROP_GT_20" in res_drop.flags

    # Red: EFW < 3rd percentile
    res_red_efw = evaluate_rules_3_level(efw_percentile=2.1, ac_percentile=12.0)
    assert res_red_efw.warning_level == "red"
    assert "EFW_BELOW_P3" in res_red_efw.flags

    # Red: NT >= 3.0 mm
    res_red_nt = evaluate_rules_3_level(nt_mm=3.2)
    assert res_red_nt.warning_level == "red"
    assert "NT_ELEVATED" in res_red_nt.flags

    # Red: AFI < 5.0 cm
    res_red_afi = evaluate_rules_3_level(efw_percentile=50.0, afi_cm=4.2)
    assert res_red_afi.warning_level == "red"
    assert "OLIGOHYDRAMNIOS" in res_red_afi.flags


def test_evaluate_and_save_persistence_and_trajectory(db_session):
    doctor = User(
        id=uuid.uuid4(),
        email="doc@example.com",
        password_hash="x",
        full_name="BS. A",
        role="doctor",
        is_active=True,
    )
    patient = User(
        id=uuid.uuid4(),
        email="pat@example.com",
        password_hash="x",
        full_name="Patient A",
        role="pregnant_woman",
        is_active=True,
    )
    other_patient = User(
        id=uuid.uuid4(),
        email="other@example.com",
        password_hash="x",
        full_name="Patient B",
        role="pregnant_woman",
        is_active=True,
    )
    db_session.add_all([doctor, patient, other_patient])
    db_session.flush()

    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=patient.id,
        primary_doctor_id=doctor.id,
        lmp=date(2026, 3, 1),
        edd=date(2026, 12, 6),
        status="active",
    )
    db_session.add(profile)
    db_session.flush()

    # Visit 1: 28w0d (196 days) - high-normal EFW (~1400g, >70th percentile on INTERGROWTH)
    checkup1 = Checkup(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        doctor_id=doctor.id,
        checkup_date=date(2026, 9, 13),
        gestational_age_days=196,
    )
    db_session.add(checkup1)
    db_session.flush()

    bio1 = BiometricData(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        checkup_id=checkup1.id,
        gestational_age_days=196,
        bpd=Decimal("70.0"),
        hc=Decimal("260.0"),
        ac=Decimal("238.0"),
        fl=Decimal("52.0"),
        efw=Decimal("1200.0"),
        status="verified",
    )
    db_session.add(bio1)
    db_session.commit()

    res1 = evaluate_biometric_rules(
        payload=ClinicalRuleEvaluateRequest(biometric_data_id=bio1.id, standard="intergrowth_21st"),
        db=db_session,
        current_user=doctor,
    )
    assert res1.rules_version == RULES_VERSION
    assert res1.disclaimer_text == MANDATORY_DISCLAIMER
    assert res1.warning_level == "green"
    assert float(res1.efw_percentile) > 60.0

    # Ensure persisted in DB
    saved_rows = get_profile_rule_evaluations(
        pregnancy_profile_id=profile.id,
        db=db_session,
        current_user=patient,
    )
    assert len(saved_rows) == 1
    assert saved_rows[0].id == res1.id

    # Other patient cannot read -> 403
    with pytest.raises(HTTPException) as exc_403:
        get_profile_rule_evaluations(
            pregnancy_profile_id=profile.id,
            db=db_session,
            current_user=other_patient,
        )
    assert exc_403.value.status_code == 403

    # Visit 2: 32w0d (224 days) - EFW drops to ~1580g (~25th percentile -> drop > 20 pts, even if >10th!)
    checkup2 = Checkup(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        doctor_id=doctor.id,
        checkup_date=date(2026, 10, 11),
        gestational_age_days=224,
    )
    db_session.add(checkup2)
    db_session.flush()

    bio2 = BiometricData(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        checkup_id=checkup2.id,
        gestational_age_days=224,
        bpd=Decimal("80.0"),
        hc=Decimal("295.0"),
        ac=Decimal("272.0"),
        fl=Decimal("60.0"),
        efw=Decimal("1580.0"),
        status="verified",
    )
    db_session.add(bio2)
    db_session.commit()

    # Ensure res1 has an older timestamp so ordering picks res1 as previous
    res1_db = db_session.query(AnalysisResult).filter(AnalysisResult.id == res1.id).first()
    res1_db.analyzed_at = datetime.now(timezone.utc) - timedelta(days=28)
    db_session.commit()

    res2 = evaluate_biometric_rules(
        payload=ClinicalRuleEvaluateRequest(biometric_data_id=bio2.id, standard="intergrowth_21st"),
        db=db_session,
        current_user=doctor,
    )
    assert res2.warning_level == "yellow"
    assert "TRAJECTORY_DROP_GT_20" in res2.flags
    assert res2.rules_version == RULES_VERSION

    # Missing biometric_data_id -> 404
    with pytest.raises(HTTPException) as exc_404:
        evaluate_biometric_rules(
            payload=ClinicalRuleEvaluateRequest(biometric_data_id=uuid.uuid4()),
            db=db_session,
            current_user=doctor,
        )
    assert exc_404.value.status_code == 404
