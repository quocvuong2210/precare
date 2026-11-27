# API CONTRACT & INTERFACE SPECIFICATION
## STORY-5.1: Đánh giá Lâm sàng (LMS Reference, Z-Score & Rule Engine 3 mức)

- **Mã Story:** STORY-5.1
- **Tên Story:** Đánh giá Lâm sàng & Cảnh báo Cờ đỏ 3 mức (Clinical Evaluation & Rules)
- **Module:** M-ANALYSIS (Clinical Rule Engine & LMS Reference Standards)
- **Chuẩn CSDL:** PostgreSQL 16 (`growth_references`, `analysis_results`)
- **Liên kết Tasks:**
  - **PRC-59:** `[BE]` Nạp bảng tham chiếu LMS INTERGROWTH-21st & Hadlock vào PostgreSQL (`growth_references`).
  - **PRC-60:** `[BE]` Cài đặt thuật toán tính Z-score, Percentile và API tra cứu chuẩn tham chiếu (`/api/v1/growth-references/*`).
  - **PRC-69:** `[BE]` Xây dựng Rule Engine đánh giá cờ đỏ 3 mức & lưu kết quả kèm `rules_version` (`/api/v1/clinical-rules/*`).
  - **PRC-70:** `[Web]` Component hiển thị Badge cảnh báo 3 mức, Bảng giải thích chuyên môn & Disclaimer cố định (`ClinicalEvaluationPanel`).

---

## 1. Sơ đồ Bảng CSDL (PostgreSQL 16)

### 1.1 Bảng `growth_references` (PRC-59)
- Lưu thông số LMS (`l_value`, `m_value`, `s_value`) và 5 mốc bách phân vị chuẩn (`p3`, `p10`, `p50`, `p90`, `p97`) theo từng ngày tuổi thai (`ga_days` từ `14` đến `310`).
- `standard`: `'intergrowth_21st' | 'hadlock'`
- `metric`: `'crl' | 'bpd' | 'hc' | 'ac' | 'fl' | 'efw'`
- `unit`: `'mm' | 'g'`
- Unique constraint: `(standard, metric, ga_days, version)`
- Partial index: `idx_growth_references_lookup ON growth_references(standard, metric, ga_days) WHERE is_deleted = FALSE`

### 1.2 Bảng `analysis_results` (PRC-69)
- Lưu kết quả đánh giá theo từng `biometric_data_id` kèm `rules_version` (`hadlock-intergrowth-v1.0`) và `model_version` (`rule-engine-only` hoặc phiên bản RACA-Net).
- Z-score & Percentile cho 5 chỉ số (`bpd`, `hc`, `ac`, `fl`, `efw`).
- `warning_level`: `'green' | 'yellow' | 'red'`
- `explanation_doctor`, `explanation_patient`, `disclaimer_text`, `analyzed_at`.

---

## 2. API Endpoints — Growth References & Z-Score (PRC-60)

Tất cả endpoints dưới prefix `/api/v1/growth-references` yêu cầu JWT Bearer Token (`get_current_user`).

### 2.1 `GET /api/v1/growth-references/point`
Tra cứu thông số LMS và 5 mốc bách phân vị tại một ngày tuổi thai.

- **Query Parameters:**
  - `standard`: `'intergrowth_21st' | 'hadlock'` (required)
  - `metric`: `'crl' | 'bpd' | 'hc' | 'ac' | 'fl' | 'efw'` (required)
  - `ga_days`: `integer` (`14 <= ga_days <= 310`, required)
  - `version`: `string` (default: `'v1.0'`)
- **Response `200 OK` (`GrowthReferenceItemResponse`):**
```json
{
  "standard": "intergrowth_21st",
  "metric": "hc",
  "ga_days": 140,
  "unit": "mm",
  "l_value": 1.0,
  "m_value": 172.4821,
  "s_value": 0.0412,
  "p3": 159.11,
  "p10": 163.37,
  "p50": 172.4821,
  "p90": 181.59,
  "p97": 185.85,
  "version": "v1.0"
}
```
- **Errors:** `404 Not Found` nếu không có dữ liệu cho `(standard, metric, ga_days)`.

### 2.2 `GET /api/v1/growth-references/curves`
Tra cứu chuỗi đường cong tham chiếu LMS theo khoảng tuổi thai để vẽ biểu đồ 5 dải bách phân vị.

- **Query Parameters:**
  - `standard`, `metric`, `version` (như trên)
  - `min_ga_days`: `integer` (`14..310`, optional)
  - `max_ga_days`: `integer` (`14..310`, optional)
- **Response `200 OK` (`GrowthReferenceCurveResponse`):**
```json
{
  "standard": "hadlock",
  "metric": "efw",
  "unit": "g",
  "version": "v1.0",
  "points": [ "...GrowthReferenceItemResponse[]" ]
}
```
- **Errors:** `422 Unprocessable Entity` nếu `min_ga_days > max_ga_days`; `404 Not Found` nếu không có dữ liệu.

### 2.3 `POST /api/v1/growth-references/evaluate`
Tính Z-score, Percentile và phân loại tăng trưởng cho một giá trị đo đơn lẻ.

- **Request Body (`ZScoreEvaluateRequest`):**
```json
{
  "standard": "intergrowth_21st",
  "metric": "efw",
  "ga_days": 224,
  "value": 1750.0
}
```
- **Response `200 OK` (`ZScoreEvaluateResponse`):**
```json
{
  "standard": "intergrowth_21st",
  "metric": "efw",
  "ga_days": 224,
  "unit": "g",
  "value": 1750.0,
  "z_score": -0.02,
  "percentile": 49.2,
  "classification": "normal",
  "reference": { "...GrowthReferenceItemResponse" }
}
```
- **`classification` values:** `'below_p3' | 'p3_to_p10' | 'normal' | 'above_p90' | 'above_p97'`.

---

## 3. API Endpoints — Clinical Rule Engine (PRC-69)

Prefix: `/api/v1/clinical-rules`.

### 3.1 `POST /api/v1/clinical-rules/evaluate`
Đánh giá cờ đỏ 3 mức cho bản ghi `biometric_data_id`, tự động kiểm tra sụt giảm quỹ đạo `> 20` điểm bách phân vị so với lần đánh giá trước, và lưu vào `analysis_results` kèm `rules_version`.

- **RBAC:** `doctor`, `admin`.
- **Request Body (`ClinicalRuleEvaluateRequest`):**
```json
{
  "biometric_data_id": "uuid",
  "standard": "intergrowth_21st",
  "nt_mm": null,
  "afi_cm": null,
  "previous_efw_percentile": null
}
```
- **Quy tắc 3 mức (`hadlock-intergrowth-v1.0`):**
  - `red`: `EFW < 3rd` hoặc `AC < 3rd`, `NT >= 3.0 mm`, `AFI < 5.0 cm` hoặc `AFI > 24.0 cm`.
  - `yellow`: `EFW` hoặc `AC` `< 10th` hoặc `> 90th`, sụt giảm quỹ đạo `> 20` điểm bách phân vị, hoặc `BPD`/`HC`/`FL` ngoài `5th–95th`.
  - `green`: Tất cả chỉ số nằm trong giới hạn bình thường.
- **Response `201 Created` (`ClinicalRuleEvaluateResponse`):**
```json
{
  "id": "uuid",
  "pregnancy_profile_id": "uuid",
  "checkup_id": "uuid",
  "biometric_data_id": "uuid",
  "model_version": "rule-engine-only",
  "rules_version": "hadlock-intergrowth-v1.0",
  "bpd_zscore": -0.15,
  "bpd_percentile": 44.04,
  "hc_zscore": 0.12,
  "hc_percentile": 54.78,
  "ac_zscore": -0.08,
  "ac_percentile": 46.81,
  "fl_zscore": 0.05,
  "fl_percentile": 51.99,
  "efw_zscore": -0.10,
  "efw_percentile": 46.02,
  "anomaly_probability": 0.05,
  "warning_level": "green",
  "explanation_doctor": "BÌNH THƯỜNG: Tất cả các chỉ số sinh trắc được đánh giá nằm trong giới hạn chuẩn theo tuổi thai.",
  "explanation_patient": "Các chỉ số phát triển của thai nhi đều nằm trong giới hạn bình thường khỏe mạnh.",
  "disclaimer_text": "Kết quả phân tích từ hệ thống hỗ trợ ra quyết định lâm sàng PreCare. Bác sĩ chuyên khoa giữ quyền chẩn đoán cuối cùng.",
  "analyzed_at": "2026-11-27T00:48:00Z",
  "flags": []
}
```

### 3.2 `GET /api/v1/clinical-rules/pregnancy-profile/{pregnancy_profile_id}`
Lấy danh sách kết quả đánh giá đã lưu theo hồ sơ thai kỳ (mới nhất trước).

- **RBAC:** `doctor`, `admin`, `pregnant_woman` (chỉ được xem hồ sơ của chính mình; trả về `403 Forbidden` nếu không phải chủ hồ sơ).
- **Response `200 OK`:** `ClinicalRuleEvaluateResponse[]`.

---

## 4. Đồng bộ Frontend Web Doctor (`web_doctor/`) (PRC-70)
- **TypeScript Interfaces (`web_doctor/src/types/index.ts`):** Đã đồng bộ `AnalysisResult`, `ClinicalRuleEvaluateRequest`, `GrowthStandard`, `BiometricMetric`, `BiometricUnit`, `PercentileClassification`, `GrowthReferenceItemResponse`, `GrowthReferenceCurveResponse`, `ZScoreEvaluateRequest`, `ZScoreEvaluateResponse`.
- **Service (`web_doctor/src/services/clinicalRule.service.ts`):** `evaluateBiometricRulesApi`, `fetchProfileRuleEvaluationsApi`.
- **UI Components (`web_doctor/src/components/ClinicalEvaluationPanel.tsx`):** `WarningLevelBadge`, `ClinicalExplanationTable`, `ClinicalDisclaimerBanner`, `ClinicalEvaluationPanel`.
