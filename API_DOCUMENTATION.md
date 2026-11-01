# TÀI LIỆU API CHI TIẾT DỰ ÁN PRECARE (API DOCUMENTATION)
*Hệ thống số hóa hồ sơ cận lâm sàng và theo dõi thai kỳ (Digital Paraclinical Records & Obstetrics Portal)*

---

## 1. TỔNG QUAN HỆ THỐNG & CẤU HÌNH KẾT NỐI

Dự án **PreCare** được thiết kế theo kiến trúc Microservices Monorepo gồm 2 backend services chính:

| Service | Công nghệ | Port mặc định | Base URL cho Frontend | Swagger / OpenAPI |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API Gateway** | FastAPI + PostgreSQL 16 + Redis | `8000` | `http://localhost:8000/api/v1` | `http://localhost:8000/docs` |
| **Analysis Microservice** | FastAPI + SciPy + PyTorch (RACA-Net) | `8001` | `http://localhost:8001/api/v1` | `http://localhost:8001/docs` |

### 1.1. Địa chỉ kết nối cho các nền tảng Frontend
- **Web Doctor Portal (`web_doctor/`)**: `http://localhost:8000/api/v1`
- **Mobile App - Android Emulator (`mobile_app/`)**: `http://10.0.2.2:8000/api/v1`
- **Mobile App - iOS Simulator / Thiết bị thật qua WiFi**: `http://<IP_MAY_TINH_LAN>:8000/api/v1`

### 1.2. Chuẩn Header và Xác thực
- **Định dạng dữ liệu mặc định**: `Content-Type: application/json`, `Accept: application/json`
- **Ngoại lệ API Đăng nhập**: `POST /api/v1/auth/login` sử dụng chuẩn `application/x-www-form-urlencoded`.
- **Xác thực bảo mật**: Sử dụng chuẩn **Bearer JWT Token** gửi trong HTTP Header:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Quy tắc An toàn Dữ liệu Lâm sàng (Clinical Safety Commitments)**:
  1. **Confirmation Barrier**: Dữ liệu trích xuất từ siêu âm (OCR) chỉ nằm ở bảng `uploaded_files`. Chỉ sau khi Bác sĩ xác nhận qua giao diện thì dữ liệu mới được ghi vào `biometric_data`.
  2. **Safety Override (`max(rule, model)`)**: Mức cảnh báo nguy cơ luôn lấy giá trị nghiêm trọng nhất giữa Luật Lâm Sàng và Mô Hình AI RACA-Net (`green` < `yellow` < `red`). Mô hình AI **không bao giờ** được phép hạ mức cảnh báo của luật cờ đỏ lâm sàng.

---

## 2. QUY ƯỚC RESPONSE & MÃ LỖI CHUẨN

### 2.1. Chuẩn Response thành công
Hầu hết các API trả về JSON trực tiếp hoặc bọc trong object envelope:
```json
{
  "success": true,
  "data": { ... }
}
```

### 2.2. Chuẩn Response lỗi
Khi gặp lỗi (HTTP status `4xx`, `5xx`), backend trả về cấu trúc lỗi chi tiết của FastAPI:
```json
{
  "detail": "Mô tả chi tiết nguyên nhân lỗi hoặc mảng validation errors"
}
```
Hoặc cấu trúc mã lỗi lâm sàng:
```json
{
  "detail": {
    "code": "CLINICAL_VALIDATION_ERROR",
    "message": "Ngày kinh cuối không được ở tương lai."
  }
}
```

### 2.3. Bảng mã HTTP Status Codes
| HTTP Code | Ý nghĩa | Trường hợp xảy ra |
| :--- | :--- | :--- |
| `200 OK` | Thành công | Thực hiện truy vấn, tính toán hoặc xác thực thành công. |
| `400 Bad Request` | Sai dữ liệu đầu vào | Email trùng, tài khoản chưa kích hoạt, OTP sai hoặc hết hạn. |
| `401 Unauthorized` | Không có quyền / Hết hạn token | Chưa gửi token, token sai hoặc Refresh Token đã hết hạn / bị thu hồi. |
| `403 Forbidden` | Bị từ chối truy cập | Bác sĩ chưa được kích hoạt, thiếu verification_token xác thực email. |
| `404 Not Found` | Không tìm thấy tài nguyên | Không tìm thấy bản ghi tương ứng. |
| `422 Unprocessable` | Lỗi định dạng dữ liệu | Dữ liệu không thỏa mãn Pydantic schema hoặc logic lâm sàng (tuần thai < 6 hoặc > 14). |
| `429 Too Many Requests` | Quá giới hạn tần suất | Gửi lại OTP trước thời gian cooldown 60 giây. |
| `500 Server Error` | Lỗi máy chủ | Lỗi tính toán nội bộ, lỗi cơ sở dữ liệu. |

---

## 3. DANH MỤC API CHI TIẾT

```
├── 1. HỆ THỐNG & GIÁM SÁT
│   ├── GET  /                              (Root API Gateway)
│   ├── GET  /health                        (Health check Gateway)
│   └── GET  /api/v1/health                 (Health check Analysis Service)
│
├── 2. XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & RBAC)
│   ├── POST /api/v1/auth/login             (Đăng nhập lấy Access Token)
│   ├── POST /api/v1/auth/send-otp          (Gửi mã OTP kích hoạt qua Email)
│   ├── POST /api/v1/auth/verify-otp        (Xác thực mã OTP 6 số)
│   ├── POST /api/v1/auth/register          (Đăng ký tài khoản người dùng)
│   ├── GET  /api/v1/auth/me                (Lấy hồ sơ người dùng hiện tại)
│   ├── POST /api/v1/auth/refresh           (Cấp mới Access Token xoay vòng)
│   ├── POST /api/v1/auth/forgot-password   (Yêu cầu OTP quên mật khẩu)
│   ├── POST /api/v1/auth/reset-password    (Đặt lại mật khẩu bằng OTP)
│   └── POST /api/v1/auth/logout            (Thu hồi Refresh Token & Đăng xuất)
│
├── 3. HỒ SƠ THAI KỲ & CÔNG CỤ TÍNH LÂM SÀNG (PREGNANCY PROFILES)
│   └── POST /api/v1/pregnancy-profiles/calculate (Tính nháp tuổi thai & EDD chuẩn lâm sàng)
│
└── 4. DỊCH VỤ PHÂN TÍCH LÂM SÀNG & RACA-NET (ANALYSIS SERVICE)
    ├── POST /api/v1/rules                  (Đánh giá Luật lâm sàng Hadlock Z-score & Percentile)
    └── POST /api/v1/predict                (Phân tích Safety Fusion: Max(Luật, RACA-Net))
```

---

## 4. CHI TIẾT TỪNG ENDPOINT

### 4.1. HỆ THỐNG & GIÁM SÁT

#### `GET /` - Kiểm tra thông tin Gateway
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
- **Content-Type**: `application/x-www-form-urlencoded` *(Chuẩn OAuth2)*
- **Headers**:
  ```http
  Content-Type: application/x-www-form-urlencoded
  ```
- **Payload (Form Data)**:
  | Tham số | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `username` | string | Có | Email đăng nhập của người dùng (VD: `admin@precare.vn` hoặc `bacsi.nguyen@precare.vn`) |
  | `password` | string | Có | Mật khẩu tài khoản |
- **Payload Example**:
  ```
  username=bacsi.nguyen%40precare.vn&password=Password123%40
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
  - `400 Bad Request`: Tài khoản chưa được kích hoạt (`{"detail": "Tài khoản chưa được kích hoạt hoặc hồ sơ chuyên môn đang chờ xét duyệt."}`).

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
    "email": "bacsi.lehoang@precare.vn",
    "role": "doctor"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "status": "success",
    "message": "Mã xác minh đã được gửi đến bacsi.lehoang@precare.vn. Mã có hiệu lực trong 5 phút.",
    "expires_in": 300,
    "retry_after": 60
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Email đã tồn tại và đang hoạt động (`{"detail": "Địa chỉ email này đã được đăng ký và kích hoạt trong hệ thống."}`).
  - `429 Too Many Requests`: Gửi lại quá nhanh (`{"detail": "Vui lòng đợi 48 giây trước khi yêu cầu gửi lại mã."}`).

---

#### `POST /api/v1/auth/verify-otp` - Xác thực mã OTP
Kiểm tra mã OTP 6 số người dùng nhập từ email. Nếu thành công, cấp `verification_token` có hiệu lực trong 15 phút để hoàn tất đăng ký.
- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email cần xác thực |
  | `otp` | string (6 ký tự) | Có | Mã OTP 6 chữ số (VD: `"941026"`) |
- **Payload Example**:
  ```json
  {
    "email": "bacsi.lehoang@precare.vn",
    "otp": "941026"
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
  - `400 Bad Request`: Mã OTP không đúng hoặc đã hết hạn.

---

#### `POST /api/v1/auth/register` - Đăng ký tài khoản người dùng
Tạo tài khoản người dùng mới. Lưu ý: Tài khoản Bác sĩ (`doctor`) mặc định sẽ có `is_active = false` để chờ duyệt hồ sơ chuyên môn và yêu cầu phải có `verification_token`.
- **Service**: Backend Gateway (`:8000`)
- **Query Parameters**:
  | Tham số | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `verification_token` | string | Bắt buộc đối với role doctor | Token nhận được từ bước `verify-otp` |
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email tài khoản |
  | `password` | string | Có | Mật khẩu tài khoản (tối thiểu 6 ký tự) |
  | `full_name` | string | Có | Họ và tên đầy đủ |
  | `role` | string | Có | `"doctor"`, `"pregnant_woman"`, hoặc `"admin"` |
  | `phone_number` | string | Không | Số điện thoại liên hệ |
- **Payload Example**:
  ```json
  {
    "email": "bacsi.lehoang@precare.vn",
    "password": "SecurePassword123@",
    "full_name": "BS. CKI Lê Hoàng",
    "role": "doctor",
    "phone_number": "0912345678"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "e0b9e8dc-3bb8-4f1b-871d-5c74fb93574d",
    "email": "bacsi.lehoang@precare.vn",
    "full_name": "BS. CKI Lê Hoàng",
    "role": "doctor",
    "phone_number": "0912345678",
    "is_active": false,
    "created_at": "2026-10-29T22:00:00Z",
    "updated_at": "2026-10-29T22:00:00Z"
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Email đã tồn tại.
  - `403 Forbidden`: Email chưa được xác thực qua OTP hoặc token xác thực đã hết hạn.

---

#### `GET /api/v1/auth/me` - Lấy thông tin tài khoản hiện tại
Lấy hồ sơ cá nhân và quyền hạn của tài khoản từ Access Token.
- **Service**: Backend Gateway (`:8000`)
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Payload**: Không có
- **Response `200 OK`**:
  ```json
  {
    "id": "21908f68-eb34-46e9-a807-5cd459ea17eb",
    "email": "bacsi.lehoang@precare.vn",
    "full_name": "BS. CKI Lê Hoàng",
    "role": "doctor",
    "phone_number": "0912345678",
    "is_active": true,
    "created_at": "2026-10-20T10:00:00Z",
    "updated_at": "2026-10-29T15:30:00Z"
  }
  ```
- **Lỗi thường gặp**:
  - `401 Unauthorized`: Token không hợp lệ, bị sửa đổi hoặc đã hết hạn.

---

#### `POST /api/v1/auth/refresh` - Cấp mới Access Token (Token Rotation)
Dùng Refresh Token hợp lệ để đổi lấy một cặp Access Token (hạn 30 phút) và Refresh Token mới (hạn 7 ngày). Refresh token cũ sẽ bị thu hồi ngay lập tức để chống tấn công Replay Attack.
- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `refresh_token` | string | Có | Chuỗi token ngẫu nhiên được lưu trữ ở client |
- **Payload Example**:
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
- **Lỗi thường gặp**:
  - `401 Unauthorized`: Refresh token không hợp lệ, đã bị thu hồi hoặc đã hết hạn.

---

#### `POST /api/v1/auth/forgot-password` - Yêu cầu khôi phục mật khẩu
Gửi mã OTP 6 số vào email để khôi phục mật khẩu. Mã có hiệu lực trong 15 phút.
- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email tài khoản cần đặt lại mật khẩu |
- **Payload Example**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Mã OTP đã được gửi đến email của bạn"
  }
  ```

---

#### `POST /api/v1/auth/reset-password` - Đặt lại mật khẩu mới
Xác thực mã OTP khôi phục, cập nhật mật khẩu mới và tự động hủy bỏ tất cả Refresh Tokens cũ trên mọi thiết bị.
- **Service**: Backend Gateway (`:8000`)
- **Headers**: `Content-Type: application/json`
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `email` | string (Email) | Có | Email tài khoản |
  | `otp_code` | string (6 ký tự) | Có | Mã OTP 6 chữ số gửi qua email |
  | `new_password` | string | Có | Mật khẩu mới (tối thiểu 6 ký tự) |
- **Payload Example**:
  ```json
  {
    "email": "user@example.com",
    "otp_code": "654321",
    "new_password": "NewSecurePassword123@"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Đặt lại mật khẩu thành công"
  }
  ```
- **Lỗi thường gặp**:
  - `400 Bad Request`: Sai email hoặc mã OTP không hợp lệ / đã hết hạn (> 15 phút).

---

#### `POST /api/v1/auth/logout` - Đăng xuất an toàn
Thu hồi Refresh Token hiện tại để đóng phiên làm việc an toàn.
- **Service**: Backend Gateway (`:8000`)
- **Headers**:
  ```http
  Authorization: Bearer <access_token>
  Content-Type: application/json
  ```
- **Payload (JSON)**:
  | Trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :--- | :--- | :--- |
  | `refresh_token` | string | Có | Refresh Token cần thu hồi |
- **Payload Example**:
  ```json
  {
    "refresh_token": "3a4b5c6d7e8f9a0b1c2d7f8b9c0d1e2f"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Đăng xuất thành công"
  }
  ```

---

### 4.3. HỒ SƠ THAI KỲ & TÍNH TOÁN LÂM SÀNG

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

- **Payload Example 1 (Tính theo Siêu âm Quý 1)**:
  ```json
  {
    "target_date": "2026-10-29",
    "lmp": "2026-04-01",
    "q1_ultrasound_date": "2026-06-15",
    "q1_gestational_weeks": 11,
    "q1_gestational_days": 2,
    "crl_mm": 45.5
  }
  ```

- **Payload Example 2 (Tính theo Kỳ kinh cuối LMP)**:
  ```json
  {
    "target_date": "2026-10-29",
    "lmp": "2026-03-25"
  }
  ```

- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "target_date": "2026-10-29",
      "calculated_edd": "2026-12-30",
      "primary_method": "crl",
      "clinical_note": "Tính dựa trên chiều dài đầu mông (CRL = 45.5mm lúc 11w2d). Phương pháp này có độ chính xác cao nhất (sai số ±3-5 ngày).",
      "gestational_age": {
        "days": 213,
        "weeks": 30,
        "remaining_days": 3,
        "formatted": "30w3d",
        "trimester": 3,
        "trimester_name": "Tam cá nguyệt thứ 3 (Tuần 28 - 40+)",
        "days_until_edd": 62
      },
      "days_until_edd": 62
    }
  }
  ```

- **Lỗi thường gặp**:
  - `422 Unprocessable Entity`: Dữ liệu không hợp lệ lâm sàng:
    ```json
    {
      "detail": {
        "code": "CLINICAL_VALIDATION_ERROR",
        "message": "Cần cung cấp ít nhất một phương pháp: LMP, Siêu âm Quý 1 hoặc EDD chỉ định."
      }
    }
    ```

---

### 4.4. DỊCH VỤ PHÂN TÍCH LÂM SÀNG & RACA-NET (ANALYSIS SERVICE)

Cả hai endpoint dưới đây đều nhận cấu trúc payload `AnalysisRequest`:
- Tuổi thai tính bằng ngày (`gestational_age_days`: 70 đến 300, tương đương 10 đến 42 tuần).
- Các chỉ số sinh trắc thai nhi (mm/g):
  - `bpd`: Đường kính lưỡng đỉnh (Biparietal Diameter - mm)
  - `hc`: Chu vi vòng đầu (Head Circumference - mm)
  - `ac`: Chu vi vòng bụng (Abdominal Circumference - mm)
  - `fl`: Chiều dài xương đùi (Femur Length - mm)
  - `efw`: Cân nặng ước tính (Estimated Fetal Weight - gram)
- Các tham số mô phỏng thử nghiệm AI:
  - `simulated_model_level`: `"green"` | `"yellow"` | `"red"`
  - `simulated_model_risk`: `0.0` đến `1.0`

---

#### `POST /api/v1/rules` - Đánh giá Luật lâm sàng Hadlock (Fallback Engine)
Chỉ thực hiện tính toán luật Hadlock thuần túy, tính Z-score, bách phân vị và phát hiện cờ đỏ lâm sàng (FGR, đa ối, thai to). Dùng làm phương án dự phòng khi mô hình AI bảo trì.
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
    "bpd": { "measured": 75.0, "expected": 76.2, "z_score": -0.42, "percentile": 33.72 },
    "hc":  { "measured": 278.0, "expected": 281.5, "z_score": -0.32, "percentile": 37.45 },
    "ac":  { "measured": 255.0, "expected": 258.0, "z_score": -0.21, "percentile": 41.68 },
    "fl":  { "measured": 56.0, "expected": 57.1, "z_score": -0.38, "percentile": 35.20 },
    "efw": { "measured": 1450.0, "expected": 1490.0, "z_score": -0.24, "percentile": 40.52 },
    "explanation_doctor": "Các chỉ số sinh trắc học nằm trong giới hạn phát triển bình thường (bách phân vị 10 - 90%).",
    "explanation_patient": "Thai nhi phát triển bình thường theo tiêu chuẩn tuổi thai 30 tuần.",
    "rules_version": "Hadlock-ACOG-v1.0"
  }
  ```

---

#### `POST /api/v1/predict` - Safety Fusion (Luật Lâm Sàng + Mô Hình RACA-Net)
**Endpoint phân tích chính của hệ thống.** Kết hợp đồng thời Luật Hadlock và Mô hình học sâu RACA-Net, áp dụng nguyên tắc an toàn tuyệt đối:
$$\text{final\_warning\_level} = \max(\text{rule\_level}, \text{model\_level})$$
Mô hình AI chỉ được phép nâng mức cảnh báo lên `red` hoặc `yellow` khi phát hiện vi cấu trúc bất thường, không bao giờ hạ mức cảnh báo của bác sĩ/luật cờ đỏ.

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
      "bpd": { "measured": 80.5, "expected": 81.5, "z_score": -0.34, "percentile": 36.69 },
      "hc": { "measured": 298.0, "expected": 301.2, "z_score": -0.28, "percentile": 38.97 },
      "ac": { "measured": 240.0, "expected": 280.0, "z_score": -2.15, "percentile": 1.58 },
      "fl": { "measured": 59.0, "expected": 61.8, "z_score": -0.92, "percentile": 17.88 },
      "efw": { "measured": 1520.0, "expected": 1900.0, "z_score": -1.95, "percentile": 2.56 }
    }
  }
  ```

---

## 5. THỰC THỂ DỮ LIỆU & LỘ TRÌNH KẾT NỐI (DATA MODELS)

Để hỗ trợ việc chuyển đổi từ Mock Data trong `web_doctor` và `mobile_app` sang API backend chính thức, bảng dưới đây tổng hợp các thực thể cốt lõi trong cơ sở dữ liệu (`init-db/01-init.sql`):

### 5.1. Bảng thực thể dữ liệu chính
| Tên Bảng | Vai trò | Các trường chính | Trạng thái (Enum) |
| :--- | :--- | :--- | :--- |
| `users` | Tài khoản hệ thống | `id`, `email`, `full_name`, `role`, `phone_number`, `is_active` | `doctor`, `pregnant_woman`, `admin` |
| `pregnancy_profiles` | Hồ sơ quản lý thai kỳ | `id`, `patient_id`, `primary_doctor_id`, `lmp`, `q1_ultrasound_date`, `edd`, `status` | `active`, `completed`, `terminated` |
| `checkups` | Phiếu khám định kỳ | `id`, `pregnancy_profile_id`, `doctor_id`, `checkup_date`, `gestational_age_days`, `weight_kg`, `blood_pressure_systolic`, `notes` | - |
| `uploaded_files` | Tệp siêu âm / OCR | `id`, `pregnancy_profile_id`, `file_url`, `file_type`, `ocr_raw_payload`, `status` | `pending`, `processing`, `extracted`, `verified`, `failed` |
| `biometric_data` | Chỉ số thai đã duyệt | `id`, `pregnancy_profile_id`, `checkup_id`, `bpd`, `hc`, `ac`, `fl`, `efw`, `status`, `verified_by` | `pending_verification`, `verified` |
| `analysis_results` | Kết quả AI & Z-score | `id`, `checkup_id`, `bpd_percentile`, `ac_percentile`, `warning_level`, `doctor_explanation` | `green`, `yellow`, `red` |
| `medical_reports` | Báo cáo PDF xuất bản | `id`, `checkup_id`, `pdf_url`, `report_type`, `generated_by` | `doctor_professional`, `patient_simplified` |

### 5.2. Luồng xác thực OCR (Confirmation Barrier Pipeline)
```
[1. Upload tệp siêu âm]
       │
       ▼
[uploaded_files] (status = 'extracted', chứa ocr_raw_payload)
       │
       ▼
[Giao diện Bác sĩ đối soát & hiệu chỉnh]
       │
       ▼
[Bác sĩ bấm 'Xác nhận'] ──► Ghi vào [biometric_data] (status = 'verified')
                                      │
                                      ▼
                        Kích hoạt [analysis_results] & Cập nhật Trajectory Curve
```

---

## 6. HƯỚNG DẪN TÍCH HỢP CODE CHO FRONTEND

### 6.1. Web Doctor (`web_doctor/src/services/api.ts`) - Cấu hình Axios Interceptor tự động Refresh Token

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// 1. Request Interceptor: Tự động đính kèm Access Token vào mọi request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('precare_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Tự động Refresh Token khi gặp lỗi 401 Unauthorized
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = localStorage.getItem('precare_refresh_token');
      if (!currentRefreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: currentRefreshToken,
        });

        const { access_token, refresh_token } = response.data.data;
        localStorage.setItem('precare_access_token', access_token);
        localStorage.setItem('precare_refresh_token', refresh_token);

        apiClient.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 6.2. Hàm Đăng Nhập Form-Data trong TypeScript

```typescript
export async function loginWithCredentials(email: string, password: string) {
  const formData = new URLSearchParams();
  formData.append('username', email); // Lưu ý: FastAPI OAuth2 dùng key 'username'
  formData.append('password', password);

  const response = await apiClient.post('/auth/login', formData.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const { access_token } = response.data;
  localStorage.setItem('precare_access_token', access_token);
  return response.data;
}
```

---

### 6.3. Mobile App (`mobile_app/src/services/api.ts`) - Cấu hình Gọi API Tính Tuổi Thai

```typescript
export async function calculateGestationalAge(params: {
  lmp?: string;
  q1_ultrasound_date?: string;
  q1_gestational_weeks?: number;
  q1_gestational_days?: number;
  crl_mm?: number;
  override_edd?: string;
}) {
  const token = await getStoredToken();
  const response = await fetch(`${API_BASE_URL}/pregnancy-profiles/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail?.message || data.detail || 'Lỗi tính toán tuổi thai');
  }

  return data.data;
}
```

---

## 7. TỔNG KẾT & DANH SÁCH KIỂM TRA CHO DEVELOPER (CHECKLIST)

- [x] Đã cấu hình CORS cho phép `http://localhost:3000` (Web) và các kết nối mobile app.
- [x] Đã test đầy đủ 9 endpoint xác thực `/api/v1/auth/*` bao gồm cấp xoay vòng refresh token.
- [x] Đã kiểm tra logic tính tuổi thai & ngày dự sinh với validation lâm sàng ACOG.
- [x] Đã liên kết endpoint phân tích cận lâm sàng port 8001 với ràng buộc `max(rule, model)`.
- [x] Frontend lưu trữ token an toàn và tự động làm mới access token khi hết hạn mà không gây gián đoạn phiên người dùng.

