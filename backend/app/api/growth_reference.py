from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.growth_reference import (
    BiometricMetric,
    GrowthReferenceCurveResponse,
    GrowthReferenceItemResponse,
    GrowthStandard,
    ZScoreEvaluateRequest,
    ZScoreEvaluateResponse,
)
from app.services.growth_reference_seeder import DEFAULT_VERSION
from app.services.growth_reference_service import (
    evaluate_biometric_zscore,
    get_reference_point,
    list_reference_curve,
)

router = APIRouter()


@router.get("/point", response_model=GrowthReferenceItemResponse)
def get_growth_reference_point(
    standard: GrowthStandard = Query(..., description="Chuẩn tham chiếu (intergrowth_21st | hadlock)"),
    metric: BiometricMetric = Query(..., description="Chỉ số sinh trắc (crl | bpd | hc | ac | fl | efw)"),
    ga_days: int = Query(..., ge=14, le=310, description="Tuổi thai tính bằng tổng số ngày"),
    version: str = Query(DEFAULT_VERSION, description="Phiên bản bảng tham chiếu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tra cứu thông số LMS và 5 mốc bách phân vị (3rd, 10th, 50th, 90th, 97th) tại một ngày tuổi thai."""
    ref = get_reference_point(
        db=db,
        standard=standard,
        metric=metric,
        ga_days=ga_days,
        version=version,
    )
    if ref is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy dữ liệu tham chiếu cho {standard}/{metric} tại {ga_days} ngày tuổi thai.",
        )
    return ref


@router.get("/curves", response_model=GrowthReferenceCurveResponse)
def get_growth_reference_curve(
    standard: GrowthStandard = Query(..., description="Chuẩn tham chiếu (intergrowth_21st | hadlock)"),
    metric: BiometricMetric = Query(..., description="Chỉ số sinh trắc (crl | bpd | hc | ac | fl | efw)"),
    min_ga_days: Optional[int] = Query(None, ge=14, le=310),
    max_ga_days: Optional[int] = Query(None, ge=14, le=310),
    version: str = Query(DEFAULT_VERSION, description="Phiên bản bảng tham chiếu"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tra cứu chuỗi đường cong tham chiếu LMS (3rd, 10th, 50th, 90th, 97th) theo khoảng tuổi thai."""
    if min_ga_days is not None and max_ga_days is not None and min_ga_days > max_ga_days:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_ga_days không được lớn hơn max_ga_days.",
        )

    points = list_reference_curve(
        db=db,
        standard=standard,
        metric=metric,
        min_ga_days=min_ga_days,
        max_ga_days=max_ga_days,
        version=version,
    )
    if not points:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đường cong tham chiếu cho {standard}/{metric}.",
        )

    return GrowthReferenceCurveResponse(
        standard=standard,
        metric=metric,
        unit=points[0].unit,
        version=version,
        points=points,
    )


@router.post("/evaluate", response_model=ZScoreEvaluateResponse)
def evaluate_measurement(
    payload: ZScoreEvaluateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tính Z-score, Percentile và phân loại lâm sàng từ giá trị đo siêu âm theo bảng LMS."""
    result = evaluate_biometric_zscore(
        db=db,
        standard=payload.standard,
        metric=payload.metric,
        ga_days=payload.ga_days,
        value=payload.value,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Không tìm thấy dữ liệu tham chiếu cho {payload.standard}/{payload.metric} "
                f"tại {payload.ga_days} ngày tuổi thai."
            ),
        )
    return result
