import uuid
import time
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.models import UploadedFile

@celery_app.task(name="process_ocr_task")
def process_ocr_task(uploaded_file_id_str: str):
    db = SessionLocal()
    try:
        file_id = uuid.UUID(uploaded_file_id_str)
        uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
        if not uploaded_file:
            return {"status": "error", "message": "File not found"}

        uploaded_file.status = "processing"
        db.commit()

        # Simulate OCR layout extraction delay
        time.sleep(2)

        # Extracted mock OCR payload from paraclinical document
        mock_ocr_payload = {
            "document_type": "ultrasound_report",
            "extracted_fields": {
                "bpd_mm": 77.5,
                "hc_mm": 282.0,
                "ac_mm": 260.0,
                "fl_mm": 57.0,
                "efw_g": 1650.0
            },
            "raw_text": "SIÊU ÂM THAI 30 TUẦN - BPD: 77.5mm, HC: 282mm, AC: 260mm, FL: 57mm, EFW: 1650g. ĐỘ TIN CẬY OCR: 98.5%",
            "confidence_scores": {
                "bpd": 0.99,
                "hc": 0.98,
                "ac": 0.96,
                "fl": 0.99,
                "efw": 0.97
            }
        }

        uploaded_file.ocr_raw_payload = mock_ocr_payload
        uploaded_file.status = "extracted"  # Ready for Doctor Confirmation Barrier review!
        db.commit()

        return {"status": "success", "file_id": uploaded_file_id_str, "payload": mock_ocr_payload}
    except Exception as e:
        if uploaded_file:
            uploaded_file.status = "failed"
            db.commit()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
