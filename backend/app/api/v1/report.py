import uuid
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.audit import log_audit_event
from app.models.models import AnalysisResult, MedicalReport, User, Checkup, PregnancyProfile, BiometricData

router = APIRouter(prefix="/report", tags=["Medical Reports PDF"])

@router.post("/export-pdf/{analysis_result_id}")
def generate_pdf_report(
    analysis_result_id: uuid.UUID,
    report_type: str = "doctor_professional",
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis = db.query(AnalysisResult).filter(AnalysisResult.id == analysis_result_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Không tìm thấy kết quả phân tích")

    biometric = db.query(BiometricData).filter(BiometricData.id == analysis.biometric_data_id).first()
    profile = db.query(PregnancyProfile).filter(PregnancyProfile.id == analysis.pregnancy_profile_id).first()

    # Generate PDF in-memory buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=12
    )

    if report_type == "doctor_professional":
        story.append(Paragraph("BÁO CÁO PHÂN TÍCH CHẨN ĐOÁN CẬN LÂM SÀNG THAI KỲ", title_style))
        story.append(Paragraph(f"<b>Mã Hồ Sơ:</b> {profile.id} | <b>Ngày Phân Tích:</b> {analysis.analyzed_at.strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
        story.append(Spacer(1, 12))

        data = [
            ["Chỉ Số Sinh Trắc", "Giá Trị Thô", "Z-Score", "Bách Phân Vị (%)"],
            ["BPD (Đường kính lưỡng đỉnh)", f"{biometric.bpd or '-'} mm", str(analysis.bpd_zscore or '-'), f"{analysis.bpd_percentile or '-'}%"],
            ["HC (Chu vi đầu)", f"{biometric.hc or '-'} mm", str(analysis.hc_zscore or '-'), f"{analysis.hc_percentile or '-'}%"],
            ["AC (Chu vi bụng)", f"{biometric.ac or '-'} mm", str(analysis.ac_zscore or '-'), f"{analysis.ac_percentile or '-'}%"],
            ["FL (Xương đùi)", f"{biometric.fl or '-'} mm", str(analysis.fl_zscore or '-'), f"{analysis.fl_percentile or '-'}%"],
            ["EFW (Cân nặng ước tính)", f"{biometric.efw or '-'} g", str(analysis.efw_zscore or '-'), f"{analysis.efw_percentile or '-'}%"],
        ]

        t = Table(data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563EB')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
        ]))
        story.append(t)
        story.append(Spacer(1, 14))

        story.append(Paragraph(f"<b>Mức Cảnh Báo Lâm Sàng:</b> {analysis.warning_level.upper()}", styles['Heading2']))
        story.append(Paragraph(f"<b>Đánh Giá Bác Sĩ:</b> {analysis.explanation_doctor}", styles['Normal']))
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>Phiên Bản Luật:</b> {analysis.rules_version} | <b>Mô Hình:</b> {analysis.model_version}", styles['Italic']))
    else:
        story.append(Paragraph("BÁO CÁO THEO DÕI SỨC KHỎE THAI NHI (DÀNH CHO MẸ)", title_style))
        story.append(Paragraph(f"<b>Tuổi thai:</b> {biometric.gestational_age_days // 7} tuần {biometric.gestational_age_days % 7} ngày", styles['Heading3']))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<b>Lời Khuyên & Giải Thích:</b> {analysis.explanation_patient}", styles['Normal']))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<i>{analysis.disclaimer_text}</i>", styles['Italic']))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    # Save MedicalReport DB entity
    pdf_url = f"minio://reports/{analysis.pregnancy_profile_id}/{analysis_result_id}_{report_type}.pdf"
    report_record = MedicalReport(
        pregnancy_profile_id=analysis.pregnancy_profile_id,
        checkup_id=analysis.checkup_id,
        analysis_result_id=analysis.id,
        report_type=report_type,
        pdf_url=pdf_url,
        generated_by=current_user.id
    )
    db.add(report_record)
    db.commit()

    log_audit_event(db, current_user.id, "EXPORT_PDF", "medical_reports", report_record.id, request)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PreCare_Report_{report_type}_{analysis_result_id}.pdf"}
    )
