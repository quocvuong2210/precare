import uuid
from datetime import date
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

from app.api.records import get_record_trajectory, router as records_router
from app.core.database import Base
from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.deletion_request import DeletionRequest
from app.models.growth_reference import GrowthReference
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.services.growth_reference_seeder import DEFAULT_VERSION, seed_growth_references


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


def _seed_users_and_profile(session):
    doctor = User(
        id=uuid.uuid4(),
        email=f"doc-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="x",
        full_name="Dr. Trajectory",
        role="doctor",
        is_active=True,
    )
    patient = User(
        id=uuid.uuid4(),
        email=f"pat-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="x",
        full_name="Patient Trajectory",
        role="pregnant_woman",
        is_active=True,
    )
    other_patient = User(
        id=uuid.uuid4(),
        email=f"other-{uuid.uuid4().hex[:6]}@example.com",
        password_hash="x",
        full_name="Other Patient",
        role="pregnant_woman",
        is_active=True,
    )
    session.add_all([doctor, patient, other_patient])
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
    session.commit()
    return doctor, patient, other_patient, profile


def _add_biometric_visit(
    session,
    *,
    profile_id: uuid.UUID,
    doctor_id: uuid.UUID,
    ga_days: int,
    checkup_date: date,
    efw: float,
    ac: float,
    is_deleted: bool = False,
):
    checkup = Checkup(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile_id,
        doctor_id=doctor_id,
        checkup_date=checkup_date,
        gestational_age_days=ga_days,
    )
    session.add(checkup)
    session.flush()

    bio = BiometricData(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile_id,
        checkup_id=checkup.id,
        gestational_age_days=ga_days,
        bpd=Decimal("75.00"),
        hc=Decimal("275.00"),
        ac=Decimal(f"{ac:.2f}"),
        fl=Decimal("56.00"),
        efw=Decimal(f"{efw:.2f}"),
        status="verified",
        is_deleted=is_deleted,
    )
    session.add(bio)
    session.commit()
    return bio


def test_trajectory_routes_registered_on_app():
    paths = {route.path for route in records_router.routes}
    assert "/{record_id}/trajectory" in paths


def test_get_trajectory_chronological_deltas_and_lms_curve(db_session):
    doctor, patient, _, profile = _seed_users_and_profile(db_session)

    # Insert Visit 2 (32w = 224d) BEFORE Visit 1 (28w = 196d) to verify chronological sorting
    bio_v2 = _add_biometric_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=224,
        checkup_date=date(2026, 8, 13),
        efw=1620.0,
        ac=268.0,
    )
    bio_v1 = _add_biometric_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=196,
        checkup_date=date(2026, 7, 16),
        efw=1200.0,
        ac=238.0,
    )
    # Soft-deleted visit should be excluded
    _add_biometric_visit(
        db_session,
        profile_id=profile.id,
        doctor_id=doctor.id,
        ga_days=210,
        checkup_date=date(2026, 7, 30),
        efw=1500.0,
        ac=255.0,
        is_deleted=True,
    )

    res = get_record_trajectory(
        record_id=profile.id,
        metric="efw",
        standard="intergrowth_21st",
        version=DEFAULT_VERSION,
        min_ga_days=None,
        max_ga_days=None,
        db=db_session,
        current_user=patient,
    )

    assert res.pregnancy_profile_id == profile.id
    assert res.metric == "efw"
    assert res.unit == "g"
    assert len(res.measurements) == 2

    # Chronologically ordered: 196d then 224d
    p1, p2 = res.measurements[0], res.measurements[1]
    assert p1.biometric_data_id == bio_v1.id
    assert p1.ga_days == 196
    assert p1.ga_formatted == "28w 0d"
    assert p1.delta_value_from_prev is None
    assert p1.delta_from_median is not None
    assert p1.is_trajectory_drop_alert is False

    assert p2.biometric_data_id == bio_v2.id
    assert p2.ga_days == 224
    assert p2.ga_formatted == "32w 0d"
    assert p2.delta_value_from_prev == pytest.approx(420.0, abs=0.01)
    assert p2.delta_ga_days_from_prev == 28
    assert p2.growth_velocity_per_week == pytest.approx(105.0, abs=0.01)
    assert p2.delta_percentile_from_prev < -20.0
    assert p2.is_trajectory_drop_alert is True

    # Summary checks
    assert res.summary.total_points == 2
    assert res.summary.latest_ga_days == 224
    assert res.summary.latest_value == 1620.0
    assert res.summary.overall_delta_value == pytest.approx(420.0, abs=0.01)
    assert res.summary.has_trajectory_drop_alert is True

    # LMS curve checks (3rd, 10th, 50th, 90th, 97th percentiles)
    assert len(res.lms_curve) > 0
    first_curve = res.lms_curve[0]
    assert first_curve.p3 < first_curve.p10 < first_curve.p50 < first_curve.p90 < first_curve.p97


def test_trajectory_rbac_idor_and_validation(db_session):
    doctor, _, other_patient, profile = _seed_users_and_profile(db_session)

    # Other patient -> 403
    with pytest.raises(HTTPException) as exc_403:
        get_record_trajectory(
            record_id=profile.id,
            metric="efw",
            standard="intergrowth_21st",
            version=DEFAULT_VERSION,
            min_ga_days=None,
            max_ga_days=None,
            db=db_session,
            current_user=other_patient,
        )
    assert exc_403.value.status_code == 403

    # Missing profile -> 404
    with pytest.raises(HTTPException) as exc_404:
        get_record_trajectory(
            record_id=uuid.uuid4(),
            metric="efw",
            standard="intergrowth_21st",
            version=DEFAULT_VERSION,
            min_ga_days=None,
            max_ga_days=None,
            db=db_session,
            current_user=doctor,
        )
    assert exc_404.value.status_code == 404

    # Invalid GA range -> 422
    with pytest.raises(HTTPException) as exc_422:
        get_record_trajectory(
            record_id=profile.id,
            metric="ac",
            standard="intergrowth_21st",
            version=DEFAULT_VERSION,
            min_ga_days=250,
            max_ga_days=200,
            db=db_session,
            current_user=doctor,
        )
    assert exc_422.value.status_code == 422
