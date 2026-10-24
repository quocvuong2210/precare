
import { Platform } from 'react-native';

// Địa chỉ Backend PreCare
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

// Hàm dùng chung để gọi API xác thực
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

// Gửi yêu cầu quên mật khẩu
export function forgotPassword(email: string) {
  return postAuth('forgot-password', {
    email: email.trim(),
  });
}

// Đổi mật khẩu bằng email và mã OTP
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
