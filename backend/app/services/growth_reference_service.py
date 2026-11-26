"""
Domain service for LMS Z-score / percentile calculation and growth reference lookup.

Pure-Python implementation (no SciPy/NumPy/ML dependencies inside `backend/`).
"""

import math
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.growth_reference import GrowthReference
from app.services.growth_reference_seeder import DEFAULT_VERSION

_SQRT_2 = math.sqrt(2.0)


def normal_cdf(z_score: float) -> float:
    """Standard normal cumulative distribution function Phi(z) using math.erfc."""
    return 0.5 * math.erfc(-z_score / _SQRT_2)


def calculate_zscore_from_lms(
    value: float,
    l_val: float,
    m_val: float,
    s_val: float,
) -> float:
    """
    Compute Z-score from a measured biometric value and Cole's LMS parameters.

    - When L == 0 (log-normal): Z = ln(value / M) / S
    - When L != 0 (Box-Cox):    Z = ((value / M) ** L - 1) / (L * S)
    """
    if value <= 0 or m_val <= 0 or s_val <= 0:
        raise ValueError("value, m_val, and s_val must all be strictly positive.")

    ratio = value / m_val
    if abs(l_val) < 1e-9:
        return math.log(ratio) / s_val
    return ((ratio ** l_val) - 1.0) / (l_val * s_val)


def calculate_zscore_and_percentile(
    value: float,
    l_val: float,
    m_val: float,
    s_val: float,
) -> Tuple[float, float]:
    """Return (z_score, percentile) rounded to 2 decimal places."""
    z_score = calculate_zscore_from_lms(value, l_val, m_val, s_val)
    percentile = max(0.0, min(100.0, normal_cdf(z_score) * 100.0))
    return round(z_score, 2), round(percentile, 2)


def classify_percentile(percentile: float) -> str:
    """Classify a percentile into clinical fetal growth bands."""
    if percentile < 3.0:
        return "below_p3"
    if percentile < 10.0:
        return "p3_to_p10"
    if percentile > 97.0:
        return "above_p97"
    if percentile > 90.0:
        return "above_p90"
    return "normal"


def get_reference_point(
    db: Session,
    standard: str,
    metric: str,
    ga_days: int,
    version: str = DEFAULT_VERSION,
) -> Optional[GrowthReference]:
    """Fetch a single LMS reference point for (standard, metric, ga_days)."""
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


def list_reference_curve(
    db: Session,
    standard: str,
    metric: str,
    min_ga_days: Optional[int] = None,
    max_ga_days: Optional[int] = None,
    version: str = DEFAULT_VERSION,
) -> List[GrowthReference]:
    """Fetch ordered LMS reference curve points for (standard, metric)."""
    query = db.query(GrowthReference).filter(
        GrowthReference.standard == standard,
        GrowthReference.metric == metric,
        GrowthReference.version == version,
        GrowthReference.is_deleted.is_(False),
    )
    if min_ga_days is not None:
        query = query.filter(GrowthReference.ga_days >= min_ga_days)
    if max_ga_days is not None:
        query = query.filter(GrowthReference.ga_days <= max_ga_days)

    return query.order_by(GrowthReference.ga_days.asc()).all()


def evaluate_biometric_zscore(
    db: Session,
    standard: str,
    metric: str,
    ga_days: int,
    value: float,
    version: str = DEFAULT_VERSION,
) -> Optional[Dict[str, object]]:
    """
    Evaluate a measured biometric value against the stored LMS reference table.

    Returns None if no reference row exists for the requested (standard, metric, ga_days).
    """
    ref = get_reference_point(
        db=db,
        standard=standard,
        metric=metric,
        ga_days=ga_days,
        version=version,
    )
    if ref is None:
        return None

    z_score, percentile = calculate_zscore_and_percentile(
        value=value,
        l_val=float(ref.l_value),
        m_val=float(ref.m_value),
        s_val=float(ref.s_value),
    )
    return {
        "standard": ref.standard,
        "metric": ref.metric,
        "ga_days": ref.ga_days,
        "unit": ref.unit,
        "value": round(float(value), 4),
        "z_score": z_score,
        "percentile": percentile,
        "classification": classify_percentile(percentile),
        "reference": ref,
    }
