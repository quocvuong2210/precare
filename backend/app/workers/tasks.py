# backend/app/workers/tasks.py
import logging
import time
import uuid

from app.core.database import SessionLocal
from app.models.user import User
from app.models.pregnancy_profile import PregnancyProfile
from app.models.checkup import Checkup
from app.models.biometric_data import BiometricData
from app.models.deletion_request import DeletionRequest
from app.models.uploaded_file import UploadedFile
from app.models.audit_log import AuditLog
from app.models.refresh_token import RefreshToken
from app.models.password_reset import PasswordReset
from app.services.ocr_extractor import ocr_extractor
from app.services.pdf_extractor import pdf_extractor
from app.services.storage_service import storage_service
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _safe_update_state(task, state: str, meta: dict):
    """Cập nhật trạng thái an toàn, tự động bỏ qua nếu không chạy trong request worker thực của Celery"""
    try:
        task.update_state(state=state, meta=meta)
    except Exception as e:
        logger.debug(f"[Worker] Bỏ qua update_state: {e}")


@celery_app.task(bind=True, name="process_ocr_task")
def process_ocr_task(self, uploaded_file_id_str: str):
    """
    Celery Task xử lý trích xuất tài liệu cận lâm sàng (Story 4.1 & Story 4.2).
    - Sub-task 4.2.1: Fast Path đọc trực tiếp text layer PDF (Digital PDF).
    - Sub-task 4.2.2: Fallback OCR Pipeline cho tài liệu ảnh / scan.
    """
    db = SessionLocal()
    uploaded_file = None
    try:
        file_id = uuid.UUID(uploaded_file_id_str)
        uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not uploaded_file:
            return {"status": "error", "message": "File not found"}

        # Giai đoạn 1: Worker tiếp nhận & phân tích cấu trúc (25%)
        uploaded_file.status = "processing"
        db.commit()

        _safe_update_state(
            self,
            state="PROCESSING",
            meta={
                "progress_percentage": 25,
                "current_stage": "reading_text_layer",
                "stage_message": "Đang phân tích cấu trúc trang và đọc text layer số hóa (Fast Path)...",
                "estimated_seconds_remaining": 4,
            },
        )

        # Tải dữ liệu nhị phân từ Object Storage (MinIO)
        try:
            file_bytes = storage_service.get_file_bytes(uploaded_file.file_url)
            if not file_bytes:
                raise ValueError("Nội dung file rỗng (0 bytes)")
        except Exception as err:
            logger.error(
                f"[Worker] Không thể tải file từ MinIO key '{uploaded_file.file_url}': {err}"
            )
            raise RuntimeError(f"Lỗi tải file từ MinIO: {err}") from err

        # Kiểm tra xem file có phải là PDF hay không
        is_pdf = (
            (uploaded_file.file_type == "application/pdf")
            or (uploaded_file.file_name and uploaded_file.file_name.lower().endswith(".pdf"))
            or (uploaded_file.file_url and uploaded_file.file_url.lower().endswith(".pdf"))
        )

        ocr_payload = None

        # =========================================================================
        # SUB-TASK 4.2.1: FAST PATH ĐỌC TRỰC TIẾP TEXT LAYER PDF
        # =========================================================================
        if is_pdf and file_bytes:
            fast_path_result = pdf_extractor.extract_pdf_fast_path(
                file_bytes=file_bytes, document_type=uploaded_file.document_type
            )

            # Nếu là Digital PDF có text layer hợp lệ
            if fast_path_result.get("is_digital_pdf"):
                _safe_update_state(
                    self,
                    state="PROCESSING",
                    meta={
                        "progress_percentage": 65,
                        "current_stage": "extracting_ocr_layout",
                        "stage_message": "Đã đọc thành công text layer số hóa. Đang chuẩn hóa cấu trúc chỉ số...",
                        "estimated_seconds_remaining": 1,
                    },
                )
                ocr_payload = fast_path_result

        # =========================================================================
        # SUB-TASK 4.2.2: SLOW PATH OCR PIPELINE CHO TÀI LIỆU ẢNH HOẶC SCANNED PDF
        # =========================================================================
        if not ocr_payload:
            _safe_update_state(
                self,
                state="PROCESSING",
                meta={
                    "progress_percentage": 35,
                    "current_stage": "preprocessing_image",
                    "stage_message": "Đang tiền xử lý ảnh và chuẩn hóa định dạng ảnh chụp/scan...",
                    "estimated_seconds_remaining": 6,
                },
            )

            _safe_update_state(
                self,
                state="PROCESSING",
                meta={
                    "progress_percentage": 65,
                    "current_stage": "running_ocr",
                    "stage_message": "Đang nhận dạng ký tự quang học qua PaddleOCR Engine (Slow Path)...",
                    "estimated_seconds_remaining": 3,
                },
            )

            if file_bytes:
                ocr_payload = ocr_extractor.extract_ocr_pipeline(
                    file_bytes=file_bytes,
                    file_type=uploaded_file.file_type or "image/jpeg",
                    document_type=uploaded_file.document_type,
                )
            else:
                raise ValueError("Không thể tải nội dung file từ Object Storage để thực thi OCR.")

            _safe_update_state(
                self,
                state="PROCESSING",
                meta={
                    "progress_percentage": 85,
                    "current_stage": "extracting_ocr_layout",
                    "stage_message": "Đã hoàn tất nhận dạng OCR. Đang bóc tách chỉ số sinh trắc học...",
                    "estimated_seconds_remaining": 1,
                },
            )

        # Giai đoạn 3: Hoàn tất trích xuất và cập nhật CSDL
        _safe_update_state(
            self,
            state="SUCCESS",
            meta={
                "progress_percentage": 100,
                "current_stage": "completed",
                "stage_message": "Trích xuất hoàn tất! Sẵn sàng cho bác sĩ đối chiếu và xác nhận.",
                "estimated_seconds_remaining": 0,
            },
        )
        uploaded_file.ocr_raw_payload = ocr_payload
        uploaded_file.status = "extracted"
        db.commit()

        return {
            "status": "success",
            "file_id": uploaded_file_id_str,
            "method": ocr_payload.get("extraction_method"),
            "payload": ocr_payload,
        }
    except Exception as e:
        logger.error(f"[Worker] Lỗi xử lý OCR task cho file '{uploaded_file_id_str}': {e}", exc_info=True)
        if uploaded_file:
            uploaded_file.status = "failed"
            uploaded_file.error_message = str(e)
            db.commit()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
