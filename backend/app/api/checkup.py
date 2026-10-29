from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, RoleChecker
from app.core.audit import log_audit_event
from app.models.user import User
from app.models.pregnancy_profile import PregnancyProfile
from app.models.checkup import Checkup
from app.models.biometric_data import BiometricData
from app.schemas.checkup import (
    CreateCheckupRequest,
    CheckupResponse,
    CheckupDetailData,
    DoctorSummary,
    GestationalAgeInfo,
    MaternalVitalsResponse,
    BiometricDataResponse
)

router = APIRouter()


def evaluate_blood_pressure(systolic: int | None, diastolic: int | None) -> str:
    """Đánh giá trạng thái huyết áp lâm sàng"""
    if systolic is None or diastolic is None:
        return "normal"
    if systolic >= 180 or diastolic >= 120:
        return "crisis"
    if systolic >= 140 or diastolic >= 90:
        return "stage1_hypertension"
    if (120 <= systolic <= 139) or (80 <= diastolic <= 89):
        return "elevated"
    return "normal"


def calculate_gestational_age_from_edd(edd: date, checkup_date: date) -> GestationalAgeInfo:
    """
    Tự động nội suy tuổi thai gt từ EDD theo chuẩn lâm sàng ACOG:
    gt = 280 - (EDD - checkup_date) (ngày)
    """
    days_until_edd = (edd - checkup_date).days
    gt_days = 280 - days_until_edd

    if gt_days < 0 or gt_days > 315:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tuổi thai tính toán ({gt_days} ngày) nằm ngoài giới hạn sinh lý cho phép (0 - 315 ngày)."
        )

    weeks = gt_days // 7
    remaining_days = gt_days % 7
    formatted = f"{weeks}w{remaining_days}d"

    if gt_days <= 97:
        trimester = 1
    elif gt_days <= 195:
        trimester = 2
    else:
        trimester = 3

    return GestationalAgeInfo(
        days=gt_days,
        weeks=weeks,
        remaining_days=remaining_days,
        formatted=formatted,
        trimester=trimester
    )


@router.post("", response_model=CheckupResponse, status_code=status.HTTP_201_CREATED)
def create_checkup(
    payload: CreateCheckupRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor"]))
):
    """
    Ghi nhận một lần khám thai mới (Visit) kèm các chỉ số sinh hiệu và sinh trắc học siêu âm.
    Chỉ dành cho Bác sĩ (Role: doctor). Tuổi thai gt được tính tự động từ EDD của thai kỳ.
    """
    # 1. Kiểm tra hồ sơ thai kỳ hợp lệ và chưa bị xóa
    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.id == payload.pregnancy_profile_id,
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy hồ sơ thai kỳ hoặc hồ sơ đã bị xóa."
        )

    # 2. Tự động tính tuổi thai gt
    ga_info = calculate_gestational_age_from_edd(profile.edd, payload.checkup_date)

    # 3. Tạo bản ghi checkup
    new_checkup = Checkup(
        pregnancy_profile_id=profile.id,
        doctor_id=current_user.id,
        checkup_date=payload.checkup_date,
        gestational_age_days=ga_info.days,
        weight_kg=Decimal(str(payload.weight_kg)) if payload.weight_kg is not None else None,
        blood_pressure_systolic=payload.blood_pressure_systolic,
        blood_pressure_diastolic=payload.blood_pressure_diastolic,
        notes=payload.notes
    )
    db.add(new_checkup)
    db.flush()  # Sinh ID cho checkup

    # 4. Lưu chỉ số sinh trắc học (nếu có)
    bio_response = None
    if payload.biometrics:
        b = payload.biometrics
        bio = BiometricData(
            pregnancy_profile_id=profile.id,
            checkup_id=new_checkup.id,
            gestational_age_days=ga_info.days,
            bpd=Decimal(str(b.bpd)) if b.bpd is not None else None,
            hc=Decimal(str(b.hc)) if b.hc is not None else None,
            ac=Decimal(str(b.ac)) if b.ac is not None else None,
            fl=Decimal(str(b.fl)) if b.fl is not None else None,
            efw=Decimal(str(b.efw)) if b.efw is not None else None,
            status="verified",
            verified_by=current_user.id
        )
        db.add(bio)
        db.flush()

        bio_response = BiometricDataResponse(
            id=bio.id,
            bpd=float(bio.bpd) if bio.bpd else None,
            hc=float(bio.hc) if bio.hc else None,
            ac=float(bio.ac) if bio.ac else None,
            fl=float(bio.fl) if bio.fl else None,
            efw=float(bio.efw) if bio.efw else None,
            status=bio.status
        )

    db.commit()
    db.refresh(new_checkup)

    # 5. Ghi vết kiểm toán (Audit Trail)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="CREATE_CHECKUP",
        target_table="checkups",
        target_id=new_checkup.id,
        request=request
    )

    bp_status = evaluate_blood_pressure(new_checkup.blood_pressure_systolic, new_checkup.blood_pressure_diastolic)

    return CheckupResponse(
        success=True,
        data=CheckupDetailData(
            id=new_checkup.id,
            pregnancy_profile_id=new_checkup.pregnancy_profile_id,
            doctor=DoctorSummary(id=current_user.id, full_name=current_user.full_name),
            checkup_date=new_checkup.checkup_date,
            gestational_age=ga_info,
            vitals=MaternalVitalsResponse(
                weight_kg=float(new_checkup.weight_kg) if new_checkup.weight_kg else None,
                blood_pressure_systolic=new_checkup.blood_pressure_systolic,
                blood_pressure_diastolic=new_checkup.blood_pressure_diastolic,
                blood_pressure_status=bp_status
            ),
            notes=new_checkup.notes,
            biometric_data=bio_response,
            created_at=new_checkup.created_at
        ),
        message="Ghi nhận lần khám thành công"
    )