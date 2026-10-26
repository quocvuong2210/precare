/**
 * STORY-2.1: Quản lý Tài khoản & Xác thực Người dùng (M-AUTH)
 * Chuẩn CSDL & API Contract theo tài liệu API_Contract_STORY-2.1_Auth.md
 */

// Định nghĩa vai trò người dùng (Đồng bộ chính xác từ CSDL PreCare)
export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';

// Thông tin người dùng (User Profile)
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string;
  phoneNumber?: string;
  phone_number?: string;
  role: UserRole;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

// Token phiên JWT & Thời hạn
export interface AuthTokens {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  tokenType?: string;
  token_type?: string;
  expiresIn?: number;
  expires_in?: number;
}

// Response chuẩn cho đăng nhập & đăng ký
export interface AuthResponseData {
  user: UserProfile;
  tokens?: AuthTokens;
  access_token?: string;
  token_type?: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  message?: string;
  detail?: string | any[];
}

// =========================================================================
// REQUEST DTOs (Data Transfer Objects)
// =========================================================================

// Request Body cho POST /api/v1/auth/register
export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  fullName?: string;
  phone_number?: string;
  phoneNumber?: string;
  role: Extract<UserRole, 'doctor' | 'pregnant_woman'>;
  specialty?: string;
  license_number?: string;
  licenseNumber?: string;
  hospital?: string;
}

// Request Body cho POST /api/v1/auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

// Request Body cho POST /api/v1/auth/forgot-password
export interface ForgotPasswordRequest {
  email: string;
}

// Request Body cho POST /api/v1/auth/reset-password
export interface ResetPasswordRequest {
  email: string;
  otp_code: string;
  otpCode?: string;
  new_password: string;
  newPassword?: string;
}

// Thông tin tệp tài liệu chuyên môn tải lên của Bác sĩ
export interface DoctorUploadedDocument {
  id: string;
  name: string;
  size: string;
  status: 'success' | 'error';
  errorMessage?: string;
  file?: File;
}
