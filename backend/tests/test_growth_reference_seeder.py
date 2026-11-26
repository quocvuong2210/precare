import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
from app.models.growth_reference import GrowthReference
from app.services.growth_reference_seeder import (
    compute_value_from_lms,
    generate_reference_points,
    get_growth_reference,
    seed_growth_references,
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
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_compute_value_from_lms_normal_and_lognormal():
    # L = 1 (normal): M=100, S=0.1, Z=1.0 -> 110.0
    assert compute_value_from_lms(1.0, 100.0, 0.1, 1.0) == pytest.approx(110.0)
    # L = 0 (log-normal): M=1000, S=0.1, Z=0.0 -> 1000.0
    assert compute_value_from_lms(0.0, 1000.0, 0.1, 0.0) == pytest.approx(1000.0)


def test_generated_points_clinical_ranges_and_monotonic_percentiles():
    points = generate_reference_points()
    assert len(points) > 1800

    for p in points:
        assert p.m_value > 0
        assert p.s_value > 0
        p3 = compute_value_from_lms(p.l_value, p.m_value, p.s_value, -1.8807936081512509)
        p10 = compute_value_from_lms(p.l_value, p.m_value, p.s_value, -1.2815515655446004)
        p50 = compute_value_from_lms(p.l_value, p.m_value, p.s_value, 0.0)
        p90 = compute_value_from_lms(p.l_value, p.m_value, p.s_value, 1.2815515655446004)
        p97 = compute_value_from_lms(p.l_value, p.m_value, p.s_value, 1.8807936081512509)
        assert p3 < p10 < p50 < p90 < p97


def test_seed_growth_references_idempotent_and_lookup(db_session):
    expected_count = len(generate_reference_points())

    inserted_first = seed_growth_references(db_session)
    assert inserted_first == expected_count

    # Second run must insert 0 rows (idempotent)
    inserted_second = seed_growth_references(db_session)
    assert inserted_second == 0

    total_rows = db_session.query(GrowthReference).count()
    assert total_rows == expected_count

    # Verify INTERGROWTH-21st CRL at 12w0d (84 days) ~ 55mm
    crl_12w = get_growth_reference(db_session, "intergrowth_21st", "crl", 84)
    assert crl_12w is not None
    assert crl_12w.unit == "mm"
    assert 50.0 < float(crl_12w.p50) < 60.0

    # Verify INTERGROWTH-21st EFW at 40w0d (280 days) ~ 3338g
    efw_ig_40w = get_growth_reference(db_session, "intergrowth_21st", "efw", 280)
    assert efw_ig_40w is not None
    assert efw_ig_40w.unit == "g"
    assert float(efw_ig_40w.l_value) == pytest.approx(0.0)
    assert 3100.0 < float(efw_ig_40w.p50) < 3600.0

    # Verify Hadlock EFW at 32w0d (224 days) ~ 2048g
    efw_hadlock_32w = get_growth_reference(db_session, "hadlock", "efw", 224)
    assert efw_hadlock_32w is not None
    assert efw_hadlock_32w.unit == "g"
    assert 1900.0 < float(efw_hadlock_32w.p50) < 2200.0
