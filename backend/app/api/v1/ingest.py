import uuid
import requests
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user, require_roles
from app.core.audit import log_audit_event
from app.models.models import UploadedFile, BiometricData, OCRCorrectionLog, AnalysisResult, Checkup, User
from app.schemas.schemas import IngestConfirmRequest, BiometricDataResponse
from app.workers.tasks import process_ocr_task

router = APIRouter(prefix="/ingest", tags=["Ingest & Confirmation Gate"])

@router.post("/upload")
def upload_paraclinical_file(
    pregnancy_profile_id: uuid.UUID = Form(...),
    checkup_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["doctor", "admin"]))
):
    """
    Tải tệp cận lâm sàng (ảnh/PDF siêu âm) lên hệ thống.
    File được lưu trữ và đẩy vào hàng đợi Celery để trích xuất OCR.
    Dữ liệu OCR CHƯA ĐƯỢC LƯU VÀO CSDL HỒ SƠ CHÍNH THỨC (Trạng thái: PENDING/EXTRACTED).
    """
    file_url = f"minio://precare-paraclinical-files/{pregnancy_profile_id}/{file.filename}"
    
    uploaded_file = UploadedFile(
        pregnancy_profile_id=pregnancy_profile_id,
        checkup_id=checkup_id,
        file_url=file_url,
        file_type=file.content_type or "image/png",
        status="pending",
        uploaded_by=current_user.id
    )
    db.add(uploaded_file)
    db.commit()
    db.refresh(uploaded_file)

    log_audit_event(db, current_user.id, "UPLOAD", "uploaded_files", uploaded_file.id, request)

    # Trigger Celery Worker background OCR parsing task
    task = process_ocr_task.delay(str(uploaded_file.id))

    return {
        "message": "File đã được tải lên thành công. Đang trích xuất OCR...",
        "uploaded_file_id": uploaded_file.id,
        "task_id": task.id,
        "status": "processing"
    }

@router.get("/review/{file_id}")
def get_ocr_review_data(
    file_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    MÀN HÌNH XÁC NHẬN (CONFIRMATION BARRIER):
    Lấy dữ liệu OCR thô để Bác sĩ đối chiếu ảnh/PDF và kiểm tra trước khi xác nhận.
    """
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="Không tìm thấy file tải lên")

    log_audit_event(db, current_user.id, "READ", "uploaded_files", uploaded_file.id, request)
    return {
        "uploaded_file_id": uploaded_file.id,
        "status": uploaded_file.status,
        "ocr_raw_payload": uploaded_file.ocr_raw_payload,
        "file_url": uploaded_file.file_url,
        "pregnancy_profile_id": uploaded_file.pregnancy_profile_id,
        "checkup_id": uploaded_file.checkup_id
    }

@router.post("/confirm", response_model=BiometricDataResponse)
def confirm_ingest_payload(
    req: IngestConfirmRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["doctor", "admin"]))
):
    """
    RÀNG BUỘC BẮT BUỘC: CONFIRMATION BARRIER GATE
    Ghi nhận kết quả sau khi Bác sĩ duyệt/sửa payload OCR thô.
    Chỉ khi qua endpoint này, dữ liệu mới được ghi chính thức vào bảng `biometric_data` (status: 'verified').
    """
    file_record = db.query(UploadedFile).filter(UploadedFile.id == req.uploaded_file_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="Không tìm thấy file OCR tương ứng")

    checkup = db.query(Checkup).filter(Checkup.id == req.checkup_id).first()
    if not checkup:
        raise HTTPException(status_code=404, detail="Không tìm thấy đợt khám (checkup_id)")

    # Record correction log if doctor updated OCR payload values
    if req.user_corrections or file_record.ocr_raw_payload:
        correction_log = OCRCorrectionLog(
            uploaded_file_id=file_record.id,
            user_id=current_user.id,
            original_payload=file_record.ocr_raw_payload or {},
            corrected_payload={
                "bpd": req.bpd, "hc": req.hc, "ac": req.ac, "fl": req.fl, "efw": req.efw,
                "corrections": req.user_corrections
            }
        )
        db.add(correction_log)

    # Official clinical record insertion
    biometric = BiometricData(
        pregnancy_profile_id=file_record.pregnancy_profile_id,
        checkup_id=checkup.id,
        uploaded_file_id=file_record.id,
        gestational_age_days=checkup.gestational_age_days,
        bpd=req.bpd,
        hc=req.hc,
        ac=req.ac,
        fl=req.fl,
        efw=req.efw,
        status="verified",
        verified_by=current_user.id
    )
    db.add(biometric)
    file_record.status = "verified"
    db.commit()
    db.refresh(biometric)

    log_audit_event(db, current_user.id, "CONFIRM", "biometric_data", biometric.id, request)

    # Automatically trigger analysis service proxy call
    try:
        payload = {
            "gestational_age_days": checkup.gestational_age_days,
            "bpd": float(req.bpd) if req.bpd else None,
            "hc": float(req.hc) if req.hc else None,
            "ac": float(req.ac) if req.ac else None,
            "fl": float(req.fl) if req.fl else None,
            "efw": float(req.efw) if req.efw else None
        }
        resp = requests.post(f"{settings.ANALYSIS_SERVICE_URL}/api/v1/predict", json=payload, timeout=5)
        if resp.status_code == 200:
            res_data = resp.json()
            analysis = AnalysisResult(
                pregnancy_profile_id=biometric.pregnancy_profile_id,
                checkup_id=biometric.checkup_id,
                biometric_data_id=biometric.id,
                model_version=res_data.get("model_version", "1.0.0"),
                rules_version=res_data.get("rules_version", "1.0.0"),
                bpd_zscore=res_data["rule_result"].get("bpd_zscore"),
                bpd_percentile=res_data["rule_result"].get("bpd_percentile"),
                hc_zscore=res_data["rule_result"].get("hc_zscore"),
                hc_percentile=res_data["rule_result"].get("hc_percentile"),
                ac_zscore=res_data["rule_result"].get("ac_zscore"),
                ac_percentile=res_data["rule_result"].get("ac_percentile"),
                fl_zscore=res_data["rule_result"].get("fl_zscore"),
                fl_percentile=res_data["rule_result"].get("fl_percentile"),
                efw_zscore=res_data["rule_result"].get("efw_zscore"),
                efw_percentile=res_data["rule_result"].get("efw_percentile"),
                anomaly_probability=res_data.get("anomaly_probability", 0.0),
                warning_level=res_data.get("final_warning_level", "green"),
                explanation_doctor=res_data.get("explanation_doctor", ""),
                explanation_patient=res_data.get("explanation_patient", ""),
                disclaimer_text=res_data.get("disclaimer_text", "")
            )
            db.add(analysis)
            db.commit()
    except Exception as e:
        print(f"[Warning] Call to Analysis Service failed: {e}. Fallback logic enabled.")

    return biometric
