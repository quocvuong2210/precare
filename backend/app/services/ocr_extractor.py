# backend/app/services/ocr_extractor.py
"""
PreCare Ingestion Engine - PaddleOCR Slow Path Pipeline
Sub-task 4.2.2 (Worker): Xây dựng pipeline OCR (PaddleOCR) xử lý ảnh chụp/scan
"""

import io
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

from PIL import Image, ImageOps
import fitz  # PyMuPDF

from app.core.config import settings
from app.services.pdf_extractor import pdf_extractor

logger = logging.getLogger(__name__)


class OcrPipelineExtractor:
    """
    Pipeline OCR tiếp nhận và xử lý tài liệu cận lâm sàng dạng ảnh (JPG, PNG)
    hoặc PDF scan không có text layer số hóa (Slow Path).
    Sử dụng PaddleOCR Engine với khả năng phát hiện góc nghiêng và nhận dạng tiếng Việt.
    """

    def __init__(self):
        self._engine = None
        self._custom_engine = None

    def set_ocr_engine(self, engine: Any) -> None:
        """Cho phép inject mock engine trong môi trường kiểm thử (Testing/CI)"""
        self._custom_engine = engine

    def get_ocr_engine(self) -> Any:
        """
        Lazy-loading Singleton cho PaddleOCR.
        Chỉ khởi tạo mô hình một lần duy nhất trong vòng đời tiến trình Celery worker.
        """
        if self._custom_engine is not None:
            return self._custom_engine

        if self._engine is None:
            try:
                import os
                os.environ["FLAGS_use_mkldnn"] = "0"
                os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
                import importlib
                paddle_mod = importlib.import_module("paddleocr")
                paddle_ocr_class = getattr(paddle_mod, "PaddleOCR")
                logger.info(
                    f"[OCR Engine] Đang khởi tạo PaddleOCR (lang={settings.OCR_LANG})..."
                )
                try:
                    self._engine = paddle_ocr_class(
                        lang=settings.OCR_LANG,
                        enable_mkldnn=False,
                    )
                except Exception:
                    try:
                        self._engine = paddle_ocr_class(
                            use_angle_cls=settings.OCR_USE_ANGLE_CLS,
                            lang=settings.OCR_LANG,
                            use_gpu=settings.OCR_USE_GPU,
                            show_log=False,
                        )
                    except Exception:
                        self._engine = paddle_ocr_class(lang=settings.OCR_LANG)
                logger.info("[OCR Engine] Khởi tạo PaddleOCR thành công.")
            except (ImportError, ModuleNotFoundError) as err:
                logger.warning(
                    f"[OCR Engine] Không thể nạp module PaddleOCR ({err}). "
                    "Hệ thống sẽ chạy ở chế độ dự phòng."
                )
                self._engine = None
            except Exception as e:
                logger.error(f"[OCR Engine] Lỗi khi nạp trọng số mô hình PaddleOCR: {e}", exc_info=True)
                self._engine = None

        return self._engine

    def preprocess_image(self, image_input: Union[bytes, Image.Image]) -> Image.Image:
        """
        Tiền xử lý ảnh chụp/scan để tối ưu độ chính xác nhận dạng OCR:
        1. Tự động xoay ảnh theo thẻ EXIF (ảnh chụp từ điện thoại).
        2. Chuyển đổi định dạng màu sắc sang RGB chuẩn.
        3. Cân chỉnh độ phân giải: upscale nếu ảnh quá nhỏ (< 600px), downscale nếu quá lớn (> 3000px).
        """
        if isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        else:
            image = image_input

        # 1. Điều chỉnh góc xoay theo EXIF orientation
        try:
            image = ImageOps.exif_transpose(image)
        except Exception as e:
            logger.debug(f"[OCR Preprocessing] Bỏ qua EXIF transpose: {e}")

        # 2. Chuẩn hóa về hệ màu RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # 3. Chuẩn hóa kích thước hình ảnh
        width, height = image.size
        min_dim = min(width, height)
        max_dim = max(width, height)

        # Upscale nếu kích thước quá nhỏ để đọc được chữ số siêu âm li ti
        if min_dim < 600:
            scale = 600.0 / min_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
            resample_filter = getattr(Image.Resampling, "LANCZOS", Image.LANCZOS)
            image = image.resize((new_width, new_height), resample=resample_filter)
        # Downscale nếu ảnh quá khổ để tránh nghẽn bộ nhớ RAM
        elif max_dim > 3000:
            scale = 3000.0 / max_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
            resample_filter = getattr(Image.Resampling, "LANCZOS", Image.LANCZOS)
            image = image.resize((new_width, new_height), resample=resample_filter)

        return image

    def extract_images_from_scanned_pdf(self, pdf_bytes: bytes) -> List[Image.Image]:
        """
        Render toàn bộ các trang của tài liệu PDF scan thành ảnh RGB sắc nét (200 DPI) bằng PyMuPDF (fitz).
        Tránh bỏ sót ảnh ghép nhiều mảnh hoặc chữ vector, không phụ thuộc poppler/pdftoppm.
        """
        extracted_images: List[Image.Image] = []
        if not pdf_bytes:
            return extracted_images

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            try:
                for page_idx, page in enumerate(doc):
                    try:
                        pix = page.get_pixmap(dpi=200, alpha=False)
                        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                        extracted_images.append(img)
                    except Exception as err:
                        logger.warning(
                            f"[OCR Extractor] Không thể render trang {page_idx} từ PDF: {err}"
                        )
            finally:
                doc.close()
        except Exception as e:
            logger.error(f"[OCR Extractor] Lỗi trích xuất ảnh từ scanned PDF bằng PyMuPDF: {e}")

        return extracted_images

    def sort_and_reconstruct_text(
        self, ocr_results: List[Any], line_grouping_tol: float = 15.0
    ) -> Tuple[str, float]:
        """
        Sắp xếp các bounding boxes theo trật tự đọc tự nhiên (từ trên xuống dưới, từ trái sang phải)
        và ghép nối thành văn bản `raw_text` hoàn chỉnh, đồng thời tính điểm tin cậy trung bình.
        """
        if not ocr_results:
            return "", 0.0

        # Chuẩn hóa danh sách các box: mỗi phần tử có dạng (box, text, confidence)
        items = []
        for res in ocr_results:
            if not res or len(res) < 2:
                continue
            box = res[0]
            text_conf = res[1]
            if isinstance(text_conf, (list, tuple)) and len(text_conf) >= 2:
                text = str(text_conf[0]).strip()
                conf = float(text_conf[1])
            else:
                text = str(text_conf).strip()
                conf = 0.9

            if not text:
                continue

            # Tính tọa độ đại diện của hộp chữ
            try:
                y_top = min(pt[1] for pt in box)
                x_left = min(pt[0] for pt in box)
            except Exception:
                y_top = 0.0
                x_left = 0.0

            items.append({
                "y_top": y_top,
                "x_left": x_left,
                "text": text,
                "conf": conf,
            })

        if not items:
            return "", 0.0

        # Sắp xếp sơ bộ theo chiều dọc
        items.sort(key=lambda it: it["y_top"])

        # Nhóm các từ nằm trên cùng một dòng ngang
        lines: List[List[Dict[str, Any]]] = []
        for it in items:
            placed = False
            for line in lines:
                # Nếu độ chênh lệch y_top nhỏ hơn ngưỡng tolerance thì coi như cùng dòng
                if abs(line[0]["y_top"] - it["y_top"]) <= line_grouping_tol:
                    line.append(it)
                    placed = True
                    break
            if not placed:
                lines.append([it])

        # Sắp xếp các từ trong từng dòng từ trái sang phải
        formatted_lines = []
        all_confs = []
        for line in lines:
            line.sort(key=lambda it: it["x_left"])
            line_str = " ".join(it["text"] for it in line)
            formatted_lines.append(line_str)
            for it in line:
                all_confs.append(it["conf"])

        full_raw_text = "\n".join(formatted_lines).strip()
        avg_confidence = round(sum(all_confs) / len(all_confs), 2) if all_confs else 0.0

        return full_raw_text, avg_confidence

    def _execute_ocr_on_pil(self, image: Image.Image) -> List[Any]:
        """Thực thi nhận dạng ký tự quang học trên đối tượng PIL Image"""
        engine = self.get_ocr_engine()
        if engine is None:
            # Chế độ fallback nếu PaddleOCR chưa được cài đặt trong môi trường
            logger.warning("[OCR Pipeline] PaddleOCR Engine không sẵn sàng, bỏ qua nhận diện chi tiết.")
            return []

        # Chuyển PIL Image sang in-memory PNG bytes buffer
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        try:
            # Kiểm tra phương thức suy luận hiện đại (PaddleOCR v3+)
            if hasattr(engine, "predict"):
                try:
                    import numpy as np
                    np_img = np.array(image.convert("RGB"))
                    preds = list(engine.predict(np_img))
                    if preds and len(preds) > 0 and isinstance(preds[0], dict):
                        p = preds[0]
                        polys = p.get("dt_polys")
                        if polys is None:
                            polys = p.get("rec_polys")
                        texts = p.get("rec_texts") or []
                        scores = p.get("rec_scores") or []
                        parsed_boxes = []
                        for i in range(len(texts)):
                            poly = polys[i] if polys is not None and i < len(polys) else [[0, 0], [0, 0], [0, 0], [0, 0]]
                            score = float(scores[i]) if i < len(scores) else 0.95
                            parsed_boxes.append([poly, (texts[i], score)])
                        if parsed_boxes:
                            return parsed_boxes
                except Exception as pred_err:
                    logger.debug(f"[OCR Pipeline] engine.predict fallback: {pred_err}")

            # PaddleOCR legacy/mock returns a list of results (one per image/page)
            if hasattr(engine, "ocr"):
                try:
                    ocr_output = engine.ocr(img_bytes, cls=True)
                except TypeError:
                    ocr_output = engine.ocr(img_bytes)
                if ocr_output and len(ocr_output) > 0 and ocr_output[0] is not None:
                    return ocr_output[0]
            return []
        except Exception as e:
            logger.error(f"[OCR Pipeline] Lỗi trong quá trình suy luận PaddleOCR: {e}", exc_info=True)
            return []

    def extract_ocr_pipeline(
        self,
        file_bytes: bytes,
        file_type: str = "image/jpeg",
        document_type: str = "ultrasound_report",
    ) -> Dict[str, Any]:
        """
        Thực thi toàn bộ luồng xử lý Slow Path (OCR Pipeline):
        1. Phân loại định dạng: PDF scan hay Ảnh chụp trực tiếp.
        2. Tiền xử lý hình ảnh và bóc tách các trang scan.
        3. Thực thi động cơ PaddleOCR trên từng trang.
        4. Tái cấu trúc văn bản thô theo đúng trật tự đọc.
        5. Bóc tách các chỉ số sinh trắc học sản khoa bằng Parser chuẩn.
        6. Đóng gói kết quả ocr_raw_payload chuẩn hóa theo hợp đồng STORY-4.2.
        """
        start_time = time.perf_counter()
        is_pdf = (
            file_type == "application/pdf"
            or file_type.lower().endswith(".pdf")
        )

        images_to_process: List[Image.Image] = []
        total_pages = 1

        if is_pdf:
            # Trích xuất các ảnh trang scan từ PDF
            scanned_images = self.extract_images_from_scanned_pdf(file_bytes)
            if scanned_images:
                images_to_process.extend(scanned_images)
                total_pages = len(scanned_images)
            else:
                # Edge case: PDF scan rỗng hoặc không có ảnh nhúng
                total_pages = 1
        else:
            # Ảnh chụp đơn lẻ (JPG, PNG)
            try:
                img = Image.open(io.BytesIO(file_bytes))
                images_to_process.append(img)
            except Exception as err:
                logger.error(f"[OCR Pipeline] Không thể mở file ảnh đầu vào: {err}")

        page_texts: List[str] = []
        page_confs: List[float] = []

        # Xử lý OCR tuần tự cho từng trang/ảnh
        for idx, raw_img in enumerate(images_to_process):
            processed_img = self.preprocess_image(raw_img)
            ocr_boxes = self._execute_ocr_on_pil(processed_img)
            text, avg_conf = self.sort_and_reconstruct_text(ocr_boxes)
            if text:
                page_texts.append(text)
                page_confs.append(avg_conf)

        combined_raw_text = "\n\n".join(page_texts).strip()
        overall_ocr_conf = (
            round(sum(page_confs) / len(page_confs), 2) if page_confs else 0.90
        )

        # Bóc tách các chỉ số sinh trắc học sản khoa & mục lâm sàng (Sub-task 4.2.3)
        extracted_fields, confidence_scores = pdf_extractor.parse_ultrasound_biometrics(
            combined_raw_text
        )
        clinical_sections = pdf_extractor.parse_clinical_sections(combined_raw_text)

        # Kết hợp điểm tin cậy quang học với điểm tin cậy Regex
        for k, v in confidence_scores.items():
            # Điều chỉnh nhẹ điểm tin cậy theo chất lượng quang học của PaddleOCR
            confidence_scores[k] = round(min(v, max(0.85, overall_ocr_conf)), 2)

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "document_type": document_type,
            "extraction_method": "ocr_pipeline_slow_path",
            "is_digital_pdf": False,
            "extracted_fields": extracted_fields,
            "clinical_sections": clinical_sections,
            "raw_text": combined_raw_text,
            "confidence_scores": confidence_scores,
            "metadata": {
                "total_pages": total_pages,
                "char_count": len(combined_raw_text),
                "is_digital_pdf": False,
                "processing_time_ms": duration_ms,
                "extracted_at": datetime.utcnow().isoformat() + "Z",
                "ocr_engine": "PaddleOCR",
                "pages_processed": len(images_to_process),
                "ocr_quality_score": overall_ocr_conf,
                "note": "Extracted via PaddleOCR pipeline (Slow Path)",
            },
        }


ocr_extractor = OcrPipelineExtractor()
