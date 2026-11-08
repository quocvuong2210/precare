# backend/app/api/ingest.py
import json
import uuid
from typing import Optional, List
import redis
from celery.result import AsyncResult
from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, status, Query
)
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, RoleChecker
from app.core.config import settings
from app.core.audit import log_audit_event
from app.models.user import User
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.services.storage_service import storage_service
from app.workers.tasks import process_ocr_task
from app.schemas.ingest import (
    UploadSingleResponse,
    BatchUploadResponse,
    BatchUploadItem,
    TaskStatusResponse,
    TaskStatusResponseData,
    BatchStatusResponse,
    BatchStatusResponseData,
    BatchStatusItem,
    FileDetailResponse,
    FileDetailResponseData,
    UploaderInfo,
    FileListResponse,
    FileListResponseData,
    UploadedFileSummary,
    PaginationMetadata,
    CommonMessageResponse
)

router = APIRouter()

# Kết nối Redis dùng lưu bộ đệm Batch Polling
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 Megabytes


def _validate_profile_access(profile: PregnancyProfile, current_user: User):
    """Xác thực người dùng có quyền thao tác với hồ sơ thai kỳ hay không"""
    if profile.is_deleted or profile.status == "terminated":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hồ sơ thai kỳ không tồn tại hoặc đã kết thúc/xóa."
        )
    if current_user.role == "pregnant_woman" and profile.patient_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền tải lên hoặc thao tác trên hồ sơ thai kỳ này."
        )


# 1. POST /api/v1/ingest/upload: Tải lên đơn lẻ phiếu khám
@router.post(
    "/upload",
    response_model=UploadSingleResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Tải lên đơn lẻ phiếu khám cận lâm sàng & sinh task Celery"
)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    pregnancy_profile_id: uuid.UUID = Form(...),
    checkup_id: Optional[uuid.UUID] = Form(None),
    document_type: str = Form("ultrasound_report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    # Validate MIME type
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Định dạng file không hợp lệ. Hệ thống chỉ chấp nhận PDF, JPEG hoặc PNG."
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Validate Dung lượng <= 20MB
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dung lượng file vượt quá giới hạn tối đa cho phép (20MB)."
        )

    profile = db.query(PregnancyProfile).filter(PregnancyProfile.id == pregnancy_profile_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hồ sơ thai kỳ.")

    _validate_profile_access(profile, current_user)

    file_uuid = uuid.uuid4()
    
    # Lưu file gốc vào Object Storage (MinIO/S3)
    storage_key = storage_service.upload_raw_file(
        file_bytes=file_bytes,
        patient_id=profile.patient_id,
        pregnancy_profile_id=profile.id,
        file_uuid=file_uuid,
        original_filename=file.filename,
        content_type=file.content_type
    )

    # Tạo bản ghi uploaded_files với status='pending'
    uploaded_file = UploadedFile(
        id=file_uuid,
        pregnancy_profile_id=profile.id,
        checkup_id=checkup_id,
        file_url=storage_key,
        file_type=file.content_type,
        file_name=file.filename,
        file_size_bytes=file_size,
        document_type=document_type,
        status="pending",
        uploaded_by=current_user.id
    )
    db.add(uploaded_file)
    db.commit()
    db.refresh(uploaded_file)

    # Sinh Task Celery đưa vào Redis Broker
    task = process_ocr_task.delay(str(uploaded_file.id))
    uploaded_file.celery_task_id = task.id
    db.commit()

    # Ghi nhận Audit Log
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="UPLOAD_PARACLINICAL_DOCUMENT",
        target_table="uploaded_files",
        target_id=uploaded_file.id,
        request=request
    )

    return {
        "success": True,
        "data": {
            "file_id": uploaded_file.id,
            "task_id": task.id,
            "pregnancy_profile_id": uploaded_file.pregnancy_profile_id,
            "checkup_id": uploaded_file.checkup_id,
            "file_name": uploaded_file.file_name,
            "file_type": uploaded_file.file_type,
            "file_size_bytes": uploaded_file.file_size_bytes,
            "document_type": uploaded_file.document_type,
            "status": uploaded_file.status,
            "tracking_url": f"/api/v1/ingest/tasks/{task.id}/status",
            "created_at": uploaded_file.created_at
        },
        "message": "Tải tài liệu lên thành công. Tác vụ trích xuất dữ liệu đang được xử lý trong hàng đợi ngầm."
    }


# 2. POST /api/v1/ingest/upload-batch: Tải lên hàng loạt nhiều phiếu khám
@router.post(
    "/upload-batch",
    response_model=BatchUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Tải lên hàng loạt nhiều phiếu khám (Batch Upload)"
)
async def upload_documents_batch(
    request: Request,
    files: List[UploadFile] = File(...),
    pregnancy_profile_id: uuid.UUID = Form(...),
    checkup_id: Optional[uuid.UUID] = Form(None),
    document_type: str = Form("ultrasound_report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    if len(files) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vui lòng chọn ít nhất 1 file.")
    if len(files) > 10:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mỗi đợt tải lên tối đa 10 files.")

    profile = db.query(PregnancyProfile).filter(PregnancyProfile.id == pregnancy_profile_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy hồ sơ thai kỳ.")

    _validate_profile_access(profile, current_user)

    batch_id = uuid.uuid4()
    items: List[BatchUploadItem] = []
    file_task_pairs = []

    for file in files:
        if file.content_type not in ALLOWED_MIME_TYPES:
            continue
        file_bytes = await file.read()
        file_size = len(file_bytes)
        if file_size > MAX_FILE_SIZE:
            continue

        file_uuid = uuid.uuid4()
        storage_key = storage_service.upload_raw_file(
            file_bytes=file_bytes,
            patient_id=profile.patient_id,
            pregnancy_profile_id=profile.id,
            file_uuid=file_uuid,
            original_filename=file.filename,
            content_type=file.content_type
        )

        uploaded_file = UploadedFile(
            id=file_uuid,
            pregnancy_profile_id=profile.id,
            checkup_id=checkup_id,
            file_url=storage_key,
            file_type=file.content_type,
            file_name=file.filename,
            file_size_bytes=file_size,
            document_type=document_type,
            status="pending",
            uploaded_by=current_user.id
        )
        db.add(uploaded_file)
        db.commit()
        db.refresh(uploaded_file)

        task = process_ocr_task.delay(str(uploaded_file.id))
        uploaded_file.celery_task_id = task.id
        db.commit()

        items.append(BatchUploadItem(
            file_id=uploaded_file.id,
            task_id=task.id,
            file_name=uploaded_file.file_name,
            file_size_bytes=uploaded_file.file_size_bytes,
            status=uploaded_file.status
        ))
        file_task_pairs.append({
            "file_id": str(uploaded_file.id),
            "file_name": uploaded_file.file_name,
            "task_id": task.id
        })

    # Cache thông tin batch vào Redis (hết hạn sau 24h) phục vụ Polling
    redis_client.setex(f"batch_upload:{batch_id}", 86400, json.dumps(file_task_pairs))

    return {
        "success": True,
        "data": {
            "batch_id": batch_id,
            "total_files": len(files),
            "successful_enqueued": len(items),
            "failed_enqueued": len(files) - len(items),
            "tracking_url": f"/api/v1/ingest/batches/{batch_id}/status",
            "items": items
        },
        "message": f"Đã tiếp nhận {len(items)}/{len(files)} tài liệu vào hàng đợi xử lý trích xuất ngầm."
    }


# 3. GET /api/v1/ingest/tasks/{task_id}/status: Polling tiến trình task đơn lẻ
@router.get(
    "/tasks/{task_id}/status",
    response_model=TaskStatusResponse,
    summary="Polling tiến trình tác vụ Celery đơn lẻ"
)
def get_task_status(task_id: str, db: Session = Depends(get_db)):
    task_res = AsyncResult(task_id)
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.celery_task_id == task_id).first()

    state = task_res.state
    progress_percentage = 0
    current_stage = "queued"
    stage_message = "Đang chờ worker tiếp nhận..."
    est_seconds = 10
    verification_url = None
    error_code = None
    can_retry = False

    if state == "PENDING":
        progress_percentage = 15
        current_stage = "queued"
        stage_message = "Tài liệu đang nằm trong hàng đợi Redis..."
    elif state == "PROCESSING" or state == "STARTED":
        info = task_res.info if isinstance(task_res.info, dict) else {}
        progress_percentage = info.get("progress_percentage", 50)
        current_stage = info.get("current_stage", "extracting_ocr_layout")
        stage_message = info.get("stage_message", "Đang phân tích bảng biểu và nhận dạng chỉ số...")
        est_seconds = info.get("estimated_seconds_remaining", 5)
    elif state == "SUCCESS":
        progress_percentage = 100
        current_stage = "completed"
        stage_message = "Trích xuất hoàn tất! Sẵn sàng cho bác sĩ đối chiếu và xác nhận."
        if uploaded_file:
            verification_url = f"/api/v1/verification/queue/{uploaded_file.id}"
    elif state in ["FAILURE", "REVOKED"]:
        progress_percentage = 100
        current_stage = "failed"
        stage_message = "Xử lý thất bại. Ảnh chụp quá mờ hoặc lỗi hệ thống bóc tách."
        error_code = "OCR_PROCESSING_FAILED"
        can_retry = True

    return {
        "success": True,
        "data": TaskStatusResponseData(
            task_id=task_id,
            file_id=uploaded_file.id if uploaded_file else None,
            state=state,
            progress_percentage=progress_percentage,
            current_stage=current_stage,
            stage_message=stage_message,
            estimated_seconds_remaining=est_seconds if state not in ["SUCCESS", "FAILURE"] else 0,
            verification_url=verification_url,
            error_code=error_code,
            can_retry=can_retry
        )
    }


# 4. GET /api/v1/ingest/batches/{batch_id}/status: Polling tiến trình toàn bộ đợt tải
@router.get(
    "/batches/{batch_id}/status",
    response_model=BatchStatusResponse,
    summary="Polling tiến trình tổng hợp của đợt tải hàng loạt"
)
def get_batch_status(batch_id: uuid.UUID, db: Session = Depends(get_db)):
    cached_data = redis_client.get(f"batch_upload:{batch_id}")
    if not cached_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mã đợt tải lên không tồn tại hoặc đã hết hạn.")

    file_task_pairs = json.loads(cached_data)
    total_files = len(file_task_pairs)
    completed_files = 0
    failed_files = 0
    total_progress = 0
    files_result: List[BatchStatusItem] = []

    for item in file_task_pairs:
        t_id = item["task_id"]
        task_res = AsyncResult(t_id)
        f_id = uuid.UUID(item["file_id"])
        db_file = db.query(UploadedFile).filter(UploadedFile.id == f_id).first()

        prog = 0
        state = task_res.state
        st = db_file.status if db_file else "pending"
        v_url = None

        if state == "SUCCESS":
            prog = 100
            completed_files += 1
            v_url = f"/api/v1/verification/queue/{f_id}"
        elif state in ["FAILURE", "REVOKED"]:
            prog = 100
            failed_files += 1
        elif state == "PROCESSING":
            info = task_res.info if isinstance(task_res.info, dict) else {}
            prog = info.get("progress_percentage", 50)
        else:
            prog = 20

        total_progress += prog
        files_result.append(BatchStatusItem(
            file_id=f_id,
            file_name=item["file_name"],
            state=state,
            progress_percentage=prog,
            status=st,
            verification_url=v_url
        ))

    overall_progress = int(total_progress / total_files) if total_files > 0 else 0
    is_finished = (completed_files + failed_files) == total_files

    return {
        "success": True,
        "data": BatchStatusResponseData(
            batch_id=batch_id,
            total_files=total_files,
            completed_files=completed_files,
            failed_files=failed_files,
            overall_progress_percentage=overall_progress,
            is_all_finished=is_finished,
            files=files_result
        )
    }


# 5. GET /api/v1/ingest/files/{file_id}: Chi tiết File & Presigned View URL
@router.get(
    "/files/{file_id}",
    response_model=FileDetailResponse,
    summary="Chi tiết file & lấy Presigned URL xem trước bản gốc"
)
def get_file_detail(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    db_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy file yêu cầu.")

    # Sinh Presigned URL từ MinIO (hết hạn sau 30 phút = 1800s)
    presigned_url = storage_service.generate_presigned_view_url(
        storage_key=db_file.file_url,
        expires_in_seconds=1800
    )

    uploader_info = None
    if db_file.uploader:
        uploader_info = UploaderInfo(
            id=db_file.uploader.id,
            full_name=db_file.uploader.full_name,
            role=db_file.uploader.role
        )

    return {
        "success": True,
        "data": FileDetailResponseData(
            id=db_file.id,
            pregnancy_profile_id=db_file.pregnancy_profile_id,
            checkup_id=db_file.checkup_id,
            file_name=db_file.file_name,
            file_type=db_file.file_type,
            file_size_bytes=db_file.file_size_bytes,
            document_type=db_file.document_type,
            status=db_file.status,
            presigned_view_url=presigned_url,
            presigned_url_expires_in_seconds=1800,
            uploaded_by=uploader_info,
            created_at=db_file.created_at
        )
    }


# 6. GET /api/v1/ingest/profiles/{profile_id}/files: Danh sách tài liệu của Thai Kỳ
@router.get(
    "/profiles/{profile_id}/files",
    response_model=FileListResponse,
    summary="Danh sách tài liệu đã tải lên của hồ sơ thai kỳ"
)
def list_profile_files(
    profile_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    document_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    query = db.query(UploadedFile).filter(UploadedFile.pregnancy_profile_id == profile_id)
    if status_filter:
        query = query.filter(UploadedFile.status == status_filter)
    if document_type:
        query = query.filter(UploadedFile.document_type == document_type)

    total_items = query.count()
    total_pages = (total_items + page_size - 1) // page_size if total_items > 0 else 1

    records = query.order_by(UploadedFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = [
        UploadedFileSummary(
            id=r.id,
            file_name=r.file_name,
            document_type=r.document_type,
            file_type=r.file_type,
            file_size_bytes=r.file_size_bytes,
            status=r.status,
            uploaded_by_name=r.uploader.full_name if r.uploader else None,
            created_at=r.created_at
        )
        for r in records
    ]

    return {
        "success": True,
        "data": FileListResponseData(
            items=items,
            pagination=PaginationMetadata(
                page=page,
                page_size=page_size,
                total_items=total_items,
                total_pages=total_pages
            )
        )
    }


# 7. DELETE /api/v1/ingest/files/{file_id}: Xóa tài liệu tải lên nhầm
@router.delete(
    "/files/{file_id}",
    response_model=CommonMessageResponse,
    summary="Xóa tài liệu tải lên nhầm (khi status là pending hoặc failed)"
)
def delete_uploaded_file(
    file_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    db_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy file để xóa.")

    if db_file.status not in ["pending", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ được phép xóa trực tiếp tài liệu khi ở trạng thái 'pending' hoặc 'failed'. Tài liệu đã xác thực phải qua luồng xóa bảo mật y tế."
        )

    # Xóa file vật lý trên MinIO
    storage_service.delete_file(db_file.file_url)

    # Ghi Audit Log trước khi xóa bản ghi
    log_audit_event(
        db=db,
        user_id=current_user.id,
        action="DELETE_PARACLINICAL_DOCUMENT",
        target_table="uploaded_files",
        target_id=db_file.id,
        request=request
    )

    db.delete(db_file)
    db.commit()

    return {
        "success": True,
        "message": "Đã xóa tài liệu và loại bỏ khỏi hàng đợi xử lý."
    }


# 8. POST /api/v1/ingest/files/{file_id}/retry: Thử lại tác vụ trích xuất bị failed
@router.post(
    "/files/{file_id}/retry",
    response_model=CommonMessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Thử lại quá trình trích xuất nếu task Celery bị failed"
)
def retry_failed_file(
    file_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["doctor", "pregnant_woman", "admin"]))
):
    db_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy file.")

    if db_file.status != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ có thể thử lại đối với các tài liệu có trạng thái 'failed'."
        )

    db_file.status = "pending"
    db_file.error_message = None
    db.commit()

    task = process_ocr_task.delay(str(db_file.id))
    db_file.celery_task_id = task.id
    db.commit()

    return {
        "success": True,
        "message": "Đã đưa tài liệu vào lại hàng đợi Celery để xử lý lại.",
        "data": {
            "file_id": db_file.id,
            "task_id": task.id,
            "tracking_url": f"/api/v1/ingest/tasks/{task.id}/status"
        }
    }