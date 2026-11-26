# backend/tests/test_pdf_extractor.py
import io
import pytest
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.services.pdf_extractor import pdf_extractor


def create_sample_ultrasound_pdf() -> bytes:
    """Tạo một file PDF số hóa mẫu bằng ReportLab mô phỏng phiếu kết quả siêu âm thai"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    c.drawString(100, 750, "PHÒNG KHÁM SẢN PHỤ KHOA TIỀN SẢN PRECARE")
    c.drawString(100, 730, "PHIẾU KẾT QUẢ SIÊU ÂM SẢN KHOA 2D/4D")
    c.drawString(100, 710, "Bệnh nhân: Trần Thị H.   Năm sinh: 1995")
    c.drawString(100, 690, "Ngày siêu âm: 18/10/2026")
    c.drawString(100, 670, "Tuổi thai theo siêu âm: 30 tuần 2 ngày")
    c.drawString(100, 650, "KẾT QUẢ ĐO CÁC CHỈ SỐ SINH TRẮC THAI NHI:")
    c.drawString(120, 630, "- Đường kính lưỡng đỉnh (BPD): 78.5 mm")
    c.drawString(120, 610, "- Chu vi vòng đầu (HC): 285.0 mm")
    c.drawString(120, 590, "- Chu vi vòng bụng (AC): 265.0 mm")
    c.drawString(120, 570, "- Chiều dài xương đùi (FL): 58.0 mm")
    c.drawString(120, 550, "- Trọng lượng thai ước tính (EFW): 1680 g")
    c.drawString(120, 530, "- Chỉ số nước ối (AFI): 12.5 cm")
    c.drawString(120, 510, "- Nhịp tim thai (FHR): 148 nhịp/phút")
    c.drawString(100, 480, "KẾT LUẬN: Một thai sống phát triển trong tử cung tương đương 30 tuần 2 ngày.")
    c.save()

    buffer.seek(0)
    return buffer.getvalue()


def create_first_trimester_pdf() -> bytes:
    """Tạo PDF siêu âm quý 1 (đo CRL và NT)"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)

    c.drawString(100, 750, "KẾT QUẢ SIÊU ÂM QUÝ I (11w - 13w6d)")
    c.drawString(100, 720, "Chiều dài đầu mông (CRL): 55.0 mm")
    c.drawString(100, 700, "Độ mờ da gáy (NT): 1.5 mm")
    c.drawString(100, 680, "Tim thai (FHR): 156 bpm")
    c.drawString(100, 660, "Tuổi thai: 12 tuần 1 ngày")
    c.save()

    buffer.seek(0)
    return buffer.getvalue()


def create_empty_pdf() -> bytes:
    """Tạo PDF rỗng không chứa văn bản (mô phỏng scanned PDF không có text layer)"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def test_is_digital_pdf_positive():
    pdf_bytes = create_sample_ultrasound_pdf()
    is_digital, text, total_pages = pdf_extractor.is_digital_pdf(pdf_bytes)

    assert is_digital is True
    assert total_pages == 1
    assert "BPD" in text
    assert "78.5" in text


def test_is_digital_pdf_negative_on_empty():
    empty_bytes = create_empty_pdf()
    is_digital, text, total_pages = pdf_extractor.is_digital_pdf(empty_bytes)

    assert is_digital is False
    assert len(text.strip()) < 30


def test_extract_pdf_fast_path_standard_report():
    pdf_bytes = create_sample_ultrasound_pdf()
    result = pdf_extractor.extract_pdf_fast_path(pdf_bytes, "ultrasound_report")

    assert result["is_digital_pdf"] is True
    assert result["extraction_method"] == "pdf_text_layer_fast_path"

    fields = result["extracted_fields"]
    assert fields["bpd_mm"] == 78.5
    assert fields["hc_mm"] == 285.0
    assert fields["ac_mm"] == 265.0
    assert fields["fl_mm"] == 58.0
    assert fields["efw_g"] == 1680.0
    assert fields["afi_cm"] == 12.5
    assert fields["fhr_bpm"] == 148
    assert fields["gestational_age_days"] == (30 * 7 + 2)

    confidence = result["confidence_scores"]
    assert confidence["bpd"] >= 0.98
    assert confidence["hc"] >= 0.98
    assert confidence["ac"] >= 0.98
    assert confidence["fl"] >= 0.98
    assert confidence["efw"] >= 0.98

    metadata = result["metadata"]
    assert metadata["is_digital_pdf"] is True
    assert metadata["total_pages"] == 1
    assert metadata["processing_time_ms"] >= 0


def test_extract_pdf_fast_path_first_trimester():
    pdf_bytes = create_first_trimester_pdf()
    result = pdf_extractor.extract_pdf_fast_path(pdf_bytes, "ultrasound_report")

    assert result["is_digital_pdf"] is True
    fields = result["extracted_fields"]
    assert fields["crl_mm"] == 55.0
    assert fields["nt_mm"] == 1.5
    assert fields["fhr_bpm"] == 156
    assert fields["gestational_age_days"] == (12 * 7 + 1)


def test_afi_mm_to_cm_auto_conversion():
    text = "Phiếu siêu âm: BPD: 80mm. Chỉ số ối (AFI): 135 mm."
    fields, conf = pdf_extractor.parse_ultrasound_biometrics(text)

    assert fields["bpd_mm"] == 80.0
    assert fields["afi_cm"] == 13.5  # 135 mm tự động quy đổi thành 13.5 cm


def test_out_of_range_sanitization():
    # Năm sinh 1995 hoặc số điện thoại không được nhầm thành BPD hay HC
    text = "Bệnh nhân sinh năm 1995, điện thoại 0912345678. BPD: 82mm."
    fields, conf = pdf_extractor.parse_ultrasound_biometrics(text)

    assert fields["bpd_mm"] == 82.0
    assert fields["hc_mm"] is None


def test_process_ocr_task_fast_path_integration():
    from unittest.mock import MagicMock, patch
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.dialects.sqlite.base import SQLiteTypeCompiler
    from datetime import date
    import uuid

    if not hasattr(SQLiteTypeCompiler, "visit_JSONB"):
        SQLiteTypeCompiler.visit_JSONB = lambda self, type_, **kw: "JSON"

    test_engine = create_engine("sqlite:///:memory:")
    from app.core.database import Base
    from app.models.user import User
    from app.models.pregnancy_profile import PregnancyProfile
    from app.models.checkup import Checkup
    from app.models.biometric_data import BiometricData
    from app.models.deletion_request import DeletionRequest
    from app.models.audit_log import AuditLog
    from app.models.uploaded_file import UploadedFile
    from app.workers.tasks import process_ocr_task

    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(bind=test_engine)
    db = TestingSession()

    user = User(
        id=uuid.uuid4(),
        email="test_worker_patient@example.com",
        password_hash="hashed",
        full_name="Nguyễn Thị Test",
        role="pregnant_woman"
    )
    db.add(user)
    db.commit()

    profile = PregnancyProfile(
        id=uuid.uuid4(),
        patient_id=user.id,
        edd=date(2027, 3, 1),
        status="active"
    )
    db.add(profile)
    db.commit()

    pdf_bytes = create_sample_ultrasound_pdf()

    uploaded_file = UploadedFile(
        id=uuid.uuid4(),
        pregnancy_profile_id=profile.id,
        file_url=f"paraclinical-documents/sample_{uuid.uuid4().hex}.pdf",
        file_type="application/pdf",
        file_name="sieu_am_30w.pdf",
        document_type="ultrasound_report",
        status="pending"
    )
    db.add(uploaded_file)
    db.commit()

    target_file_id = uploaded_file.id

    with patch.object(process_ocr_task, "update_state") as mock_update_state:
        with patch("app.workers.tasks.SessionLocal", return_value=db):
            with patch("app.workers.tasks.storage_service.get_file_bytes", return_value=pdf_bytes):
                result = process_ocr_task.run(str(target_file_id))

    assert result["status"] == "success"
    assert result["method"] == "pdf_text_layer_fast_path"
    assert mock_update_state.called

    # Reload from DB and verify using a new session
    verify_db = TestingSession()
    file_record = verify_db.query(UploadedFile).filter_by(id=target_file_id).first()
    assert file_record is not None
    assert file_record.status == "extracted"
    assert file_record.ocr_raw_payload is not None
    assert file_record.ocr_raw_payload["is_digital_pdf"] is True
    assert file_record.ocr_raw_payload["extracted_fields"]["bpd_mm"] == 78.5
    assert file_record.ocr_raw_payload["extracted_fields"]["efw_g"] == 1680.0
    verify_db.close()


def create_tabular_report_pdf() -> bytes:
    """Tạo file PDF dạng bảng biểu có đường kẻ ô (giống phiếu bệnh viện thật) bằng ReportLab Platypus."""
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("PHONG KHAM SAN PHU KHOA PRECARE", styles["Title"]))
    elements.append(Paragraph("Ngay kham: 24/11/2026 | Bac si thuc hien: BS. Le Minh", styles["Normal"]))
    elements.append(Paragraph("Huyet ap: 118/76 mmHg | Can nang me: 56.5 kg", styles["Normal"]))
    elements.append(Spacer(1, 12))

    # Bảng có cột Giá trị và cột Khoảng tham chiếu (để kiểm chứng Table-First không bắt nhầm số tham chiếu)
    table_data = [
        ["Chi so", "Gia tri", "Khoang tham chieu", "Danh gia"],
        ["BPD", "58 mm", "54 - 62 mm", "Binh thuong"],
        ["HC", "290 mm", "270 - 305 mm", "Binh thuong"],
        ["AC", "196 mm", "185 - 210 mm", "Binh thuong"],
        ["FL", "43 mm", "40 - 46 mm", "Binh thuong"],
        ["EFW", "1.950 g", "1750 - 2150 g", "Binh thuong"],
        ["FHR", "148 bpm", "120 - 160 bpm", "Binh thuong"],
        ["HGB", "11.8 g/dL", "11.0 - 14.0 g/dL", "On dinh"],
        ["Glucose", "5.4 mmol/L", "4.1 - 5.6 mmol/L", "Binh thuong"],
    ]

    t = Table(table_data)
    t.setStyle(
        TableStyle(
            [
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 12))
    elements.append(Paragraph("KET LUAN: Mot thai song phat trien binh thuong trong tu cung.", styles["Normal"]))
    elements.append(Paragraph("DAN DO: Tai kham sau 2 tuan.", styles["Normal"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def test_hybrid_pdfplumber_table_and_clinical_sections():
    pdf_bytes = create_tabular_report_pdf()
    result = pdf_extractor.extract_pdf_fast_path(pdf_bytes, "ultrasound_report")

    assert result["is_digital_pdf"] is True
    assert result["metadata"]["engine"] == "pymupdf+pdfplumber"
    assert result["metadata"]["tables_count"] >= 1

    fields = result["extracted_fields"]
    assert fields["bpd_mm"] == 58.0
    assert fields["hc_mm"] == 290.0
    assert fields["ac_mm"] == 196.0
    assert fields["fl_mm"] == 43.0
    assert fields["efw_g"] == 1950.0
    assert fields["fhr_bpm"] == 148
    assert result["confidence_scores"]["bpd"] == 0.995

    sections = result["clinical_sections"]
    assert sections["administrative_info"]["visit_date"] == "24/11/2026"
    assert "Le Minh" in (sections["administrative_info"]["doctor_performer"] or "")
    assert sections["vitals"]["blood_pressure_systolic"] == 118.0
    assert sections["vitals"]["blood_pressure_diastolic"] == 76.0
    assert sections["vitals"]["weight_kg"] == 56.5
    assert sections["labs"]["hgb"] == "11.8"
    assert sections["labs"]["glucose"] == "5.4"
    assert "binh thuong" in (sections["conclusions"]["summary"] or "").lower()


