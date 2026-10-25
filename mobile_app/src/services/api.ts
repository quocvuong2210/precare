import { Platform } from 'react-native';

// Địa chỉ Backend PreCare
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

// Hàm dùng chung để xử lý response từ backend
async function handleResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : data.message || 'Yêu cầu thất bại',
    );
  }

  return data;
}

// Hàm dùng chung để gọi API xác thực (chức năng Quên mật khẩu)
async function postAuth(path: string, body: object) {
  const response = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : data.message || JSON.stringify(data.detail || data),
    );
  }

  return data;
}

// Đăng nhập
export async function login(email: string, password: string) {
  const formData = new URLSearchParams();

  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : JSON.stringify(data.detail || data),
    );
  }

  return data;
}

// 1. Gửi mã OTP (đăng ký)
export interface SendOtpResponse {
  status: string;
  message: string;
  expires_in: number;
  retry_after: number;
}

export async function sendOtp(
  email: string,
  role: string,
): Promise<SendOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      role,
    }),
  });

  return handleResponse(response);
}

// 2. Xác thực OTP (đăng ký)
export interface VerifyOtpResponse {
  status: string;
  message: string;
  verification_token: string;
}

export async function verifyOtp(
  email: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otp,
    }),
  });

  return handleResponse(response);
}

// 3. Đăng ký tài khoản
export interface RegisterRequest {
  email: string;
  full_name: string;
  role: string;
  phone_number: string;
  password: string;
}

export async function register(
  user: RegisterRequest,
  verificationToken: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/auth/register?verification_token=${encodeURIComponent(verificationToken)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    },
  );

  return handleResponse(response);
}

// Gửi yêu cầu quên mật khẩu (Của bạn)
export function forgotPassword(email: string) {
  return postAuth('forgot-password', {
    email: email.trim(),
  });
}

// Đổi mật khẩu bằng email và mã OTP (Của bạn)
export function resetPassword(
  email: string,
  otp_code: string,
  new_password: string,
) {
  return postAuth('reset-password', {
    email: email.trim(),
    otp_code: otp_code.trim(),
    new_password,
  });
}