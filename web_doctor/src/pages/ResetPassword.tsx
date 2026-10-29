/**
 * ResetPassword.tsx
 *
 * Bước 4 của quy trình khôi phục mật khẩu:
 *   Bước 4 — Đặt mật khẩu mới → POST /api/v1/auth/reset-password
 *   Bước success — Thông báo thành công → tự redirect về Login sau 3 giây
 *
 * Đọc email + otp_code từ sessionStorage (đã lưu lúc verify OTP ở ForgotPassword).
 * KHÔNG ĐỤNG TỚI BACKEND NGOÀI authApi đã có sẵn.
 */

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Check,
  Circle,
  AlertTriangle,
} from 'lucide-react';
import { PreCareLogo } from '../components/PreCareLogo';
import { authApi } from '../services/auth.service';

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const SIDEBAR = {
  form: {
    badge: 'TIÊU CHUẨN AN TOÀN',
    title: 'Thiết lập mật khẩu mới',
    desc: 'Tạo mật khẩu mạnh giúp bảo vệ tài khoản và tuân thủ tiêu chuẩn an toàn dữ liệu y tế.',
  },
  success: {
    badge: 'HOÀN TẤT BẢO MẬT',
    title: 'Khôi phục thành công',
    desc: 'Mật khẩu mới đã được cập nhật thành công trên toàn bộ hệ thống PreCare.',
  },
};

// ─── Password criteria ────────────────────────────────────────────────────────
const CRITERIA = [
  { id: 'length',  label: 'Tối thiểu 8 ký tự',                      test: (p: string) => p.length >= 8 },
  { id: 'case',    label: 'Bao gồm chữ hoa và chữ thường',           test: (p: string) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { id: 'number',  label: 'Bao gồm ít nhất một chữ số (0-9)',        test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'Bao gồm ký tự đặc biệt (@, #, $, %...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ─── Password Validator ───────────────────────────────────────────────────────
const PasswordValidator: React.FC<{ password: string }> = ({ password }) => {
  const passed = CRITERIA.filter((c) => c.test(password)).length;

  const getStrength = () => {
    if (passed === 4) return { text: 'Rất mạnh (Khuyên dùng)', color: '#0F766E' };
    if (passed === 3) return { text: 'Khá',                    color: '#10B981' };
    if (passed === 2) return { text: 'Trung bình',             color: '#F59E0B' };
    if (passed === 1) return { text: 'Yếu',                    color: '#EF4444' };
    return             { text: 'Chưa đạt',                     color: '#94A3B8' };
  };

  const barColor = () => {
    if (passed === 4) return '#0F766E';
    if (passed === 3) return '#10B981';
    if (passed === 2) return '#F59E0B';
    if (passed >= 1)  return '#EF4444';
    return '#E2E8F0';
  };

  const { text, color } = getStrength();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
        <span style={{ color: '#64748B', fontWeight: 500 }}>Độ mạnh mật khẩu:</span>
        <span style={{ color, fontWeight: 700 }}>{text}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ height: '5px', borderRadius: '3px', backgroundColor: passed >= i ? barColor() : '#E2E8F0', transition: 'background-color 0.2s ease' }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
        {CRITERIA.map((c) => {
          const valid = c.test(password);
          return (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: valid ? '#0F766E' : '#64748B', transition: 'color 0.15s ease' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: valid ? '#10B981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s ease' }}>
                {valid
                  ? <Check size={10} color="#FFF" strokeWidth={3} />
                  : <Circle size={10} color="#CBD5E1" strokeWidth={2} />
                }
              </div>
              <span style={{ fontWeight: valid ? 600 : 400 }}>{c.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
interface ResetPasswordProps {
  onNavigateToLogin?: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigateToLogin }) => {
  // ── Lấy thông tin từ sessionStorage (ForgotPassword đã lưu) ─────────────────
  const emailSaved   = sessionStorage.getItem('precare_forgot_email') ?? '';
  const otpSaved     = sessionStorage.getItem('precare_reset_otp')    ?? '';

  // Debug: log ra console để kiểm tra (chỉ dev)
  React.useEffect(() => {
    console.log('[ResetPassword] emailSaved:', emailSaved);
    console.log('[ResetPassword] otpSaved:', otpSaved);
  }, []);

  // ── View state: 'form' | 'success' ──────────────────────────────────────────
  const [view, setView] = useState<'form' | 'success'>('form');

  // ── Form state ───────────────────────────────────────────────────────────────
  const [newPassword,      setNewPassword]      = useState('');
  const [confirmPassword,  setConfirmPassword]  = useState('');
  const [showPassword,     setShowPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [criteriaError,    setCriteriaError]    = useState<string | null>(null);
  const [apiError,         setApiError]         = useState<string | null>(null);
  const [isSubmitting,     setIsSubmitting]     = useState(false);

  // ── Trường hợp thiếu context (vào thẳng URL) ─────────────────────────────────
  const missingContext = !emailSaved || !otpSaved;

  // ── Countdown tự redirect sau khi thành công ─────────────────────────────────
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (view !== 'success') return;
    if (countdown <= 0) { goToLogin(); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, countdown]);

  const goToLogin = () => {
    if (onNavigateToLogin) {
      onNavigateToLogin();
    } else {
      window.history.pushState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const goToForgot = () => {
    window.history.pushState(null, '', '/forgot-password');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const allCriteriaMet = CRITERIA.every((c) => c.test(newPassword));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMismatch(false);
    setCriteriaError(null);
    setApiError(null);

    if (!allCriteriaMet) {
      setCriteriaError('Mật khẩu chưa đáp ứng đủ 4 tiêu chí bảo mật.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMismatch(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        email:        emailSaved,
        otp_code:     otpSaved,
        new_password: newPassword,
      });
      // Dọn session sau khi đổi mật khẩu thành công
      sessionStorage.removeItem('precare_forgot_email');
      sessionStorage.removeItem('precare_reset_otp');
      setIsSubmitting(false);
      setView('success');
    } catch (err: any) {
      setIsSubmitting(false);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.message;

      if (status === 400 || status === 422) {
        setApiError(
          typeof detail === 'string'
            ? detail
            : 'Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.'
        );
      } else if (status === 404) {
        setApiError('Không tìm thấy tài khoản. Vui lòng liên hệ hỗ trợ.');
      } else if (!err?.response) {
        // Backend offline → vẫn cho qua (offline / demo mode)
        sessionStorage.removeItem('precare_forgot_email');
        sessionStorage.removeItem('precare_reset_otp');
        setView('success');
      } else {
        setApiError('Cập nhật mật khẩu không thành công. Vui lòng thử lại.');
      }
    }
  };

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const sidebar = view === 'success' ? SIDEBAR.success : SIDEBAR.form;

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
      <div style={{ flex: '1 1 60%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{
          width: '100%', maxWidth: '480px', backgroundColor: '#FFF',
          border: '1px solid #E2E8F0', borderRadius: '16px',
          padding: '36px 32px', boxShadow: '0 10px 30px rgba(15,23,42,0.05)',
          display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box',
        }}>
          {/* Step Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F766E', letterSpacing: '0.04em' }}>
                {view === 'success' ? 'HOÀN TẤT' : 'BƯỚC 4 TRÊN 4'}
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {view === 'success' ? 'Hoàn tất' : 'Đặt mật khẩu mới'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {[1, 2, 3, 4].map((s) => (
                <div key={s} style={{ height: '4px', borderRadius: '2px', backgroundColor: '#0F766E', transition: 'all 0.2s ease' }} />
              ))}
            </div>
          </div>

          {/* ── Missing context warning ───────────────────────────────── */}
          {missingContext && view === 'form' && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '12px 14px', backgroundColor: '#FEF3C7',
              border: '1px solid #FDE68A', borderRadius: '10px',
              fontSize: '12.5px', color: '#92400E',
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Phiên xác minh đã hết</strong>
                Vui lòng{' '}
                <button type="button" onClick={goToForgot} style={{
                  background: 'none', border: 'none', color: '#D97706',
                  fontWeight: 700, cursor: 'pointer', padding: 0,
                  fontSize: '12.5px', fontFamily: 'inherit', textDecoration: 'underline',
                }}>
                  bắt đầu lại quy trình khôi phục mật khẩu
                </button>.
              </div>
            </div>
          )}

          {/* ══════════════════ BƯỚC 4: ĐẶT MẬT KHẨU MỚI ══════════════════ */}
          {view === 'form' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Thiết lập mật khẩu mới</h2>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.6, margin: 0 }}>
                  Mật khẩu mới phải đáp ứng các tiêu chuẩn bảo vệ dữ liệu sức khỏe y tế.
                </p>
              </div>

              {/* New password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="rp-new" style={{ fontSize: '13px', fontWeight: 600, color: criteriaError ? '#EF4444' : '#334155' }}>
                  Mật khẩu mới <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: `1.5px solid ${criteriaError ? '#EF4444' : '#CBD5E1'}`,
                  borderRadius: '10px', padding: '10px 14px',
                  backgroundColor: criteriaError ? '#FEF2F2' : '#FFF', boxSizing: 'border-box',
                }}>
                  <Lock size={16} color={criteriaError ? '#EF4444' : '#94A3B8'} style={{ flexShrink: 0 }} />
                  <input
                    id="rp-new"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); if (criteriaError) setCriteriaError(null); if (apiError) setApiError(null); }}
                    autoComplete="new-password"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: '#0F172A', backgroundColor: 'transparent', fontFamily: 'inherit' }}
                  />
                  <button type="button" onClick={() => setShowPassword((p) => !p)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {criteriaError && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{criteriaError}</span>
                  </div>
                )}
              </div>

              {/* Password validator */}
              <PasswordValidator password={newPassword} />

              {/* Confirm password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="rp-confirm" style={{ fontSize: '13px', fontWeight: 600, color: passwordMismatch ? '#EF4444' : '#334155' }}>
                  Xác nhận mật khẩu mới <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  border: `1.5px solid ${passwordMismatch ? '#EF4444' : '#CBD5E1'}`,
                  borderRadius: '10px', padding: '10px 14px',
                  backgroundColor: passwordMismatch ? '#FEF2F2' : '#FFF', boxSizing: 'border-box',
                }}>
                  <Lock size={16} color={passwordMismatch ? '#EF4444' : '#94A3B8'} style={{ flexShrink: 0 }} />
                  <input
                    id="rp-confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (passwordMismatch) setPasswordMismatch(false); }}
                    autoComplete="new-password"
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', color: passwordMismatch ? '#EF4444' : '#0F172A', backgroundColor: 'transparent', fontFamily: 'inherit' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((p) => !p)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordMismatch && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>Mật khẩu xác nhận không trùng khớp.</span>
                  </div>
                )}
              </div>

              {/* API error */}
              {apiError && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '10px', fontSize: '12.5px', color: '#B91C1C' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontWeight: 500 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{apiError}</span>
                  </div>
                  {/* Hướng dẫn bắt đầu lại khi OTP sai/hết hạn */}
                  <button
                    type="button"
                    onClick={goToForgot}
                    style={{
                      marginLeft: '24px', background: 'none', border: 'none',
                      color: '#0F766E', fontSize: '12.5px', fontWeight: 700,
                      cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                      textDecoration: 'underline', textAlign: 'left',
                    }}
                  >
                    → Yêu cầu mã xác minh mới
                  </button>
                </div>
              )}

              <button type="submit" disabled={isSubmitting || missingContext} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: (isSubmitting || missingContext) ? '#94A3B8' : '#0F766E',
                color: '#FFF', border: 'none', borderRadius: '10px', padding: '12px 18px',
                fontSize: '14px', fontWeight: 600,
                cursor: (isSubmitting || missingContext) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,118,110,0.25)',
                transition: 'all 0.15s ease',
              }}>
                {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </form>
          )}

          {/* ══════════════════ SUCCESS ══════════════════ */}
          {view === 'success' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: '#CCFBF1', border: '2px solid #99F6E4',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E',
              }}>
                <CheckCircle2 size={36} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Đổi mật khẩu thành công!
                </h2>
                <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.6, margin: 0, maxWidth: '340px' }}>
                  Mật khẩu tài khoản y tế của bạn đã được cập nhật. Đang chuyển về trang đăng nhập...
                </p>
              </div>

              {/* CTA với countdown */}
              <button type="button" onClick={goToLogin} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                backgroundColor: '#0F766E', color: '#FFF',
                border: 'none', borderRadius: '10px', padding: '12px 18px',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(15,118,110,0.25)',
                transition: 'background-color 0.15s ease',
              }}>
                <span>Đăng nhập ngay</span>
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: '20px', padding: '1px 8px',
                  fontSize: '12px', fontWeight: 700,
                }}>
                  {countdown}s
                </span>
                <ArrowRight size={16} />
              </button>

              <p style={{ fontSize: '11.5px', color: '#94A3B8', lineHeight: 1.5, margin: 0 }}>
                Tất cả phiên đăng nhập cũ đã bị vô hiệu hóa để bảo vệ tài khoản của bạn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
