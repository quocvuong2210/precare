# TÀI LIỆU API CHI TIẾT DỰ ÁN PRECARE (API DOCUMENTATION)

_Hệ thống số hóa hồ sơ cận lâm sàng và theo dõi thai kỳ (Digital Paraclinical Records & Obstetrics Portal)_
_Phiên bản cập nhật: Tháng 11/2026 (Đồng bộ toàn diện Web Doctor, Mobile App và Backend Gateway)_

---

## 1. TỔNG QUAN HỆ THỐNG & CẤU HÌNH KẾT NỐI

Hệ thống **PreCare** được thiết kế theo kiến trúc Microservices Monorepo gồm 2 backend services chính:

| Service                   | Công nghệ                            | Port mặc định | Base URL cho Client            | Swagger / OpenAPI Docs       |
| :------------------------ | :----------------------------------- | :------------ | :----------------------------- | :--------------------------- |
| **Backend API Gateway**   | FastAPI + PostgreSQL 16 + Redis      | `8000`        | `http://localhost:8000/api/v1` | `http://localhost:8000/docs` |
| **Analysis Microservice** | FastAPI + SciPy + PyTorch (RACA-Net) | `8001`        | `http://localhost:8001/api/v1` | `http://localhost:8001/docs` |

### 1.1. Địa chỉ kết nối cho các nền tảng Frontend

- **Web Doctor Portal (`web_doctor/`)**: `http://localhost:8000/api/v1` (Biến môi trường: `VITE_API_URL`)
- **Analysis Microservice Endpoint (`web_doctor/`)**: `http://localhost:8001/api/v1` (Biến môi trường: `VITE_ANALYSIS_API_URL`)
- **Mobile App - Android Emulator (`mobile_app/`)**: `http://10.0.2.2:8000/api/v1`
- **Mobile App - iOS Simulator / Thiết bị thật qua mạng LAN**: `http://<IP_MAY_TINH_LAN>:8000/api/v1`

### 1.2. Chuẩn Header và Xác thực (Authentication)

- **Định dạng dữ liệu mặc định**: `Content-Type: application/json`, `Accept: application/json`
- **Ngoại lệ API Đăng nhập**: `POST /api/v1/auth/login` sử dụng chuẩn OAuth2 Form URL-Encoded (`Content-Type: application/x-www-form-urlencoded`).
- **Xác thực bảo mật**: Sử dụng chuẩn **Bearer JWT Token** gửi trong HTTP Header của mọi yêu cầu bảo vệ (Protected Routes):
  ```http
  Authorization: Bearer <access_token>
  ```
- **Cơ chế kích hoạt tài khoản**: Tài khoản Bác sĩ (`doctor`) và Thai phụ (`pregnant_woman`) đăng ký xong có **hiệu lực ngay lập tức** (`is_active = true`), không yêu cầu phê duyệt thủ công từ Admin, cho phép người dùng đăng nhập tức thì.
- **Google reCAPTCHA v2**: Tích hợp trên form đăng nhập web với Site Key chính thức:
  ```
  6Ld1WQwuAAAAANwVZPpTcQ3HsBfqWaqi1u1NX-ih
  ```

### 1.3. Quy tắc An toàn Dữ liệu Lâm sàng (Clinical Safety Commitments)

1. **Confirmation Barrier**: Dữ liệu trích xuất từ phiếu siêu âm (OCR) chỉ nằm ở trạng thái dự thảo (`uploaded_files`). Chỉ sau khi Bác sĩ chuyên khoa kiểm tra, đối soát và bấm xác nhận thì dữ liệu mới được ghi vào bảng chỉ số chính thức `biometric_data`.
2. **Safety Override (`max(rule, model)`)**: Mức độ cảnh báo nguy cơ thai kỳ luôn lấy giá trị nghiêm trọng nhất giữa Luật Lâm Sàng Hadlock và Mô Hình AI RACA-Net (`green` < `yellow` < `red`). Mô hình AI **tuyệt đối không bao giờ** được phép hạ mức cảnh báo của luật cờ đỏ lâm sàng.

---

## 2. QUY ƯỚC RESPONSE & MÃ LỖI CHUẨN

### 2.1. Chuẩn Response thành công

Hầu hết các API trả về JSON trực tiếp hoặc bọc trong object envelope:

```json
{
  "success": true,
  "data": { ... },
  "message": "Mô tả kết quả thực hiện thành công"
}
```

### 2.2. Chuẩn Response lỗi

Khi xảy ra lỗi (HTTP status `4xx`, `5xx`), backend trả về cấu trúc lỗi chi tiết chuẩn của FastAPI:

```json
{
  "detail": "Mô tả chi tiết nguyên nhân lỗi hoặc mảng validation errors"
}
```

Hoặc cấu trúc lỗi lâm sàng định danh (Clinical Error):

```json
{
  "detail": {
    "code": "CLINICAL_VALIDATION_ERROR",
    "message": "Ngày khám không được ở tương lai hoặc huyết áp tâm thu phải lớn hơn tâm trương."
  }
}
```

### 2.3. Bảng mã HTTP Status Codes

| HTTP Code               | Ý nghĩa                        | Trường hợp xảy ra                                                                       |
| :---------------------- | :----------------------------- | :-------------------------------------------------------------------------------------- |
| `200 OK`                | Thành công                     | Thực hiện truy vấn, tính toán hoặc xác thực thành công.                                 |
| `201 Created`           | Đã tạo mới                     | Tạo mới lần khám (`checkups`), gửi yêu cầu xóa hoặc tạo tài khoản thành công.           |
| `400 Bad Request`       | Sai dữ liệu đầu vào            | Email đã tồn tại, mã OTP sai hoặc đã hết hạn, mật khẩu không khớp.                      |
| `401 Unauthorized`      | Không có quyền / Hết hạn token | Chưa gửi token, sai email/mật khẩu, token hết hạn hoặc Refresh Token đã bị thu hồi.     |
| `403 Forbidden`         | Bị từ chối truy cập            | Sai quyền hạn (RBAC) - Bác sĩ truy cập trang Admin hoặc Thai phụ truy cập trang Bác sĩ. |
| `404 Not Found`         | Không tìm thấy tài nguyên      | Không tìm thấy hồ sơ thai kỳ, bệnh nhân hoặc lần khám tương ứng.                        |
| `422 Unprocessable`     | Lỗi định dạng dữ liệu          | Dữ liệu không thỏa mãn Pydantic schema hoặc logic lâm sàng (tuần thai < 6 hoặc > 14).   |
| `429 Too Many Requests` | Quá giới hạn tần suất          | Gửi lại OTP trước thời gian cooldown 60 giây.                                           |
| `500 Server Error`      | Lỗi máy chủ nội bộ             | Lỗi tính toán nội bộ, lỗi kết nối cơ sở dữ liệu PostgreSQL hoặc Redis.                  |

---

## 3. DANH MỤC TẤT CẢ CÁC ENDPOINT (API DIRECTORY)

```
├── 1. HỆ THỐNG & GIÁM SÁT (SYSTEM & HEALTH)
│   ├── GET   /                               (Root Gateway Info)
│   ├── GET   /health                         (Health check API Gateway)
│   └── GET   /api/v1/health                  (Health check Analysis Microservice)
│
├── 2. XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & RBAC)
│   ├── POST  /api/v1/auth/login              (Đăng nhập OAuth2 lấy Bearer Access Token)
│   ├── POST  /api/v1/auth/send-otp           (Gửi mã OTP 6 số qua Email)
│   ├── POST  /api/v1/auth/verify-otp         (Xác thực mã OTP 6 số)
│   ├── POST  /api/v1/auth/register           (Đăng ký tài khoản - Kích hoạt ngay lập tức)
│   ├── GET   /api/v1/auth/me                 (Lấy thông tin profile & role người dùng hiện tại)
│   ├── POST  /api/v1/auth/refresh            (Cấp mới Access Token xoay vòng - Token Rotation)
│   ├── POST  /api/v1/auth/forgot-password    (Yêu cầu mã OTP khôi phục mật khẩu)
│   ├── POST  /api/v1/auth/reset-password     (Xác thực OTP và đặt lại mật khẩu mới)
│   └── POST  /api/v1/auth/logout             (Thu hồi Refresh Token & đóng phiên làm việc)
│
├── 3. HỒ SƠ THAI KỲ & CÔNG CỤ TÍNH LÂM SÀNG (PREGNANCY PROFILES)
│   ├── POST  /api/v1/pregnancy-profiles/calculate (Tính nháp tuổi thai gt & EDD chuẩn ACOG)
│   └── GET   /api/v1/pregnancy-profiles      (Lấy danh sách hồ sơ thai kỳ quản lý)
│
├── 4. KHÁM THAI & SINH TRẮC HỌC SIÊU ÂM (CHECKUPS & BIOMETRICS)
│   └── POST  /api/v1/checkups                (Ghi nhận lần khám mới, sinh hiệu & chỉ số siêu âm)
│
├── 5. YÊU CẦU XÓA DỮ LIỆU Y TẾ (MEDICAL DELETION REQUESTS)
│   ├── POST  /api/v1/deletion-requests       (Thai phụ gửi yêu cầu xóa hồ sơ / lần khám)
│   ├── GET   /api/v1/deletion-requests       (Bác sĩ/Admin xem danh sách yêu cầu xóa)
│   └── PATCH /api/v1/deletion-requests/{id}/review (Bác sĩ/Admin duyệt/từ chối xóa hồ sơ)
│
└── 6. DỊCH VỤ PHÂN TÍCH LÂM SÀNG & RACA-NET (ANALYSIS SERVICE :8001)
    ├── POST  /api/v1/rules                   (Đánh giá Luật Hadlock Z-score & Percentile)
    └── POST  /api/v1/predict                 (Phân tích Safety Fusion: Max(Luật, RACA-Net))
```

---

## 4. CHI TIẾT TỪNG ENDPOINT

### 4.1. HỆ THỐNG & GIÁM SÁT

#### `GET /` - Thông tin API Gateway

- **Service**: Backend Gateway (`:8000`)
- **Headers**: Không yêu cầu
- **Response `200 OK`**:

```json
{
  "system": "PreCare API Gateway",
  "status": "online",
  "docs_url": "/docs"
}
```

---

#### `GET /health` - Health check Gateway

- **Service**: Backend Gateway (`:8000`)
- **Response `200 OK`**:

```json
{
  "status": "healthy"
}
```

---

#### `GET /api/v1/health` - Health check Analysis Microservice

- **Service**: Analysis Microservice (`:8001`)
- **Response `200 OK`**:

```json
{
  "status": "healthy",
  "service": "PreCare Analysis Microservice",
  "rule_version": "Hadlock-ACOG-v1.0",
  "model_version": "RACA-Net-ResNet50-v1.2"
}
```

---

### 4.2. XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & RBAC)

#### `POST /api/v1/auth/login` - Đăng nhập tài khoản

Xác thực người dùng bằng email và mật khẩu, trả về JWT Access Token.

- **Service**: Backend Gateway (`:8000`)
- **Content-Type**: `application/x-www-form-urlencoded` _(Chuẩn OAuth2 Password Request)_
- **Lưu ý**: Payload **chỉ chứa** `username` và `password`. Tuyệt đối không gửi trường `role`.
- **Payload (Form URL-Encoded)**:
  | Tham số | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `username` | string | Có | Email đăng nhập của người dùng (VD: `bacsi.ngoc.tram@precare.vn`) |
  | `password` | string | Có | Mật khẩu tài khoản |
- **Payload Example**:
  ```
  username=bacsi.ngoc.tram%40precare.vn&password=MySecurePassword123%40
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMTkwOGY2OC1lYjM0LTQ2ZTktYTgwNy01Y2Q0NTllYTE3ZWIiLCJleHAiOjE3NjE3NjgwMDB9...",
    "token_type": "bearer"
  }
  ```
- **Lỗi thường gặp**:
  - `401 Unauthorized`: Sai email hoặc mật khẩu (`{"detail": "Incorrect email or password"}`).
  - `400 Bad Request`: Tài khoản bị tạm khóa (`{"detail": "Tài khoản chưa được kích hoạt hoặc đã bị khóa."}`).

---

#### `POST /api/v1/auth/send-otp` - Gửi mã OTP xác minh Email

Gửi mã OTP gồm 6 chữ số vào email của người dùng với template HTML. Có cơ chế giới hạn 60 giây chống spam và thời hạn mã 5 phút.

- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
  | :--- | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | - | Email đăng ký |
  | `role` | string | Không | `"doctor"` | Vai trò: `"doctor"` hoặc `"pregnant_woman"` |
- **Payload Example**:
  ```json
  {
    "email": "bacsi.ngoc.tram@precare.vn",
    "role": "doctor"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "message": "Mã xác minh đã được gửi đến bacsi.ngoc.tram@precare.vn. Mã có hiệu lực trong 5 phút.",
    "expires_in": 300,
    "retry_after": 60
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Email đã tồn tại và đang hoạt động.
  - `429 Too Many Requests`: Gửi lại trước khi hết thời gian cooldown 60 giây.

---

#### `POST /api/v1/auth/verify-otp` - Xác thực mã OTP

Kiểm tra mã OTP 6 số người dùng nhập từ email. Nếu thành công, cấp `verification_token` có hiệu lực trong 15 phút để hoàn tất đăng ký.

- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email cần xác thực |
  | `otp` | string (6 ký tự) | Có | Mã OTP 6 chữ số (VD: `"123456"`) |
- **Payload Example**:
  ```json
  {
    "email": "bacsi.ngoc.tram@precare.vn",
    "otp": "123456"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "message": "Xác minh email thành công! Bạn có thể tiếp tục hoàn thiện hồ sơ.",
    "verification_token": "a1b2c3d4e5f6...verif_token_hex_15min"
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Mã OTP không chính xác hoặc đã hết hạn.

---

#### `POST /api/v1/auth/register` - Đăng ký tài khoản người dùng

Tạo tài khoản người dùng mới. **Tài khoản được kích hoạt ngay lập tức (`is_active = false`)**, người dùng có thể đăng nhập ngay sau khi đăng ký.

- **Service**: Backend Gateway (`:8000`)
- **Query Parameters**:
  | Tham số | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `verification_token` | string | Có (với doctor) | Token nhận được từ bước `verify-otp` |
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email tài khoản |
  | `password` | string | Có | Mật khẩu tài khoản (tối thiểu 6 ký tự) |
  | `full_name` | string | Có | Họ và tên đầy đủ của bác sĩ |
  | `role` | string | Có | `"doctor"`, `"pregnant_woman"`, hoặc `"admin"` |
  | `phone_number` | string | Không | Số điện thoại liên hệ |
- **Payload Example**:
  ```json
  {
    "email": "bacsi.ngoc.tram@precare.vn",
    "password": "SecurePassword123@",
    "full_name": "BS. CKI Ngọc Trâm",
    "role": "doctor",
    "phone_number": "0912345678"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "e0b9e8dc-3bb8-4f1b-871d-5c74fb93574d",
    "email": "bacsi.ngoc.tram@precare.vn",
    "full_name": "BS. CKI Ngọc Trâm",
    "role": "doctor",
    "phone_number": "0912345678",
    "is_active": false,
    "created_at": "2026-11-02T20:00:00Z",
    "updated_at": "2026-11-02T20:00:00Z"
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Email đã tồn tại trên hệ thống.
  - `403 Forbidden`: Email chưa được xác thực qua OTP hoặc token xác thực đã hết hạn.

---

#### `GET /api/v1/auth/me` - Lấy thông tin tài khoản hiện tại

Lấy hồ sơ cá nhân và quyền hạn (`role`) chính thức từ cơ sở dữ liệu dựa trên Access Token.

- **Service**: Backend Gateway (`:8000`)
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "21908f68-eb34-46e9-a807-5cd459ea17eb",
    "email": "bacsi.ngoc.tram@precare.vn",
    "full_name": "BS. CKI Ngọc Trâm",
    "role": "doctor",
    "phone_number": "0912345678",
    "is_active": false,
    "created_at": "2026-11-02T10:00:00Z",
    "updated_at": "2026-11-02T15:30:00Z"
  }
  ```
- **Lỗi thường gặp**:
  - `401 Unauthorized`: Token không hợp lệ, bị sửa đổi hoặc đã hết hạn.

---

#### `POST /api/v1/auth/refresh` - Cấp mới Access Token (Token Rotation)

Dùng Refresh Token hợp lệ để đổi lấy cặp Access Token (hạn 30 phút) và Refresh Token mới (hạn 7 ngày). Token cũ bị thu hồi ngay lập tức để chống tấn công Replay Attack.

- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  ```json
  {
    "refresh_token": "7f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "3a4b5c6d7e8f9a0b1c2d7f8b9c0d1e2f",
      "token_type": "Bearer",
      "expires_in": 1800
    }
  }
  ```

---

#### `POST /api/v1/auth/forgot-password` & `POST /api/v1/auth/reset-password`

1. **`POST /api/v1/auth/forgot-password`**: Gửi mã OTP 6 số qua email.
   - Payload: `{"email": "user@example.com"}`
   - Response: `{"success": true, "message": "Mã OTP đã được gửi đến email của bạn"}`
2. **`POST /api/v1/auth/reset-password`**: Xác nhận OTP và cập nhật mật khẩu mới.
   - Payload: `{"email": "user@example.com", "otp_code": "654321", "new_password": "NewSecurePassword123@"}`
   - Response: `{"success": true, "message": "Đặt lại mật khẩu thành công"}`

---

#### `POST /api/v1/auth/logout` - Đăng xuất an toàn

Thu hồi Refresh Token và vô hiệu hóa phiên làm việc hiện tại.

- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Payload**: `{"refresh_token": "<refresh_token>"}`
- **Response `200 OK`**: `{"success": true, "message": "Đăng xuất thành công"}`

---

### 4.3. HỒ SƠ THAI KỲ & CÔNG CỤ TÍNH LÂM SÀNG

#### `POST /api/v1/pregnancy-profiles/calculate` - Tính tuổi thai & Ngày dự sinh (EDD)

Công cụ tính nháp tuổi thai và ngày dự sinh (EDD) tiêu chuẩn lâm sàng theo hướng dẫn của ACOG & Bộ Y Tế. Hỗ trợ 4 phương pháp:

1. `crl`: Đo chiều dài đầu mông quý 1 (10mm - 84mm) - **Độ chính xác cao nhất**.
2. `q1_ultrasound`: Siêu âm quý 1 (6 đến 14 tuần).
3. `lmp`: Ngày đầu kỳ kinh cuối (Last Menstrual Period).
4. `direct_edd`: Bác sĩ chỉ định trực tiếp ngày dự sinh.

- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
  | :--- | :--- | :--- | :--- | :--- |
  | `target_date` | string (YYYY-MM-DD) | Không | Mặc định hôm nay | Ngày mốc để tính tuổi thai |
  | `lmp` | string (YYYY-MM-DD) | Không | Không ở tương lai, <= 300 ngày | Ngày đầu kỳ kinh cuối |
  | `q1_ultrasound_date` | string (YYYY-MM-DD) | Không | >= lmp, <= target_date | Ngày thực hiện siêu âm quý 1 |
  | `q1_gestational_weeks` | integer | Không | `6` đến `14` | Tuần thai ghi trên siêu âm quý 1 |
  | `q1_gestational_days` | integer | Không | `0` đến `6` (mặc định 0) | Ngày thai lẻ ghi trên siêu âm quý 1 |
  | `crl_mm` | number | Không | `10.0` đến `84.0` | Chiều dài đầu mông (mm) |
  | `override_edd` | string (YYYY-MM-DD) | Không | - | Ngày dự sinh bác sĩ chỉ định ghi đè |

- **Payload Example**:
  ```json
  {
    "target_date": "2026-11-02",
    "lmp": "2026-04-01",
    "q1_ultrasound_date": "2026-06-15",
    "q1_gestational_weeks": 11,
    "q1_gestational_days": 2,
    "crl_mm": 45.5
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "target_date": "2026-11-02",
      "calculated_edd": "2026-12-30",
      "primary_method": "crl",
      "clinical_note": "Tính dựa trên chiều dài đầu mông (CRL = 45.5mm lúc 11w2d). Phương pháp này có độ chính xác cao nhất (sai số ±3-5 ngày).",
      "gestational_age": {
        "days": 217,
        "weeks": 31,
        "remaining_days": 0,
        "formatted": "31w0d",
        "trimester": 3,
        "trimester_name": "Tam cá nguyệt thứ 3 (Tuần 28 - 40+)",
        "days_until_edd": 58
      },
      "days_until_edd": 58
    }
  }
  ```

---

#### `GET /api/v1/pregnancy-profiles` - Lấy danh sách hồ sơ thai kỳ quản lý

Lấy toàn bộ danh sách hồ sơ thai kỳ thuộc phạm vi quản lý của bác sĩ phục vụ trang Dashboard.

- **Service**: Backend Gateway (`:8000`)
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "prf-84920",
        "patientId": "p-101",
        "patientName": "Nguyễn Thị Minh Anh",
        "patientCode": "PRE-8492",
        "gestationalAge": "32w1d",
        "edd": "2026-12-28",
        "warningLevel": "yellow",
        "status": "active",
        "appointmentTime": "08:30",
        "reason": "Khám định kỳ tuần 32"
      }
    ]
  }
  ```

---

### 4.4. KHÁM THAI & SINH TRẮC HỌC SIÊU ÂM (CHECKUPS & BIOMETRICS)

#### `POST /api/v1/checkups` - Ghi nhận lần khám thai mới (Visit)

Ghi nhận đầy đủ thông tin một lần khám thai: Ngày khám, sinh hiệu mẹ bầu (cân nặng, huyết áp) và chỉ số siêu âm sinh trắc học thai nhi (`bpd`, `hc`, `ac`, `fl`, `efw`).

- **Service**: Backend Gateway (`:8000`)
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Quyền yêu cầu**: Role `doctor`
- **Cơ chế tự động hóa**:
  1. Tự động tính tuổi thai $g_t$ dựa trên EDD của hồ sơ theo công thức ACOG: $g_t = 280 - (\text{EDD} - \text{checkup\_date})$.
  2. Tự động phân loại trạng thái huyết áp (`normal`, `elevated`, `stage1_hypertension`, `crisis`).
  3. Ghi vết kiểm toán bất biến vào bảng `audit_logs`.
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Ràng buộc | Mô tả |
  | :--- | :--- | :--- | :--- | :--- |
  | `pregnancy_profile_id` | UUID | Có | - | ID hồ sơ thai kỳ |
  | `checkup_date` | string (YYYY-MM-DD) | Có | Không ở tương lai | Ngày diễn ra lần khám |
  | `weight_kg` | number | Không | 30.0 - 200.0 | Cân nặng mẹ bầu (kg) |
  | `blood_pressure_systolic` | integer | Không | 60 - 250 | Huyết áp tâm thu (mmHg) |
  | `blood_pressure_diastolic`| integer | Không | 40 - 150 (Tâm thu > Tâm trương) | Huyết áp tâm trương (mmHg) |
  | `notes` | string | Không | - | Lời dặn hoặc ghi chú của bác sĩ |
  | `biometrics` | object | Không | - | Đối tượng chứa chỉ số siêu âm |
  | `biometrics.bpd` | number | Không | 10.0 - 120.0 | Đường kính lưỡng đỉnh (mm) |
  | `biometrics.hc` | number | Không | 50.0 - 400.0 | Chu vi vòng đầu (mm) |
  | `biometrics.ac` | number | Không | 50.0 - 450.0 | Chu vi vòng bụng (mm) |
  | `biometrics.fl` | number | Không | 5.0 - 95.0 | Chiều dài xương đùi (mm) |
  | `biometrics.efw` | number | Không | 50.0 - 6000.0 | Cân nặng ước tính thai nhi (gram) |

- **Payload Example**:
  ```json
  {
    "pregnancy_profile_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "checkup_date": "2026-11-02",
    "weight_kg": 58.5,
    "blood_pressure_systolic": 118,
    "blood_pressure_diastolic": 76,
    "notes": "Tim thai đều rõ (142 bpm), ngôi đầu. Hẹn khám lại sau 2 tuần.",
    "biometrics": {
      "bpd": 78.5,
      "hc": 285.0,
      "ac": 262.0,
      "fl": 58.0,
      "efw": 1580.0
    }
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "a2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "pregnancy_profile_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "doctor": {
        "id": "21908f68-eb34-46e9-a807-5cd459ea17eb",
        "full_name": "BS. CKI Ngọc Trâm"
      },
      "checkup_date": "2026-11-02",
      "gestational_age": {
        "days": 217,
        "weeks": 31,
        "remaining_days": 0,
        "formatted": "31w0d",
        "trimester": 3
      },
      "vitals": {
        "weight_kg": 58.5,
        "blood_pressure_systolic": 118,
        "blood_pressure_diastolic": 76,
        "blood_pressure_status": "normal"
      },
      "notes": "Tim thai đều rõ (142 bpm), ngôi đầu. Hẹn khám lại sau 2 tuần.",
      "biometric_data": {
        "id": "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f",
        "bpd": 78.5,
        "hc": 285.0,
        "ac": 262.0,
        "fl": 58.0,
        "efw": 1580.0,
        "status": "verified"
      },
      "created_at": "2026-11-02T10:15:00Z"
    },
    "message": "Ghi nhận lần khám thành công"
  }
  ```

---

### 4.5. YÊU CẦU XÓA DỮ LIỆU Y TẾ (MEDICAL DELETION REQUESTS)

Quy trình tuân thủ quyền được lãng quên (Right to be Forgotten) theo chuẩn y tế HIPAA/GDPR.

#### 1. `POST /api/v1/deletion-requests` - Gửi yêu cầu xóa hồ sơ

- **Quyền yêu cầu**: Role `pregnant_woman` (Chính chủ hồ sơ)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Payload**:
  ```json
  {
    "pregnancy_profile_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "target_type": "full_profile",
    "reason": "Chuyển tuyến điều trị sang cơ sở y tế khác theo nguyện vọng gia đình.",
    "allow_anonymized_research": true
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "request_id": "d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a",
      "target_type": "full_profile",
      "allow_anonymized_research": true,
      "status": "pending",
      "created_at": "2026-11-02T10:30:00Z"
    },
    "message": "Yêu cầu xóa dữ liệu đã được ghi nhận và đang chờ Bác sĩ/Admin phê duyệt."
  }
  ```

#### 2. `GET /api/v1/deletion-requests` - Danh sách yêu cầu xóa

- **Quyền yêu cầu**: Role `doctor` hoặc `admin`
- **Query Parameters**: `?status=pending` (hoặc `approved`, `rejected`)
- **Response `200 OK`**: Mảng danh sách các yêu cầu xóa kèm thông tin bệnh nhân và lý do xóa.

#### 3. `PATCH /api/v1/deletion-requests/{request_id}/review` - Duyệt/Từ chối yêu cầu xóa

- **Quyền yêu cầu**: Role `doctor` (bác sĩ phụ trách chính) hoặc `admin`
- **Payload**:
  ```json
  {
    "status": "approved",
    "review_notes": "Đã hoàn thành thủ tục chuyển tuyến, chấp thuận lưu trữ ẩn danh phục vụ nghiên cứu lâm sàng."
  }
  ```
- **Response `200 OK`**: Trạng thái hồ sơ chuyển sang `is_deleted = true`, dữ liệu được ẩn danh hóa hoặc xóa triệt để khỏi hệ thống tùy theo lựa chọn của người bệnh.

---

### 4.6. DỊCH VỤ PHÂN TÍCH LÂM SÀNG & RACA-NET (ANALYSIS SERVICE :8001)

#### `POST /api/v1/rules` - Đánh giá Luật lâm sàng Hadlock (Fallback Engine)

Thực hiện tính toán công thức Hadlock thuần túy, tính Z-score, bách phân vị và phát hiện cờ đỏ lâm sàng (FGR thai chậm phát triển, đa ối, thai to).

- **Service**: Analysis Microservice (`:8001`)
- **Headers**: `Content-Type: application/json`
- **Payload Example**:
  ```json
  {
    "gestational_age_days": 210,
    "bpd": 75.0,
    "hc": 278.0,
    "ac": 255.0,
    "fl": 56.0,
    "efw": 1450.0
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "warning_level": "green",
    "bpd": {
      "measured": 75.0,
      "expected": 76.2,
      "z_score": -0.42,
      "percentile": 33.72
    },
    "hc": {
      "measured": 278.0,
      "expected": 281.5,
      "z_score": -0.32,
      "percentile": 37.45
    },
    "ac": {
      "measured": 255.0,
      "expected": 258.0,
      "z_score": -0.21,
      "percentile": 41.68
    },
    "fl": {
      "measured": 56.0,
      "expected": 57.1,
      "z_score": -0.38,
      "percentile": 35.2
    },
    "efw": {
      "measured": 1450.0,
      "expected": 1490.0,
      "z_score": -0.24,
      "percentile": 40.52
    },
    "explanation_doctor": "Các chỉ số sinh trắc học nằm trong giới hạn phát triển bình thường (bách phân vị 10 - 90%).",
    "explanation_patient": "Thai nhi phát triển bình thường theo tiêu chuẩn tuổi thai 30 tuần.",
    "rules_version": "Hadlock-ACOG-v1.0"
  }
  ```

---

#### `POST /api/v1/predict` - Safety Fusion: Max(Luật Lâm Sàng, RACA-Net)

**Endpoint phân tích chính của hệ thống.** Kết hợp đồng thời Luật Hadlock và Mô hình học sâu RACA-Net theo nguyên tắc an toàn:
$$\text{final\_warning\_level} = \max(\text{rule\_level}, \text{model\_level})$$
Mô hình AI chỉ được phép nâng mức cảnh báo lên `red` hoặc `yellow` khi phát hiện bất thường, không bao giờ hạ mức cảnh báo của luật lâm sàng.

- **Service**: Analysis Microservice (`:8001`)
- **Headers**: `Content-Type: application/json`
- **Payload Example**:
  ```json
  {
    "gestational_age_days": 224,
    "bpd": 80.5,
    "hc": 298.0,
    "ac": 240.0,
    "fl": 59.0,
    "efw": 1520.0,
    "simulated_model_level": "red",
    "simulated_model_risk": 0.92
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "final_warning_level": "red",
    "anomaly_probability": 0.92,
    "raw_model_level": "red",
    "raw_model_prob": 0.92,
    "model_version": "RACA-Net-ResNet50-v1.2",
    "rules_version": "Hadlock-ACOG-v1.0",
    "doctor_explanation": "CỜ ĐỎ LÂM SÀNG: Chu vi vòng bụng (AC) ở bách phân vị < 5th percentile -> Nghi ngờ Thai chậm phát triển (FGR). | [MÔ HÌNH RACA-Net]: Phát hiện bất thường qua mô hình deep learning, nâng cảnh báo lên RED.",
    "patient_explanation": "Chỉ số vòng bụng thai nhi nhỏ hơn bình thường. Bác sĩ chuyên khoa sẽ giải thích chi tiết và đưa ra hướng dẫn theo dõi sát.",
    "disclaimer_text": "LƯU Ý Y TẾ: Kết quả phân tích được tổng hợp từ Luật Lâm Sàng và Mô Hình RACA-Net. Kết quả chỉ mang tính chất hỗ trợ chẩn đoán và cần được duyệt bởi Bác sĩ Chuyên khoa.",
    "rule_result": {
      "warning_level": "yellow",
      "bpd": {
        "measured": 80.5,
        "expected": 81.5,
        "z_score": -0.34,
        "percentile": 36.69
      },
      "hc": {
        "measured": 298.0,
        "expected": 301.2,
        "z_score": -0.28,
        "percentile": 38.97
      },
      "ac": {
        "measured": 240.0,
        "expected": 280.0,
        "z_score": -2.15,
        "percentile": 1.58
      },
      "fl": {
        "measured": 59.0,
        "expected": 61.8,
        "z_score": -0.92,
        "percentile": 17.88
      },
      "efw": {
        "measured": 1520.0,
        "expected": 1900.0,
        "z_score": -1.95,
        "percentile": 2.56
      }
    }
  }
  ```

---

## 5. THỰC THỂ DỮ LIỆU & LƯU TRỮ (DATABASE SCHEMAS)

| Tên Bảng             | Vai trò trong hệ thống   | Các trường dữ liệu chính                                                                                                                                       | Trạng thái (Enum/Status)                                   |
| :------------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `users`              | Tài khoản hệ thống       | `id`, `email`, `password_hash`, `full_name`, `role`, `phone_number`, `is_active`                                                                               | `doctor`, `pregnant_woman`, `admin`                        |
| `pregnancy_profiles` | Hồ sơ thai kỳ            | `id`, `patient_id`, `primary_doctor_id`, `lmp`, `q1_ultrasound_date`, `edd`, `is_deleted`                                                                      | `active`, `completed`, `terminated`                        |
| `checkups`           | Phiếu khám thai          | `id`, `pregnancy_profile_id`, `doctor_id`, `checkup_date`, `gestational_age_days`, `weight_kg`, `blood_pressure_systolic`, `blood_pressure_diastolic`, `notes` | -                                                          |
| `uploaded_files`     | Tệp siêu âm thô (OCR)    | `id`, `pregnancy_profile_id`, `file_url`, `ocr_raw_payload`, `status`                                                                                          | `pending`, `processing`, `extracted`, `verified`, `failed` |
| `biometric_data`     | Chỉ số thai đã đối soát  | `id`, `pregnancy_profile_id`, `checkup_id`, `bpd`, `hc`, `ac`, `fl`, `efw`, `status`, `verified_by`                                                            | `pending_verification`, `verified`                         |
| `analysis_results`   | Kết quả Z-score & AI     | `id`, `checkup_id`, `warning_level`, `bpd_percentile`, `ac_percentile`, `doctor_explanation`                                                                   | `green`, `yellow`, `red`                                   |
| `deletion_requests`  | Yêu cầu xóa dữ liệu y tế | `id`, `requester_id`, `pregnancy_profile_id`, `checkup_id`, `target_type`, `reason`, `allow_anonymized_research`, `status`                                     | `pending`, `approved`, `rejected`                          |
| `audit_logs`         | Nhật ký bảo mật bất biến | `id`, `user_id`, `action`, `target_table`, `target_id`, `ip_address`, `user_agent`, `created_at`                                                               | -                                                          |

---

## 6. HƯỚNG DẪN TÍCH HỢP CODE CHO FRONTEND (WEB & MOBILE)

### 6.1. Cấu hình Axios Client & Tự động Refresh Token (`web_doctor/src/services/api.ts`)

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// 1. Gắn Bearer Token vào mọi Request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("precare_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. Xử lý Token Rotation khi gặp 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) promise.reject(error);
    else promise.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = localStorage.getItem("precare_refresh_token");
      if (!currentRefreshToken) {
        localStorage.removeItem("precare_token");
        localStorage.removeItem("precare_user");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: currentRefreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem("precare_token", access_token);
        localStorage.setItem("precare_refresh_token", refresh_token);

        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("precare_token");
        localStorage.removeItem("precare_user");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

---

### 6.2. Code Gọi API Đăng Nhập & Đăng Ký Chuẩn Contract

```typescript
import { apiClient } from "./api";

// 1. Đăng nhập qua OAuth2 Form URL-Encoded
export async function login(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", email.trim()); // FastAPI OAuth2 yêu cầu trường 'username'
  formData.append("password", password);

  const res = await apiClient.post("/auth/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const token = res.data.access_token;
  localStorage.setItem("precare_token", token);

  // Sau khi lấy token, gọi /auth/me để lấy hồ sơ chính chủ
  const meRes = await apiClient.get("/auth/me");
  const user = meRes.data;
  localStorage.setItem("precare_user", JSON.stringify(user));

  return { token, user };
}

// 2. Đăng ký tài khoản (kích hoạt ngay lập tức)
export async function register(userData: {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
  verification_token?: string;
}) {
  const res = await apiClient.post(
    "/auth/register",
    {
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      phone_number: userData.phone_number,
      role: "doctor",
    },
    {
      params: userData.verification_token
        ? { verification_token: userData.verification_token }
        : {},
    },
  );

  return res.data;
}
```

---

### 6.3. Code Ghi Nhận Lần Khám & Chỉ Số Siêu Âm (`createCheckup`)

```typescript
export async function createCheckupVisit(checkupData: {
  pregnancy_profile_id: string;
  checkup_date: string; // YYYY-MM-DD
  weight_kg?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  notes?: string;
  biometrics?: {
    bpd?: number;
    hc?: number;
    ac?: number;
    fl?: number;
    efw?: number;
  };
}) {
  const response = await apiClient.post("/checkups", checkupData);
  return response.data;
}
```

---

## 7. TỔNG KẾT & CHECKLIST KẾT NỐI CHO DEVELOPER

- [x] **CORS Gateway**: Đã cấu hình cho phép kết nối từ `http://localhost:3000`, `http://localhost:5173` và Mobile Emulator.
- [x] **Xác thực Đăng nhập**: Dùng `application/x-www-form-urlencoded` với cặp trường `username` và `password`.
- [x] **Kích hoạt tài khoản**: Bác sĩ đăng ký xong là `is_active = true`, đăng nhập được ngay, không còn cơ chế chờ duyệt.
- [x] **Tích hợp Checkup Visit**: Tự động nội suy tuổi thai $g_t$ từ EDD và phân loại huyết áp lâm sàng.
- [x] **Quyền được lãng quên**: Tích hợp luồng xóa hồ sơ và lần khám y tế 3 bước qua `/api/v1/deletion-requests`.
- [x] **Phân tích RACA-Net**: Cố định luật $\max(\text{rule}, \text{model})$, mô hình deep learning không bao giờ được phép hạ mức cảnh báo của luật cờ đỏ lâm sàng.
