from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.user import User
from app.schemas.analysis import (
    AnalysisHealthResponse,
    InternalAnalysisRequest,
    InternalAnalysisResponse,
)
from app.services.analysis_client import (
    check_analysis_service_health,
    evaluate_with_fallback,
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
    kèm cơ chế Rule-only Fallback (/api/v1/rules hoặc backend rule-only).
    """
    return evaluate_with_fallback(req=payload, db=db)


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
