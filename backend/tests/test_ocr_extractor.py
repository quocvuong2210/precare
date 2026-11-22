# backend/tests/test_ocr_extractor.py
import io
import time
import uuid
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy import create_engine
from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models.audit_log import AuditLog
from app.models.biometric_data import BiometricData
from app.models.checkup import Checkup
from app.models.deletion_request import DeletionRequest
from app.models.pregnancy_profile import PregnancyProfile
from app.models.uploaded_file import UploadedFile
from app.models.user import User
from app.services.ocr_extractor import ocr_extractor
from app.services.pdf_extractor import pdf_extractor
from app.workers.tasks import process_ocr_task

# Hỗ trợ JSONB trên SQLite memory
if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
    SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"


def create_sample_ultrasound_image_bytes() -> bytes:
    """Tạo file ảnh PNG giả lập một phiếu siêu âm thai"""
    img = Image.new("RGB", (800, 600), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf.getvalue()


def create_scanned_pdf_with_embedded_image() -> bytes:
    """Tạo một Scanned PDF không có text layer số hóa mà nhúng một ảnh quét toàn trang"""
    img_bytes = create_sample_ultrasound_image_bytes()
    img_stream = io.BytesIO(img_bytes)

    pdf_buf = io.BytesIO()
    c = canvas.Canvas(pdf_buf, pagesize=letter)
    # Nhúng ảnh vào trang PDF (không vẽ chuỗi văn bản nào để text layer rỗng)
    from reportlab.lib.utils import ImageReader
    reader = ImageReader(img_stream)
    c.drawImage(reader, 50, 50, width=500, height=700)
    c.showPage()
    c.save()

    pdf_buf.seek(0)
    return pdf_buf.getvalue()


class MockPaddleOcrEngine:
    """Mock PaddleOCR Engine trả về các bounding box mô phỏng phiếu siêu âm thai chuẩn"""

    def ocr(self, img_input, cls=True):
        # Format chuẩn trả về từ PaddleOCR: [ [ [box, (text, conf)], ... ] ]
        return [[
            [[[50, 30], [250, 30], [250, 50], [50, 50]], ("PHÒNG KHÁM SẢN PRECARE", 0.99)],
            [[[50, 70], [300, 70], [300, 90], [50, 90]], ("PHIẾU KẾT QUẢ SIÊU ÂM THAI", 0.99)],
            [[[50, 110], [280, 110], [280, 130], [50, 130]], ("Đường kính lưỡng đỉnh (BPD): 82.0 mm", 0.98)],
            [[[50, 140], [260, 140], [260, 160], [50, 160]], ("Chu vi vòng đầu (HC): 290.0 mm", 0.97)],
            [[[50, 170], [260, 170], [260, 190], [50, 190]], ("Chu vi vòng bụng (AC): 270.0 mm", 0.96)],
            [[[50, 200], [270, 200], [270, 220], [50, 220]], ("Chiều dài xương đùi (FL): 60.0 mm", 0.98)],
            [[[50, 230], [260, 230], [260, 250], [50, 250]], ("Cân nặng ước tính (EFW): 1850 g", 0.98)],
            [[[50, 260], [220, 260], [220, 280], [50, 280]], ("Chỉ số nước ối (AFI): 13.5 cm", 0.96)],
            [[[50, 290], [200, 290], [200, 310], [50, 310]], ("Nhịp tim thai (FHR): 146 bpm", 0.99)],
            [[[50, 320], [250, 320], [250, 340], [50, 340]], ("Tuổi thai siêu âm: 31 tuần 4 ngày", 0.97)],
        ]]


@pytest.fixture(autouse=True)
def setup_mock_ocr_engine():
    """Tự động inject MockPaddleOcrEngine cho các bài kiểm thử"""
    original_engine = ocr_extractor._custom_engine
    ocr_extractor.set_ocr_engine(MockPaddleOcrEngine())
    yield
    ocr_extractor.set_ocr_engine(original_engine)


def test_preprocess_image_rgb_and_resize():
    """Kiểm tra chức năng tiền xử lý ảnh (chuyển đổi RGB và scale kích thước)"""
    # Tạo ảnh RGBA kích thước nhỏ (300 x 200)
    tiny_rgba = Image.new("RGBA", (300, 200), color=(255, 0, 0, 128))
    processed = ocr_extractor.preprocess_image(tiny_rgba)

    assert processed.mode == "RGB"
    # Min dimension phải được upscale lên tối thiểu 600
    assert min(processed.size) >= 600


def test_extract_images_from_scanned_pdf():
    """Kiểm tra khả năng trích xuất ảnh nhúng từ Scanned PDF"""
    pdf_bytes = create_scanned_pdf_with_embedded_image()
    extracted_imgs = ocr_extractor.extract_images_from_scanned_pdf(pdf_bytes)

    assert len(extracted_imgs) >= 1
    assert isinstance(extracted_imgs[0], Image.Image)


def test_sort_and_reconstruct_text():
    """Kiểm tra thuật toán sắp xếp hộp chữ theo thứ tự đọc tự nhiên"""
    # Xáo trộn thứ tự các hộp chữ
    unordered_boxes = [
        [[[150, 50], [250, 50], [250, 70], [150, 70]], ("HC: 290mm", 0.97)],
        [[[10, 10], [100, 10], [100, 30], [10, 30]], ("PHÒNG KHÁM", 0.99)],
        [[[110, 10], [200, 10], [200, 30], [110, 30]], ("PRECARE", 0.99)],
        [[[10, 50], [120, 50], [120, 70], [10, 70]], ("BPD: 82mm", 0.98)],
    ]

    reconstructed_text, avg_conf = ocr_extractor.sort_and_reconstruct_text(unordered_boxes)

    lines = reconstructed_text.split("\n")
    assert len(lines) == 2
    assert "PHÒNG KHÁM PRECARE" in lines[0]
    assert "BPD: 82mm HC: 290mm" in lines[1]
    assert avg_conf >= 0.97


def test_extract_ocr_pipeline_direct_image():
    """Kiểm tra toàn bộ luồng extract_ocr_pipeline trên file ảnh PNG"""
    img_bytes = create_sample_ultrasound_image_bytes()
    result = ocr_extractor.extract_ocr_pipeline(
        file_bytes=img_bytes,
        file_type="image/png",
        document_type="ultrasound_report"
    )

    assert result["document_type"] == "ultrasound_report"
    assert result["extraction_method"] == "ocr_pipeline_slow_path"
    assert result["is_digital_pdf"] is False

    fields = result["extracted_fields"]
    assert fields["bpd_mm"] == 82.0
    assert fields["hc_mm"] == 290.0
    assert fields["ac_mm"] == 270.0
    assert fields["fl_mm"] == 60.0
    assert fields["efw_g"] == 1850.0
    assert fields["afi_cm"] == 13.5
    assert fields["fhr_bpm"] == 146
    assert fields["gestational_age_days"] == (31 * 7 + 4)  # 221 ngày

    assert result["confidence_scores"]["bpd"] >= 0.85
    assert result["confidence_scores"]["efw"] >= 0.85
    assert result["metadata"]["ocr_engine"] == "PaddleOCR"
    assert result["metadata"]["is_digital_pdf"] is False


def test_process_ocr_task_image_slow_path_integration():
    """Kiểm tra tích hợp Celery Worker khi nhận tài liệu ảnh (Slow Path)"""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    user = User(
        id=uuid.uuid4(),
        email="pregnant_ocr_patient@example.com",
        password_hash="hashed_pw",
        full_name="Lê Thị Mai",
        role="pregnant_woman"
    )
    db.add(user)
    db.commit()

    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=user.id,
        edd=date(2027, 4, 15),
        status="active"
    )
    db.add(profile)
    db.commit()

    img_bytes = create_sample_ultrasound_image_bytes()

    uploaded_file = UploadedFile(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        file_url=f"paraclinical-documents/ultrasound_{uuid.uuid4().hex}.png",
        file_type="image/png",
        file_name="sieu_am_tuan_31.png",
        document_type="ultrasound_report",
        status="pending"
    )
    db.add(uploaded_file)
    db.commit()

    target_file_id = uploaded_file.id

    with patch.object(process_ocr_task, "update_state") as mock_update_state:
        with patch("app.workers.tasks.SessionLocal", return_value=db):
            with patch("app.workers.tasks.storage_service.get_file_bytes", return_value=img_bytes):
                result = process_ocr_task.run(str(target_file_id))

    assert result["status"] == "success"
    assert result["method"] == "ocr_pipeline_slow_path"
    assert mock_update_state.called

    # Kiểm tra bản ghi trong DB sau khi worker chạy xong
    verify_db = TestingSession()
    file_record = verify_db.query(UploadedFile).filter_by(id=target_file_id).first()
    assert file_record is not None
    assert file_record.status == "extracted"
    assert file_record.ocr_raw_payload is not None
    assert file_record.ocr_raw_payload["is_digital_pdf"] is False
    assert file_record.ocr_raw_payload["extraction_method"] == "ocr_pipeline_slow_path"
    assert file_record.ocr_raw_payload["extracted_fields"]["bpd_mm"] == 82.0
    assert file_record.ocr_raw_payload["extracted_fields"]["efw_g"] == 1850.0
    assert file_record.ocr_raw_payload["extracted_fields"]["gestational_age_days"] == 221
    verify_db.close()


def test_process_ocr_task_scanned_pdf_slow_path_integration():
    """Kiểm tra tích hợp Celery Worker khi nhận Scanned PDF (tự động rẽ nhánh sang Slow Path)"""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    user = User(
        id=uuid.uuid4(),
        email="scanned_pdf_patient@example.com",
        password_hash="hashed_pw",
        full_name="Võ Thị Lan",
        role="pregnant_woman"
    )
    db.add(user)
    db.commit()

    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=user.id,
        edd=date(2027, 5, 20),
        status="active"
    )
    db.add(profile)
    db.commit()

    scanned_pdf_bytes = create_scanned_pdf_with_embedded_image()

    # Xác nhận trước: PDF này không phải là Digital PDF vì không có text layer
    is_digital, _, _ = pdf_extractor.is_digital_pdf(scanned_pdf_bytes)
    assert is_digital is False

    uploaded_file = UploadedFile(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        file_url=f"paraclinical-documents/scan_{uuid.uuid4().hex}.pdf",
        file_type="application/pdf",
        file_name="phieu_scan_vien_san.pdf",
        document_type="ultrasound_report",
        status="pending"
    )
    db.add(uploaded_file)
    db.commit()

    target_file_id = uploaded_file.id

    with patch.object(process_ocr_task, "update_state") as mock_update_state:
        with patch("app.workers.tasks.SessionLocal", return_value=db):
            with patch("app.workers.tasks.storage_service.get_file_bytes", return_value=scanned_pdf_bytes):
                result = process_ocr_task.run(str(target_file_id))

    assert result["status"] == "success"
    assert result["method"] == "ocr_pipeline_slow_path"

    # Kiểm tra bản ghi trong DB
    verify_db = TestingSession()
    file_record = verify_db.query(UploadedFile).filter_by(id=target_file_id).first()
    assert file_record is not None
    assert file_record.status == "extracted"
    assert file_record.ocr_raw_payload["is_digital_pdf"] is False
    assert file_record.ocr_raw_payload["extraction_method"] == "ocr_pipeline_slow_path"
    assert file_record.ocr_raw_payload["extracted_fields"]["bpd_mm"] == 82.0
    verify_db.close()


def test_process_ocr_task_error_handling_on_failure():
    """Kiểm tra xử lý ngoại lệ an toàn: khi xảy ra sự cố worker ghi nhận status='failed'"""
    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    uploaded_file = UploadedFile(
        id=uuid.uuid4(),
        pregnancy_profile_id=uuid.uuid4(),
        file_url="paraclinical-documents/corrupted_file.png",
        file_type="image/png",
        file_name="corrupted.png",
        document_type="ultrasound_report",
        status="pending"
    )
    db.add(uploaded_file)
    db.commit()

    target_file_id = uploaded_file.id

    # Giả lập lỗi khi đọc file từ Object Storage
    with patch("app.workers.tasks.SessionLocal", return_value=db):
        with patch("app.workers.tasks.storage_service.get_file_bytes", side_effect=Exception("MinIO Connection Timeout")):
            result = process_ocr_task.run(str(target_file_id))

    assert result["status"] == "error"

    verify_db = TestingSession()
    file_record = verify_db.query(UploadedFile).filter_by(id=target_file_id).first()
    assert file_record.status == "failed"
    assert "MinIO Connection Timeout" in file_record.error_message
    verify_db.close()


def test_get_task_status_api_endpoint_resilience():
    """Kiểm tra endpoint get_task_status hoạt động trơn tru, không bị lỗi DisabledBackend 500"""
    from app.api.ingest import get_task_status

    test_engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    task_uuid = str(uuid.uuid4())
    uploaded_file = UploadedFile(
        id=uuid.uuid4(),
        pregnancy_profile_id=uuid.uuid4(),
        file_url="paraclinical-documents/sample.png",
        file_type="image/png",
        file_name="sample.png",
        document_type="ultrasound_report",
        status="processing",
        celery_task_id=task_uuid
    )
    db.add(uploaded_file)
    db.commit()

    # 1. Giả lập Celery AsyncResult trả về state PROCESSING
    mock_async_result = MagicMock()
    mock_async_result.state = "PROCESSING"
    mock_async_result.info = {
        "progress_percentage": 65,
        "current_stage": "running_ocr",
        "stage_message": "Đang nhận dạng ký tự quang học qua PaddleOCR Engine (Slow Path)...",
        "estimated_seconds_remaining": 3,
    }

    with patch("app.api.ingest.AsyncResult", return_value=mock_async_result):
        resp = get_task_status(task_uuid, db=db)

    assert resp["success"] is True
    assert resp["data"].state == "PROCESSING"
    assert resp["data"].progress_percentage == 65
    assert resp["data"].current_stage == "running_ocr"
    assert "PaddleOCR" in resp["data"].stage_message

    # 2. Giả lập trường hợp Celery backend bị lỗi/DisabledBackend: endpoint vẫn an toàn fallback về DB
    with patch("app.api.ingest.AsyncResult", side_effect=AttributeError("'DisabledBackend' object has no attribute '_get_task_meta_for'")):
        resp_fallback = get_task_status(task_uuid, db=db)

    assert resp_fallback["success"] is True
    assert resp_fallback["data"].state == "PROCESSING"
    assert resp_fallback["data"].file_id == uploaded_file.id
    db.close()
