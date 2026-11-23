# backend/app/services/pdf_extractor.py
"""
PreCare Ingestion Engine - Digital PDF Fast Path Text Layer Extractor
Sub-task 4.2.1 (Worker): Xây dựng "Đường nhanh" (Fast path) đọc trực tiếp text layer PDF
"""

import io
import re
import time
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import pypdf


class PdfFastPathExtractor:
    """
    Extractor chuyên trách đọc trực tiếp text layer số hóa từ file PDF (Digital PDF),
    bỏ qua bước rasterization và OCR model nặng, giúp giảm thời gian xử lý xuống < 1.5s
    với độ chính xác đạt 98% - 99.5%.
    """

    MIN_DIGITAL_TEXT_CHARS = 30

    def is_digital_pdf(self, file_bytes: bytes) -> Tuple[bool, str, int]:
        """
        Kiểm tra xem file PDF có chứa text layer số hóa hợp lệ hay không.
        Returns:
            (is_digital, full_text, total_pages)
        """
        if not file_bytes:
            return False, "", 0

        try:
            stream = io.BytesIO(file_bytes)
            reader = pypdf.PdfReader(stream)
            total_pages = len(reader.pages)
            if total_pages == 0:
                return False, "", 0

            page_texts = []
            for page in reader.pages:
                txt = page.extract_text() or ""
                page_texts.append(txt)

            full_text = "\n".join(page_texts).strip()
            # Loại bỏ whitespace để đếm ký tự có nghĩa
            clean_chars = "".join(full_text.split())

            is_digital = len(clean_chars) >= self.MIN_DIGITAL_TEXT_CHARS
            return is_digital, full_text, total_pages
        except Exception:
            return False, "", 0

    def _normalize_float(self, raw_str: str) -> Optional[float]:
        """Chuẩn hóa chuỗi số thập phân có thể chứa dấu phẩy (77,5 -> 77.5)"""
        if not raw_str:
            return None
        cleaned = raw_str.strip().replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None

    def parse_ultrasound_biometrics(
        self, raw_text: str
    ) -> Tuple[Dict[str, Optional[Any]], Dict[str, float]]:
        """
        Trích xuất và chuẩn hóa các chỉ số sinh trắc học sản khoa từ văn bản thô.
        Tuân thủ chặt chẽ các giới hạn lâm sàng và đơn vị chuẩn của PreCare:
        - BPD, HC, AC, FL, CRL, NT: mm
        - EFW: gram (g)
        - AFI: cm
        - FHR: nhịp/phút (bpm)
        - GA: ngày (ga_days)
        """
        extracted: Dict[str, Optional[Any]] = {
            "bpd_mm": None,
            "hc_mm": None,
            "ac_mm": None,
            "fl_mm": None,
            "efw_g": None,
            "crl_mm": None,
            "nt_mm": None,
            "afi_cm": None,
            "fhr_bpm": None,
            "gestational_age_days": None,
        }
        confidence: Dict[str, float] = {}

        if not raw_text:
            return extracted, confidence

        # 1. Đường kính lưỡng đỉnh BPD (10.0 - 120.0 mm)
        bpd_pattern = re.compile(
            r"(?i)(?:Đường\s*kính\s*lưỡng\s*đỉnh|ĐK\s*lưỡng\s*đỉnh|ĐKLD|BPD)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = bpd_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 10.0 <= val <= 120.0:
                extracted["bpd_mm"] = round(val, 2)
                confidence["bpd"] = 0.99 if match.group(2) else 0.98

        # 2. Chu vi vòng đầu HC (50.0 - 400.0 mm)
        hc_pattern = re.compile(
            r"(?i)(?:Chu\s*vi\s*(?:vòng\s*)?đầu|CV\s*đầu|HC)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = hc_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 50.0 <= val <= 400.0:
                extracted["hc_mm"] = round(val, 2)
                confidence["hc"] = 0.99 if match.group(2) else 0.98

        # 3. Chu vi vòng bụng AC (50.0 - 450.0 mm)
        ac_pattern = re.compile(
            r"(?i)(?:Chu\s*vi\s*(?:vòng\s*)?bụng|CV\s*bụng|AC)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = ac_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 50.0 <= val <= 450.0:
                extracted["ac_mm"] = round(val, 2)
                confidence["ac"] = 0.99 if match.group(2) else 0.98

        # 4. Chiều dài xương đùi FL (5.0 - 95.0 mm)
        fl_pattern = re.compile(
            r"(?i)(?:Chiều\s*dài\s*xương\s*đùi|CD\s*xương\s*đùi|CDXD|FL)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = fl_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 5.0 <= val <= 95.0:
                extracted["fl_mm"] = round(val, 2)
                confidence["fl"] = 0.99 if match.group(2) else 0.98

        # 5. Cân nặng thai ước tính EFW (50.0 - 6000.0 g)
        # Hỗ trợ cả tiếng Việt chuẩn và kết quả OCR thiếu dấu (Cân nng thai ưc tính / Trọng lượng thai)
        efw_pattern = re.compile(
            r"(?i)(?:Tr[^\s:]*ng\s*l[^\s:]*ng\s*thai|Cân\s*n[^\s:]*ng\s*(?:thai\s*)?[uư][^\s:]*c\s*t[^\s:]*nh|Cân\s*n[^\s:]*ng\s*thai|EFW)\s*(?:\([^)]{1,25}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(g|gram|gr|kg)?",
            re.UNICODE,
        )
        for match in efw_pattern.finditer(raw_text):
            raw_val_str = match.group(1)
            unit = (match.group(2) or "").lower()
            val = self._normalize_float(raw_val_str)
            if val is not None:
                # Xử lý đơn vị kg (vd 1.48kg -> 1480g) hoặc dấu chấm phân cách hàng nghìn (1.480g -> 1480g)
                if unit == "kg":
                    val = val * 1000.0
                elif val < 10.0 and "." in raw_val_str and len(raw_val_str.split(".")[1]) == 3:
                    val = val * 1000.0
                elif val < 10.0 and unit in ("g", "gram", "gr"):
                    val = val * 1000.0
                if 50.0 <= val <= 6000.0:
                    extracted["efw_g"] = round(val, 2)
                    confidence["efw"] = 0.99 if match.group(2) else 0.98
                    break

        # 6. Chiều dài đầu mông CRL (5.0 - 120.0 mm - siêu âm Quý 1)
        crl_pattern = re.compile(
            r"(?i)(?:Chiều\s*dài\s*đầu\s*mông|CD\s*đầu\s*mông|CRL)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = crl_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 5.0 <= val <= 120.0:
                extracted["crl_mm"] = round(val, 2)
                confidence["crl"] = 0.99 if match.group(2) else 0.98

        # 7. Độ mờ da gáy NT (0.5 - 10.0 mm)
        nt_pattern = re.compile(
            r"(?i)(?:Độ\s*mờ\s*da\s*gáy|Khoảng\s*sáng\s*sau\s*gáy|ĐMDG|NT)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm)?",
            re.UNICODE,
        )
        match = nt_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            if val is not None and 0.5 <= val <= 10.0:
                extracted["nt_mm"] = round(val, 2)
                confidence["nt"] = 0.99 if match.group(2) else 0.98

        # 8. Chỉ số nước ối AFI (2.0 - 35.0 cm, nếu là mm tự động chia 10)
        afi_pattern = re.compile(
            r"(?i)(?:Chỉ\s*số\s*(?:nước\s*)?ối|AFI)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|mm)?",
            re.UNICODE,
        )
        match = afi_pattern.search(raw_text)
        if match:
            val = self._normalize_float(match.group(1))
            unit = (match.group(2) or "").lower()
            if val is not None:
                # Nếu ghi đơn vị mm hoặc giá trị > 40 (vd 135mm -> 13.5cm)
                if unit == "mm" or val > 40.0:
                    val = val / 10.0
                if 2.0 <= val <= 35.0:
                    extracted["afi_cm"] = round(val, 2)
                    confidence["afi"] = 0.98 if unit else 0.96

        # 9. Nhịp tim thai FHR (80 - 220 bpm)
        fhr_pattern = re.compile(
            r"(?i)(?:Nhịp\s*tim(?:\s*thai)?|Tim\s*thai|FHR)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]{2,3})\s*(bpm|l\/p|nhịp\/phút|lần\/phút)?",
            re.UNICODE,
        )
        match = fhr_pattern.search(raw_text)
        if match:
            try:
                val = int(match.group(1))
                if 80 <= val <= 220:
                    extracted["fhr_bpm"] = val
                    confidence["fhr"] = 0.99
            except ValueError:
                pass

        # 10. Tuổi thai GA trên phiếu (14 - 310 ngày)
        # Hỗ trợ cả tiếng Việt có dấu, không dấu hoặc font lỗi nhẹ (Tuổi thai / Tuan / Week)
        ga_pattern = re.compile(
            r"(?i)(?:Tu[^\s:]*\s*thai|GA|Thai\s*kho[^\s:]*|Thai\s*t[^\s:]*)\s*(?:(?:theo\s*)?siêu\s*âm)?\s*(?:\([^)]{1,20}\))?[\)\]]?\s*[:=~]?\s*([0-9]{1,2})\s*(?:tu[^\s0-9]+|w|weeks?)\s*(?:([0-9])\s*(?:ng[^\s0-9]+|d|days?))?",
            re.UNICODE,
        )
        match = ga_pattern.search(raw_text)
        if match:
            try:
                weeks = int(match.group(1))
                days = int(match.group(2)) if match.group(2) else 0
                total_days = weeks * 7 + days
                if 14 <= total_days <= 310:
                    extracted["gestational_age_days"] = total_days
                    confidence["ga"] = 0.98
            except ValueError:
                pass

        return extracted, confidence

    def extract_pdf_fast_path(
        self, file_bytes: bytes, document_type: str = "ultrasound_report"
    ) -> Dict[str, Any]:
        """
        Thực thi toàn bộ luồng Fast Path trên file PDF nhị phân:
        1. Phân tích text layer.
        2. Nếu là Digital PDF, trích xuất text và bóc tách các chỉ số.
        3. Nếu là Scanned PDF, trả về cờ is_digital_pdf = False để chuyển sang OCR pipeline.
        """
        start_time = time.perf_counter()
        is_digital, full_text, total_pages = self.is_digital_pdf(file_bytes)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        if not is_digital:
            return {
                "document_type": document_type,
                "extraction_method": None,
                "is_digital_pdf": False,
                "extracted_fields": {},
                "raw_text": "",
                "confidence_scores": {},
                "metadata": {
                    "total_pages": total_pages,
                    "char_count": len(full_text.strip()),
                    "is_digital_pdf": False,
                    "processing_time_ms": duration_ms,
                    "extracted_at": datetime.utcnow().isoformat() + "Z",
                    "note": "PDF scan/ảnh không có text layer số hóa, chuyển tiếp sang Slow Path (OCR Pipeline).",
                },
            }

        extracted_fields, confidence_scores = self.parse_ultrasound_biometrics(full_text)

        return {
            "document_type": document_type,
            "extraction_method": "pdf_text_layer_fast_path",
            "is_digital_pdf": True,
            "extracted_fields": extracted_fields,
            "raw_text": full_text,
            "confidence_scores": confidence_scores,
            "metadata": {
                "total_pages": total_pages,
                "char_count": len(full_text),
                "is_digital_pdf": True,
                "processing_time_ms": duration_ms,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
            },
        }


pdf_extractor = PdfFastPathExtractor()
