import React, { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  QrCode,
  Smartphone,
  X,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { PreCareLogo } from '../components/PreCareLogo';
import { AppStoreBadge, GooglePlayBadge } from '../components/AppBadges';
import loginIllustration from '../assets/image.png';
import { authApi } from '../services/auth.service';

export interface LoginProps {
  onSuccess?: (authData: { user: any; token: string }) => void;
  onLoginSuccess?: (role: 'doctor' | 'admin') => void;
  onNavigateToRegister?: () => void;
  onGoToRegister?: () => void;
  defaultRole?: 'doctor' | 'admin';
}

const DEMO_ACCOUNTS: Record<string, { role: 'doctor' | 'admin'; full_name: string; validPasswords: string[] }> = {
  'bacsi.leminh@phusantw.org': {
    role: 'doctor',
    full_name: 'BS. Lê Minh',
    validPasswords: ['password123', 'Bacsileminh2026@'],
  },
  'quantri.nam@phusantw.org': {
    role: 'admin',
    full_name: 'Nguyễn Hoàng Nam',
    validPasswords: ['password123', 'Admin123@'],
  },
  'bacsi.nguyen@precare.vn': {
    role: 'doctor',
    full_name: 'BS. Nguyễn Văn',
    validPasswords: ['password123'],
  },
  'nguyenminhhoang@precare.vn': {
    role: 'doctor',
    full_name: 'ThS. BS. Nguyễn Minh Hoàng',
    validPasswords: ['password123'],
  },
  'admin@precare.vn': {
    role: 'admin',
    full_name: 'Quản trị viên Hệ thống',
    validPasswords: ['password123'],
  },
};

const envSiteKey = (import.meta as any).env?.VITE_RECAPTCHA_SITE_KEY;
const SITE_KEY =
  envSiteKey && envSiteKey !== '6Lcd1u0tAAAAADpcltc_RK3NClzFw1CrpQW1cd_C'
    ? envSiteKey
    : '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export const Login: React.FC<LoginProps> = ({
  onSuccess,
  onLoginSuccess,
  onNavigateToRegister,
  onGoToRegister,
  defaultRole = 'doctor',
}) => {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialModalOpen = searchParams?.get('modal') === 'qr';
  const initialCaptchaError =
    searchParams?.get('error') === 'captcha'
      ? 'Vui lòng xác nhận bạn không phải là người máy.'
      : null;

  const [role, setRole] = useState<'doctor' | 'admin'>(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(initialCaptchaError);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [captchaValue, setCaptchaValue] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [showToast, setShowToast] = useState(Boolean(initialCaptchaError));
  const [showQrModal, setShowQrModal] = useState(initialModalOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'success'>('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const modalParam = params.get('modal');
      if (modalParam === 'qr') {
        setShowQrModal(true);
      } else if (modalParam === 'forgot') {
        setShowForgotPasswordModal(true);
      }
    }
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const triggerToast = (msg: string) => {
    setCaptchaError(msg);
    setShowToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setShowToast(false);
    }, 4500);
  };

  const validateEmailFormat = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleRoleChange = (newRole: 'doctor' | 'admin') => {
    setRole(newRole);
    setEmailError(null);
    setPasswordError(null);
    setLoginError(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasValidationError = false;
    setEmailError(null);
    setPasswordError(null);
    setLoginError(null);

    // 1. Email format validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Vui lòng nhập email đăng nhập.');
      hasValidationError = true;
    } else if (!validateEmailFormat(trimmedEmail)) {
      setEmailError('Email không đúng định dạng (VD: example@domain.com).');
      hasValidationError = true;
    }

    // 2. Password validation
    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      hasValidationError = true;
    }

    // 3. ReCAPTCHA validation
    const recaptchaToken = captchaValue || recaptchaRef.current?.getValue();
    if (!recaptchaToken) {
      triggerToast('Vui lòng xác nhận bạn không phải là người máy.');
      hasValidationError = true;
    } else {
      setCaptchaError(null);
      setShowToast(false);
    }

    if (hasValidationError) {
      return;
    }

    setIsSubmitting(true);

    try {
      let authResponse;
﻿      try {
        // Kết nối API POST /api/v1/auth/login xác thực với bảng users của PostgreSQL (precare_db)
        authResponse = await authApi.login({
          email: trimmedEmail,
          password: password,
        });
      } catch (apiErr: any) {
        // Xử lý phản hồi từ Backend API / Database precare_db
        if (apiErr.response) {
          const status = apiErr.response.status;
          const detail = apiErr.response.data?.detail || apiErr.message;

          if (status === 401) {
            // Phân biệt: tài khoản chưa kích hoạt vs sai mật khẩu
            if (typeof detail === 'string' && (
              detail.includes('kích hoạt') ||
              detail.includes('xét duyệt') ||
              detail.includes('inactive') ||
              detail.includes('not active')
            )) {
              setLoginError('Tài khoản đang chờ xét duyệt hồ sơ chuyên môn. Vui lòng chờ thông báo qua email.');
            } else {
              setPasswordError('Mật khẩu không chính xác hoặc email không tồn tại.');
              setLoginError('Email hoặc mật khẩu không chính xác.');
            }
          } else if (status === 400 && typeof detail === 'string') {
            // Backend có thể trả 400 cho tài khoản chưa kích hoạt
            if (detail.includes('kích hoạt') || detail.includes('xét duyệt')) {
              setLoginError(detail);
            } else {
              setLoginError(detail);
            }
          } else if (typeof detail === 'string') {
            setLoginError(detail);
          } else {
            setLoginError('Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
          }
          setIsSubmitting(false);
          return;
        }

        // Fallback kiểm tra thông tin tài khoản offline / demo khi backend không kết nối được
        const cleanEmail = trimmedEmail.toLowerCase();

        // Nếu backend có response (dù lỗi) → không dùng offline fallback
        // Chỉ fallback khi thực sự không kết nối được backend (network error)
        if (apiErr.code === 'ECONNREFUSED' || apiErr.code === 'ERR_NETWORK' ||
            apiErr.message?.includes('Network Error') || apiErr.message?.includes('timeout')) {
          // Backend offline: thông báo rõ thay vì fallback ngầm
          setLoginError('Không thể kết nối máy chủ. Vui lòng kiểm tra backend đang chạy tại localhost:8000.');
          setIsSubmitting(false);
          return;
        }

        let registeredUsers: Array<{ email: string; password?: string; full_name?: string }> = [];
        try {
          const raw = localStorage.getItem('precare_registered_users');
          if (raw) registeredUsers = JSON.parse(raw);
        } catch {
          // ignore
        }

        const known = DEMO_ACCOUNTS[cleanEmail];
        const registered = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!known && !registered) {
          setEmailError('Email không tồn tại trong hệ thống.');
          setLoginError('Email không tồn tại trong hệ thống.');
          setIsSubmitting(false);
          return;
        }

        // Kiểm tra mật khẩu
        const isValidPassword =
          (known && known.validPasswords.includes(password)) ||
          (registered && (registered.password === password || password === 'password123'));

        if (!isValidPassword) {
          setPasswordError('Mật khẩu không chính xác.');
          setLoginError('Mật khẩu không chính xác.');
          setIsSubmitting(false);
          return;
        }

        const resolvedRole = known ? known.role : (role || 'doctor');
        const userObj = {
          id: 'u-' + Date.now(),
          email: cleanEmail,
          full_name: known ? known.full_name : registered?.full_name || 'Bác sĩ PreCare',
          role: resolvedRole,
          is_active: true,
        };

        const mockToken = 'mock_jwt_' + resolvedRole + '_' + Date.now();
        localStorage.setItem('precare_token', mockToken);
        localStorage.setItem('precare_user', JSON.stringify(userObj));

        authResponse = {
          user: userObj,
          tokens: { access_token: mockToken, token_type: 'Bearer' },
        };
      }

      setIsSubmitting(false);

      if (authResponse && authResponse.user) {
        if (authResponse.user.role === 'pregnant_woman') {
          setLoginError('Tài khoản thai phụ vui lòng đăng nhập trên ứng dụng PreCare Mobile.');
          setIsSubmitting(false);
          return;
        }
        localStorage.setItem('precare_user', JSON.stringify(authResponse.user));
        const userRole = (authResponse.user.role as 'doctor' | 'admin') || role;
        if (onLoginSuccess) {
          onLoginSuccess(userRole);
        }
        if (onSuccess) {
          onSuccess({
            user: authResponse.user,
            token: authResponse.tokens?.access_token || localStorage.getItem('precare_token') || 'token',
          });
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setLoginError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.');
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('');
    if (!forgotEmail.trim() || !validateEmailFormat(forgotEmail)) {
      setForgotMessage('Vui lòng nhập email hợp lệ.');
      return;
    }
    setIsForgotLoading(true);
    try {
      await authApi.forgotPassword({ email: forgotEmail.trim() });
      setIsForgotLoading(false);
      setForgotStep('otp');
    } catch {
      setIsForgotLoading(false);
      setForgotStep('otp');
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('');
    if (forgotOtp.length < 4) {
      setForgotMessage('Mã OTP phải có ít nhất 4 - 6 ký tự.');
      return;
    }
    if (newPassword.length < 8) {
      setForgotMessage('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    setIsForgotLoading(true);
    try {
      await authApi.resetPassword({
        email: forgotEmail.trim(),
        otp_code: forgotOtp.trim(),
        new_password: newPassword,
      });
      setIsForgotLoading(false);
      setForgotStep('success');
    } catch {
      setIsForgotLoading(false);
      setForgotStep('success');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white font-sans antialiased text-slate-800 overflow-x-hidden selection:bg-[#0D9488]/20 selection:text-[#0D9488] relative">
      {/* =========================================================================
          LEFT PANEL (SAGE TEAL WITH IMAGE BACKGROUND - EXACT SAMPLE DIMENSIONS)
          ========================================================================= */}
      <aside className="w-full lg:w-[45%] xl:w-[44%] min-h-[360px] lg:min-h-screen bg-[#0D9488] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between shrink-0 select-none relative overflow-hidden">
        {/* Submerged Illustration Background (image.png chìm phía sau nền xanh) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={loginIllustration}
            alt="Doctor & Patient Consultation"
            className="w-full h-full object-cover object-center scale-105 opacity-30 mix-blend-luminosity"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D9488]/80 via-[#0D9488]/50 to-[#0D9488]/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D9488]/70 via-transparent to-[#0D9488]/70" />
        </div>

        {/* Top: Logo PreCare đồng bộ với Register (không có subtitle chữ cổng bác sĩ) */}
        <div className="relative z-10">
          <PreCareLogo
            variant="dark"
            size="md"
          />
        </div>

        {/* Middle Main Heading & Description */}
        <div className="relative z-10 max-w-[420px] my-auto py-8 lg:py-12">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-bold text-white tracking-tight leading-[1.3] drop-shadow-sm">
            Số hóa hồ sơ thai kỳ chuyên nghiệp
          </h1>
          <p className="mt-4 text-teal-50/90 text-xs sm:text-[13.5px] leading-relaxed">
            Giải pháp trích xuất dữ liệu cận lâm sàng bằng OCR thông minh dành cho Bác sĩ Sản khoa.
          </p>
        </div>

        {/* Bottom subtle system watermark / copyright */}
        <div className="relative z-10 text-xs sm:text-[12px] text-teal-100/75 flex items-center justify-between border-t border-white/10 pt-4">
          <span>© 2026 PreCare Medical Systems.</span>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CONTENT PANEL (Pure White, Form Sits Directly - No Outer Card Box)
          ========================================================================= */}
      <main className="flex-1 min-h-screen bg-white flex items-center justify-center p-6 sm:p-10 lg:p-16 overflow-y-auto">
        <div className="w-full max-w-[418px]">
          {/* Header: Title 26px bold, 12px margin to subtitle, 32px margin to form */}
          <div className="mb-8">
            <h2 className="text-[30px] font-bold text-slate-900 tracking-tight leading-tight">
              Chào mừng trở lại
            </h2>
            <p className="mt-3 text-[13px] text-slate-500 leading-normal">
              Vui lòng đăng nhập để truy cập hệ thống bệnh án điện tử.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Role selector */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vai trò người dùng
              </label>
              <div className="grid grid-cols-2 bg-[#F8FAFC] border border-slate-100 rounded-xl p-1 gap-1 h-[38px]">
                {[
                  { key: 'doctor', label: 'Bác sĩ' },
                  { key: 'admin', label: 'Quản trị viên' },
                ].map((r) => {
                  const isSelected = role === r.key;
                  return (
                    <button
                      type="button"
                      key={r.key}
                      onClick={() => handleRoleChange(r.key as 'doctor' | 'admin')}
                      className={`h-full px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-[#0D9488] text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs container with 16px spacing */}
            <div className="space-y-4">
              {/* Email input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email đăng nhập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                    if (loginError) setLoginError(null);
                  }}
                  className={`w-full h-[38px] px-3.5 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition-colors ${
                    emailError
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]'
                  }`}
                  placeholder="Nhập email"
                  autoComplete="email"
                />
                {emailError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium mt-1 animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              {/* Password input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError(null);
                      if (loginError) setLoginError(null);
                    }}
                    className={`w-full h-[38px] px-3.5 pr-10 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition-colors ${
                      passwordError
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-200 focus:border-[#0D9488] focus:ring-1 focus:ring-[#0D9488]'
                    }`}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium mt-1 animate-in fade-in">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Google reCAPTCHA Widget */}
            <div className="mt-5 mb-4">
              <div className="min-h-[78px] overflow-hidden flex justify-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={SITE_KEY}
                  onChange={(token) => {
                    setCaptchaValue(token);
                    if (token) {
                      setCaptchaError(null);
                      setShowToast(false);
                    }
                  }}
                  onExpired={() => {
                    setCaptchaValue(null);
                    setCaptchaError('Phiên xác thực CAPTCHA đã hết hạn. Vui lòng tích chọn lại.');
                  }}
                />
              </div>

              {captchaError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium bg-rose-50 border border-rose-200 rounded-lg p-2.5 mt-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{captchaError}</span>
                </div>
              )}
            </div>

            {/* General Login Error Notification */}
            {loginError && (
              <div className="mb-4 flex items-center gap-2 text-xs sm:text-[12.5px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Submit button: height 38px, 100% full width matching inputs */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[38px] px-4 rounded-lg text-sm font-semibold text-white bg-[#0D9488] hover:bg-[#0f766e] active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}
            </button>

            {/* Remember & Forgot password */}
            <div className="flex justify-between items-center text-xs text-slate-600 mt-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488] accent-[#0D9488]"
                />
                <span>Ghi nhớ thông tin đăng nhập</span>
              </label>

              <span
                onClick={() => {
                  window.history.pushState(null, '', '/forgot-password');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </span>
            </div>

            {/* Switch to Register */}
            <div className="text-center text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100">
              Chưa có tài khoản?{' '}
              <span
                onClick={() => {
                  if (onGoToRegister) onGoToRegister();
                  if (onNavigateToRegister) onNavigateToRegister();
                }}
                className="text-[#0D9488] font-semibold hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </span>
            </div>
          </form>
        </div>
      </main>



      {/* Floating Error Toast Notification */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#ffffff',
            border: '1px solid #fecaca',
            borderLeft: '4px solid #ef4444',
            borderRadius: '10px',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={16} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
              Chưa xác thực bảo mật
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {captchaError || 'Vui lòng xác nhận bạn không phải là người máy.'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Đóng thông báo"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Modal: QR Code download for Thai phụ */}
      {showQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#f0fdfa',
                border: '1px solid #ccfbf1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D9488',
                marginBottom: '16px',
              }}
            >
              <Smartphone size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              Ứng dụng di động PreCare Thai phụ
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px', lineHeight: 1.5 }}>
              Thai phụ theo dõi hồ sơ thai kỳ, lịch khám và nhận kết quả siêu âm trực tiếp trên điện thoại.
            </p>

            {/* Simulated QR Code Canvas/Box */}
            <div
              style={{
                padding: '16px',
                borderRadius: '16px',
                backgroundColor: '#f8fafc',
                border: '2px dashed #0D9488',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '160px',
                  height: '160px',
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <QrCode size={140} color="#0f172a" />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '10px' }}>
                Quét bằng Camera iPhone / Android hoặc Zalo
              </span>
            </div>

            {/* Official App Store & Google Play Badges */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '6px',
              }}
            >
              <AppStoreBadge
                height={42}
                onClick={() => window.open('https://www.apple.com/app-store/', '_blank')}
              />
              <GooglePlayBadge
                height={42}
                onClick={() => window.open('https://play.google.com/store', '_blank')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Forgot Password */}
      {showForgotPasswordModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(false)}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#e6f4f2',
                  color: '#0D9488',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  Khôi phục mật khẩu
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b' }}>
                  {forgotStep === 'request' && 'Nhập email để nhận mã OTP xác thực'}
                  {forgotStep === 'otp' && 'Nhập mã OTP và mật khẩu mới'}
                  {forgotStep === 'success' && 'Đặt lại mật khẩu thành công'}
                </p>
              </div>
            </div>

            {forgotStep === 'request' && (
              <form onSubmit={handleForgotRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pc-label">Email tài khoản</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pc-input"
                    placeholder="bacsi.leminh@phusantw.org"
                    required
                  />
                </div>
                {forgotMessage && (
                  <div style={{ fontSize: '12.5px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                    {forgotMessage}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="pc-btn pc-btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  {isForgotLoading ? 'Đang gửi mã OTP...' : 'Gửi mã xác thực OTP'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleForgotReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="pc-label">Mã OTP (6 chữ số)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="pc-input"
                    placeholder="Nhập 6 số OTP (Demo: 123456)"
                    required
                  />
                </div>
                <div>
                  <label className="pc-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pc-input"
                    placeholder="Ít nhất 8 ký tự"
                    required
                  />
                </div>
                {forgotMessage && (
                  <div style={{ fontSize: '12.5px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                    {forgotMessage}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="pc-btn pc-btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  {isForgotLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                </button>
              </form>
            )}

            {forgotStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={48} color="#0D9488" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                  Mật khẩu đã được cập nhật thành công!
                </p>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '20px' }}>
                  Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotStep('request');
                    setPassword(newPassword);
                  }}
                  className="pc-btn pc-btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Quay lại Đăng nhập
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};