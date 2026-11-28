# API CONTRACT & INTERFACE SPECIFICATION
## STORY-6.1: Quỹ đạo Tăng trưởng Thai nhi, Chuẩn LMS & Phân tích Cảnh báo L5

- **Mã Story:** STORY-6.1
- **Tên Story:** Quỹ đạo Tăng trưởng Thai nhi (Trajectory), Đường cong chuẩn LMS & Phân tích Cảnh báo Lâm sàng Tầng L5
- **Module:** M-ANALYSIS & M-RECORD (Theo dõi Quỹ đạo Sinh trắc dọc & Hỗ trợ Quyết định Lâm sàng)
- **Chuẩn CSDL:** PostgreSQL 16 (`pregnancy_profiles`, `checkups`, `biometric_data`, `growth_references`, `analysis_results`)
- **Liên kết Tasks:**
  - **PRC-59 / PRC-60 ([BE]):** Bảng tham chiếu LMS (INTERGROWTH-21st & Hadlock), tính Z-score & Percentile.
  - **PRC-69 ([BE]):** Động cơ luật lâm sàng 3 mức (`green`, `yellow`, `red`) và lưu `rules_version`.
  - **PRC-66 / PRC-67 ([BE]):** Internal Analysis API, cơ chế Rule-only Fallback & tầng L5 Safety Fusion `max(rule, model)` + kiểm soát truy vết `model_version`.
  - **PRC-74 ([BE]):** `GET /api/records/{id}/trajectory` trả về chuỗi điểm đo, độ lệch Delta & đường cong chuẩn LMS.

---

## 1. QUỸ ĐẠO TĂNG TRƯỞNG & ĐỘ LỆCH DELTA (PRC-74)

### 1.1 `GET /api/records/{record_id}/trajectory` (Alias: `GET /api/v1/records/{record_id}/trajectory`)
Trả về chuỗi điểm đo sinh trắc học theo thứ tự thời gian (`gestational_age_days` tăng dần), độ lệch Delta (so với trung vị P50 và so với lần khám liền trước), cờ cảnh báo tụt `> 20` điểm bách phân vị, và đường cong chuẩn LMS 5 mốc (`3rd`, `10th`, `50th`, `90th`, `97th`).

- **Quyền truy cập (RBAC):** `doctor`, `admin`, `pregnant_woman` (với `pregnant_woman`, chỉ được xem hồ sơ mà `profile.patient_id == current_user.id`, vi phạm trả `403 Forbidden`).
- **Path Parameter:**
  - `record_id` (`UUID`, required): ID của `pregnancy_profiles`.
- **Query Parameters:**
  - `metric` (`string`, default `"efw"`): `"crl" | "bpd" | "hc" | "ac" | "fl" | "efw"`
  - `standard` (`string`, default `"intergrowth_21st"`): `"intergrowth_21st" | "hadlock"`
  - `version` (`string`, default `"1.0.0"`): Phiên bản bảng tham chiếu LMS.
  - `min_ga_days` (`int`, optional, `14..310`): Lọc tuổi thai tối thiểu (ngày).
  - `max_ga_days` (`int`, optional, `14..310`): Lọc tuổi thai tối đa (ngày).

#### Response `200 OK` (`TrajectoryResponse`)
```json
{
  "pregnancy_profile_id": "2c92d8d7-8486-45a2-8d5c-5e0f5b5d0f21",
  "patient_id": "8e357022-c66b-4ad7-96d8-3081a9588f50",
  "metric": "efw",
  "standard": "intergrowth_21st",
  "unit": "g",
  "lms_version": "1.0.0",
  "measurements": [
    {
      "biometric_data_id": "d21a8e41-2d2f-4e8a-9b3b-12d6b66f9d11",
      "checkup_id": "4e0f9033-8b76-48e0-bc21-0174f12e3d05",
      "checkup_date": "2026-07-16",
      "ga_days": 196,
      "ga_formatted": "28w 0d",
      "value": 1200.0,
      "z_score": 0.45,
      "percentile": 67.36,
      "classification": "normal",
      "warning_level": "green",
      "delta_from_median": 75.2,
      "delta_from_median_pct": 6.69,
      "delta_value_from_prev": null,
      "delta_ga_days_from_prev": null,
      "growth_velocity_per_week": null,
      "delta_percentile_from_prev": null,
      "is_trajectory_drop_alert": false
    },
    {
      "biometric_data_id": "f94b1e22-9f44-420e-9b8b-8a014d9f55a2",
      "checkup_id": "b62d8851-3b6b-4bd3-94aa-5b9a24c71022",
      "checkup_date": "2026-08-13",
      "ga_days": 224,
      "ga_formatted": "32w 0d",
      "value": 1620.0,
      "z_score": -0.71,
      "percentile": 23.89,
      "classification": "normal",
      "warning_level": "yellow",
      "delta_from_median": -190.4,
      "delta_from_median_pct": -10.52,
      "delta_value_from_prev": 420.0,
      "delta_ga_days_from_prev": 28,
      "growth_velocity_per_week": 105.0,
      "delta_percentile_from_prev": -43.47,
      "is_trajectory_drop_alert": true
    }
  ],
  "summary": {
    "total_points": 2,
    "latest_ga_days": 224,
    "latest_value": 1620.0,
    "latest_percentile": 23.89,
    "latest_z_score": -0.71,
    "overall_delta_value": 420.0,
    "overall_delta_percentile": -43.47,
    "has_trajectory_drop_alert": true
  },
  "lms_curve": [
    {
      "id": "0a7714bd-41c8-4c58-8755-6802b07c7e20",
      "standard": "intergrowth_21st",
      "metric": "efw",
      "ga_days": 196,
      "l_value": 0.1234,
      "m_value": 1124.8,
      "s_value": 0.118,
      "p3": 890.1,
      "p10": 962.5,
      "p50": 1124.8,
      "p90": 1310.4,
      "p97": 1412.9,
      "unit": "g",
      "version": "1.0.0"
    }
  ]
}
```

#### Mã lỗi chuẩn
- `401 Unauthorized`: Thiếu hoặc sai JWT Bearer Token.
- `403 Forbidden`: Thai phụ truy cập `record_id` không thuộc quyền sở hữu.
- `404 Not Found`: Không tìm thấy `PregnancyProfile` hoặc hồ sơ đã bị xóa mềm.
- `422 Unprocessable Entity`: `min_ga_days > max_ga_days` hoặc tham số ngoài phạm vi (`14..310`).

---

## 2. ĐƯỜNG CONG CHUẨN LMS & ĐÁNH GIÁ Z-SCORE (PRC-59 / PRC-60)

### 2.1 `GET /api/v1/growth-references/point`
Tra cứu thông số LMS và 5 mốc bách phân vị (`p3`, `p10`, `p50`, `p90`, `p97`) tại đúng 1 ngày tuổi thai (`ga_days`).
- **RBAC:** Authenticated User (`get_current_user`).
- **Query Params:** `standard`, `metric`, `ga_days` (`14..310`), `version` (default `"1.0.0"`).
- **Response `200 OK`:** `GrowthReferenceItemResponse`.

### 2.2 `GET /api/v1/growth-references/curves`
Tra cứu chuỗi đường cong tham chiếu LMS theo khoảng tuổi thai.
- **RBAC:** Authenticated User (`get_current_user`).
- **Query Params:** `standard`, `metric`, `min_ga_days` (optional), `max_ga_days` (optional), `version`.
- **Response `200 OK`:** `{ "standard": "...", "metric": "...", "unit": "...", "version": "...", "points": [...] }`.

### 2.3 `POST /api/v1/growth-references/evaluate`
Tính Z-score, Percentile và phân loại (`below_p3`, `p3_to_p10`, `normal`, `above_p90`, `above_p97`) từ giá trị đo.
- **Request Body (`ZScoreEvaluateRequest`):**
  ```json
  {
    "standard": "intergrowth_21st",
    "metric": "efw",
    "ga_days": 210,
    "value": 1550.0
  }
  ```
- **Response `200 OK` (`ZScoreEvaluateResponse`):** Trả về `z_score`, `percentile`, `classification`, và `reference`.

---

## 3. ĐỘNG CƠ LUẬT LÂM SÀNG & TẦNG L5 SAFETY FUSION (PRC-66 / PRC-67 / PRC-69)

### 3.1 `POST /api/v1/clinical-rules/evaluate`
Đánh giá cờ đỏ 3 mức (`green`, `yellow`, `red`) cho `biometric_data_id` theo luật tất định và lưu kết quả vào `analysis_results` kèm `rules_version`.
- **RBAC:** `doctor`, `admin`.
- **Request Body (`ClinicalRuleEvaluateRequest`):**
  ```json
  {
    "biometric_data_id": "d21a8e41-2d2f-4e8a-9b3b-12d6b66f9d11",
    "standard": "intergrowth_21st",
    "nt_mm": null,
    "afi_cm": null,
    "previous_efw_percentile": null
  }
  ```
- **Response `201 Created` (`ClinicalRuleEvaluateResponse`):** Trả về bản ghi `AnalysisResult` kèm `flags` và `MANDATORY_DISCLAIMER`.

### 3.2 `GET /api/v1/clinical-rules/pregnancy-profile/{pregnancy_profile_id}`
Lấy danh sách kết quả đánh giá lâm sàng đã lưu theo hồ sơ thai kỳ (mới nhất trước).
- **RBAC:** `doctor`, `admin`, `pregnant_woman` (kiểm tra IDOR cho `pregnant_woman`).

### 3.3 `POST /api/v1/internal/analysis/evaluate`
Gọi `analysis_service` (`/api/v1/predict`) kèm cơ chế fallback nhiều tầng (`/api/v1/rules` $\rightarrow$ backend rule-only) và thực thi **Tầng L5 Safety Fusion `max(rule, model)`**.
- **RBAC:** `doctor`, `admin`.
- **Request Body (`InternalAnalysisRequest`):**
  ```json
  {
    "gestational_age_days": 210,
    "bpd": 76.0,
    "hc": 275.0,
    "ac": 260.0,
    "fl": 58.0,
    "efw": 1550.0,
    "biometric_data_id": null
  }
  ```
- **Response `200 OK` (`InternalAnalysisResponse`):**
  ```json
  {
    "warning_level": "red",
    "rule_warning_level": "red",
    "model_warning_level": "green",
    "safety_override_applied": true,
    "anomaly_probability": 0.05,
    "fallback_used": false,
    "fallback_mode": "none",
    "diagnostic_notice": null,
    "rule_version": "1.0.0-hadlock-intergrowth",
    "model_version": "1.0.0-racanet-v1",
    "analysis_result_id": null,
    "details": {}
  }
  ```

### 3.4 `POST /api/v1/internal/analysis/fuse-and-save`
Thực thi tầng L5 kết hợp `max(rule, model)` cho một `biometric_data_id` và lưu vào `analysis_results` kèm `model_version` và `rules_version`.
- **RBAC:** `doctor`, `admin`.
- **Response `201 Created` (`AnalysisTraceabilityResponse`)**.

### 3.5 `GET /api/v1/internal/analysis/traceability`
Truy vết lịch sử kết quả phân tích theo `pregnancy_profile_id`, `model_version`, `rules_version`, `warning_level` (`limit` mặc định `50`, tối đa `200`).
- **RBAC:** `doctor`, `admin`.
- **Response `200 OK`:** `List[AnalysisTraceabilityResponse]`.

### 3.6 `GET /api/v1/internal/analysis/health`
Kiểm tra trạng thái kết nối tới microservice `analysis_service`.
- **RBAC:** `doctor`, `admin`.
- **Response `200 OK` (`AnalysisHealthResponse`)**.
