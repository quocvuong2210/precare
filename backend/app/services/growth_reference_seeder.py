"""
Service for generating and seeding INTERGROWTH-21st & Hadlock LMS reference tables
into PostgreSQL (`growth_references`).

References:
- INTERGROWTH-21st CRL: Papageorghiou et al., Ultrasound Obstet Gynecol 2014 (GA 58-98 days).
- INTERGROWTH-21st BPD, HC, AC, FL: Papageorghiou et al., Lancet 2014 (GA 98-287 days).
- INTERGROWTH-21st EFW: Stirnemann et al., Ultrasound Obstet Gynecol 2017 (GA 154-287 days).
- Hadlock BPD, HC, AC, FL, EFW: Hadlock FP et al., Radiology 1984 / 1991 (GA 98-287 days),
  aligned with `analysis_service/app/core/constants.py`.
"""

import logging
import math
from dataclasses import dataclass
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.growth_reference import GrowthReference

logger = logging.getLogger(__name__)

DEFAULT_VERSION = "v1.0"

Z_PERCENTILES: Dict[str, float] = {
    "p3": -1.8807936081512509,
    "p10": -1.2815515655446004,
    "p50": 0.0,
    "p90": 1.2815515655446004,
    "p97": 1.8807936081512509,
}


@dataclass(frozen=True)
class LMSPoint:
    standard: str
    metric: str
    ga_days: int
    unit: str
    l_value: float
    m_value: float
    s_value: float


def compute_value_from_lms(l_val: float, m_val: float, s_val: float, z_score: float) -> float:
    """Compute biometric value at a given z-score using Cole's LMS formula."""
    if abs(l_val) < 1e-9:
        return m_val * math.exp(s_val * z_score)
    inner = 1.0 + l_val * s_val * z_score
    if inner <= 0.0:
        raise ValueError(f"Invalid LMS domain: 1 + L*S*Z = {inner} <= 0")
    return m_val * (inner ** (1.0 / l_val))


def _intergrowth_crl(ga_days: int) -> Tuple[float, float, float]:
    mean = -50.6562 + (0.815118 * ga_days) + (0.00535302 * (ga_days ** 2))
    sd = -2.21626 + (0.0984894 * ga_days)
    return 1.0, mean, sd / mean


def _intergrowth_bpd(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    ln_g = math.log(g)
    mean = 5.60878 + (0.158369 * (g ** 2)) - (0.00256379 * (g ** 3))
    sd = math.exp(
        0.101242
        + (0.00150557 * (g ** 3))
        - (0.000771535 * (g ** 3) * ln_g)
        + (0.0000999638 * (g ** 3) * (ln_g ** 2))
    )
    return 1.0, mean, sd / mean


def _intergrowth_hc(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    ln_g = math.log(g)
    mean = -28.2849 + (1.69267 * (g ** 2)) - (0.397485 * (g ** 2) * ln_g)
    sd = (
        1.98735
        + (0.0136772 * (g ** 3))
        - (0.00726264 * (g ** 3) * ln_g)
        + (0.000976253 * (g ** 3) * (ln_g ** 2))
    )
    return 1.0, mean, sd / mean


def _intergrowth_ac(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    ln_g = math.log(g)
    mean = -81.3243 + (11.6772 * g) - (0.000561865 * (g ** 3))
    sd = (
        -4.36302
        + (0.121445 * (g ** 2))
        - (0.0130256 * (g ** 3))
        + (0.00282143 * (g ** 3) * ln_g)
    )
    return 1.0, mean, sd / mean


def _intergrowth_fl(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    mean = -39.9616 + (4.32298 * g) - (0.0380156 * (g ** 2))
    sd = math.exp(0.605843 - (42.0014 * (g ** -2)) + (0.00000917972 * (g ** 3)))
    return 1.0, mean, sd / mean


def _intergrowth_efw(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    ln_g = math.log(g)
    mu_ln = 4.956737 + (0.0005019687 * (g ** 3)) - (0.0001227065 * (g ** 3) * ln_g)
    # Log-normal parameterization: L = 0.0, M = exp(mu_ln), S = sigma_ln
    sigma_ln = 0.115
    return 0.0, math.exp(mu_ln), sigma_ln


def _hadlock_bpd(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    expected = max(20.0, -23.3 + (4.43 * g) - (0.0282 * (g ** 2)))
    return 1.0, expected, 0.05


def _hadlock_hc(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    expected = max(40.0, -17.8 + (12.58 * g) - (0.12 * (g ** 2)))
    return 1.0, expected, 0.04


def _hadlock_ac(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    expected = max(40.0, -38.8 + (13.97 * g) - (0.14 * (g ** 2)))
    return 1.0, expected, 0.05


def _hadlock_fl(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    expected = max(10.0, -18.2 + (4.57 * g) - (0.033 * (g ** 2)))
    return 1.0, expected, 0.05


def _hadlock_efw(ga_days: int) -> Tuple[float, float, float]:
    g = ga_days / 7.0
    expected = max(50.0, 0.09 * (g ** 2.9))
    return 1.0, expected, 0.12


_CURVE_SPECS = [
    # (standard, metric, unit, min_ga_days, max_ga_days, calculator_fn)
    ("intergrowth_21st", "crl", "mm", 58, 98, _intergrowth_crl),
    ("intergrowth_21st", "bpd", "mm", 98, 287, _intergrowth_bpd),
    ("intergrowth_21st", "hc", "mm", 98, 287, _intergrowth_hc),
    ("intergrowth_21st", "ac", "mm", 98, 287, _intergrowth_ac),
    ("intergrowth_21st", "fl", "mm", 98, 287, _intergrowth_fl),
    ("intergrowth_21st", "efw", "g", 154, 287, _intergrowth_efw),
    ("hadlock", "bpd", "mm", 98, 287, _hadlock_bpd),
    ("hadlock", "hc", "mm", 98, 287, _hadlock_hc),
    ("hadlock", "ac", "mm", 98, 287, _hadlock_ac),
    ("hadlock", "fl", "mm", 98, 287, _hadlock_fl),
    ("hadlock", "efw", "g", 98, 287, _hadlock_efw),
]


def generate_reference_points() -> List[LMSPoint]:
    """Generate all INTERGROWTH-21st & Hadlock LMS points across valid gestational ages."""
    points: List[LMSPoint] = []
    for standard, metric, unit, min_ga, max_ga, calc_fn in _CURVE_SPECS:
        for ga_days in range(min_ga, max_ga + 1):
            l_val, m_val, s_val = calc_fn(ga_days)
            points.append(
                LMSPoint(
                    standard=standard,
                    metric=metric,
                    ga_days=ga_days,
                    unit=unit,
                    l_value=l_val,
                    m_value=m_val,
                    s_value=s_val,
                )
            )
    return points


def _build_orm_row(point: LMSPoint, version: str) -> GrowthReference:
    return GrowthReference(
        standard=point.standard,
        metric=point.metric,
        ga_days=point.ga_days,
        unit=point.unit,
        l_value=Decimal(f"{point.l_value:.6f}"),
        m_value=Decimal(f"{point.m_value:.4f}"),
        s_value=Decimal(f"{point.s_value:.6f}"),
        p3=Decimal(f"{compute_value_from_lms(point.l_value, point.m_value, point.s_value, Z_PERCENTILES['p3']):.4f}"),
        p10=Decimal(f"{compute_value_from_lms(point.l_value, point.m_value, point.s_value, Z_PERCENTILES['p10']):.4f}"),
        p50=Decimal(f"{compute_value_from_lms(point.l_value, point.m_value, point.s_value, Z_PERCENTILES['p50']):.4f}"),
        p90=Decimal(f"{compute_value_from_lms(point.l_value, point.m_value, point.s_value, Z_PERCENTILES['p90']):.4f}"),
        p97=Decimal(f"{compute_value_from_lms(point.l_value, point.m_value, point.s_value, Z_PERCENTILES['p97']):.4f}"),
        version=version,
    )


def seed_growth_references(db: Session, version: str = DEFAULT_VERSION) -> int:
    """
    Idempotently seed INTERGROWTH-21st and Hadlock LMS reference tables into PostgreSQL.

    Returns the number of newly inserted rows.
    """
    existing_keys = set(
        db.query(
            GrowthReference.standard,
            GrowthReference.metric,
            GrowthReference.ga_days,
        )
        .filter(GrowthReference.version == version)
        .all()
    )

    to_insert: List[GrowthReference] = []
    for point in generate_reference_points():
        key = (point.standard, point.metric, point.ga_days)
        if key not in existing_keys:
            to_insert.append(_build_orm_row(point, version))

    if not to_insert:
        logger.info("Growth references already seeded (version=%s).", version)
        return 0

    db.bulk_save_objects(to_insert)
    db.commit()
    logger.info("Seeded %d growth reference rows (version=%s).", len(to_insert), version)
    return len(to_insert)


def get_growth_reference(
    db: Session,
    standard: str,
    metric: str,
    ga_days: int,
    version: str = DEFAULT_VERSION,
) -> Optional[GrowthReference]:
    """Fetch a single LMS reference row by (standard, metric, ga_days)."""
    return (
        db.query(GrowthReference)
        .filter(
            GrowthReference.standard == standard,
            GrowthReference.metric == metric,
            GrowthReference.ga_days == ga_days,
            GrowthReference.version == version,
            GrowthReference.is_deleted.is_(False),
        )
        .first()
    )


if __name__ == "__main__":
    from app.core.database import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        inserted = seed_growth_references(session)
        print(f"Seeded {inserted} growth reference rows.")
