import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Địa chỉ Backend PreCare
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

export interface UserAccountInfo {
  id?: string;
  full_name: string;
  email: string;
  phone_number: string;
  birthday?: string;
}

// Lưu thông tin tài khoản hiện tại trong phiên
export let currentAccessToken: string = '';
export let currentUserProfile: UserAccountInfo | null = null;

// Khôi phục phiên đăng nhập từ bộ nhớ máy nếu có
export async function restoreSession(): Promise<UserAccountInfo | null> {
  try {
    const savedToken = await AsyncStorage.getItem('precare_access_token');
    const savedUser = await AsyncStorage.getItem('precare_current_user');
    if (savedToken) currentAccessToken = savedToken;
    if (savedUser) {
      currentUserProfile = JSON.parse(savedUser);
      return currentUserProfile;
    }
  } catch (e) {
    console.log('Lỗi khôi phục phiên:', e);
  }
  return currentUserProfile;
}


// Hàm dùng chung để xử lý response từ backend
async function handleResponse(response: Response) {
  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: any) => d.msg).join('; ')
      : typeof detail === 'string' ? detail : data.message || 'Yêu cầu thất bại';
    throw new Error(message);
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

// Đăng nhập và kiểm tra role qua API profile
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
  // Lấy access_token từ bước login
  const token = data.access_token;
  if (!token) {
    throw new Error('API không trả về access_token.');
  }
  // Gọi tiếp API lấy thông tin user hiện tại (ví dụ: /auth/me hoặc /users/me tùy backend của nhóm bạn)
  const profileRes = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!profileRes.ok) {
    throw new Error('Không lấy được thông tin tài khoản. Vui lòng thử lại.');
  }

  const profileData = await profileRes.json();
  const userObj = profileData.user || profileData.data || profileData;
  const role = userObj.role || profileData.role;

  if (role !== 'pregnant_woman') {
    throw new Error('Chỉ tài khoản thai phụ mới được phép đăng nhập vào ứng dụng.');
  }

  currentAccessToken = token;
  currentUserProfile = {
    id: userObj.id || userObj.user_id || '',
    full_name: userObj.full_name || userObj.name || '',
    email: (userObj.email || email).trim().toLowerCase(),
    phone_number: userObj.phone_number || userObj.phone || '',
    birthday: userObj.birthday || '',
  };

  // Lưu token và thông tin user hiện tại vào AsyncStorage
  try {
    await AsyncStorage.setItem('precare_access_token', token);
    await AsyncStorage.setItem('precare_current_user', JSON.stringify(currentUserProfile));
  } catch (e) {
    console.log('Lỗi lưu phiên đăng nhập:', e);
  }

  return { ...data, role, user: currentUserProfile };
}

// 1. Gửi mã OTP (đăng ký)
export interface SendOtpResponse {
  status: string;
  message: string;
  expires_in: number;
  retry_after: number;
}

export async function sendOtp(email: string, role: string = 'pregnant_woman') {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      role: 'pregnant_woman', // Ép cứng luôn là mẹ bầu
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


// --- TÍNH TOÁN HỒ SƠ THAI KỲ (TUỔI THAI & EDD) ---
export interface PregnancyCalculateRequest {
  target_date?: string;
  lmp?: string;
  q1_ultrasound_date?: string;
  q1_gestational_weeks?: number;
  q1_gestational_days?: number;
  crl_mm?: number;
  override_edd?: string;
}

export async function calculatePregnancyProfile(
  payload: PregnancyCalculateRequest,
  token?: string,
) {
  const authToken = token || currentAccessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(
    `${API_BASE_URL}/pregnancy-profiles/calculate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    },
  );

  return handleResponse(response);
}

// Lưu hồ sơ thai kỳ xuống bảng public.pregnancy_profiles trong Database
export async function savePregnancyProfileToDB(
  payload: PregnancyCalculateRequest & { edd?: string },
  token?: string,
) {
  const authToken = token || currentAccessToken;
  if (!authToken) return null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  try {
    // Thử tạo mới hoặc cập nhật qua POST /pregnancy-profiles
    let res = await fetch(`${API_BASE_URL}/pregnancy-profiles`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    // Nếu hồ sơ đã tồn tại, thử cập nhật qua PUT /pregnancy-profiles/me hoặc PUT /pregnancy-profiles
    if (!res.ok && (res.status === 400 || res.status === 405 || res.status === 409)) {
      res = await fetch(`${API_BASE_URL}/pregnancy-profiles/me`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.log('Lưu DB pregnancy_profiles:', e);
  }
  return null;
}

// Lấy hồ sơ thai kỳ từ bảng public.pregnancy_profiles trong Database khi đăng nhập lại
export async function fetchPregnancyProfileFromDB(token?: string) {
  const authToken = token || currentAccessToken;
  if (!authToken) return null;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  try {
    let res = await fetch(`${API_BASE_URL}/pregnancy-profiles/me`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      res = await fetch(`${API_BASE_URL}/pregnancy-profiles`, {
        method: 'GET',
        headers,
      });
    }

    if (res.ok) {
      const json = await res.json();
      const data = json?.data || json;
      return Array.isArray(data) ? data[0] : data;
    }
  } catch (e) {
    console.log('Tải DB pregnancy_profiles:', e);
  }
  return null;
}