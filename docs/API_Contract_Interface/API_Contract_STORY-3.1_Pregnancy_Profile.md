# API CONTRACT & INTERFACE SPECIFICATION
## STORY-3.1: Quản lý Hồ sơ Thai kỳ (Pregnancy Profile)

- **Mã Story:** STORY-3.1
- **Tên Story:** Quản lý Hồ sơ Thai kỳ (Pregnancy Profile)
- **Module:** M-RECORD (Quản lý Hồ sơ & Lịch sử Thai kỳ)
- **Chuẩn CSDL:** PostgreSQL 16 — Đồng bộ chính xác với sơ đồ 11 bảng của hệ thống PreCare (`pregnancy_profiles`, `users`, `audit_logs`).
- **Liên kết Tasks:**
  - **PRC-32 (Sub-task 3.1.1 - Backend):** Thiết kế schema `pregnancy_profiles` (LMP, Q1 Ultrasound, CRL, EDD).
  - **PRC-33 (Sub-task 3.1.2 - Backend):** Viết hàm logic y khoa tính toán tuổi thai ($g_t$) và ngày dự sinh (EDD) tại mọi thời điểm.
  - **PRC-34 (Sub-task 3.1.3 - Frontend Web):** Giao diện nhập thông tin ban đầu của thai kỳ (Doctor Web).
  - **PRC-55 (Sub-task 3.1.3 - Frontend Mobile):** Giao diện nhập thông tin ban đầu của thai kỳ (Patient Mobile).

---

## 1. SUB-TASK 3.1.1 (BACKEND): THIẾT KẾ CƠ SỞ DỮ LIỆU & RÀNG BUỘC TOÀN VẸN

### 1.1 Sơ đồ Bảng Chuẩn (PostgreSQL)

#### Bảng `pregnancy_profiles` (Trích xuất từ `PrecareDatabase` chuẩn)
```sql
CREATE TABLE IF NOT EXISTS pregnancy_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    primary_doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    lmp DATE,                                 -- Ngày đầu kỳ kinh cuối (Last Menstrual Period)
    q1_ultrasound_date DATE,                  -- Ngày thực hiện siêu âm quý 1
    q1_gestational_weeks INT,                 -- Tuổi thai (tuần) tại thời điểm siêu âm Q1
    q1_gestational_days INT,                  -- Tuổi thai (ngày lẻ) tại thời điểm siêu âm Q1 (0 - 6)
    crl_mm NUMERIC(5,2),                      -- Chiều dài đầu mông (Crown-Rump Length tính bằng mm, hỗ trợ theo ticket PRC-32)
    edd DATE NOT NULL,                        -- Ngày dự sinh đã chốt (Estimated Date of Delivery)
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'terminated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_gestational_days CHECK (q1_gestational_days IS NULL OR (q1_gestational_days >= 0 AND q1_gestational_days <= 6)),
    CONSTRAINT chk_gestational_weeks CHECK (q1_gestational_weeks IS NULL OR (q1_gestational_weeks >= 0 AND q1_gestational_weeks <= 42)),
    CONSTRAINT chk_crl_positive CHECK (crl_mm IS NULL OR crl_mm > 0)
);

-- Chỉ mục tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_patient ON pregnancy_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_doctor ON pregnancy_profiles(primary_doctor_id);
CREATE INDEX IF NOT EXISTS idx_pregnancy_profiles_status ON pregnancy_profiles(status);

-- Ràng buộc Partial Unique Index: Mỗi thai phụ chỉ có tối đa 1 hồ sơ ở trạng thái 'active' tại một thời điểm
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_pregnancy_per_patient 
ON pregnancy_profiles(patient_id) 
WHERE status = 'active';
```

### 1.2 Tích hợp Audit Logging (Bảo mật Y tế theo NFR03 & Story-2.3)
Mọi hành vi `CREATE`, `READ`, `UPDATE`, `UPDATE_STATUS` trên bảng `pregnancy_profiles` đều kích hoạt ghi vết vào bảng `audit_logs`:
- `target_table`: `"pregnancy_profiles"`
- `target_id`: ID của hồ sơ thai kỳ
- `action`: `"CREATE_PROFILE"`, `"VIEW_PROFILE"`, `"UPDATE_PROFILE"`, `"CHANGE_STATUS"`

---

## 2. SUB-TASK 3.1.2 (BACKEND): ĐẶC TẢ LOGIC Y KHOA TÍNH TUỔI THAI ($g_t$) & NGÀY DỰ SINH (EDD)

### 2.1 Tiêu chuẩn Y khoa Áp dụng
Theo hướng dẫn của Hiệp hội Sản Phụ khoa Hoa Kỳ (ACOG Committee Opinion No. 700), Tổ chức Y tế Thế giới (WHO) và chuẩn INTERGROWTH-21st:

1. **Tính theo Kỳ kinh cuối (LMP - Quy tắc Naegele):**
   $$\text{EDD}_{\text{LMP}} = \text{LMP} + 280\text{ ngày (40 tuần 0 ngày)}$$
   $$\text{Tuổi thai tại ngày } T \ (g_t) = T - \text{LMP}\quad (\text{đơn vị: ngày})$$

2. **Tính theo Siêu âm Quý 1 (Q1 Ultrasound):**
   - Tuổi thai tại ngày siêu âm Q1:
     $$\text{GA}_{\text{Q1}} = (\text{q1\_gestational\_weeks} \times 7) + \text{q1\_gestational\_days}$$
   - *Nếu sử dụng chỉ số Chiều dài đầu mông CRL (Robinson & Fleming / Hadlock Formula):*
     $$\text{GA}_{\text{Q1\_CRL}} = 8.052 \times \sqrt{\text{crl\_mm} \times 1.037} + 23.73 \quad (\text{ngày})$$
   - Ngày dự sinh tính từ Siêu âm Q1:
     $$\text{EDD}_{\text{Q1}} = \text{q1\_ultrasound\_date} + (280 - \text{GA}_{\text{Q1}})\text{ ngày}$$
   - Tuổi thai tại ngày $T$ ($g_t$):
     $$g_t = \text{GA}_{\text{Q1}} + (T - \text{q1\_ultrasound\_date})\text{ ngày}$$

3. **Cơ chế Đồng thuận & Quyết định Lâm sàng (Clinical Decision Rule):**
   - **Trường hợp 1 (Chỉ có LMP):** Sử dụng $\text{EDD}_{\text{LMP}}$.
   - **Trường hợp 2 (Chỉ có Siêu âm Q1 / Kinh không đều / Không nhớ LMP):** Lấy Siêu âm Q1 làm chuẩn vàng $\text{EDD} = \text{EDD}_{\text{Q1}}$.
   - **Trường hợp 3 (Có cả LMP và Siêu âm Q1):**
     - Tính độ lệch: $\Delta = |\text{EDD}_{\text{LMP}} - \text{EDD}_{\text{Q1}}|$.
     - Nếu $\text{GA}_{\text{Q1}} \le 8^{+6}$ tuần: Nếu $\Delta > 5\text{ ngày} \implies$ Ưu tiên chọn Siêu âm Q1; ngược lại chọn LMP.
     - Nếu $9^{+0} \le \text{GA}_{\text{Q1}} \le 13^{+6}$ tuần: Nếu $\Delta > 7\text{ ngày} \implies$ Ưu tiên chọn Siêu âm Q1; ngược lại chọn LMP.
   - **Trường hợp 4 (Bác sĩ chốt ngày EDD thủ công):** Ưu tiên giá trị EDD do bác sĩ chỉ định. Tuổi thai tại ngày $T$ được tính quy ngược:
     $$g_t = 280 - (\text{EDD} - T)$$

4. **Biểu diễn Tuổi thai Chuẩn hóa:**
   $$\text{gestational\_weeks} = \lfloor g_t / 7 \rfloor$$
   $$\text{gestational\_days} = g_t \pmod 7$$
   $$\text{gestational\_age\_display} = \text{f"{gestational\_weeks}w{gestational\_days}d"}$$
   - **Tam cá nguyệt (Trimester):**
     - Quý 1 (Trimester 1): $0 \le g_t \le 97$ ngày ($0\text{w} - 13\text{w}6\text{d}$).
     - Quý 2 (Trimester 2): $98 \le g_t \le 195$ ngày ($14\text{w} - 27\text{w}6\text{d}$).
     - Quý 3 (Trimester 3): $g_t \ge 196$ ngày ($\ge 28\text{w}$).

---

## 3. SUB-TASK 3.1.2 (BACKEND): CHI TIẾT REST API CONTRACT

- **Base URL:** `/api/v1/pregnancy-profiles`
- **Format:** `application/json`
- **Header chung:** `Authorization: Bearer <access_token>`

---

### 3.1 Danh sách Endpoints

| Method | Endpoint | Quyền hạn (RBAC) | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/pregnancy-profiles` | `pregnant_woman`, `doctor` | Tạo hồ sơ thai kỳ ban đầu |
| `GET` | `/api/v1/pregnancy-profiles/active` | `pregnant_woman`, `doctor` | Lấy hồ sơ thai kỳ hiện tại đang hoạt động |
| `GET` | `/api/v1/pregnancy-profiles/{profile_id}` | `pregnant_woman`, `doctor`, `admin` | Lấy thông tin chi tiết một hồ sơ |
| `GET` | `/api/v1/pregnancy-profiles` | `doctor`, `admin` | Danh sách hồ sơ (phân trang, tìm kiếm) |
| `PUT` | `/api/v1/pregnancy-profiles/{profile_id}` | `pregnant_woman`, `doctor` | Chỉnh sửa hồ sơ ban đầu & tính lại EDD |
| `PATCH`| `/api/v1/pregnancy-profiles/{profile_id}/status` | `pregnant_woman`, `doctor` | Chuyển trạng thái (`active`, `completed`, `terminated`) |
| `POST` | `/api/v1/pregnancy-profiles/calculate` | All Authenticated Users | Utility Engine tính nháp $g_t$ & EDD (cho Web/Mobile preview) |

---

### 3.2 Đặc tả Chi tiết từng Endpoint

#### 1. `POST /api/v1/pregnancy-profiles` — Khởi tạo Hồ sơ Thai kỳ Mới

- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body (JSON):**
```json
{
  "patient_id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
  "primary_doctor_id": "d15c7a32-1e44-4829-9e88-4c123d567890",
  "calculation_method": "lmp",
  "lmp": "2026-06-01",
  "q1_ultrasound_date": null,
  "q1_gestational_weeks": null,
  "q1_gestational_days": null,
  "crl_mm": null,
  "override_edd": null
}
```
*Ghi chú request:*
- `calculation_method`: `"lmp"` (ngày kinh cuối), `"q1_ultrasound"` (siêu âm quý 1), `"crl"` (chiều dài đầu mông), hoặc `"direct_edd"` (nhập thẳng EDD).
- Nếu người gọi mang role `pregnant_woman`, trường `patient_id` tự động lấy từ Token ID (bỏ qua giá trị gửi lên để tránh IDOR).
- Nếu người gọi mang role `doctor`, có thể chỉ định `patient_id` của thai phụ được khám.

- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "7b8e9f10-5a3d-4c21-b0e4-9876543210ab",
    "patient_id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
    "primary_doctor_id": "d15c7a32-1e44-4829-9e88-4c123d567890",
    "lmp": "2026-06-01",
    "q1_ultrasound_date": null,
    "q1_gestational_weeks": null,
    "q1_gestational_days": null,
    "crl_mm": null,
    "edd": "2027-03-08",
    "status": "active",
    "current_gestational_age": {
      "days": 139,
      "weeks": 19,
      "remaining_days": 6,
      "formatted": "19w6d",
      "trimester": 2,
      "days_until_edd": 141
    },
    "created_at": "2026-10-18T00:00:00Z",
    "updated_at": "2026-10-18T00:00:00Z"
  },
  "message": "Khởi tạo hồ sơ thai kỳ thành công"
}
```

- **Error Responses:**
  - `400 Bad Request`: `{"success": false, "error": {"code": "ACTIVE_PROFILE_EXISTS", "message": "Thai phụ đã có hồ sơ thai kỳ đang hoạt động. Vui lòng đóng hồ sơ cũ trước khi tạo mới."}}`
  - `422 Unprocessable Entity`: Dữ liệu lâm sàng không hợp lệ (ví dụ: ngày LMP ở tương lai, hoặc tuần thai Q1 vượt quá 14 tuần).

---

#### 2. `GET /api/v1/pregnancy-profiles/active` — Lấy Hồ sơ Đang Hoạt động
Endpoint dành cho màn hình chính của Mobile App và Dashboard Khám bệnh của Bác sĩ.

- **Query Parameters (chỉ dành cho Bác sĩ):**
  - `patient_id` (UUID, tùy chọn): Chỉ định ID thai phụ cần tra cứu nếu người gọi là `doctor`.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "7b8e9f10-5a3d-4c21-b0e4-9876543210ab",
    "patient": {
      "id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
      "full_name": "Nguyễn Thị A",
      "phone_number": "0912345678",
      "email": "nguyenthia@example.com"
    },
    "primary_doctor": {
      "id": "d15c7a32-1e44-4829-9e88-4c123d567890",
      "full_name": "BS. Trần Văn B"
    },
    "lmp": "2026-06-01",
    "q1_ultrasound_date": "2026-08-20",
    "q1_gestational_weeks": 11,
    "q1_gestational_days": 3,
    "crl_mm": 47.50,
    "edd": "2027-03-08",
    "status": "active",
    "current_gestational_age": {
      "days": 139,
      "weeks": 19,
      "remaining_days": 6,
      "formatted": "19w6d",
      "trimester": 2,
      "trimester_name": "Tam cá nguyệt thứ 2 (3 tháng giữa)",
      "days_until_edd": 141
    },
    "created_at": "2026-10-18T00:00:00Z",
    "updated_at": "2026-10-18T00:00:00Z"
  }
}
```
- **Response 404 Not Found:** Nếu bệnh nhân chưa có hồ sơ active nào.

---

#### 3. `GET /api/v1/pregnancy-profiles/{profile_id}` — Lấy Chi tiết Hồ sơ theo ID
- **Path Parameters:** `profile_id` (UUID).
- **Query Parameters:** `target_date` (Date, YYYY-MM-DD, tùy chọn, mặc định hôm nay). Cho phép tính tuổi thai $g_t$ tại một mốc thời gian khám cụ thể.
- **Response 200 OK:** Cấu trúc tương tự Endpoint 2 kèm thông tin tính toán tại `target_date`.

---

#### 4. `GET /api/v1/pregnancy-profiles` — Danh sách Hồ sơ Thai kỳ (Bác sĩ & Quản trị viên)
- **Query Parameters:**
  - `page`: int (default: 1)
  - `page_size`: int (default: 20, max: 100)
  - `status`: string (`"active"`, `"completed"`, `"terminated"`)
  - `search`: string (tìm theo họ tên, sđt thai phụ)
  - `doctor_id`: UUID (lọc theo bác sĩ phụ trách)
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "7b8e9f10-5a3d-4c21-b0e4-9876543210ab",
        "patient_id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
        "patient_name": "Nguyễn Thị A",
        "patient_phone": "0912345678",
        "primary_doctor_name": "BS. Trần Văn B",
        "edd": "2027-03-08",
        "status": "active",
        "current_gestational_age_formatted": "19w6d",
        "created_at": "2026-10-18T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total_items": 1,
      "total_pages": 1
    }
  }
}
```

---

#### 5. `PUT /api/v1/pregnancy-profiles/{profile_id}` — Cập nhật Thông tin Hồ sơ Thai kỳ
- **Headers:** `Authorization: Bearer <access_token>`
- **Request Body (JSON):**
```json
{
  "primary_doctor_id": "d15c7a32-1e44-4829-9e88-4c123d567890",
  "lmp": "2026-06-03",
  "q1_ultrasound_date": "2026-08-20",
  "q1_gestational_weeks": 11,
  "q1_gestational_days": 3,
  "crl_mm": 47.50,
  "recalculate_edd": true,
  "override_edd": null
}
```
- **Xử lý:** Khi `recalculate_edd = true`, hệ thống chạy lại bộ quy tắc lâm sàng ACOG để chuẩn hóa lại `edd` và cập nhật cơ sở dữ liệu.

---

#### 6. `PATCH /api/v1/pregnancy-profiles/{profile_id}/status` — Cập nhật Trạng thái Hồ sơ
- **Request Body:**
```json
{
  "status": "completed",
  "reason": "Sinh thường an toàn tại Bệnh viện Phụ sản"
}
```
*(Hỗ trợ: `active`, `completed`, `terminated`)*
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "7b8e9f10-5a3d-4c21-b0e4-9876543210ab",
    "status": "completed",
    "updated_at": "2026-10-18T00:30:00Z"
  },
  "message": "Cập nhật trạng thái hồ sơ thành công"
}
```

---

#### 7. `POST /api/v1/pregnancy-profiles/calculate` — Utility Engine Tính toán Tuổi thai & EDD (Preview)
Endpoint stateless không lưu vào CSDL, dùng cho Frontend Web/Mobile hiển thị thời gian thực (real-time preview) khi người dùng đang gõ phím hoặc chọn lịch.

- **Request Body:**
```json
{
  "target_date": "2026-10-18",
  "lmp": "2026-06-01",
  "q1_ultrasound_date": "2026-08-20",
  "q1_gestational_weeks": 11,
  "q1_gestational_days": 3,
  "crl_mm": null
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "target_date": "2026-10-18",
    "calculated_edd": "2027-03-08",
    "primary_method": "q1_ultrasound",
    "clinical_note": "Chênh lệch giữa LMP và Siêu âm Q1 là 2 ngày (<= 7 ngày). Đủ điều kiện đồng thuận lâm sàng.",
    "gestational_age": {
      "days": 139,
      "weeks": 19,
      "remaining_days": 6,
      "formatted": "19w6d",
      "trimester": 2,
      "trimester_description": "3 tháng giữa thai kỳ (Tam cá nguyệt thứ 2)"
    },
    "days_until_edd": 141
  }
}
```

---

## 4. SUB-TASK 3.1.3 (FRONTEND WEB & MOBILE): INTERFACES & SPECS

### 4.1 Định nghĩa TypeScript Interfaces Chuẩn hóa

```typescript
// types/pregnancyProfile.ts

export type PregnancyStatus = 'active' | 'completed' | 'terminated';

export type CalculationMethod = 'lmp' | 'q1_ultrasound' | 'crl' | 'direct_edd';

export interface GestationalAgeDetail {
  days: number;             // Tổng số ngày tuổi thai (gt)
  weeks: number;            // Số tuần thai (gt / 7)
  remainingDays: number;    // Số ngày dư lẻ (gt % 7)
  formatted: string;        // Ví dụ: "19w6d"
  trimester: 1 | 2 | 3;     // Tam cá nguyệt
  trimesterName?: string;
  daysUntilEdd: number;     // Số ngày còn lại đến lúc sinh
}

export interface PregnancyProfile {
  id: string;
  patientId: string;
  primaryDoctorId?: string | null;
  lmp?: string | null;                  // Định dạng YYYY-MM-DD
  q1UltrasoundDate?: string | null;     // Định dạng YYYY-MM-DD
  q1GestationalWeeks?: number | null;
  q1GestationalDays?: number | null;
  crlMm?: number | null;
  edd: string;                          // Định dạng YYYY-MM-DD
  status: PregnancyStatus;
  currentGestationalAge?: GestationalAgeDetail;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePregnancyProfileRequest {
  patientId?: string;                   // Bắt buộc nếu là Doctor; tự động điền nếu là Thai phụ
  primaryDoctorId?: string;
  calculationMethod: CalculationMethod;
  lmp?: string;                         // YYYY-MM-DD
  q1UltrasoundDate?: string;            // YYYY-MM-DD
  q1GestationalWeeks?: number;          // 6 - 14
  q1GestationalDays?: number;           // 0 - 6
  crlMm?: number;                       // 10 - 84 mm
  overrideEdd?: string;                 // YYYY-MM-DD
}

export interface UpdatePregnancyProfileRequest {
  primaryDoctorId?: string | null;
  lmp?: string | null;
  q1UltrasoundDate?: string | null;
  q1GestationalWeeks?: number | null;
  q1GestationalDays?: number | null;
  crlMm?: number | null;
  recalculateEdd?: boolean;
  overrideEdd?: string | null;
}

export interface CalculateGestationalAgeRequest {
  targetDate?: string;                  // Mặc định là ngày hiện tại
  lmp?: string;
  q1UltrasoundDate?: string;
  q1GestationalWeeks?: number;
  q1GestationalDays?: number;
  crlMm?: number;
  directEdd?: string;
}

export interface CalculateGestationalAgeResponse {
  targetDate: string;
  calculatedEdd: string;
  primaryMethod: CalculationMethod;
  clinicalNote: string;
  gestationalAge: GestationalAgeDetail;
  daysUntilEdd: number;
}
```

---

### 4.2 Đặc tả Giao diện & Hành vi UI/UX

#### A. Web Bác sĩ (PRC-34: Frontend Web)
1. **Vị trí tích hợp:**
   - Nút `+ Tạo Hồ sơ Thai kỳ` tại màn hình *Chi tiết Bệnh nhân* hoặc *Danh sách Hồ sơ*.
2. **Quy tắc Form:**
   - **Lựa chọn Phương pháp tính:** Segmented Control gồm 3 chế độ:
     1. *Theo Kỳ kinh cuối (LMP)*: Nhập `Ngày bắt đầu kinh cuối`.
     2. *Theo Siêu âm Quý 1*: Nhập `Ngày siêu âm`, `Tuổi thai lúc siêu âm (Tuần + Ngày)` HOẶC `Chiều dài đầu mông CRL (mm)`.
     3. *Nhập EDD chỉ định*: Bác sĩ chủ động chọn ngày dự sinh.
   - **Card Tiện ích Lâm sàng (Live Preview Box):** Khi bác sĩ thay đổi ngày, giao diện tự động gửi debounce request tới `/calculate` để hiển thị:
     - Ngày dự sinh (EDD) dự kiến.
     - Tuổi thai hiện tại ($g_t$) dạng Badge sinh động (ví dụ: `12w4d - Quý 1`).
     - Độ lệch so sánh giữa LMP và Siêu âm (nếu nhập cả hai).

#### B. Mobile App Thai phụ (PRC-55: Frontend Mobile)
1. **Vị trí tích hợp:**
   - Màn hình Onboarding ngay sau khi thai phụ đăng ký tài khoản thành công, hoặc tại tab *Hồ sơ Thai kỳ*.
2. **Trải nghiệm Thân thiện:**
   - Ngôn từ đơn giản, giải thích rõ: *"Kỳ kinh cuối là ngày đầu tiên ra máu của chu kỳ kinh nguyệt gần nhất"*.
   - DatePicker bánh xe cuộn cuộn mượt mà trên iOS/Android.
   - Thẻ hiển thị hình ảnh minh họa sự phát triển của thai nhi tương ứng với tuần tuổi tính được.

---

### 4.3 Bảng Ma trận Kiểm tra Dữ liệu (Validation Rules Matrix)

| Trường dữ liệu | Giới hạn kỹ thuật | Quy tắc Nghiệp vụ Y tế | Thông báo lỗi |
| :--- | :--- | :--- | :--- |
| `lmp` | Date (YYYY-MM-DD) | Không ở tương lai; không quá 300 ngày về trước so với hiện tại. | "Ngày kinh cuối không hợp lệ hoặc vượt quá thời gian mang thai." |
| `q1_ultrasound_date` | Date (YYYY-MM-DD) | Phải nhỏ hơn hoặc bằng ngày hiện tại; sau ngày LMP (nếu có). | "Ngày siêu âm phải nhỏ hơn hoặc bằng ngày hôm nay." |
| `q1_gestational_weeks` | Integer (6 - 14) | Quý 1 tính từ tuần thứ 6 đến tuần thứ 13+6 ngày. | "Tuổi thai siêu âm quý 1 phải nằm trong khoảng 6 - 14 tuần." |
| `q1_gestational_days` | Integer (0 - 6) | Số ngày trong tuần. | "Số ngày lẻ phải từ 0 đến 6 ngày." |
| `crl_mm` | Decimal(5,2) (10 - 84mm)| Chiều dài đầu mông chuẩn đo tuổi thai quý 1. | "Chỉ số CRL đo tuổi thai quý 1 tiêu chuẩn từ 10mm đến 84mm." |
| `edd` | Date (YYYY-MM-DD) | Nằm trong khoảng $[T - 14\text{ ngày}, T + 294\text{ ngày}]$. | "Ngày dự sinh không hợp lệ." |

---

*Tài liệu này được thiết kế tương thích tuyệt đối với PostgreSQL 11 core tables, kiến trúc FastAPI monorepo gateway và luồng nghiệp vụ y tế của dự án PreCare.*
