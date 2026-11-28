"""
Trajectory Service (PRC-74):
Computes chronological fetal biometric measurement series, sequential & median
Delta deviations, >20 percentile trajectory-drop alerts, and LMS reference curves.
"""

from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.analysis_result import AnalysisResult
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.pregnancy_profile import PregnancyProfile
from app.schemas.growth_reference import BiometricMetric, GrowthStandard
from app.schemas.trajectory import (
    TrajectoryPoint,
    TrajectoryResponse,
    TrajectorySummary,
)
from app.services.growth_reference_seeder import DEFAULT_VERSION
from app.services.growth_reference_service import (
    evaluate_biometric_zscore,
    list_reference_curve,
)

_METRIC_DEFAULT_UNITS: Dict[str, str] = {
    "efw": "g",
    "bpd": "mm",
    "hc": "mm",
    "ac": "mm",
    "fl": "mm",
    "crl": "mm",
}


def _format_ga(ga_days: int) -> str:
    return f"{ga_days // 7}w {ga_days % 7}d"


def _evaluate_point_against_lms(
    db: Session,
    standard: GrowthStandard,
    metric: BiometricMetric,
    ga_days: int,
    value: float,
    version: str,
) -> Optional[Dict[str, object]]:
    res = evaluate_biometric_zscore(
        db=db,
        standard=standard,
        metric=metric,
        ga_days=ga_days,
        value=value,
        version=version,
    )
    if res is not None:
        return res
    fallback_std = "hadlock" if standard == "intergrowth_21st" else "intergrowth_21st"
    return evaluate_biometric_zscore(
        db=db,
        standard=fallback_std,
        metric=metric,
        ga_days=ga_days,
        value=value,
        version=version,
    )


def get_pregnancy_trajectory(
    db: Session,
    pregnancy_profile_id: UUID,
    *,
    metric: BiometricMetric = "efw",
    standard: GrowthStandard = "intergrowth_21st",
    version: str = DEFAULT_VERSION,
    min_ga_days: Optional[int] = None,
    max_ga_days: Optional[int] = None,
) -> Tuple[PregnancyProfile, TrajectoryResponse]:
    """
    Build longitudinal trajectory points with Delta deviations and LMS reference curves
    for a given `pregnancy_profile_id` and biometric `metric`.
    """
    profile = (
        db.query(PregnancyProfile)
        .filter(
            PregnancyProfile.id == pregnancy_profile_id,
            PregnancyProfile.is_deleted.is_(False),
        )
        .first()
    )
    if profile is None:
        raise LookupError(f"PregnancyProfile {pregnancy_profile_id} not found.")

    rows = (
        db.query(BiometricData, Checkup.checkup_date)
        .join(Checkup, BiometricData.checkup_id == Checkup.id)
        .filter(
            BiometricData.pregnancy_profile_id == pregnancy_profile_id,
            BiometricData.is_deleted.is_(False),
            Checkup.is_deleted.is_(False),
        )
        .order_by(
            BiometricData.gestational_age_days.asc(),
            Checkup.checkup_date.asc(),
            BiometricData.created_at.asc(),
        )
        .all()
    )

    # Latest warning_level per biometric_data_id (if already analyzed)
    analysis_rows = (
        db.query(AnalysisResult)
        .filter(AnalysisResult.pregnancy_profile_id == pregnancy_profile_id)
        .order_by(AnalysisResult.analyzed_at.desc())
        .all()
    )
    warning_by_bio_id: Dict[UUID, str] = {}
    for ar in analysis_rows:
        if ar.biometric_data_id not in warning_by_bio_id:
            warning_by_bio_id[ar.biometric_data_id] = ar.warning_level

    lms_curve = list_reference_curve(
        db=db,
        standard=standard,
        metric=metric,
        min_ga_days=min_ga_days,
        max_ga_days=max_ga_days,
        version=version,
    )
    unit = lms_curve[0].unit if lms_curve else _METRIC_DEFAULT_UNITS.get(metric, "mm")

    measurements: List[TrajectoryPoint] = []
    prev_point: Optional[TrajectoryPoint] = None

    for bio, checkup_date in rows:
        raw_val = getattr(bio, metric, None)
        if raw_val is None:
            continue
        ga_days = int(bio.gestational_age_days)
        if min_ga_days is not None and ga_days < min_ga_days:
            continue
        if max_ga_days is not None and ga_days > max_ga_days:
            continue

        val = float(raw_val)
        eval_res = _evaluate_point_against_lms(
            db=db,
            standard=standard,
            metric=metric,
            ga_days=ga_days,
            value=val,
            version=version,
        )

        z_score: Optional[float] = None
        percentile: Optional[float] = None
        classification: Optional[str] = None
        delta_from_median: Optional[float] = None
        delta_from_median_pct: Optional[float] = None

        if eval_res is not None:
            z_score = float(eval_res["z_score"])  # type: ignore[arg-type]
            percentile = float(eval_res["percentile"])  # type: ignore[arg-type]
            classification = str(eval_res["classification"])
            ref = eval_res["reference"]
            median_m = float(getattr(ref, "m_value", 0.0) or 0.0)
            if median_m > 0:
                delta_from_median = round(val - median_m, 2)
                delta_from_median_pct = round(((val - median_m) / median_m) * 100.0, 2)

        delta_value_from_prev: Optional[float] = None
        delta_ga_days_from_prev: Optional[int] = None
        growth_velocity_per_week: Optional[float] = None
        delta_percentile_from_prev: Optional[float] = None
        is_drop_alert = False

        if prev_point is not None:
            delta_value_from_prev = round(val - prev_point.value, 2)
            delta_ga_days_from_prev = ga_days - prev_point.ga_days
            if delta_ga_days_from_prev > 0:
                growth_velocity_per_week = round(
                    (delta_value_from_prev / delta_ga_days_from_prev) * 7.0,
                    2,
                )
            if percentile is not None and prev_point.percentile is not None:
                delta_percentile_from_prev = round(percentile - prev_point.percentile, 2)
                is_drop_alert = delta_percentile_from_prev < -20.0

        point = TrajectoryPoint(
            biometric_data_id=bio.id,
            checkup_id=bio.checkup_id,
            checkup_date=checkup_date,
            ga_days=ga_days,
            ga_formatted=_format_ga(ga_days),
            value=round(val, 2),
            z_score=z_score,
            percentile=percentile,
            classification=classification,
            warning_level=warning_by_bio_id.get(bio.id),
            delta_from_median=delta_from_median,
            delta_from_median_pct=delta_from_median_pct,
            delta_value_from_prev=delta_value_from_prev,
            delta_ga_days_from_prev=delta_ga_days_from_prev,
            growth_velocity_per_week=growth_velocity_per_week,
            delta_percentile_from_prev=delta_percentile_from_prev,
            is_trajectory_drop_alert=is_drop_alert,
        )
        measurements.append(point)
        prev_point = point

    if measurements:
        first_pt = measurements[0]
        last_pt = measurements[-1]
        overall_delta_value = (
            round(last_pt.value - first_pt.value, 2) if len(measurements) >= 2 else 0.0
        )
        overall_delta_percentile = (
            round(last_pt.percentile - first_pt.percentile, 2)
            if len(measurements) >= 2
            and last_pt.percentile is not None
            and first_pt.percentile is not None
            else (0.0 if len(measurements) == 1 and last_pt.percentile is not None else None)
        )
        summary = TrajectorySummary(
            total_points=len(measurements),
            latest_ga_days=last_pt.ga_days,
            latest_value=last_pt.value,
            latest_percentile=last_pt.percentile,
            latest_z_score=last_pt.z_score,
            overall_delta_value=overall_delta_value,
            overall_delta_percentile=overall_delta_percentile,
            has_trajectory_drop_alert=any(m.is_trajectory_drop_alert for m in measurements),
        )
    else:
        summary = TrajectorySummary()

    response = TrajectoryResponse(
        pregnancy_profile_id=profile.id,
        patient_id=profile.patient_id,
        metric=metric,
        standard=standard,
        unit=unit,
        lms_version=version,
        measurements=measurements,
        summary=summary,
        lms_curve=lms_curve,
    )
    return profile, response
