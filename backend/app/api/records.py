from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.growth_reference import BiometricMetric, GrowthStandard
from app.schemas.trajectory import TrajectoryResponse
from app.services.growth_reference_seeder import DEFAULT_VERSION
from app.services.trajectory_service import get_pregnancy_trajectory

router = APIRouter()


@router.get(
    "/{record_id}/trajectory",
    response_model=TrajectoryResponse,
    status_code=status.HTTP_200_OK,
)
def get_record_trajectory(
    record_id: UUID,
    metric: BiometricMetric = Query("efw", description="Chỉ số sinh trắc (crl | bpd | hc | ac | fl | efw)"),
    standard: GrowthStandard = Query("intergrowth_21st", description="Chuẩn tham chiếu (intergrowth_21st | hadlock)"),
    version: str = Query(DEFAULT_VERSION, description="Phiên bản bảng tham chiếu LMS"),
    min_ga_days: Optional[int] = Query(None, ge=14, le=310),
    max_ga_days: Optional[int] = Query(None, ge=14, le=310),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin", "pregnant_woman"])),
):
    """
    Trả về chuỗi điểm đo sinh trắc theo tuổi thai, độ lệch Delta (so với P50 & lần khám trước),
    cảnh báo tụt > 20 bách phân vị, và đường cong chuẩn LMS (3rd, 10th, 50th, 90th, 97th).
    """
    if min_ga_days is not None and max_ga_days is not None and min_ga_days > max_ga_days:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_ga_days không được lớn hơn max_ga_days.",
        )

    try:
        profile, trajectory = get_pregnancy_trajectory(
            db=db,
            pregnancy_profile_id=record_id,
            metric=metric,
            standard=standard,
            version=version,
            min_ga_days=min_ga_days,
            max_ga_days=max_ga_days,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ thai kỳ.",
        ) from exc

    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem quỹ đạo tăng trưởng của hồ sơ này.",
        )

    return trajectory
