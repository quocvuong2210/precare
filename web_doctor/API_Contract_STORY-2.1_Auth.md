# API CONTRACT & INTERFACE SPECIFICATION (UPDATED)
## STORY-2.1: Quản lý Tài khoản & Xác thực Người dùng (M-AUTH)

- **Mã Story:** STORY-2.1
- **Tên Story:** Quản lý Tài khoản & Xác thực Người dùng
- **Module:** M-AUTH
- **Chuẩn CSDL:** Đồng bộ chính xác với sơ đồ PostgreSQL 11 bảng của hệ thống PreCare.

---

## 1. SUB-TASK 2.1.1 (BACKEND): CƠ SỞ DỮ LIỆU & BẢO MẬT

### 1.1 Sơ đồ Bảng Chuẩn (PostgreSQL)

#### 1. Bảng `users` (Đồng bộ chính xác từ DDL dự án)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'pregnant_woman', 'admin')),
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

#### 2. Bảng `refresh_tokens` (Quản lý phiên JWT & Revocation)
```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

#### 3. Bảng `password_resets` (Mã khôi phục mật khẩu OTP)
```sql
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_resets_user ON password_resets(user_id);
```

---

## 2. SUB-TASK 2.1.2 (BACKEND): API REST CONTRACT

- **Base URL:** `/api/v1/auth`
- **Content-Type:** `application/json`

### 2.1 Chi tiết các Endpoints

#### 1. `POST /api/v1/auth/register` — Đăng ký tài khoản mới
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123@",
  "full_name": "Nguyễn Thị A",
  "phone_number": "0912345678",
  "role": "pregnant_woman"
}
```
*(Lưu ý: `role` chấp nhận `'pregnant_woman'` hoặc `'doctor'`)*

- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
      "email": "user@example.com",
      "full_name": "Nguyễn Thị A",
      "phone_number": "0912345678",
      "role": "pregnant_woman",
      "is_active": true,
      "created_at": "2026-09-18T14:00:00Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "d7a4891b2c3d4e5f6a7b8c9d0e1f2a3b...",
      "token_type": "Bearer",
      "expires_in": 1800
    }
  },
  "message": "Đăng ký tài khoản thành công"
}
```

---

#### 2. `POST /api/v1/auth/login` — Đăng nhập hệ thống
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123@"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
      "email": "user@example.com",
      "full_name": "Nguyễn Thị A",
      "role": "pregnant_woman",
      "is_active": true
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "d7a4891b2c3d4e5f6a7b8c9d0e1f2a3b...",
      "token_type": "Bearer",
      "expires_in": 1800
    }
  },
  "message": "Đăng nhập thành công"
}
```

---

#### 3. `POST /api/v1/auth/refresh` — Cấp lại Access Token
- **Request Body:**
```json
{
  "refresh_token": "d7a4891b2c3d4e5f6a7b8c9d0e1f2a3b..."
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.NEW...",
    "refresh_token": "e8b59A2c3d4e5f6a7b8c9d0e1f2a3b.NEW...",
    "token_type": "Bearer",
    "expires_in": 1800
  }
}
```

---

#### 4. `POST /api/v1/auth/forgot-password` — Yêu cầu OTP khôi phục mật khẩu
- **Request Body:** `{"email": "user@example.com"}`
- **Response 200 OK:** `{"success": true, "message": "Mã OTP đã được gửi đến email của bạn"}`

---

#### 5. `POST /api/v1/auth/reset-password` — Đặt lại mật khẩu với OTP
- **Request Body:**
```json
{
  "email": "user@example.com",
  "otp_code": "654321",
  "new_password": "NewPassword123@"
}
```
- **Response 200 OK:** `{"success": true, "message": "Đặt lại mật khẩu thành công"}`

---

#### 6. `POST /api/v1/auth/logout` — Đăng xuất
- **Header:** `Authorization: Bearer <access_token>`
- **Request Body:** `{"refresh_token": "d7a4891b2c3d4e5f6a7b8c9d0e1f2a3b..."}`
- **Response 200 OK:** `{"success": true, "message": "Đăng xuất thành công"}`

---

#### 7. `GET /api/v1/auth/me` — Thông tin người dùng hiện tại
- **Header:** `Authorization: Bearer <access_token>`
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "c39a8e41-2b62-4f38-9e12-3a456b789012",
    "email": "user@example.com",
    "full_name": "Nguyễn Thị A",
    "phone_number": "0912345678",
    "role": "pregnant_woman",
    "is_active": true,
    "created_at": "2026-09-18T14:00:00Z"
  }
}
```

---

## 3. SUB-TASK 2.1.3 (WEB & MOBILE): SPECS & INTERFACES

### 3.1 Định nghĩa TypeScript Interfaces (Cập nhật)

```typescript
// roles.ts - Đồng bộ chính xác enum từ CSDL
export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';

// user.ts
export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

// requests.ts
export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: Extract<UserRole, 'doctor' | 'pregnant_woman'>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}
```

---

### 3.2 UI Rules & Routing

| Màn hình | Trường dữ liệu | Quy tắc Validation & Routing |
| :--- | :--- | :--- |
| **Đăng nhập** | Email, Password | Chuyển hướng theo role: `doctor` -> Dashboard Web, `pregnant_woman` -> App Mobile |
| **Đăng ký** | Email, Password, Full Name, Phone Number, Role | Role chọn từ dropdown: `doctor` (Bác sĩ) hoặc `pregnant_woman` (Thai phụ). |
| **Quên Mật Khẩu** | Email, OTP Code, New Password | OTP 6 chữ số, thời gian hiệu lực 15 phút. |

---
*Tài liệu này đã được cập nhật hoàn toàn khớp với sơ đồ 11 bảng của CSDL PreCare.*
