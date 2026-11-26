# backend/app/services/pdf_extractor.py
"""
PreCare Ingestion Engine - Hybrid Digital PDF Fast Path Extractor
Sub-task 4.2.1 (Worker): Kết hợp PyMuPDF (fitz) đọc text giữ layout siêu tốc
và pdfplumber bóc tách chính xác bảng chỉ số siêu âm, xét nghiệm (Table-First + Text-Fallback).
"""

import io
import logging
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF
import pdfplumber

logger = logging.getLogger(__name__)


class PdfFastPathExtractor:
    """
    Extractor chuyên trách đọc trực tiếp text layer và cấu trúc bảng từ Digital PDF:
    - PyMuPDF (fitz): Kiểm tra text layer và trích xuất văn bản giữ nguyên hàng lối (sort=True)
      cho phần thông tin hành chính và kết luận chẩn đoán.
    - pdfplumber: Bóc tách cấu trúc bảng 2 chiều (dòng x cột) để lấy chính xác giá trị
      chỉ số siêu âm/xét nghiệm, tránh bắt nhầm số ở cột 'Khoảng tham chiếu'.
    """

    MIN_DIGITAL_TEXT_CHARS = 30

    def is_digital_pdf(self, file_bytes: bytes) -> Tuple[bool, str, int]:
        """
        Kiểm tra nhanh bằng PyMuPDF xem file PDF có chứa text layer số hóa hợp lệ hay không.
        Sử dụng `sort=True` để giữ nguyên trật tự đọc từ trên xuống dưới, trái sang phải.
        Returns:
            (is_digital, full_text, total_pages)
        """
        if not file_bytes:
            return False, "", 0

        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            try:
                total_pages = len(doc)
                if total_pages == 0:
                    return False, "", 0

                page_texts: List[str] = []
                for page in doc:
                    txt = page.get_text("text", sort=True) or ""
                    page_texts.append(txt)
            finally:
                doc.close()

            full_text = "\n".join(page_texts).strip()
            clean_chars = "".join(full_text.split())
            is_digital = len(clean_chars) >= self.MIN_DIGITAL_TEXT_CHARS
            return is_digital, full_text, total_pages
        except Exception as err:
            logger.debug(f"[PdfFastPath] PyMuPDF không thể đọc PDF: {err}")
            return False, "", 0

    def extract_tables_with_pdfplumber(
        self, file_bytes: bytes
    ) -> List[List[List[str]]]:
        """
        Dùng pdfplumber bóc tách toàn bộ các bảng có cấu trúc (siêu âm, sinh hiệu, xét nghiệm).
        Mỗi ô được làm sạch khoảng trắng thừa và loại bỏ dòng hoàn toàn rỗng.
        """
        tables: List[List[List[str]]] = []
        if not file_bytes:
            return tables

        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    raw_tables = page.extract_tables() or []
                    for tbl in raw_tables:
                        cleaned_rows: List[List[str]] = []
                        for row in tbl:
                            if not row:
                                continue
                            cells = [
                                re.sub(r"\s+", " ", str(cell or "")).strip()
                                for cell in row
                            ]
                            if any(cells):
                                cleaned_rows.append(cells)
                        if cleaned_rows:
                            tables.append(cleaned_rows)
        except Exception as err:
            logger.warning(f"[PdfFastPath] pdfplumber trích xuất bảng gặp lỗi: {err}")

        return tables

    def _normalize_float(self, raw_str: str) -> Optional[float]:
        """Chuẩn hóa chuỗi số thập phân có thể chứa dấu phẩy (77,5 -> 77.5)"""
        if not raw_str:
            return None
        cleaned = raw_str.strip().replace(",", ".")
        try:
            return float(cleaned)
        except ValueError:
            return None

    def _extract_value_and_unit(
        self, cell_text: str
    ) -> Tuple[Optional[float], str, str]:
        """Tách số đầu tiên và đơn vị đi kèm từ một ô giá trị trong bảng."""
        if not cell_text:
            return None, "", ""
        match = re.search(
            r"([0-9]+(?:[.,][0-9]+)?)\s*(mm|cm|g|gram|gr|kg|bpm|l/p|nhịp/phút|lần/phút|g/dL|mmol/L|g/L|%)?",
            cell_text,
            re.IGNORECASE | re.UNICODE,
        )
        if not match:
            return None, "", ""
        raw_num = match.group(1)
        val = self._normalize_float(raw_num)
        unit = (match.group(2) or "").lower()
        return val, raw_num, unit

    def _parse_table_rows_biometrics(
        self, tables: List[List[List[str]]]
    ) -> Tuple[Dict[str, Optional[Any]], Dict[str, float]]:
        """
        Table-First Parser: Duyệt từng dòng trong bảng pdfplumber (cột Tên -> cột Giá trị).
        Tránh tuyệt đối việc bắt nhầm các con số ở cột Khoảng tham chiếu (cột thứ 3 trở đi).
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

        if not tables:
            return extracted, confidence

        # Ánh xạ (key_out, conf_key, label_regex, min_val, max_val)
        float_specs = [
            ("bpd_mm", "bpd", r"(?i)(?:đường\s*kính\s*lưỡng\s*đỉnh|đk\s*lưỡng\s*đỉnh|đkld|\bbpd\b)", 10.0, 120.0),
            ("hc_mm", "hc", r"(?i)(?:chu\s*vi\s*(?:vòng\s*)?đầu|cv\s*đầu|\bhc\b)", 50.0, 400.0),
            ("ac_mm", "ac", r"(?i)(?:chu\s*vi\s*(?:vòng\s*)?bụng|cv\s*bụng|\bac\b)", 50.0, 450.0),
            ("fl_mm", "fl", r"(?i)(?:chiều\s*dài\s*xương\s*đùi|cd\s*xương\s*đùi|cdxd|\bfl\b)", 5.0, 95.0),
            ("crl_mm", "crl", r"(?i)(?:chiều\s*dài\s*đầu\s*mông|cd\s*đầu\s*mông|\bcrl\b)", 5.0, 120.0),
            ("nt_mm", "nt", r"(?i)(?:độ\s*mờ\s*da\s*gáy|khoảng\s*sáng\s*sau\s*gáy|đmdg|\bnt\b)", 0.5, 10.0),
        ]

        for table in tables:
            for row in table:
                if len(row) < 2:
                    continue

                # Tìm ô nhãn (label_idx) và ô kết quả liền kề ngay sau nhãn (value_cell)
                label_idx = -1
                for idx, cell in enumerate(row[:-1]):
                    if cell and re.search(r"[a-zA-ZÀ-ỹ]", cell):
                        label_idx = idx
                        break

                if label_idx == -1:
                    continue

                label_cell = row[label_idx]
                # Tìm ô giá trị không rỗng gần nhất bên phải cột nhãn
                value_cell = ""
                for candidate in row[label_idx + 1 :]:
                    if candidate:
                        value_cell = candidate
                        break

                if not value_cell:
                    continue

                # Bỏ qua dòng tiêu đề bảng (ví dụ "Chỉ số | Giá trị | Khoảng tham chiếu")
                if re.search(r"(?i)^(?:chỉ\s*số|tên\s*xét\s*nghiệm|thông\s*số)$", label_cell.strip()):
                    continue

                # 1. Các chỉ số đo mm tiêu chuẩn
                for key_out, conf_key, pattern, min_v, max_v in float_specs:
                    if extracted[key_out] is None and re.search(pattern, label_cell, re.UNICODE):
                        val, _, _ = self._extract_value_and_unit(value_cell)
                        if val is not None and min_v <= val <= max_v:
                            extracted[key_out] = round(val, 2)
                            confidence[conf_key] = 0.995
                        break

                # 2. Cân nặng thai ước tính EFW
                if extracted["efw_g"] is None and re.search(
                    r"(?i)(?:tr[^\s:]*ng\s*l[^\s:]*ng\s*thai|cân\s*n[^\s:]*ng\s*(?:thai\s*)?[uư][^\s:]*c\s*t[^\s:]*nh|cân\s*n[^\s:]*ng\s*thai|\befw\b)",
                    label_cell,
                    re.UNICODE,
                ):
                    val, raw_num, unit = self._extract_value_and_unit(value_cell)
                    if val is not None:
                        if unit == "kg":
                            val = val * 1000.0
                        elif val < 10.0 and "." in raw_num and len(raw_num.split(".")[1]) == 3:
                            val = val * 1000.0
                        elif val < 10.0 and unit in ("g", "gram", "gr"):
                            val = val * 1000.0
                        if 50.0 <= val <= 6000.0:
                            extracted["efw_g"] = round(val, 2)
                            confidence["efw"] = 0.995

                # 3. Chỉ số nước ối AFI (cm)
                if extracted["afi_cm"] is None and re.search(
                    r"(?i)(?:chỉ\s*số\s*(?:nước\s*)?ối|\bafi\b)", label_cell, re.UNICODE
                ):
                    val, _, unit = self._extract_value_and_unit(value_cell)
                    if val is not None:
                        if unit == "mm" or val > 40.0:
                            val = val / 10.0
                        if 2.0 <= val <= 35.0:
                            extracted["afi_cm"] = round(val, 2)
                            confidence["afi"] = 0.995

                # 4. Nhịp tim thai FHR (bpm)
                if extracted["fhr_bpm"] is None and re.search(
                    r"(?i)(?:nhịp\s*tim(?:\s*thai)?|tim\s*thai|\bfhr\b)", label_cell, re.UNICODE
                ):
                    val, _, _ = self._extract_value_and_unit(value_cell)
                    if val is not None:
                        int_val = int(round(val))
                        if 80 <= int_val <= 220:
                            extracted["fhr_bpm"] = int_val
                            confidence["fhr"] = 0.995

                # 5. Tuổi thai GA trong bảng
                if extracted["gestational_age_days"] is None and re.search(
                    r"(?i)(?:tuổi\s*thai|\bga\b)", label_cell, re.UNICODE
                ):
                    ga_m = re.search(
                        r"(?i)([0-9]{1,2})\s*(?:tu[^\s0-9]+|w|weeks?)\s*(?:([0-9])\s*(?:ng[^\s0-9]+|d|days?))?",
                        value_cell,
                        re.UNICODE,
                    )
                    if ga_m:
                        weeks = int(ga_m.group(1))
                        days = int(ga_m.group(2)) if ga_m.group(2) else 0
                        total_days = weeks * 7 + days
                        if 14 <= total_days <= 310:
                            extracted["gestational_age_days"] = total_days
                            confidence["ga"] = 0.995

        return extracted, confidence

    def parse_ultrasound_biometrics(
        self,
        raw_text: str,
        tables: Optional[List[List[List[str]]]] = None,
    ) -> Tuple[Dict[str, Optional[Any]], Dict[str, float]]:
        """
        Trích xuất và chuẩn hóa các chỉ số sinh trắc học sản khoa theo chiến lược:
        1. Table-First: Ưu tiên bóc tách chính xác từ bảng pdfplumber (nếu có).
        2. Text-Fallback: Chạy Regex trên văn bản giữ layout từ PyMuPDF cho các chỉ số còn thiếu.

        Giới hạn lâm sàng & đơn vị chuẩn PreCare:
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

        # Bước 1: Table-First từ pdfplumber
        if tables:
            tbl_extracted, tbl_confidence = self._parse_table_rows_biometrics(tables)
            for k, v in tbl_extracted.items():
                if v is not None:
                    extracted[k] = v
            confidence.update(tbl_confidence)

        if not raw_text:
            return extracted, confidence

        # Bước 2: Text-Fallback bằng Regex cho các chỉ số chưa tìm thấy trong bảng
        # 1. Đường kính lưỡng đỉnh BPD (10.0 - 120.0 mm)
        if extracted["bpd_mm"] is None:
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
        if extracted["hc_mm"] is None:
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
        if extracted["ac_mm"] is None:
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
        if extracted["fl_mm"] is None:
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
        if extracted["efw_g"] is None:
            efw_pattern = re.compile(
                r"(?i)(?:Tr[^\s:]*ng\s*l[^\s:]*ng\s*thai|Cân\s*n[^\s:]*ng\s*(?:thai\s*)?[uư][^\s:]*c\s*t[^\s:]*nh|Cân\s*n[^\s:]*ng\s*thai|EFW)\s*(?:\([^)]{1,25}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(g|gram|gr|kg)?",
                re.UNICODE,
            )
            for match in efw_pattern.finditer(raw_text):
                raw_val_str = match.group(1)
                unit = (match.group(2) or "").lower()
                val = self._normalize_float(raw_val_str)
                if val is not None:
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
        if extracted["crl_mm"] is None:
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
        if extracted["nt_mm"] is None:
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

        # 8. Chỉ số nước ối AFI (2.0 - 35.0 cm)
        if extracted["afi_cm"] is None:
            afi_pattern = re.compile(
                r"(?i)(?:Chỉ\s*số\s*(?:nước\s*)?ối|AFI)\s*(?:\([^)]{1,10}\))?[\)\]]?\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(cm|mm)?",
                re.UNICODE,
            )
            match = afi_pattern.search(raw_text)
            if match:
                val = self._normalize_float(match.group(1))
                unit = (match.group(2) or "").lower()
                if val is not None:
                    if unit == "mm" or val > 40.0:
                        val = val / 10.0
                    if 2.0 <= val <= 35.0:
                        extracted["afi_cm"] = round(val, 2)
                        confidence["afi"] = 0.98 if unit else 0.96

        # 9. Nhịp tim thai FHR (80 - 220 bpm)
        if extracted["fhr_bpm"] is None:
            fhr_pattern = re.compile(
                r"(?i)(?:Nhịp\s*tim(?:\s*thai)?|Tim\s*thai|FHR)\s*(?:\([^)]{1,15}\))?[\)\]]?\s*(?:[,;]?\s*tần\s*số)?\s*[:=]?\s*([0-9]{2,3})\s*(bpm|l\/p|nhịp\/phút|lần\/phút)?",
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
        if extracted["gestational_age_days"] is None:
            ga_pattern = re.compile(
                r"(?i)(?:Tu[^\s:]*\s*thai|GA|Thai\s*kho[^\s:]*|Thai\s*t[^\s:]*)\s*(?:(?:theo\s*)?siêu\s*âm)?\s*(?:\([^)]{1,20}\))?[\)\]]?\s*[:=~]?\s*([0-9]{1,2})\s*(?:tu[^\s0-9]+|w|weeks?)\s*(?:([0-9])\s*(?:ng[^\s0-9]+|d|days?))?",
                re.UNICODE,
            )
            match = ga_pattern.search(raw_text)
            if not match:
                match = re.search(
                    r"(?i)\b([0-9]{1,2})\s*tu[aầ]n\s*([0-6])\s*ng[aà]y\b",
                    raw_text,
                    re.UNICODE,
                )
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

    def parse_clinical_sections(
        self,
        raw_text: str,
        tables: Optional[List[List[List[str]]]] = None,
    ) -> Dict[str, Any]:
        """
        Bóc tách phần mở rộng phục vụ đồng bộ Form Bước 2 (Web Doctor Portal):
        - Thông tin hành chính (ngày khám, bác sĩ thực hiện, khoa/phòng khám)
        - Sinh hiệu thai phụ (huyết áp, cân nặng, mạch, thân nhiệt, BMI)
        - Xét nghiệm huyết học & sinh hóa nước tiểu (HGB, Glucose, Protein, pH, Bạch cầu)
        - Kết luận chuyên môn & dặn dò điều trị
        """
        administrative_info: Dict[str, Optional[str]] = {
            "visit_date": None,
            "doctor_performer": None,
            "department": None,
        }
        vitals: Dict[str, Optional[float]] = {
            "blood_pressure_systolic": None,
            "blood_pressure_diastolic": None,
            "weight_kg": None,
            "heart_rate_bpm": None,
            "temperature_c": None,
            "bmi": None,
        }
        labs: Dict[str, Optional[str]] = {
            "hgb": None,
            "glucose": None,
            "urine_protein": None,
            "urine_ph": None,
            "urine_leukocyte": None,
        }
        conclusions: Dict[str, Optional[str]] = {
            "summary": None,
            "recommendations": None,
        }

        # 1. Table-First cho Sinh hiệu & Xét nghiệm từ pdfplumber (hỗ trợ bảng 2 cột và bảng 4 cột ghép cặp)
        if tables:
            for table in tables:
                for row in table:
                    if len(row) < 2:
                        continue
                    pairs: List[Tuple[str, str]] = []
                    if len(row) >= 4 and row[2] and row[3]:
                        pairs.append((row[0], row[1]))
                        pairs.append((row[2], row[3]))
                    else:
                        first_val = next((c for c in row[1:] if c), "")
                        pairs.append((row[0], first_val))

                    for label_cell, value_cell in pairs:
                        if not label_cell or not value_cell:
                            continue

                        if vitals["blood_pressure_systolic"] is None and re.search(
                            r"(?i)huyết\s*áp|\bBP\b", label_cell
                        ):
                            bp_m = re.search(r"([0-9]{2,3})\s*/\s*([0-9]{2,3})", value_cell)
                            if bp_m:
                                vitals["blood_pressure_systolic"] = float(bp_m.group(1))
                                vitals["blood_pressure_diastolic"] = float(bp_m.group(2))

                        if vitals["weight_kg"] is None and re.search(
                            r"(?i)cân\s*nặng(?:\s*hiện\s*tại|\s*mẹ|\s*thai\s*phụ)?", label_cell
                        ) and not re.search(r"(?i)thai|efw|ước\s*tính", label_cell):
                            val, _, _ = self._extract_value_and_unit(value_cell)
                            if val is not None and 30.0 <= val <= 150.0:
                                vitals["weight_kg"] = round(val, 2)

                        if vitals["heart_rate_bpm"] is None and re.search(
                            r"(?i)\bmạch\b|nhịp\s*tim\s*mẹ", label_cell
                        ):
                            val, _, _ = self._extract_value_and_unit(value_cell)
                            if val is not None and 40.0 <= val <= 160.0:
                                vitals["heart_rate_bpm"] = round(val, 0)

                        if vitals["temperature_c"] is None and re.search(
                            r"(?i)thân\s*nhiệt|nhiệt\s*độ", label_cell
                        ):
                            temp_m = re.search(
                                r"([34][0-9](?:[.,][0-9])?)\s*(?:°\s*C|C\b)",
                                value_cell,
                                re.IGNORECASE,
                            )
                            val = (
                                self._normalize_float(temp_m.group(1))
                                if temp_m
                                else self._extract_value_and_unit(value_cell)[0]
                            )
                            if val is not None and 34.0 <= val <= 42.0:
                                vitals["temperature_c"] = round(val, 1)

                        if vitals["bmi"] is None and re.search(r"(?i)\bbmi\b", label_cell):
                            bmi_m = re.search(
                                r"(?i)BMI\s*[:=]?\s*([0-9]{2}(?:[.,][0-9]+)?)",
                                value_cell,
                            )
                            val = (
                                self._normalize_float(bmi_m.group(1))
                                if bmi_m
                                else self._extract_value_and_unit(value_cell)[0]
                            )
                            if val is not None and 12.0 <= val <= 55.0:
                                vitals["bmi"] = round(val, 1)

                    # Labs
                    if labs["hgb"] is None and re.search(
                        r"(?i)huyết\s*sắc\s*tố|\bhgb\b|\bhb\b", label_cell
                    ):
                        val, _, _ = self._extract_value_and_unit(value_cell)
                        if val is not None:
                            labs["hgb"] = str(round(val, 2))

                    if labs["glucose"] is None and re.search(
                        r"(?i)đường\s*huyết|\bglucose\b", label_cell
                    ):
                        val, _, _ = self._extract_value_and_unit(value_cell)
                        if val is not None:
                            labs["glucose"] = str(round(val, 2))

                    if labs["urine_protein"] is None and re.search(
                        r"(?i)protein\s*niệu|đạm\s*nước\s*tiểu", label_cell
                    ):
                        labs["urine_protein"] = value_cell

                    if labs["urine_ph"] is None and re.search(
                        r"(?i)\bph\b\s*(?:nước\s*tiểu)?", label_cell
                    ):
                        val, _, _ = self._extract_value_and_unit(value_cell)
                        if val is not None and 4.0 <= val <= 9.5:
                            labs["urine_ph"] = str(round(val, 1))

                    if labs["urine_leukocyte"] is None and re.search(
                        r"(?i)bạch\s*cầu\s*niệu|leukocyte", label_cell
                    ):
                        labs["urine_leukocyte"] = value_cell

        if not raw_text:
            return {
                "administrative_info": administrative_info,
                "vitals": vitals,
                "labs": labs,
                "conclusions": conclusions,
            }

        # 2. Thông tin hành chính & Chẩn đoán giữ nguyên hàng lối từ PyMuPDF (sort=True)
        date_m = re.search(
            r"(?i)(?:Ng[aà]y\s*(?:si[eê]u\s*[aâ]m|kh[aá]m|l[aậ]p\s*phi[eế]u))\s*[:=]?\s*([0-9]{1,2})\s*[/-]\s*([0-9]{1,2})\s*[/-]\s*([0-9]{4})",
            raw_text,
            re.UNICODE,
        )
        if date_m:
            administrative_info["visit_date"] = f"{date_m.group(1).zfill(2)}/{date_m.group(2).zfill(2)}/{date_m.group(3)}"
        else:
            date_vn_m = re.search(
                r"(?i)Ng[aà]y\s+([0-9]{1,2})\s+th[aá]ng\s+([0-9]{1,2})\s+n[aă]m\s+([0-9]{4})",
                raw_text,
                re.UNICODE,
            )
            if date_vn_m:
                administrative_info["visit_date"] = f"{date_vn_m.group(1).zfill(2)}/{date_vn_m.group(2).zfill(2)}/{date_vn_m.group(3)}"

        doc_m = re.search(
            r"(?i)(?:B[aá]c\s*s[iĩ]\s*(?:th[uự]c\s*hi[eệ]n|si[eê]u\s*[aâ]m|kh[aá]m|ch[iỉ]\s*[đd][iị]nh|[đd]i[eề]u\s*tr[iị])|BS\.?\s*th[uự]c\s*hi[eệ]n)\s*[:=]?\s*([^\n\r|]{3,80})",
            raw_text,
            re.UNICODE,
        )
        if doc_m:
            administrative_info["doctor_performer"] = doc_m.group(1).strip()
        else:
            bs_line_m = re.search(
                r"(?m)(BS\.\s*(?:CK[I|II]+\.?\s*)?[A-ZÀ-Ỹ][^\n\r]{3,60})",
                raw_text,
            )
            if bs_line_m:
                administrative_info["doctor_performer"] = bs_line_m.group(1).strip()

        dept_m = re.search(
            r"(?i)(?:Khoa|Ph[oò]ng\s*kh[aá]m)\s*[:=]?\s*([^\n\r|]{3,80})",
            raw_text,
            re.UNICODE,
        )
        if dept_m:
            administrative_info["department"] = dept_m.group(1).strip()

        # Fallback sinh hiệu từ raw_text nếu không nằm trong bảng
        if vitals["blood_pressure_systolic"] is None:
            bp_m = re.search(
                r"(?i)Huy[eế]t\s*[aá]p\s*[:=]?\s*([0-9]{2,3})\s*/\s*([0-9]{2,3})",
                raw_text,
                re.UNICODE,
            )
            if bp_m:
                vitals["blood_pressure_systolic"] = float(bp_m.group(1))
                vitals["blood_pressure_diastolic"] = float(bp_m.group(2))

        if vitals["weight_kg"] is None:
            wt_m = re.search(
                r"(?i)C[aâ]n\s*n[aặ]ng\s*(?:m[eẹ]|thai\s*ph[uụ])\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kg)?",
                raw_text,
                re.UNICODE,
            )
            if wt_m:
                val = self._normalize_float(wt_m.group(1))
                if val is not None and 30.0 <= val <= 150.0:
                    vitals["weight_kg"] = round(val, 2)

        # Fallback xét nghiệm từ đoạn văn bản gộp (Mục IV)
        if labs["hgb"] is None:
            hb_m = re.search(r"(?i)\b(?:HGB|Hb)\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:g/dL)?", raw_text)
            if hb_m:
                val = self._normalize_float(hb_m.group(1))
                if val is not None:
                    labs["hgb"] = str(round(val, 2))

        if labs["glucose"] is None:
            glu_m = re.search(
                r"(?i)(?:Đường\s*huyết(?:\s*đói)?|Glucose)\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:mmol/L)?",
                raw_text,
                re.UNICODE,
            )
            if glu_m:
                val = self._normalize_float(glu_m.group(1))
                if val is not None:
                    labs["glucose"] = str(round(val, 2))

        if labs["urine_protein"] is None:
            prot_m = re.search(r"(?i)Protein\s*(?:niệu)?\s*[:=]?\s*(\(\s*[+-]+\s*\)|Âm\s*tính|Dương\s*tính|[0-9]+(?:[.,][0-9]+)?)", raw_text)
            if prot_m:
                labs["urine_protein"] = "Âm tính" if "-" in prot_m.group(1) else prot_m.group(1)

        if labs["urine_leukocyte"] is None:
            leu_m = re.search(r"(?i)(?:Bạch\s*cầu|Leukocyte)\s*(?:niệu)?\s*[:=]?\s*(\(\s*[+-]+\s*\)|Âm\s*tính|Dương\s*tính|[0-9]+)", raw_text)
            if leu_m:
                labs["urine_leukocyte"] = "Âm tính" if "-" in leu_m.group(1) else leu_m.group(1)

        # Kết luận chuyên môn & Dặn dò
        conc_m = re.search(
            r"(?im)^(?:\s*)(?:K[EẾ]T\s*LU[AẬ]N|CH[AẨ]N\s*[ĐD]O[AÁ]N)\s*[:\-]?\s*(.+?)(?=(?:\n\s*(?:[ĐD][EỀ]\s*NGH[IỊ]|D[AẶ]N\s*D[OÒ]|L[OỜ]I\s*KHUY[EÊ]N|H[EẸ]N\s*T[AÁ]I\s*KH[AÁ]M|B[AÁ]C\s*S[IĨ]|$)))",
            raw_text,
            re.DOTALL | re.UNICODE,
        )
        if conc_m:
            conclusions["summary"] = re.sub(r"\s+", " ", conc_m.group(1)).strip()

        rec_m = re.search(
            r"(?im)^(?:\s*)(?:[ĐD][EỀ]\s*NGH[IỊ]|D[AẶ]N\s*D[OÒ]|H[EẸ]N\s*T[AÁ]I\s*KH[AÁ]M)\s*[:\-]?\s*(.+?)(?=(?:\n\s*(?:B[AÁ]C\s*S[IĨ]|NG[AÀ]Y|$)))",
            raw_text,
            re.DOTALL | re.UNICODE,
        )
        if rec_m:
            conclusions["recommendations"] = re.sub(r"\s+", " ", rec_m.group(1)).strip()

        return {
            "administrative_info": administrative_info,
            "vitals": vitals,
            "labs": labs,
            "conclusions": conclusions,
        }

    def extract_pdf_fast_path(
        self, file_bytes: bytes, document_type: str = "ultrasound_report"
    ) -> Dict[str, Any]:
        """
        Thực thi toàn bộ luồng Hybrid Fast Path trên file PDF nhị phân:
        1. Dùng PyMuPDF (fitz) đọc text layer giữ layout (sort=True).
        2. Nếu là Digital PDF, dùng pdfplumber bóc tách cấu trúc bảng.
        3. Chạy Table-First + Text-Fallback Parser cho sinh trắc học & các mục lâm sàng mở rộng.
        4. Nếu là Scanned PDF, trả về cờ is_digital_pdf = False để chuyển sang OCR pipeline.
        """
        start_time = time.perf_counter()
        is_digital, full_text, total_pages = self.is_digital_pdf(file_bytes)

        if not is_digital:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return {
                "document_type": document_type,
                "extraction_method": None,
                "is_digital_pdf": False,
                "extracted_fields": {},
                "clinical_sections": {},
                "raw_text": "",
                "confidence_scores": {},
                "metadata": {
                    "total_pages": total_pages,
                    "char_count": len(full_text.strip()),
                    "tables_count": 0,
                    "engine": "pymupdf+pdfplumber",
                    "is_digital_pdf": False,
                    "processing_time_ms": duration_ms,
                    "extracted_at": datetime.utcnow().isoformat() + "Z",
                    "note": "PDF scan/ảnh không có text layer số hóa, chuyển tiếp sang Slow Path (OCR Pipeline).",
                },
            }

        tables = self.extract_tables_with_pdfplumber(file_bytes)
        extracted_fields, confidence_scores = self.parse_ultrasound_biometrics(
            full_text, tables=tables
        )
        clinical_sections = self.parse_clinical_sections(full_text, tables=tables)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "document_type": document_type,
            "extraction_method": "pdf_text_layer_fast_path",
            "is_digital_pdf": True,
            "extracted_fields": extracted_fields,
            "clinical_sections": clinical_sections,
            "raw_text": full_text,
            "confidence_scores": confidence_scores,
            "metadata": {
                "total_pages": total_pages,
                "char_count": len(full_text),
                "tables_count": len(tables),
                "engine": "pymupdf+pdfplumber",
                "is_digital_pdf": True,
                "processing_time_ms": duration_ms,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
            },
        }


pdf_extractor = PdfFastPathExtractor()
