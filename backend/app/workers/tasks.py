# Đoạn thay đổi tại: backend/app/workers/tasks.py
import uuid
import time
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
# THAY ĐỔI: Sửa đường dẫn import Model chuẩn
from app.models.uploaded_file import UploadedFile

@celery_app.task(bind=True, name="process_ocr_task")
def process_ocr_task(self, uploaded_file_id_str: str):
    db = SessionLocal()
    uploaded_file = None
    try:
        file_id = uuid.UUID(uploaded_file_id_str)
        uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not uploaded_file:
            return {"status": "error", "message": "File not found"}

        # Giai đoạn 1: Worker tiếp nhận (25%)
        uploaded_file.status = "processing"
        db.commit()

        self.update_state(
            state="PROCESSING",
            meta={
                "progress_percentage": 25,
                "current_stage": "reading_text_layer",
                "stage_message": "Đang phân tích cấu trúc trang và lớp văn bản số hóa (Digital PDF)...",
                "estimated_seconds_remaining": 12
            }
        )
        time.sleep(1.5)

        # Giai đoạn 2: Bóc tách OCR Layout (65%)
        self.update_state(
            state="PROCESSING",
            meta={
                "progress_percentage": 65,
                "current_stage": "extracting_ocr_layout",
                "stage_message": "Đang phân tích bảng biểu và nhận dạng chỉ số sinh trắc học...",
                "estimated_seconds_remaining": 6
            }
        )
        time.sleep(2)

        # Kết quả bóc tách giả lập sẵn sàng cho Doctor Confirmation Barrier (Story 4.3)
        mock_ocr_payload = {
            "document_type": uploaded_file.document_type,
            "extracted_fields": {
                "bpd_mm": 77.5,
                "hc_mm": 282.0,
                "ac_mm": 260.0,
                "fl_mm": 57.0,
                "efw_g": 1650.0
            },
            "raw_text": "SIÊU ÂM THAI - BPD: 77.5mm, HC: 282mm, AC: 260mm, FL: 57mm, EFW: 1650g. ĐỘ TIN CẬY: 98.5%",
            "confidence_scores": {
                "bpd": 0.99,
                "hc": 0.98,
                "ac": 0.96,
                "fl": 0.99,
                "efw": 0.97
            }
        }

        # Giai đoạn 3: Hoàn tất trích xuất thô
        uploaded_file.ocr_raw_payload = mock_ocr_payload
        uploaded_file.status = "extracted"  # Trạng thái extracted theo đúng vòng đời Story-4.1
        db.commit()

        return {
            "status": "success",
            "file_id": uploaded_file_id_str,
            "payload": mock_ocr_payload
        }
    except Exception as e:
        if uploaded_file:
            uploaded_file.status = "failed"
            uploaded_file.error_message = str(e)
            db.commit()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()