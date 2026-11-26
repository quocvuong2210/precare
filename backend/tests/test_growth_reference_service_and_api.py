import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.growth_reference import (
    evaluate_measurement,
    get_growth_reference_curve,
    get_growth_reference_point,
)
from app.core.database import Base
from app.models.growth_reference import GrowthReference
from app.models.user import User
from app.schemas.growth_reference import ZScoreEvaluateRequest
from app.services.growth_reference_seeder import DEFAULT_VERSION, seed_growth_references
from app.services.growth_reference_service import (
    calculate_zscore_and_percentile,
    calculate_zscore_from_lms,
    classify_percentile,
    normal_cdf,
)


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine, tables=[GrowthReference.__table__])
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    seed_growth_references(session)
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def fake_user():
    return User(
        id=uuid.uuid4(),
        email="doctor@example.com",
        password_hash="x",
        full_name="BS. Test",
        role="doctor",
        is_active=True,
    )


def test_normal_cdf_and_zscore_math():
    assert normal_cdf(0.0) == pytest.approx(0.5)
    assert normal_cdf(1.2815515655446004) == pytest.approx(0.90, abs=1e-6)
    assert normal_cdf(-1.8807936081512509) == pytest.approx(0.03, abs=1e-6)

    # Normal (L=1.0)
    z_norm, p_norm = calculate_zscore_and_percentile(110.0, 1.0, 100.0, 0.1)
    assert z_norm == pytest.approx(1.0)
    assert p_norm == pytest.approx(84.13)

    # Log-normal (L=0.0)
    z_log = calculate_zscore_from_lms(1000.0, 0.0, 1000.0, 0.115)
    assert z_log == pytest.approx(0.0)

    # General Box-Cox (L=0.5)
    z_box, p_box = calculate_zscore_and_percentile(100.0, 0.5, 100.0, 0.1)
    assert z_box == pytest.approx(0.0)
    assert p_box == pytest.approx(50.0)


def test_classify_percentile_boundaries():
    assert classify_percentile(2.9) == "below_p3"
    assert classify_percentile(3.0) == "p3_to_p10"
    assert classify_percentile(9.9) == "p3_to_p10"
    assert classify_percentile(10.0) == "normal"
    assert classify_percentile(90.0) == "normal"
    assert classify_percentile(90.1) == "above_p90"
    assert classify_percentile(97.0) == "above_p90"
    assert classify_percentile(97.1) == "above_p97"


def test_get_point_and_curves_handlers(db_session, fake_user):
    point = get_growth_reference_point(
        standard="intergrowth_21st",
        metric="hc",
        ga_days=140,
        version=DEFAULT_VERSION,
        db=db_session,
        current_user=fake_user,
    )
    assert point.standard == "intergrowth_21st"
    assert point.metric == "hc"
    assert point.ga_days == 140
    assert point.unit == "mm"
    assert float(point.p3) < float(point.p10) < float(point.p50) < float(point.p90) < float(point.p97)

    # Out of range -> 404
    with pytest.raises(HTTPException) as exc_404:
        get_growth_reference_point(
            standard="intergrowth_21st",
            metric="crl",
            ga_days=200,
            version=DEFAULT_VERSION,
            db=db_session,
            current_user=fake_user,
        )
    assert exc_404.value.status_code == 404

    # Curves with range filter
    curve = get_growth_reference_curve(
        standard="hadlock",
        metric="efw",
        min_ga_days=210,
        max_ga_days=224,
        version=DEFAULT_VERSION,
        db=db_session,
        current_user=fake_user,
    )
    assert curve.unit == "g"
    assert len(curve.points) == 15
    assert curve.points[0].ga_days == 210
    assert curve.points[-1].ga_days == 224

    # Invalid range -> 422
    with pytest.raises(HTTPException) as exc_422:
        get_growth_reference_curve(
            standard="hadlock",
            metric="efw",
            min_ga_days=250,
            max_ga_days=200,
            version=DEFAULT_VERSION,
            db=db_session,
            current_user=fake_user,
        )
    assert exc_422.value.status_code == 422


def test_evaluate_measurement_handler(db_session, fake_user):
    point = get_growth_reference_point(
        standard="intergrowth_21st",
        metric="efw",
        ga_days=224,
        version=DEFAULT_VERSION,
        db=db_session,
        current_user=fake_user,
    )

    # At median -> z_score ~ 0, percentile ~ 50, normal
    res_med = evaluate_measurement(
        payload=ZScoreEvaluateRequest(
            standard="intergrowth_21st",
            metric="efw",
            ga_days=224,
            value=float(point.p50),
        ),
        db=db_session,
        current_user=fake_user,
    )
    assert res_med["z_score"] == pytest.approx(0.0, abs=0.02)
    assert res_med["percentile"] == pytest.approx(50.0, abs=0.5)
    assert res_med["classification"] == "normal"

    # Below p3 -> below_p3
    res_low = evaluate_measurement(
        payload=ZScoreEvaluateRequest(
            standard="intergrowth_21st",
            metric="efw",
            ga_days=224,
            value=float(point.p3) * 0.9,
        ),
        db=db_session,
        current_user=fake_user,
    )
    assert res_low["classification"] == "below_p3"

    # Above p97 -> above_p97
    res_high = evaluate_measurement(
        payload=ZScoreEvaluateRequest(
            standard="hadlock",
            metric="ac",
            ga_days=224,
            value=450.0,
        ),
        db=db_session,
        current_user=fake_user,
    )
    assert res_high["classification"] == "above_p97"
