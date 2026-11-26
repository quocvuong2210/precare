from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_db
from app.models.pregnancy_profile import PregnancyProfile
from app.models.user import User
from app.schemas.clinical_rule import (
    ClinicalRuleEvaluateRequest,
    ClinicalRuleEvaluateResponse,
)
from app.services.clinical_rule_engine import (
    evaluate_and_save_biometric_rules,
    list_profile_analysis_results,
)

router = APIRouter()


@router.post(
    "/evaluate",
    response_model=ClinicalRuleEvaluateResponse,
    status_code=status.HTTP_201_CREATED,
)
def evaluate_biometric_rules(
    payload: ClinicalRuleEvaluateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"])),
):
    """Đánh giá cờ đỏ 3 mức (green/yellow/red) cho bản ghi sinh trắc và lưu kết quả kèm rules_version."""
    try:
        record, flags = evaluate_and_save_biometric_rules(
            db=db,
            biometric_data_id=payload.biometric_data_id,
            standard=payload.standard,
            nt_mm=payload.nt_mm,
            afi_cm=payload.afi_cm,
            previous_efw_percentile=payload.previous_efw_percentile,
        )
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    response = ClinicalRuleEvaluateResponse.model_validate(record)
    response.flags = flags
    return response


@router.get(
    "/pregnancy-profile/{pregnancy_profile_id}",
    response_model=List[ClinicalRuleEvaluateResponse],
)
def get_profile_rule_evaluations(
    pregnancy_profile_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin", "pregnant_woman"])),
):
    """Lấy danh sách kết quả đánh giá lâm sàng đã lưu theo hồ sơ thai kỳ."""
    profile = (
        db.query(PregnancyProfile)
        .filter(
            PregnancyProfile.id == pregnancy_profile_id,
            PregnancyProfile.is_deleted.is_(False),
        )
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ thai kỳ.",
        )

    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xem kết quả đánh giá của hồ sơ này.",
        )

    return list_profile_analysis_results(db=db, pregnancy_profile_id=pregnancy_profile_id)
