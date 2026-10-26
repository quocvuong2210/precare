/**
 * ForgotPassword.tsx
 *
 * Quản lý 3 bước đầu của quy trình khôi phục mật khẩu:
 *   Bước 1 — Nhập email  → POST /api/v1/auth/forgot-password
 *   Bước 2 — Mở Gmail, chờ nhận OTP
 *   Bước 3 — Nhập mã OTP 6 số → xác minh → chuyển sang ResetPassword (bước 4)
 *
 * KHÔNG ĐỤNG TỚI BACKEND NGOÀI CÁC authApi đã có sẵn.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Mail,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { PreCareLogo } from '../components/PreCareLogo';
import { authApi } from '../services/auth.service';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ForgotPasswordProps {
  onNavigateToLogin?: () => void;
  /** Gọi khi OTP verified thành công → chuyển sang trang đặt mật khẩu mới */
  onOtpVerified?: (email: string, otpCode: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const getMailboxUrl = (email: string) => {
  const d = email.split('@')[1]?.toLowerCase() ?? '';
  if (d === 'gmail.com') return 'https://mail.google.com';
  if (d === 'yahoo.com' || d === 'yahoo.com.vn') return 'https://mail.yahoo.com';
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(d)) return 'https://outlook.live.com';
  return `https://mail.${d}`;
};

const getMailboxLabel = (email: string) => {
  const d = email.split('@')[1]?.toLowerCase() ?? '';
  if (d === 'gmail.com') return 'Mở Gmail';
  if (d === 'yahoo.com' || d === 'yahoo.com.vn') return 'Mở Yahoo Mail';
  if (['outlook.com', 'hotmail.com', 'live.com'].includes(d)) return 'Mở Outlook';
  return 'Mở hộp thư';
};

// ─── Sidebar config theo bước ─────────────────────────────────────────────────
const SIDEBAR: Record<number, { badge: string; title: string; desc: string }> = {
  1: {
    badge: 'BẢO MẬT TÀI KHOẢN Y TẾ',
    title: 'Bảo vệ tài khoản',
    desc: 'Hệ thống xác thực đa lớp bảo vệ an toàn cho hồ sơ bệnh án điện tử và thông tin thai phụ.',
  },
  2: {
    badge: 'HỘP THƯ Y TẾ',
    title: 'Kiểm tra hộp thư',
    desc: 'Vui lòng kiểm tra hộp thư đến hoặc thư mục Spam để nhận mã xác minh 6 chữ số.',
  },
  3: {
    badge: 'XÁC MINH BẢO MẬT',
    title: 'Nhập mã xác minh',
    desc: 'Nhập mã OTP 6 chữ số vừa được gửi đến hộp thư của bạn để tiếp tục đặt lại mật khẩu.',
  },
};

// ─── OTP Input Cell ───────────────────────────────────────────────────────────
const OtpCell: React.FC<{
  value: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  hasError: boolean;
}> = ({ value, inputRef, onChange, onKeyDown, onPaste, hasError }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '48px',
        height: '56px',
        textAlign: 'center',
        fontSize: '22px',
        fontWeight: 700,
        fontFamily: "'Courier New', monospace",
        border: `2px solid ${hasError ? '#EF4444' : focused ? '#0F766E' : value ? '#0F766E' : '#CBD5E1'}`,
        borderRadius: '10px',
        backgroundColor: hasError ? '#FEF2F2' : value ? '#F0FDFA' : '#FFFFFF',
        color: hasError ? '#EF4444' : '#0F172A',
        outline: 'none',
        transition: 'all 0.15s ease',
        boxShadow: focused
          ? hasError
            ? '0 0 0 3px rgba(239,68,68,0.15)'
            : '0 0 0 3px rgba(15,118,110,0.15)'
          : 'none',
        caretColor: 'transparent',
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onNavigateToLogin,
  onOtpVerified,
}) => {
  // ── Global state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');

  // ── Step 1 ──────────────────────────────────────────────────────────────────
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── Step 2 ──────────────────────────────────────────────────────────────────
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendLabel, setResendLabel] = useState('Gửi lại mã');
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 3: OTP ─────────────────────────────────────────────────────────────
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(300); // 5 phút
  const [timerActive, setTimerActive] = useState(false);
  const inputRefs = useRef<Array<React.RefObject<HTMLInputElement>>>(
    Array.from({ length: 6 }, () => React.createRef<HTMLInputElement>())
  );

  // ── Timer countdown khi vào bước 3 ─────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) return;
    if (timer <= 0) {
      setTimerActive(false);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerActive, timer]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Navigate helpers ─────────────────────────────────────────────────────────
  const goToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // ── Step 1: Submit email ─────────────────────────────────────────────────────
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setApiError(null);
    const trimmed = email.trim();
    if (!trimmed) { setEmailError('Vui lòng nhập địa chỉ email.'); return; }
    if (!validateEmail(trimmed)) {
      setEmailError('Email không hợp lệ. Ví dụ: bacsi@precare.vn');
      return;
    }
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email: trimmed });
      sessionStorage.setItem('precare_forgot_email', trimmed);
      setIsSubmitting(false);
      setStep(2);
    } catch (err: any) {
      setIsSubmitting(false);
      const status = err?.response?.status;
      // Luôn chuyển sang bước 2 để không lộ email tồn tại hay không
      if (!err?.response || status === 404 || status === 400) {
        sessionStorage.setItem('precare_forgot_email', trimmed);
        setStep(2);
      } else {
        setApiError(
          err?.response?.data?.detail || err?.message ||
          'Không thể gửi yêu cầu. Vui lòng kiểm tra kết nối và thử lại.'
        );
      }
    }
  };

  // ── Step 2 → 3: Proceed to OTP entry ────────────────────────────────────────
  const handleProceedToOtp = () => {
    setOtp(['', '', '', '', '', '']);
    setOtpError(null);
    setOtpSuccess(false);
    setTimer(300);
    setTimerActive(true);
    setStep(3);
    setTimeout(() => inputRefs.current[0].current?.focus(), 100);
  };

  // ── Step 2: Resend email ──────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown) return;
    setResendCooldown(true);
    setResendLabel('Đang gửi lại...');
    try {
      await authApi.forgotPassword({ email: email.trim() });
    } catch { /* silent */ }
    setResendLabel('Đã gửi lại!');
    resendTimerRef.current = setTimeout(() => {
      setResendCooldown(false);
      setResendLabel('Gửi lại mã');
    }, 30_000);
  };

  // ── Step 3: OTP cell handlers ─────────────────────────────────────────────────
  const handleOtpChange = (index: number, val: string) => {
    setOtpError(null);
    if (val.length > 1) {
      // paste nhiều ký tự
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otp];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      const focusIdx = Math.min(digits.length, 5);
      inputRefs.current[focusIdx].current?.focus();
      if (digits.length === 6) triggerVerify(next.join(''));
      return;
    }
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) inputRefs.current[index + 1].current?.focus();
    if (val && index === 5) triggerVerify(next.join(''));
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...otp];
    text.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx].current?.focus();
    if (text.length === 6) triggerVerify(text);
  };

  const triggerVerify = async (code: string) => {
    if (code.length < 6) return;
    setIsVerifying(true);

    // Không gọi /auth/verify-otp vì endpoint đó dành cho flow đăng ký (Redis).
    // OTP forgot-password được lưu trong bảng password_resets (DB) và chỉ được
    // xác thực khi submit POST /auth/reset-password ở bước 4.
    // Ở đây chỉ cần lưu code vào sessionStorage rồi chuyển trang.
    await new Promise((r) => setTimeout(r, 400)); // nhỏ delay cho UX

    sessionStorage.setItem('precare_forgot_email', email.trim());
    sessionStorage.setItem('precare_reset_otp', code);
    setOtpSuccess(true);
    setOtpError(null);
    setIsVerifying(false);

    setTimeout(() => {
      if (onOtpVerified) {
        onOtpVerified(email.trim(), code);
      } else {
        window.history.pushState(null, '', '/reset-password');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }, 600);
  };

  const handleStep3Submit = () => {
    const code = otp.join('');
    if (code.length < 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã xác minh.');
      return;
    }
    triggerVerify(code);
  };

  // ── Step 3: Resend OTP ────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setOtp(['', '', '', '', '', '']);
      setOtpError(null);
      setOtpSuccess(false);
      setTimer(300);
      setTimerActive(true);
      setTimeout(() => inputRefs.current[0].current?.focus(), 50);
    } catch { /* silent */ }
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const sidebar = SIDEBAR[step];

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', minHeight: '100vh', width: '100vw',
      overflowX: 'hidden', backgroundColor: '#F8FAFC', fontFamily: 'inherit',
    }}>
      {/* LEFT SIDEBAR 40% */}
      <aside style={{
        width: '40%', minWidth: '300px', backgroundColor: '#0A2530', color: '#FFF',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '48px 40px', boxSizing: 'border-box', flexShrink: 0,
      }}>
        <div>
          <PreCareLogo variant="dark" size="md" subtitle="KHÔI PHỤC MẬT KHẨU" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 'auto', marginBottom: 'auto', paddingTop: '24px', paddingBottom: '24px' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '6px', alignSelf: 'flex-start',
            backgroundColor: 'rgba(15,118,110,0.25)', color: '#5EEAD4',
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
            border: '1px solid rgba(94,234,212,0.25)',
          }}>
            <ShieldCheck size={14} />
            <span>{sidebar.badge}</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#FFF', lineHeight: 1.3, letterSpacing: '-0.02em', margin: 0 }}>
            {sidebar.title}
          </h1>
          <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.6, margin: 0 }}>
            {sidebar.desc}
          </p>
        </div>

        <div style={{ fontSize: '11.5px', color: '#64748B', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
          Hệ thống y tế số PreCare • Tuân thủ an toàn dữ liệu y khoa
        </div>
      </aside>

      {/* RIGHT FORM 60% */}
      <div style={{
        flex: '1 1 60%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      }}>
        <div style={{
          width: '100%', maxWidth: '480px', backgroundColor: '#FFF',
          border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '36px 32px', boxShadow: '0 10px 30px rgba(15,23,42,0.05)',
          display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box',
        }}>
          {/* ── Step progress bar (3 bước + 1 bước ở ResetPassword) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F766E', letterSpacing: '0.04em' }}>
                BƯỚC {step} TRÊN 4
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {step === 1 ? 'Yêu cầu đặt lại' : step === 2 ? 'Xác minh hộp thư' : 'Nhập mã OTP'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[1, 2, 3, 4].map((s) => (
                <div key={s} style={{
                  height: '4px', borderRadius: '2px',
                  backgroundColor: step >= s ? '#0F766E' : '#E2E8F0',
                  transition: 'all 0.2s ease',
                }} />
              ))}
            </div>
          </div>

          {/* ══════════════════ BƯỚC 1: EMAIL ══════════════════ */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Quên mật khẩu?</h2>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  Nhập địa chỉ email liên kết với tài khoản y tế của bạn để nhận mã xác minh.
                </p>
              </div>

              {/* Email input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="fp-email" style={{ fontSize: '13px', fontWeight: 600, color: emailError ? '#EF4444' : '#334155' }}>
                  Địa chỉ email đăng ký <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: `1.5px solid ${emailError ? '#EF4444' : '#CBD5E1'}`,
                  borderRadius: '10px', padding: '10px 14px',
                  backgroundColor: emailError ? '#FEF2F2' : '#FFF', boxSizing: 'border-box',
                }}>
                  <Mail size={16} color={emailError ? '#EF4444' : '#94A3B8'} style={{ flexShrink: 0 }} />
                  <input
                    id="fp-email" type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); if (apiError) setApiError(null); }}
                    placeholder="bacsi@precare.vn" autoComplete="email"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: emailError ? '#EF4444' : '#0F172A', backgroundColor: 'transparent', fontFamily: 'inherit' }}
                  />
                </div>
                {emailError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              {apiError && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', fontSize: '12.5px', color: '#B91C1C', fontWeight: 500 }}>
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{apiError}</span>
                </div>
              )}

              <button type="submit" disabled={isSubmitting} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: isSubmitting ? '#94A3B8' : '#0F766E', color: '#FFF',
                border: 'none', borderRadius: '10px', padding: '12px 18px',
                fontSize: '14px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: isSubmitting ? 'none' : '0 2px 8px rgba(15,118,110,0.25)',
                transition: 'all 0.15s ease',
              }}>
                {isSubmitting
                  ? <><RefreshCw size={16} style={{ animation: 'fp-spin 1s linear infinite' }} /><span>Đang gửi...</span></>
                  : <span>Gửi mã xác minh</span>
                }
              </button>

              <div style={{ textAlign: 'center' }}>
                <button type="button" onClick={goToLogin} style={{ background: 'none', border: 'none', color: '#0F766E', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════ BƯỚC 2: CHECK EMAIL ══════════════════ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Icon + heading */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '14px' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  backgroundColor: '#CCFBF1', border: '1px solid #99F6E4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E',
                }}>
                  <Mail size={30} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Kiểm tra hộp thư của bạn</h2>
                  <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                    Mã xác minh 6 chữ số đã được gửi đến:
                  </p>
                  <span style={{
                    fontSize: '13px', fontWeight: 600, color: '#0F766E',
                    backgroundColor: '#F0FDFA', padding: '6px 12px',
                    borderRadius: '8px', border: '1px solid #CCFBF1', marginTop: '4px',
                  }}>
                    {email}
                  </span>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                backgroundColor: '#FEF3C7', border: '1px solid #FDE68A',
                borderRadius: '10px', padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: '10px',
              }}>
                <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
                  Mã chỉ có giá trị trong <strong>5 phút</strong>. Kiểm tra cả thư mục <strong>Spam</strong> nếu không thấy.
                </span>
              </div>

              {/* Open mailbox */}
              <a href={getMailboxUrl(email)} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  backgroundColor: '#0F766E', color: '#FFF', textDecoration: 'none',
                  borderRadius: '10px', padding: '12px 18px', fontSize: '14px', fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(15,118,110,0.25)', boxSizing: 'border-box',
                }}>
                <ExternalLink size={16} />
                <span>{getMailboxLabel(email)}</span>
              </a>

              {/* Instruction box */}
              <div style={{
                backgroundColor: '#F0FDFA', border: '1px solid #CCFBF1',
                borderRadius: '10px', padding: '12px 14px',
                fontSize: '12px', color: '#134E4A', lineHeight: 1.6,
              }}>
                <strong style={{ color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  📧 Tìm email từ PreCare có tiêu đề chứa mã số
                </strong>
                Mở email có tiêu đề <em>"[XXXXXX] Mã xác minh đăng ký tài khoản PreCare"</em> được gửi gần nhất. Đó là mã dùng để đặt lại mật khẩu. Nhấn nút <strong>"Tôi đã có mã"</strong> bên dưới để nhập mã.
              </div>

              {/* Proceed to OTP entry */}
              <button type="button" onClick={handleProceedToOtp} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: '#F0FDFA', color: '#0F766E',
                border: '1.5px solid #0F766E', borderRadius: '10px',
                padding: '11px 18px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
              }}>
                <KeyRound size={16} />
                <span>Tôi đã có mã — Nhập mã xác minh</span>
                <ArrowRight size={16} />
              </button>

              {/* Resend + back */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Chưa nhận được thư?{' '}
                  <button type="button" onClick={handleResend} disabled={resendCooldown} style={{
                    background: 'none', border: 'none', padding: 0,
                    color: resendCooldown ? '#94A3B8' : '#0F766E', fontWeight: 600,
                    fontSize: '12px', cursor: resendCooldown ? 'default' : 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    {resendLabel}
                  </button>
                </div>
                <button type="button" onClick={goToLogin} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Quay lại đăng nhập
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════ BƯỚC 3: NHẬP OTP ══════════════════ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Nhập mã xác minh</h2>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  Nhập mã 6 chữ số được gửi đến <strong style={{ color: '#0F172A' }}>{email}</strong>
                </p>
              </div>

              {/* Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Mã xác minh còn hiệu lực</span>
                <span style={{
                  fontSize: '13px', fontWeight: 700,
                  color: timer <= 60 ? '#EF4444' : '#0F766E',
                  backgroundColor: timer <= 60 ? '#FEF2F2' : '#F0FDFA',
                  padding: '2px 10px', borderRadius: '20px',
                  border: `1px solid ${timer <= 60 ? '#FEE2E2' : '#CCFBF1'}`,
                }}>
                  {timer > 0 ? formatTimer(timer) : 'Đã hết hạn'}
                </span>
              </div>

              {/* OTP cells */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                {otp.map((val, i) => (
                  <OtpCell
                    key={i}
                    value={val}
                    inputRef={inputRefs.current[i]}
                    onChange={(v) => handleOtpChange(i, v)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={handleOtpPaste}
                    hasError={!!otpError}
                  />
                ))}
              </div>

              {/* Loading / Error / Success feedback */}
              {isVerifying && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px', color: '#0F766E' }}>
                  <RefreshCw size={14} style={{ animation: 'fp-spin 1s linear infinite' }} />
                  <span>Đang xác minh...</span>
                </div>
              )}
              {otpError && !isVerifying && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#EF4444', fontWeight: 500, justifyContent: 'center' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{otpError}</span>
                </div>
              )}
              {otpSuccess && !isVerifying && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0F766E', fontWeight: 600, justifyContent: 'center' }}>
                  <CheckCircle2 size={16} />
                  <span>Xác minh thành công! Đang chuyển trang...</span>
                </div>
              )}

              {/* Submit button (hỗ trợ thêm cho UX — auto verify khi nhập đủ 6 số) */}
              {!otpSuccess && (
                <button type="button" onClick={handleStep3Submit} disabled={isVerifying || otp.join('').length < 6}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    backgroundColor: (isVerifying || otp.join('').length < 6) ? '#94A3B8' : '#0F766E',
                    color: '#FFF', border: 'none', borderRadius: '10px', padding: '12px 18px',
                    fontSize: '14px', fontWeight: 600,
                    cursor: (isVerifying || otp.join('').length < 6) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,118,110,0.2)',
                    transition: 'all 0.15s ease',
                  }}>
                  <span>Xác minh mã OTP</span>
                  <ArrowRight size={16} />
                </button>
              )}

              {/* Resend OTP + back */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Không nhận được mã?{' '}
                  <button type="button" onClick={handleResendOtp} style={{
                    background: 'none', border: 'none', padding: 0,
                    color: '#0F766E', fontWeight: 600, fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Gửi lại mã mới
                  </button>
                </div>
                <button type="button" onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ← Quay lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes fp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ForgotPassword;
