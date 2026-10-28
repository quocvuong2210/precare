/**
 * STORY-2.1: Qu?n l� T�i kho?n & X�c th?c Ngu?i d�ng (M-AUTH)
 * API Service ph? tr�ch to�n b? nghi?p v? �ang k�, �ang nh?p, X�c th?c OTP v� Kh�i ph?c m?t kh?u.
 * Tham chi?u API Contract: web_doctor/API_Contract_STORY-2.1_Auth.md
 */

import axios from 'axios';
import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserProfile,
  AuthResponseData,
} from '../types/auth.types';

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('precare_token');
  if (token && config.headers) {
    config.headers.Authorization = 'Bearer ' + token;
  }
  return config;
});

// Danh sách tài khoản đã đăng ký mẫu (kiểm tra trùng lặp offline / demo)
// Đồng bộ với dữ liệu thực trong precare_db (users table)
const DEFAULT_EXISTING_EMAILS = [
  // Demo accounts (DEMO_ACCOUNTS trong Login.tsx)
  'admin@precare.vn',
  'bacsi.leminh@phusantw.org',
  'bacsi.nguyen@precare.vn',
  'me.bau@gmail.com',
  'nguyenminhhoang@precare.vn',
  // Accounts thực từ DB (precare_db.public.users)
  'user@example.com',
  'bacsi.choaduyet@phusant.vn',
  'haiyen.le@gmail.com',
  'thaochi.nguyen@gmail.com',
  'bacsi.leminh@phusantw.org',
  'quantri.nam@phusantw.org',
  'yennhi5033@gmail.com',
];

const DEFAULT_EXISTING_PHONES = [
  '0903123456',
  '0912345678',
  '0987654321',
  '0933221100',
];

// Tự động dọn dẹp cache tài khoản cũ trong localStorage để không xung đột với Database PostgreSQL
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('precare_registered_users');
  }
} catch {
  // ignore
}

const getRegisteredUsersStore = (): Array<{ email: string; phone_number?: string }> => {
  return [];
};

const saveUserToStore = (_user: { email: string; phone_number?: string; full_name?: string }) => {
  // Không lưu tài khoản vào localStorage để việc kiểm tra luôn do Database PostgreSQL quyết định
};

// =========================================================================
// AUTH API SERVICES (STORY-2.1)
// =========================================================================
export const authApi = {
  /**
   * 1. Ki?m tra d?nh d?ng email v� ki?m tra email d� t?n t?i hay chua
   */
  async checkEmailAvailability(email: string): Promise<{ isAvailable: boolean; message?: string }> {
    const trimmed = email.trim().toLowerCase();

    // Reset c�c token x�c th?c cu khi g?i m� m?i
    sessionStorage.removeItem('precare_verification_token');
    sessionStorage.removeItem('precare_verified_email');
    sessionStorage.removeItem('precare_verified_otp');

    // Ki?m tra d?nh d?ng email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
      return {
        isAvailable: false,
        message: 'Email chua d�ng d?nh d?ng. Vui l�ng ki?m tra l?i, v� d?: bacsi@gmail.com.',
      };
    }

    // Th? g?i endpoint backend n?u c�
    try {
      const res = await apiClient.get('/auth/check-email?email=' + encodeURIComponent(trimmed));
      if (res.data?.exists) {
        return {
          isAvailable: false,
          message: 'Email n�y d� du?c dang k�. Vui l�ng dang nh?p ho?c s? d?ng email kh�c.',
        };
      }
    } catch {
      // Fallback sang store c?c b?
    }

    return { isAvailable: true };
  },

  /**
   * 2. Ki?m tra s? di?n tho?i: sai d?nh d?ng v� d� g?n v?i t�i kho?n kh�c
   */
  async checkPhoneAvailability(phone: string): Promise<{ isAvailable: boolean; message?: string }> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');

    // Ki?m tra format s? di?n tho?i Vi?t Nam (10 s?, b?t d?u 03, 05, 07, 08, 09 ho?c +84)
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return {
        isAvailable: false,
        message: 'S? di?n tho?i sai d?nh d?ng. Vui l�ng nh?p s? di?n tho?i h?p l? (VD: 0903123456).',
      };
    }

    return { isAvailable: true };
  },

  /**
   * 3. G?i m� x�c minh OTP qua Backend FastAPI ho?c Dev SMTP server
   * KH�NG hi?n th? m� OTP l�n giao di?n ngu?i d�ng theo y�u c?u b?o m?t.
   */
  async sendVerificationOtp(email: string): Promise<{ success: boolean; message: string }> {
    const trimmed = email.trim().toLowerCase();

    // Sinh m� ng?u nhi�n 6 ch? s? th?c t? (d�ng cho dev fallback)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // Hi?u l?c 5 ph�t

    // Luu m� an to�n v�o sessionStorage d? d?i so�t khi ngu?i d�ng nh?p (dev mode)
    const otpSessionData = {
      email: trimmed,
      code: otpCode,
      expiresAt,
    };
    sessionStorage.setItem('precare_otp_' + trimmed, JSON.stringify(otpSessionData));
    sessionStorage.setItem('precare_last_otp', JSON.stringify(otpSessionData));

    console.log(
      '%c[PreCare Auth Service] �ang g?i m� OTP d?n: ' + trimmed + ' qua Gmail SMTP...',
      'color: #0d8a7c; font-weight: bold; font-size: 13px;'
    );

    let isSent = false;
    let errorMessage: string | null = null;

    // 1. Th? g?i request d?n Backend FastAPI th?t: POST /api/v1/auth/send-otp
    try {
      const apiRes = await apiClient.post(
        '/auth/send-otp',
        { email: trimmed, role: 'doctor' },
        { timeout: 15000 }
      );
      if (apiRes.data?.status === 'success' || apiRes.data?.success) {
        isSent = true;
      }
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 429) {
        throw new Error(
          err.response?.data?.detail || err.response?.data?.message || 'L?i g?i m� x�c nh?n'
        );
      }
      // N?u backend chua ch?y (offline/network error), ti?p t?c fallback
    }

    // 2. Fallback: G?i qua Vite dev server middleware (scripts/send_otp.py)
    if (!isSent) {
      try {
        const devRes = await axios.post(
          '/api/v1/auth/send-otp',
          { email: trimmed, otp_code: otpCode },
          { headers: { 'Content-Type': 'application/json' }, timeout: 25000 }
        );
        if (devRes.data?.success) {
          isSent = true;
        } else if (devRes.data?.error) {
          errorMessage = devRes.data.error;
        }
      } catch (devErr: any) {
        errorMessage =
          devErr.response?.data?.error ||
          devErr.response?.data?.detail ||
          devErr.message ||
          'Kh�ng th? k?t n?i d?n m�y ch? SMTP';
      }
    }

    // N?u kh�ng g?i du?c
    if (!isSent && errorMessage) {
      console.error('[PreCare Dev SMTP Error]:', errorMessage);
      throw new Error(
        'Kh�ng th? g?i email OTP d?n ' + trimmed + ': ' + errorMessage + '. Vui l�ng ki?m tra l?i c?u h�nh SMTP ho?c k?t n?i internet.'
      );
    }

    // Ph�t s? ki?n email d� g?i th�nh c�ng
    window.dispatchEvent(
      new CustomEvent('precare:otp_dispatched', {
        detail: {
          email: trimmed,
          expiresInMinutes: 5,
        },
      })
    );

    return {
      success: true,
      message: 'M� OTP x�c th?c d� du?c g?i d?n h?p thu ' + trimmed,
    };
  },

  /**
   * 4. X�c minh m� OTP qua Backend FastAPI ho?c SessionStorage fallback
   */
  async verifyOtp(
    email: string,
    inputCode: string
  ): Promise<{ isValid: boolean; error?: string; verificationToken?: string }> {
    const trimmed = email.trim().toLowerCase();
    const cleanCode = inputCode.trim();

    // 1. Th? g?i backend FastAPI th?t: POST /api/v1/auth/verify-otp
    try {
      const res = await apiClient.post('/auth/verify-otp', {
        email: trimmed,
        otp: cleanCode,
      });

      if (res.data?.verification_token) {
        sessionStorage.setItem('precare_verification_token', res.data.verification_token);
        sessionStorage.setItem('precare_verified_email', trimmed);
        sessionStorage.setItem('precare_verified_otp', cleanCode);
        return {
          isValid: true,
          verificationToken: res.data.verification_token,
        };
      }
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 422) {
        return {
          isValid: false,
          error: err.response?.data?.detail || 'M� x�c minh kh�ng ch�nh x�c. Vui l�ng ki?m tra l?i.',
        };
      }
      // N?u offline, ti?p t?c sang fallback
    }

    // 2. Fallback d?i chi?u v?i sessionStorage (dev offline mode)
    const raw =
      sessionStorage.getItem('precare_otp_' + trimmed) ||
      sessionStorage.getItem('precare_last_otp');

    if (!raw) {
      return {
        isValid: false,
        error: 'M� x�c th?c d� h?t h?n ho?c chua du?c t?o. Vui l�ng nh?n g?i l?i m�.',
      };
    }

    try {
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        return {
          isValid: false,
          error: 'M� x�c minh d� h?t h?n (qu� 5 ph�t). Vui l�ng y�u c?u m� m?i.',
        };
      }

      if (session.code !== cleanCode) {
        return {
          isValid: false,
          error: 'M� x�c minh kh�ng d�ng. Vui l�ng ki?m tra l?i m� d� nh?n trong email.',
        };
      }

      const mockVerificationToken = 'dev_verify_token_' + Date.now();
      sessionStorage.setItem('precare_verification_token', mockVerificationToken);
      sessionStorage.setItem('precare_verified_email', trimmed);
      sessionStorage.setItem('precare_verified_otp', cleanCode);
      return { isValid: true, verificationToken: mockVerificationToken };
    } catch {
      return { isValid: false, error: 'L?i x�c minh m� OTP.' };
    }
  },

  /**
   * 5. POST /api/v1/auth/register � �ang k� t�i kho?n b�c si theo API Contract STORY-2.1
   */
  async register(data: RegisterRequest): Promise<any> {
    const payload = {
      email: data.email.trim(),
      password: data.password,
      full_name: data.full_name || data.fullName || '',
      phone_number: data.phone_number || data.phoneNumber || '',
      role: data.role || 'doctor',
    };

    const verificationToken = sessionStorage.getItem('precare_verification_token');

    try {
      const res = await apiClient.post('/auth/register', payload, {
        params: verificationToken ? { verification_token: verificationToken } : {},
      });
      const user = res.data?.data?.user || res.data;
      const tokens = res.data?.data?.tokens;

      if (tokens?.access_token) {
        localStorage.setItem('precare_token', tokens.access_token);
      }

      saveUserToStore({
        email: payload.email,
        phone_number: payload.phone_number,
        full_name: payload.full_name,
      });

      return {
        success: true,
        data: {
          user,
          tokens,
        },
        message: res.data?.message || '�ang k� t�i kho?n th�nh c�ng',
      };
    } catch (err: any) {
      if (err.response?.status === 400 || err.response?.status === 403) {
        const detail = err.response?.data?.detail;
        throw new Error(
          typeof detail === 'string' && detail.includes('already exists')
            ? 'Email n�y d� t?n t?i tr�n h? th?ng.'
            : detail || '�ang k� th?t b?i. Vui l�ng ki?m tra l?i th�ng tin.'
        );
      }

      // Fallback offline mock khi backend chua ch?y
      if (!err.response) {
        saveUserToStore({
          email: payload.email,
          phone_number: payload.phone_number,
          full_name: payload.full_name,
        });

        const mockUser = {
          id: 'u-' + Date.now(),
          email: payload.email,
          full_name: payload.full_name,
          phone_number: payload.phone_number,
          role: payload.role,
          is_active: false,
          created_at: new Date().toISOString(),
        };

        return {
          success: true,
          data: {
            user: mockUser,
            tokens: {
              access_token: 'mock-jwt-token-' + Date.now(),
              token_type: 'Bearer',
            },
          },
          message: '�ang k� t�i kho?n th�nh c�ng (Offline Mode)',
        };
      }

      throw err;
    }
  },

  /**
   * 6. POST /api/v1/auth/login � �ang nh?p h? th?ng theo API Contract STORY-2.1
   */
  async login(data: LoginRequest): Promise<AuthResponseData> {
    try {
      const formData = new URLSearchParams();
      formData.append('username', data.email.trim());
      formData.append('password', data.password);

      const res = await apiClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const token = res.data?.access_token || res.data?.data?.tokens?.access_token;
      if (token) {
        localStorage.setItem('precare_token', token);
      }

      let userProfile: UserProfile;
      try {
        const meRes = await apiClient.get('/auth/me', {
          headers: { Authorization: 'Bearer ' + token },
        });
        userProfile = meRes.data?.data || meRes.data;
      } catch {
        userProfile = {
          id: 'u-' + Date.now(),
          email: data.email,
          full_name: 'B�c si PreCare',
          role: 'doctor',
          is_active: true,
        };
      }

      localStorage.setItem('precare_user', JSON.stringify(userProfile));

      return {
        user: userProfile,
        tokens: {
          access_token: token,
          token_type: 'Bearer',
        },
      };
    } catch (err: any) {
      if (err.response?.status === 422) {
        try {
          const jsonRes = await apiClient.post('/auth/login', {
            email: data.email.trim(),
            password: data.password,
          });
          const token = jsonRes.data?.data?.tokens?.access_token || jsonRes.data?.access_token;
          if (token) {
            localStorage.setItem('precare_token', token);
          }
          const user = jsonRes.data?.data?.user || {
            id: 'u-' + Date.now(),
            email: data.email,
            full_name: 'B�c si PreCare',
            role: 'doctor',
            is_active: true,
          };
          return {
            user,
            tokens: { access_token: token, token_type: 'Bearer' },
          };
        } catch (jsonErr: any) {
          throw jsonErr;
        }
      }

      if (err.response?.status === 401) {
        throw new Error('Email ho?c m?t kh?u kh�ng ch�nh x�c.');
      }

      if (!err.response) {
        const mockToken = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('precare_token', mockToken);
        return {
          user: {
            id: 'u-102948',
            email: data.email,
            full_name: 'BS. L� Minh',
            role: 'doctor',
            is_active: true,
          },
          tokens: {
            access_token: mockToken,
            token_type: 'Bearer',
          },
        };
      }

      throw err;
    }
  },

  /**
   * 7. GET /api/v1/auth/me � L?y th�ng tin t�i kho?n hi?n t?i
   */
  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get('/auth/me');
    return res.data?.data || res.data;
  },

  /**
   * 8. POST /api/v1/auth/forgot-password — Yêu cầu OTP khôi phục mật khẩu
   * Fallback offline: giả lập thành công để không block UX khi backend chưa chạy
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<any> {
    try {
      const res = await apiClient.post('/auth/forgot-password', data);
      return res.data;
    } catch (err: any) {
      // Nếu backend có response (400, 404...) → throw để caller xử lý
      if (err.response) {
        throw err;
      }
      // Backend offline → giả lập thành công (UX không bị block)
      console.warn('[PreCare offline] forgotPassword fallback — backend không chạy');
      return { success: true, message: 'Offline mode: giả lập gửi email thành công' };
    }
  },

  /**
   * 9. POST /api/v1/auth/reset-password — Đặt lại mật khẩu với OTP
   * Fallback offline: giả lập thành công để dev test UX bước 4 → success
   */
  async resetPassword(data: ResetPasswordRequest): Promise<any> {
    const payload = {
      email: data.email,
      otp_code: data.otp_code || data.otpCode,
      new_password: data.new_password || data.newPassword,
    };
    try {
      const res = await apiClient.post('/auth/reset-password', payload);
      return res.data;
    } catch (err: any) {
      // Nếu backend có response (400, 422...) → throw để caller xử lý (OTP sai, hết hạn...)
      if (err.response) {
        throw err;
      }
      // Backend offline → giả lập đổi mật khẩu thành công
      console.warn('[PreCare offline] resetPassword fallback — backend không chạy');
      return { success: true, message: 'Offline mode: giả lập đặt lại mật khẩu thành công' };
    }
  },

  /**
   * 10. POST /api/v1/auth/logout � �ang xu?t
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('precare_refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh_token: refreshToken });
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('precare_token');
      localStorage.removeItem('precare_refresh_token');
      localStorage.removeItem('precare_user');
    }
  },
};

export default authApi;
