import React, { useState } from 'react';
import {
  Heart,
  Eye,
  EyeOff,
  Check,
  RotateCw,
  X,
  ArrowRight,
  Sparkles,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Alert } from '../components/ui/alert';
import { authApi } from '../services/auth.service';
import loginIllustration from '../assets/image.png';

export type UserRoleType = 'doctor' | 'admin';

interface LoginProps {
  onSuccess?: (authData: { user: any; token: string }) => void;
  onNavigateToRegister?: () => void;
  defaultRole?: UserRoleType;
}

export const Login: React.FC<LoginProps> = ({
  onSuccess,
  onNavigateToRegister,
  defaultRole = 'doctor',
}) => {
  const [role, setRole] = useState<UserRoleType>(defaultRole);
  const [email, setEmail] = useState<string>('bacsi.leminh@phusantw.org');
  const [password, setPassword] = useState<string>('Bacsileminh2026@');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isCaptchaChecked, setIsCaptchaChecked] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [captchaError, setCaptchaError] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotStep, setForgotStep] = useState<'request' | 'otp' | 'success'>('request');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [forgotMessage, setForgotMessage] = useState<string>('');

  const validateEmailFormat = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      if (!val.trim()) {
        setEmailError('Vui lòng nhập email đăng nhập.');
      } else if (!validateEmailFormat(val)) {
        setEmailError('Email không đúng định dạng (VD: example@domain.com).');
      } else {
        setEmailError('');
      }
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) {
      if (!val) {
        setPasswordError('Vui lòng nhập mật khẩu.');
      } else {
        setPasswordError('');
      }
    }
  };

  const handleCaptchaToggle = () => {
    const next = !isCaptchaChecked;
    setIsCaptchaChecked(next);
    if (next) {
      setCaptchaError('');
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError('');
    let hasValidationError = false;

    if (!email.trim()) {
      setEmailError('Vui lòng nhập email đăng nhập.');
      hasValidationError = true;
    } else if (!validateEmailFormat(email)) {
      setEmailError('Email không đúng định dạng (VD: example@domain.com).');
      hasValidationError = true;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu.');
      hasValidationError = true;
    } else {
      setPasswordError('');
    }

    if (!isCaptchaChecked) {
      setCaptchaError('Vui lòng xác minh bạn không phải là người máy.');
      hasValidationError = true;
    } else {
      setCaptchaError('');
    }

    if (hasValidationError) return;

    setIsLoading(true);
    try {
      const authRes = await authApi.login({ email, password });
      setIsLoading(false);
      if (onSuccess) {
        onSuccess({
          user: authRes.user,
          token: authRes.tokens?.access_token || 'precare-token-' + Date.now(),
        });
      }
    } catch (err: any) {
      setIsLoading(false);
      setAuthError(err.message || 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }
  };

  const applyPreset = (type: 'normal' | 'empty' | 'invalid_email' | 'no_captcha' | 'auth_fail' | 'loading') => {
    setAuthError('');
    setEmailError('');
    setPasswordError('');
    setCaptchaError('');
    setIsLoading(false);

    switch (type) {
      case 'normal':
        setEmail('bacsi.leminh@phusantw.org');
        setPassword('Bacsileminh2026@');
        setIsCaptchaChecked(false);
        break;
      case 'empty':
        setEmail('');
        setPassword('');
        setIsCaptchaChecked(false);
        setEmailError('Vui lòng nhập email đăng nhập.');
        setPasswordError('Vui lòng nhập mật khẩu.');
        break;
      case 'invalid_email':
        setEmail('bacsi.leminh_chuadung');
        setPassword('Bacsileminh2026@');
        setIsCaptchaChecked(true);
        setEmailError('Email không đúng định dạng (VD: example@domain.com).');
        break;
      case 'no_captcha':
        setEmail('bacsi.leminh@phusantw.org');
        setPassword('Bacsileminh2026@');
        setIsCaptchaChecked(false);
        setCaptchaError('Vui lòng xác minh bạn không phải là người máy.');
        break;
      case 'auth_fail':
        setEmail('bacsi.leminh@phusantw.org');
        setPassword('WrongPassword123');
        setIsCaptchaChecked(true);
        setAuthError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        break;
      case 'loading':
        setEmail('bacsi.leminh@phusantw.org');
        setPassword('Bacsileminh2026@');
        setIsCaptchaChecked(true);
        setIsLoading(true);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex flex-col justify-center items-center p-3 sm:p-6 lg:p-10 font-sans antialiased text-slate-800">

      <div className="w-full max-w-[1440px] min-h-[760px] lg:min-h-[880px] bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-2xl shadow-slate-300/60 flex flex-col lg:flex-row border border-slate-200/80">
        <section className="relative w-full lg:w-[48%] xl:w-[46%] bg-[#507D75] p-8 sm:p-12 lg:p-14 flex flex-col justify-between overflow-hidden select-none min-h-[580px] lg:min-h-[880px]">
          {/* Lớp hình ảnh hòa quyện mềm mại với nền màu teal #507D75, nằm chìm tinh tế phía sau chữ */}
          <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
            {/* Ảnh minh họa chính từ image.png */}
            <img
              src={loginIllustration}
              alt="Minh họa Bác sĩ và Thai phụ siêu âm thai kỳ"
              className="w-full h-full object-cover object-center scale-105 opacity-30 mix-blend-luminosity filter contrast-[1.15] brightness-[1.05]"
            />
            {/* Lớp phủ gradient đa chiều giúp hình ảnh hòa tan mềm mại vào màu nền teal #507D75 */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#507D75]/90 via-[#507D75]/55 to-[#507D75]/95" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#507D75]/85 via-transparent to-[#507D75]/85" />
            {/* Ánh sáng tỏa nhẹ góc nền */}
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/4 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Logo Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md shadow-teal-950/20">
              <Heart className="w-5 h-5 text-[#507D75] stroke-[2.5]" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white drop-shadow-xs">PreCare</span>
          </div>

          {/* Value Proposition: Tiêu đề và nội dung nổi bật, sắc nét và dễ đọc */}
          <div className="relative z-10 my-auto py-10 lg:py-6 max-w-lg space-y-5">
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-[1.2] drop-shadow-sm">
                Số hóa hồ sơ thai kỳ chuyên nghiệp
              </h1>
              <p className="text-sm sm:text-base text-teal-50 leading-relaxed font-normal drop-shadow-xs">
                Giải pháp trích xuất dữ liệu cận lâm sàng bằng OCR thông minh dành cho Bác sĩ Sản khoa.
              </p>
            </div>

          </div>

          {/* Footer Copyright */}
          <div className="relative z-10 text-xs text-teal-100/80 font-medium drop-shadow-xs">
            © 2026 PreCare Medical Systems. Nền tảng Y tế Số.
          </div>
        </section>

        <main className="w-full lg:w-[52%] xl:w-[54%] bg-white p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center">
          <div className="w-full max-w-[460px] space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-[32px] font-bold text-slate-900 tracking-tight leading-tight">
                Chào mừng trở lại
              </h2>
              <p className="text-sm text-slate-500 font-normal">
                Vui lòng đăng nhập để truy cập hệ thống bệnh án điện tử.
              </p>
            </div>

            {authError && (
              <Alert
                variant="destructive"
                title="Đăng nhập không thành công"
                onClose={() => setAuthError('')}
                className="animate-in fade-in slide-in-from-top-2 duration-200"
              >
                {authError}
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Vai trò người dùng
                </label>
                <div className="bg-[#F1F5F9] p-1 rounded-xl grid grid-cols-2 gap-1 text-sm font-medium">
                  <button
                    type="button"
                    onClick={() => setRole('doctor')}
                    className={`py-2 px-4 rounded-lg text-center transition-all cursor-pointer font-medium text-sm ${
                      role === 'doctor'
                        ? 'bg-[#4D7D74] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    Bác sĩ
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-4 rounded-lg text-center transition-all cursor-pointer font-medium text-sm ${
                      role === 'admin'
                        ? 'bg-[#4D7D74] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    Quản trị viên
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-slate-700 block">
                  Email đăng nhập
                </label>
                <div className="relative">
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={role === 'doctor' ? 'bacsi.leminh@phusantw.org' : 'admin@precare.vn'}
                    hasError={Boolean(emailError)}
                    disabled={isLoading}
                    autoComplete="email"
                    className="h-11 px-3.5 text-sm"
                  />
                </div>
                {emailError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-in fade-in duration-150">
                    {emailError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-xs font-semibold text-slate-700 block">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Nhập mật khẩu"
                    hasError={Boolean(passwordError)}
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-11 px-3.5 pr-11 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 cursor-pointer focus:outline-none"
                    aria-label='toggle-password'
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-in fade-in duration-150">
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div
                  className={`w-full rounded-xl border bg-[#FAFAFA] p-3 sm:px-4 sm:py-3.5 flex items-center justify-between transition-all ${
                    captchaError
                      ? 'border-rose-400 bg-rose-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isCaptchaChecked}
                      onClick={handleCaptchaToggle}
                      disabled={isLoading}
                      className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isCaptchaChecked
                          ? 'border-[#4D7D74] bg-[#4D7D74] text-white shadow-xs'
                          : 'border-slate-300 bg-white hover:border-slate-400'
                      }`}
                      aria-label="Xác minh tôi không phải là người máy"
                    >
                      {isCaptchaChecked && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>
                    <div className="select-none cursor-pointer" onClick={handleCaptchaToggle}>
                      <span className="text-xs sm:text-sm font-medium text-slate-800 block">
                        Tôi không phải là người máy
                      </span>
                      {isCaptchaChecked && (
                        <span className="text-[11px] text-[#4D7D74] font-medium block animate-in fade-in">
                          Đã xác minh
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center pl-2 border-l border-slate-200/60 text-center select-none">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <RotateCw className="w-6 h-6 text-[#1A73E8]" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold tracking-tighter leading-none mt-0.5">
                      reCAPTCHA
                    </span>
                    <span className="text-[8px] text-slate-400 leading-tight mt-0.5">
                      Quyền riêng tư • Điều khoản
                    </span>
                  </div>
                </div>
                {captchaError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-in fade-in duration-150">
                    {captchaError}
                  </p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={isLoading}
                  isLoading={isLoading}
                  className={`w-full h-11 text-sm font-semibold rounded-lg shadow-sm transition-all ${
                    isLoading
                      ? 'bg-[#7FA59E] cursor-not-allowed opacity-90'
                      : 'bg-[#4D7D74] hover:bg-[#436E66]'
                  }`}
                >
                  {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
                {isLoading && (
                  <p className="text-xs text-slate-500 text-center mt-2.5 animate-in fade-in duration-200">
                    Vui lòng chờ, yêu cầu của bạn đang được xử lý.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs sm:text-sm">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 hover:text-slate-900">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <span>Ghi nhớ thông tin đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotPasswordModal(true);
                  }}
                  className="text-[#4D7D74] hover:underline font-medium hover:text-[#3B625B] transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {onNavigateToRegister && (
                <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                  Chưa có tài khoản Bác sĩ?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToRegister}
                    className="text-[#4D7D74] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    Đăng ký ngay <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>

      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <KeyRound className="w-5 h-5 text-[#4D7D74]" />
                <span>Khôi phục mật khẩu</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPasswordModal(false);
                  setForgotStep('request');
                  setForgotMessage('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotStep === 'request' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nhập email tài khoản Bác sĩ hoặc Quản trị viên của bạn. Hệ thống PreCare sẽ gửi mã xác thực OTP 6 số để thiết lập lại mật khẩu mới.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Email tài khoản
                  </label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="bacsi.leminh@phusantw.org"
                  />
                </div>
                {forgotMessage && (
                  <p className="text-xs text-rose-500 font-medium">{forgotMessage}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgotPasswordModal(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!forgotEmail || !validateEmailFormat(forgotEmail)) {
                        setForgotMessage('Vui lòng nhập địa chỉ email hợp lệ.');
                        return;
                      }
                      setForgotMessage('');
                      setForgotStep('otp');
                    }}
                  >
                    Gửi mã OTP
                  </Button>
                </div>
              </div>
            )}

            {forgotStep === 'otp' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mã OTP đã được gửi đến <b>{forgotEmail}</b>. Vui lòng nhập mã và mật khẩu mới.
                </p>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mã xác thực OTP (6 số)
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="123456"
                    className="tracking-widest font-mono text-center text-lg"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Mật khẩu mới
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới an toàn"
                  />
                </div>
                {forgotMessage && (
                  <p className="text-xs text-rose-500 font-medium">{forgotMessage}</p>
                )}
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('request')}
                    className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                  </button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (forgotOtp.length < 6) {
                        setForgotMessage('Mã OTP gồm 6 chữ số.');
                        return;
                      }
                      if (!newPassword || newPassword.length < 8) {
                        setForgotMessage('Mật khẩu mới tối thiểu 8 ký tự.');
                        return;
                      }
                      setForgotMessage('');
                      setForgotStep('success');
                      setPassword(newPassword);
                    }}
                  >
                    Xác nhận đổi mật khẩu
                  </Button>
                </div>
              </div>
            )}

            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Đổi mật khẩu thành công!</h4>
                <p className="text-xs text-slate-600">
                  Bạn có thể sử dụng mật khẩu mới để đăng nhập vào hệ thống PreCare ngay bây giờ.
                </p>
                <Button
                  type="button"
                  className="w-full mt-2"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotStep('request');
                  }}
                >
                  Quay lại Đăng nhập
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;