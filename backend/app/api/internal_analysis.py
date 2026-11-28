from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.analysis import (
    AnalysisHealthResponse,
    AnalysisTraceabilityResponse,
    InternalAnalysisRequest,
    InternalAnalysisResponse,
    L5FuseAndSaveRequest,
    WarningLevel,
)
from app.services.analysis_client import (
    check_analysis_service_health,
    evaluate_with_fallback,
)
from app.services.safety_fusion_service import (
    fuse_and_save_analysis_result,
    list_analysis_results_by_version,
)

router = APIRouter()


@router.post(
    "/evaluate",
    response_model=InternalAnalysisResponse,
    status_code=status.HTTP_200_OK,
)
def evaluate_internal_analysis(
    payload: InternalAnalysisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"])),
):
    """
    Internal REST API kết nối Analysis Service (/api/v1/predict)
    kèm cơ chế Rule-only Fallback và tầng L5 Safety Fusion max(rule, model).
    """
    return evaluate_with_fallback(req=payload, db=db)


@router.post(
    "/fuse-and-save",
    response_model=AnalysisTraceabilityResponse,
    status_code=status.HTTP_201_CREATED,
)
def fuse_and_save_l5_analysis(
    payload: L5FuseAndSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"])),
):
    """
    Tầng L5: Kết hợp cảnh báo max(rule, model) và lưu kết quả vào `analysis_results`
    kèm truy vết đầy đủ `model_version` và `rules_version`.
    """
    try:
        record, _, _ = fuse_and_save_analysis_result(
            db=db,
            biometric_data_id=payload.biometric_data_id,
            standard=payload.standard,
            nt_mm=payload.nt_mm,
            afi_cm=payload.afi_cm,
            previous_efw_percentile=payload.previous_efw_percentile,
            model_warning_level=payload.model_warning_level,
            model_anomaly_probability=payload.model_anomaly_probability,
            model_version=payload.model_version,
            rules_version=payload.rules_version,
            fallback_mode=payload.fallback_mode,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return record


@router.get(
    "/traceability",
    response_model=List[AnalysisTraceabilityResponse],
    status_code=status.HTTP_200_OK,
)
def list_analysis_version_traceability(
    pregnancy_profile_id: Optional[UUID] = Query(None),
    model_version: Optional[str] = Query(None, max_length=100),
    rules_version: Optional[str] = Query(None, max_length=100),
    warning_level: Optional[WarningLevel] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"])),
):
    """
    Truy vết lịch sử kết quả phân tích theo `model_version`, `rules_version`,
    `pregnancy_profile_id` hoặc `warning_level`.
    """
    return list_analysis_results_by_version(
        db=db,
        pregnancy_profile_id=pregnancy_profile_id,
        model_version=model_version,
        rules_version=rules_version,
        warning_level=warning_level,
        limit=limit,
    )


@router.get(
    "/health",
    response_model=AnalysisHealthResponse,
    status_code=status.HTTP_200_OK,
)
def get_analysis_service_health(
    current_user: User = Depends(RoleChecker(["doctor", "admin"])),
):
    """Kiểm tra trạng thái kết nối tới Analysis Service."""
    return check_analysis_service_health()
