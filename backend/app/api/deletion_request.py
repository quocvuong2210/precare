from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, RoleChecker
from app.core.audit import log_audit_event
from app.models.user import User
from app.models.pregnancy_profile import PregnancyProfile
from app.models.checkup import Checkup
from app.models.biometric_data import BiometricData
from app.models.deletion_request import DeletionRequest
from app.schemas.deletion_request import (
    CreateDeletionRequestPayload,
    DeletionRequestCreateResponse,
    DeletionRequestCreatedData,
    ReviewDeletionPayload,
    ReviewDeletionResponse,
    ReviewDeletionData,
    ReviewerSummary,
    DeletionRequestListItem
)

router = APIRouter()


@router.post("", response_model=DeletionRequestCreateResponse, status_code=status.HTTP_201_CREATED)
def submit_deletion_request(
    payload: CreateDeletionRequestPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["pregnant_woman"]))
):
    """
    Thai phụ gửi yêu cầu xóa hồ sơ thai kỳ hoặc một lần khám theo chuẩn bảo mật y tế.
    Hồ sơ sau khi gửi yêu cầu sẽ chuyển sang trạng thái pending chờ bác sĩ phụ trách chính hoặc Admin duyệt.
    """
    # 1. Xác thực hồ sơ tồn tại và chính chủ
    profile = db.query(PregnancyProfile).filter(
        PregnancyProfile.id == payload.pregnancy_profile_id,
        PregnancyProfile.is_deleted == False
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ thai kỳ không tồn tại hoặc đã bị xóa."
        )

    if profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền yêu cầu xóa hồ sơ của người khác."
        )

    # 2. Nếu xóa 1 lần khám, kiểm tra lần khám có thuộc hồ sơ này không
    if payload.target_type == "single_checkup":
        checkup = db.query(Checkup).filter(
            Checkup.id == payload.checkup_id,
            Checkup.pregnancy_profile_id == profile.id,
            Checkup.is_deleted == False
        ).first()
        if not checkup:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lần khám được chỉ định không tồn tại trong hồ sơ này."
            )

    # 3. Kiểm tra xem đã có yêu cầu pending nào cho đối tượng này chưa
    existing_pending = db.query(DeletionRequest).filter(
        DeletionRequest.pregnancy_profile_id == profile.id,
        DeletionRequest.checkup_id == payload.checkup_id,
        DeletionRequest.status == "pending"
    ).first()

    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Yêu cầu xóa cho đối tượng này đang trong quá trình chờ xét duyệt."
        )

    # 4. Tạo bản ghi deletion_request
    del_req = DeletionRequest(
        requester_id=current_user.id,
        pregnancy_profile_id=profile.id,
        checkup_id=payload.checkup_id,
        target_type=payload.target_type,
        reason=payload.reason,
        allow_anonymized_research=payload.allow_anonymized_research,
        status="pending"
    )
    db.add(del_req)
    db.commit()
    db.refresh(del_req)

    # 5. Ghi vết kiểm toán (Audit Trail)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="REQUEST_MEDICAL_DELETION",
        target_table="deletion_requests",
        target_id=del_req.id,
        request=request
    )

    return DeletionRequestCreateResponse(
        success=True,
        data=DeletionRequestCreatedData(
            request_id=del_req.id,
            target_type=del_req.target_type,
            allow_anonymized_research=del_req.allow_anonymized_research,
            status=del_req.status,
            created_at=del_req.created_at
        ),
        message="Yêu cầu xóa hồ sơ đã được tiếp nhận và chuyển đến Bác sĩ phụ trách chính/Quản trị viên xét duyệt theo quy định bảo mật dữ liệu y tế."
    )


@router.get("", response_model=List[DeletionRequestListItem])
def list_deletion_requests(
    status_filter: Optional[str] = Query(None, alias="status", regex="^(pending|approved|rejected)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"]))
):
    """
    Xem danh sách yêu cầu xóa hồ sơ:
    - Bác sĩ chỉ xem các yêu cầu thuộc hồ sơ do mình phụ trách chính (primary_doctor_id).
    - Quản trị viên (admin) xem được toàn bộ.
    """
    query = db.query(DeletionRequest).join(PregnancyProfile, DeletionRequest.pregnancy_profile_id == PregnancyProfile.id)

    if current_user.role == "doctor":
        query = query.filter(PregnancyProfile.primary_doctor_id == current_user.id)

    if status_filter:
        query = query.filter(DeletionRequest.status == status_filter)

    requests = query.order_by(DeletionRequest.created_at.desc()).all()

    results = []
    for r in requests:
        results.append(
            DeletionRequestListItem(
                id=r.id,
                requester_id=r.requester_id,
                requester_name=r.requester.full_name if r.requester else "N/A",
                pregnancy_profile_id=r.pregnancy_profile_id,
                checkup_id=r.checkup_id,
                target_type=r.target_type,
                reason=r.reason,
                allow_anonymized_research=r.allow_anonymized_research,
                status=r.status,
                created_at=r.created_at,
                reviewed_by_name=r.reviewer.full_name if r.reviewer else None,
                reviewed_at=r.reviewed_at,
                review_notes=r.review_notes
            )
        )
    return results


@router.patch("/{request_id}/review", response_model=ReviewDeletionResponse)
def review_deletion_request(
    request_id: UUID,
    payload: ReviewDeletionPayload,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "admin"]))
):
    """
    Phê duyệt hoặc từ chối yêu cầu xóa hồ sơ.
    RBAC: Chỉ Quản trị viên HOẶC Bác sĩ phụ trách chính của hồ sơ thai kỳ đó mới có quyền thực hiện.
    """
    del_req = db.query(DeletionRequest).filter(DeletionRequest.id == request_id).first()
    if not del_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy yêu cầu xóa hồ sơ."
        )

    if del_req.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Yêu cầu này đã được xử lý trước đó với trạng thái: {del_req.status}."
        )

    profile = db.query(PregnancyProfile).filter(PregnancyProfile.id == del_req.pregnancy_profile_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hồ sơ thai kỳ không tồn tại.")

    # Kiểm tra quyền: Nếu là doctor, bắt buộc phải là primary_doctor_id của hồ sơ
    if current_user.role == "doctor" and profile.primary_doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ bác sĩ phụ trách chính của hồ sơ thai kỳ hoặc quản trị viên mới có thẩm quyền phê duyệt yêu cầu xóa này"
        )

    now = datetime.utcnow()
    del_req.status = payload.status
    del_req.reviewed_by = current_user.id
    del_req.reviewed_at = now
    del_req.review_notes = payload.review_notes

    if payload.status == "approved":
        # 1. Xử lý đồng thuận NCKH (Patient Consent)
        if del_req.allow_anonymized_research:
            del_req.is_anonymized = True
            del_req.is_purged_from_research = False
        else:
            del_req.is_anonymized = False
            del_req.is_purged_from_research = True

        # 2. Thực hiện Soft-delete theo phạm vi target_type
        if del_req.target_type == "full_profile":
            profile.is_deleted = True
            profile.deleted_at = now
            profile.is_anonymized = del_req.is_anonymized
            profile.is_purged_from_research = del_req.is_purged_from_research

            # Soft-delete toàn bộ checkups và biometric_data liên quan
            db.query(Checkup).filter(Checkup.pregnancy_profile_id == profile.id).update(
                {"is_deleted": True, "deleted_at": now}, synchronize_session=False
            )
            db.query(BiometricData).filter(BiometricData.pregnancy_profile_id == profile.id).update(
                {"is_deleted": True, "deleted_at": now}, synchronize_session=False
            )

        elif del_req.target_type == "single_checkup" and del_req.checkup_id:
            # Soft-delete lần khám cụ thể
            db.query(Checkup).filter(Checkup.id == del_req.checkup_id).update(
                {"is_deleted": True, "deleted_at": now}, synchronize_session=False
            )
            db.query(BiometricData).filter(BiometricData.checkup_id == del_req.checkup_id).update(
                {"is_deleted": True, "deleted_at": now}, synchronize_session=False
            )

        action_name = "APPROVE_MEDICAL_DELETION"
        message = "Đã phê duyệt yêu cầu xóa hồ sơ y tế thành công. Dữ liệu đã được xử lý xóa mềm và cách ly khỏi mô hình nghiên cứu theo đúng chỉ định."

    else:
        action_name = "REJECT_MEDICAL_DELETION"
        message = "Đã từ chối yêu cầu xóa hồ sơ y tế."

    db.commit()
    db.refresh(del_req)

    # 3. Ghi vết kiểm toán (Audit Trail)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action=action_name,
        target_table="deletion_requests",
        target_id=del_req.id,
        request=request
    )

    return ReviewDeletionResponse(
        success=True,
        data=ReviewDeletionData(
            request_id=del_req.id,
            status=del_req.status,
            reviewed_by=ReviewerSummary(
                id=current_user.id,
                full_name=current_user.full_name,
                role=current_user.role
            ),
            is_anonymized=del_req.is_anonymized,
            is_purged_from_research=del_req.is_purged_from_research,
            reviewed_at=del_req.reviewed_at
        ),
        message=message
    )