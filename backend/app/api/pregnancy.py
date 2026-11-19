# backend/app/api/pregnancy.py
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker, get_current_user, get_db
from app.core.audit import log_audit_event
from app.models.pregnancy_profile import PregnancyProfile
from app.models.user import User
from app.schemas.pregnancy_profile import (
    ActivePregnancyProfileData,
    ActivePregnancyProfileResponse,
    CalculateGestationalAgeRequest,
    CalculateGestationalAgeResponse,
    CreatePregnancyProfileRequest,
    CreatePregnancyProfileResponse,
    DoctorSummary,
    EligiblePatientsResponse,
    PaginationMeta,
    PatientSummary,
    PregnancyProfileCreatedData,
    PregnancyProfileDetailData,
    PregnancyProfileDetailResponse,
    PregnancyProfileListContractData,
    PregnancyProfileListContractResponse,
    PregnancyProfileListItemContract,
    UpdatePregnancyProfileRequest,
    UpdatePregnancyProfileStatusRequest,
    UpdateStatusData,
    UpdateStatusResponse,
)
from app.services.pregnancy_calculator import (
    calculate_gestational_age_engine,
    calculate_pregnancy_dates,
    format_gestational_age,
)

router = APIRouter()


# ==============================================================================
# 1. POST /calculate - Utility Engine tính nháp tuổi thai gt & EDD (Preview)
# ==============================================================================
@router.post(
    "/calculate",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Utility Engine tính nháp tuổi thai gt & EDD"
)
def calculate_preview(payload: CalculateGestationalAgeRequest):
    """
    Endpoint stateless không lưu vào CSDL, dùng cho Frontend Web/Mobile hiển thị preview
    thời gian thực khi người dùng đang nhập hoặc thay đổi ngày.
    """
    try:
        result = calculate_gestational_age_engine(payload)
        return {
            "success": True,
            "data": result.model_dump()
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "CLINICAL_VALIDATION_ERROR", "message": str(e)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": f"Lỗi tính toán tuổi thai: {str(e)}"}
        )


# ==============================================================================
# 2. GET /active - Lấy Hồ sơ Đang Hoạt động
# ==============================================================================
@router.get(
    "/active",
    response_model=ActivePregnancyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy hồ sơ thai kỳ hiện tại đang hoạt động"
)
def get_active_pregnancy_profile(
    patient_id: Optional[UUID] = Query(None, description="ID thai phụ (bắt buộc nếu người gọi là Doctor)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman", "doctor"]))
):
    """
    Lấy hồ sơ thai kỳ active của thai phụ.
    - Với thai phụ (pregnant_woman): Tự động lấy hồ sơ của chính mình.
    - Với bác sĩ (doctor): Cần truyền query parameter `patient_id`.
    """
    if current_user.role == "pregnant_woman":
        target_patient_id = current_user.id
    else:
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "MISSING_PATIENT_ID", "message": "Bác sĩ cần cung cấp query parameter patient_id khi tra cứu hồ sơ active."}
            )
        target_patient_id = patient_id

    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.patient_id == target_patient_id,
        PregnancyProfile.status == "active",
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ACTIVE_PROFILE_NOT_FOUND", "message": "Thai phụ chưa có hồ sơ thai kỳ nào đang hoạt động."}
        )

    # Ghi audit log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="VIEW_PROFILE",
        target_table="pregnancy_profiles",
        target_id=profile.id,
        request=request
    )

    # Tính toán tuổi thai tại ngày hôm nay
    today = date.today()
    gt_days = 280 - (profile.edd - today).days
    ga_detail = format_gestational_age(gt_days, today, profile.edd)

    patient_summary = PatientSummary(
        id=profile.patient.id,
        full_name=profile.patient.full_name,
        email=profile.patient.email,
        phone_number=profile.patient.phone_number
    )

    doctor_summary = None
    if profile.primary_doctor:
        doctor_summary = DoctorSummary(
            id=profile.primary_doctor.id,
            full_name=profile.primary_doctor.full_name,
            email=profile.primary_doctor.email
        )

    return ActivePregnancyProfileResponse(
        success=True,
        data=ActivePregnancyProfileData(
            id=profile.id,
            patient=patient_summary,
            primary_doctor=doctor_summary,
            lmp=profile.lmp,
            q1_ultrasound_date=profile.q1_ultrasound_date,
            q1_gestational_weeks=profile.q1_gestational_weeks,
            q1_gestational_days=profile.q1_gestational_days,
            crl_mm=float(profile.crl_mm) if profile.crl_mm is not None else None,
            edd=profile.edd,
            status=profile.status,
            current_gestational_age=ga_detail,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )
    )


# ==============================================================================
# 3. POST / - Khởi tạo Hồ sơ Thai kỳ Mới
# ==============================================================================
@router.post(
    "",
    response_model=CreatePregnancyProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Khởi tạo hồ sơ thai kỳ ban đầu"
)
def create_pregnancy_profile(
    payload: CreatePregnancyProfileRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman", "doctor"]))
):
    """
    Khởi tạo một hồ sơ thai kỳ mới.
    - Với thai phụ (pregnant_woman): Tự động lấy patient_id từ token để tránh IDOR.
    - Với bác sĩ (doctor): patient_id lấy từ payload.
    - Kiểm tra nếu thai phụ đã có hồ sơ active thì từ chối (400 Bad Request).
    """
    if current_user.role == "pregnant_woman":
        target_patient_id = current_user.id
        primary_doc_id = payload.primary_doctor_id
    else:
        if not payload.patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "MISSING_PATIENT_ID", "message": "Bác sĩ cần cung cấp patient_id của thai phụ."}
            )
        patient_exists = db.query(User).filter(User.id == payload.patient_id).first()
        if not patient_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PATIENT_NOT_FOUND", "message": "Không tìm thấy thông tin bệnh nhân thai phụ."}
            )
        target_patient_id = payload.patient_id
        primary_doc_id = payload.primary_doctor_id or current_user.id

    # Kiểm tra xem thai phụ đã có hồ sơ active nào chưa
    existing_active = db.query(PregnancyProfile).filter(
        PregnancyProfile.patient_id == target_patient_id,
        PregnancyProfile.status == "active",
        PregnancyProfile.is_deleted == False
    ).first()

    if existing_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ACTIVE_PROFILE_EXISTS",
                "message": "Thai phụ đã có hồ sơ thai kỳ đang hoạt động. Vui lòng đóng hồ sơ cũ trước khi tạo mới."
            }
        )

    # Tính toán ngày dự sinh EDD và tuổi thai hiện tại theo clinical rules
    today = date.today()
    try:
        edd, ga_days, method, note = calculate_pregnancy_dates(
            target_date=today,
            lmp=payload.lmp,
            q1_ultrasound_date=payload.q1_ultrasound_date,
            q1_gestational_weeks=payload.q1_gestational_weeks,
            q1_gestational_days=payload.q1_gestational_days,
            crl_mm=payload.crl_mm,
            override_edd=payload.override_edd
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "CLINICAL_VALIDATION_ERROR", "message": str(e)}
        )

    # Tạo bản ghi pregnancy_profiles
    new_profile = PregnancyProfile(
        patient_id=target_patient_id,
        primary_doctor_id=primary_doc_id,
        lmp=payload.lmp,
        q1_ultrasound_date=payload.q1_ultrasound_date,
        q1_gestational_weeks=payload.q1_gestational_weeks,
        q1_gestational_days=payload.q1_gestational_days,
        crl_mm=payload.crl_mm,
        edd=edd,
        status="active"
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    # Ghi audit log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="CREATE_PROFILE",
        target_table="pregnancy_profiles",
        target_id=new_profile.id,
        request=request
    )

    ga_detail = format_gestational_age(ga_days, today, edd)

    return CreatePregnancyProfileResponse(
        success=True,
        data=PregnancyProfileCreatedData(
            id=new_profile.id,
            patient_id=new_profile.patient_id,
            primary_doctor_id=new_profile.primary_doctor_id,
            lmp=new_profile.lmp,
            q1_ultrasound_date=new_profile.q1_ultrasound_date,
            q1_gestational_weeks=new_profile.q1_gestational_weeks,
            q1_gestational_days=new_profile.q1_gestational_days,
            crl_mm=float(new_profile.crl_mm) if new_profile.crl_mm is not None else None,
            edd=new_profile.edd,
            status=new_profile.status,
            current_gestational_age=ga_detail,
            created_at=new_profile.created_at,
            updated_at=new_profile.updated_at
        ),
        message="Khởi tạo hồ sơ thai kỳ thành công"
    )


# ==============================================================================
# 4. GET / - Danh sách Hồ sơ Thai kỳ (Bác sĩ & Quản trị viên)
# ==============================================================================
@router.get(
    "",
    response_model=PregnancyProfileListContractResponse,
    status_code=status.HTTP_200_OK,
    summary="Danh sách hồ sơ thai kỳ (phân trang, tìm kiếm)"
)
def list_pregnancy_profiles(
    page: int = Query(1, ge=1, description="Số trang (mặc định: 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Số bản ghi mỗi trang (mặc định: 20, max: 100)"),
    status: Optional[str] = Query(None, pattern="^(active|completed|terminated)$", description="Lọc theo trạng thái"),
    search: Optional[str] = Query(None, description="Tìm theo họ tên hoặc số điện thoại thai phụ"),
    doctor_id: Optional[UUID] = Query(None, description="Lọc theo ID bác sĩ phụ trách"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"]))
):
    """
    Lấy danh sách hồ sơ thai kỳ có phân trang và bộ lọc dành cho Bác sĩ và Quản trị viên.
    """
    query = db.query(PregnancyProfile).join(
        User, PregnancyProfile.patient_id == User.id
    ).filter(
        PregnancyProfile.is_deleted == False
    )

    if status:
        query = query.filter(PregnancyProfile.status == status)

    if doctor_id:
        query = query.filter(PregnancyProfile.primary_doctor_id == doctor_id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_filter),
                User.phone_number.ilike(search_filter)
            )
        )

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 0

    profiles = (
        query.order_by(PregnancyProfile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    today = date.today()
    items = []
    for p in profiles:
        gt_days = 280 - (p.edd - today).days
        ga_detail = format_gestational_age(gt_days, today, p.edd)
        items.append(
            PregnancyProfileListItemContract(
                id=p.id,
                patient_id=p.patient_id,
                patient_name=p.patient.full_name if p.patient else "",
                patient_phone=p.patient.phone_number if p.patient else None,
                primary_doctor_name=p.primary_doctor.full_name if p.primary_doctor else None,
                edd=p.edd,
                status=p.status,
                current_gestational_age_formatted=ga_detail.formatted,
                created_at=p.created_at
            )
        )

    return PregnancyProfileListContractResponse(
        success=True,
        data=PregnancyProfileListContractData(
            items=items,
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages
            )
        )
    )


# ==============================================================================
# 4.1. GET /eligible-patients - Lấy Danh sách Thai phụ Chưa có Hồ sơ Active
# ==============================================================================
@router.get(
    "/eligible-patients",
    response_model=EligiblePatientsResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy danh sách thai phụ chưa có hồ sơ hoạt động (dành cho Bác sĩ)"
)
def get_eligible_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"]))
):
    """
    Truy vấn bảng users để lấy danh sách tài khoản thai phụ (role='pregnant_woman')
    chưa có hồ sơ thai kỳ active trong hệ thống.
    """
    active_patient_ids = (
        db.query(PregnancyProfile.patient_id)
        .filter(
            PregnancyProfile.status == "active",
            PregnancyProfile.is_deleted == False
        )
        .scalar_subquery()
    )

    eligible_users = db.query(User).filter(
        User.role == "pregnant_woman",
        ~User.id.in_(active_patient_ids)
    ).order_by(User.full_name.asc()).all()

    patient_summaries = [
        PatientSummary(
            id=u.id,
            full_name=u.full_name,
            phone_number=u.phone_number,
            email=u.email
        )
        for u in eligible_users
    ]

    return EligiblePatientsResponse(
        success=True,
        total=len(patient_summaries),
        data=patient_summaries,
        message="Lấy danh sách thai phụ chưa có hồ sơ thành công"
    )


# ==============================================================================
# 5. GET /{profile_id} - Lấy Chi tiết Hồ sơ theo ID
# ==============================================================================
@router.get(
    "/{profile_id}",
    response_model=PregnancyProfileDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Lấy chi tiết hồ sơ thai kỳ theo ID"
)
def get_pregnancy_profile_detail(
    profile_id: UUID,
    target_date: Optional[date] = Query(None, description="Ngày tính tuổi thai (mặc định hôm nay)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman", "doctor", "admin"]))
):
    """
    Lấy chi tiết một hồ sơ thai kỳ kèm tuổi thai tính toán tại ngày target_date.
    Thai phụ chỉ có quyền xem hồ sơ của chính mình.
    """
    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.id == profile_id,
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_NOT_FOUND", "message": "Không tìm thấy hồ sơ thai kỳ hoặc hồ sơ đã bị xóa."}
        )

    # Kiểm tra quyền sở hữu đối với thai phụ
    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "PERMISSION_DENIED", "message": "Bạn không có quyền truy cập hồ sơ thai kỳ này."}
        )

    # Ghi audit log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="VIEW_PROFILE",
        target_table="pregnancy_profiles",
        target_id=profile.id,
        request=request
    )

    calc_date = target_date or date.today()
    gt_days = 280 - (profile.edd - calc_date).days
    ga_detail = format_gestational_age(gt_days, calc_date, profile.edd)

    patient_summary = PatientSummary(
        id=profile.patient.id,
        full_name=profile.patient.full_name,
        email=profile.patient.email,
        phone_number=profile.patient.phone_number
    )

    doctor_summary = None
    if profile.primary_doctor:
        doctor_summary = DoctorSummary(
            id=profile.primary_doctor.id,
            full_name=profile.primary_doctor.full_name,
            email=profile.primary_doctor.email
        )

    return PregnancyProfileDetailResponse(
        success=True,
        data=PregnancyProfileDetailData(
            id=profile.id,
            patient=patient_summary,
            primary_doctor=doctor_summary,
            lmp=profile.lmp,
            q1_ultrasound_date=profile.q1_ultrasound_date,
            q1_gestational_weeks=profile.q1_gestational_weeks,
            q1_gestational_days=profile.q1_gestational_days,
            crl_mm=float(profile.crl_mm) if profile.crl_mm is not None else None,
            edd=profile.edd,
            status=profile.status,
            target_date=calc_date,
            current_gestational_age=ga_detail,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        ),
        message="Lấy chi tiết hồ sơ thai kỳ thành công"
    )


# ==============================================================================
# 6. PUT /{profile_id} - Chỉnh sửa Hồ sơ Ban đầu & Tính lại EDD
# ==============================================================================
@router.put(
    "/{profile_id}",
    response_model=CreatePregnancyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Chỉnh sửa hồ sơ thai kỳ ban đầu & tính lại EDD"
)
def update_pregnancy_profile(
    profile_id: UUID,
    payload: UpdatePregnancyProfileRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman", "doctor"]))
):
    """
    Cập nhật các thông số đầu kỳ của hồ sơ thai kỳ.
    Khi `recalculate_edd = True`, hệ thống áp dụng lại bộ quy tắc lâm sàng ACOG để tính toán lại EDD.
    """
    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.id == profile_id,
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_NOT_FOUND", "message": "Không tìm thấy hồ sơ thai kỳ hoặc hồ sơ đã bị xóa."}
        )

    # Thai phụ chỉ được sửa hồ sơ của chính mình
    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "PERMISSION_DENIED", "message": "Bạn không có quyền chỉnh sửa hồ sơ này."}
        )

    # Cập nhật thông tin lâm sàng nếu được gửi lên
    if payload.primary_doctor_id is not None:
        profile.primary_doctor_id = payload.primary_doctor_id

    if payload.lmp is not None:
        profile.lmp = payload.lmp

    if payload.q1_ultrasound_date is not None:
        profile.q1_ultrasound_date = payload.q1_ultrasound_date

    if payload.q1_gestational_weeks is not None:
        profile.q1_gestational_weeks = payload.q1_gestational_weeks

    if payload.q1_gestational_days is not None:
        profile.q1_gestational_days = payload.q1_gestational_days

    if payload.crl_mm is not None:
        profile.crl_mm = payload.crl_mm

    # Xử lý cập nhật EDD
    today = date.today()
    if payload.override_edd is not None:
        profile.edd = payload.override_edd
    elif payload.recalculate_edd:
        try:
            new_edd, _, _, _ = calculate_pregnancy_dates(
                target_date=today,
                lmp=profile.lmp,
                q1_ultrasound_date=profile.q1_ultrasound_date,
                q1_gestational_weeks=profile.q1_gestational_weeks,
                q1_gestational_days=profile.q1_gestational_days,
                crl_mm=profile.crl_mm
            )
            profile.edd = new_edd
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "CLINICAL_VALIDATION_ERROR", "message": str(e)}
            )

    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    # Ghi audit log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="UPDATE_PROFILE",
        target_table="pregnancy_profiles",
        target_id=profile.id,
        request=request
    )

    gt_days = 280 - (profile.edd - today).days
    ga_detail = format_gestational_age(gt_days, today, profile.edd)

    return CreatePregnancyProfileResponse(
        success=True,
        data=PregnancyProfileCreatedData(
            id=profile.id,
            patient_id=profile.patient_id,
            primary_doctor_id=profile.primary_doctor_id,
            lmp=profile.lmp,
            q1_ultrasound_date=profile.q1_ultrasound_date,
            q1_gestational_weeks=profile.q1_gestational_weeks,
            q1_gestational_days=profile.q1_gestational_days,
            crl_mm=float(profile.crl_mm) if profile.crl_mm is not None else None,
            edd=profile.edd,
            status=profile.status,
            current_gestational_age=ga_detail,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        ),
        message="Cập nhật hồ sơ thai kỳ thành công"
    )


# ==============================================================================
# 7. PATCH /{profile_id}/status - Cập nhật Trạng thái Hồ sơ
# ==============================================================================
@router.patch(
    "/{profile_id}/status",
    response_model=UpdateStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Cập nhật trạng thái hồ sơ thai kỳ"
)
def update_pregnancy_profile_status(
    profile_id: UUID,
    payload: UpdatePregnancyProfileStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman", "doctor"]))
):
    """
    Chuyển trạng thái hồ sơ thai kỳ: active, completed, terminated.
    Nếu chuyển sang active, đảm bảo thai phụ không có hồ sơ active nào khác.
    """
    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.id == profile_id,
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROFILE_NOT_FOUND", "message": "Không tìm thấy hồ sơ thai kỳ hoặc hồ sơ đã bị xóa."}
        )

    # Thai phụ chỉ được thao tác trên hồ sơ của chính mình
    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "PERMISSION_DENIED", "message": "Bạn không có quyền chuyển trạng thái hồ sơ này."}
        )

    # Nếu kích hoạt trạng thái active, kiểm tra xem đã có hồ sơ active nào khác chưa
    if payload.status == "active" and profile.status != "active":
        other_active = db.query(PregnancyProfile).filter(
            PregnancyProfile.patient_id == profile.patient_id,
            PregnancyProfile.status == "active",
            PregnancyProfile.id != profile.id,
            PregnancyProfile.is_deleted == False
        ).first()

        if other_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "ACTIVE_PROFILE_EXISTS",
                    "message": "Thai phụ đã có hồ sơ thai kỳ khác đang hoạt động. Vui lòng đóng hồ sơ đó trước khi kích hoạt lại hồ sơ này."
                }
            )

    profile.status = payload.status
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)

    # Ghi audit log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="CHANGE_STATUS",
        target_table="pregnancy_profiles",
        target_id=profile.id,
        request=request
    )

    return UpdateStatusResponse(
        success=True,
        data=UpdateStatusData(
            id=profile.id,
            status=profile.status,
            updated_at=profile.updated_at
        ),
        message="Cập nhật trạng thái hồ sơ thành công"
    )
