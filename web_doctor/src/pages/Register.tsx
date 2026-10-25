import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  FileText,
  Upload,
  X,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Mail,
  Phone,
  Info,
} from 'lucide-react';
import { PreCareLogo } from '../components/PreCareLogo';
import { RegistrationStatusCard } from '../components/RegistrationStatusCard';
import { authApi } from '../services/auth.service';
import { ExternalLink } from 'lucide-react';

export interface RegisterProps {
  onLoginClick?: () => void;
  onGoToLogin?: () => void;
  onSuccess?: (userData?: any) => void;
  onRegisterSuccess?: (userData?: any) => void;
  initialStep?: number;
}

export interface UploadedFileItem {
  id: string;
  name: string;
  size: string;
  status: 'success' | 'error';
  errorMessage?: string;
}

export const Register: React.FC<RegisterProps> = ({
  onLoginClick,
  onGoToLogin,
  onSuccess,
  onRegisterSuccess,
  initialStep,
}) => {
  const handleNavigateToLogin = () => {
    if (onLoginClick) onLoginClick();
    else if (onGoToLogin) onGoToLogin();
  };

  const handleCompleteRegistration = (userData?: any) => {
    if (onRegisterSuccess) onRegisterSuccess(userData);
    else if (onSuccess) onSuccess(userData);
  };

  const getInitialStep = (): number => {
    if (initialStep && initialStep >= 1 && initialStep <= 5) return initialStep;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const s = parseInt(urlParams.get('step') || '1', 10);
      if (s >= 1 && s <= 5) return s;
    } catch {
      // fallback
    }
    return 1;
  };

  const [step, setStep] = useState<number>(getInitialStep);

  // =========================================================================
  // STEP 1 STATE: Email & Terms
  // =========================================================================
  const [email, setEmail] = useState<string>('');
  const [agreedTerms, setAgreedTerms] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [termsError, setTermsError] = useState<string>('');
  const [emailAlreadyExists, setEmailAlreadyExists] = useState<boolean>(false);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  // =========================================================================
  // STEP 2 STATE: OTP Verification
  // =========================================================================
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string>('');
  const [otpSuccess, setOtpSuccess] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(59);
  const [canResendOtp, setCanResendOtp] = useState<boolean>(false);
  const [showOtpBanner, setShowOtpBanner] = useState<boolean>(true);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown cho Bước 2
  useEffect(() => {
    let interval: any;
    if (step === 2 && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timerSeconds]);

  // Lắng nghe sự kiện gửi email OTP từ authApi để bật thông báo
  useEffect(() => {
    const handleOtpDispatched = () => {
      setShowOtpBanner(true);
    };
    window.addEventListener('precare:otp_dispatched', handleOtpDispatched);
    return () => {
      window.removeEventListener('precare:otp_dispatched', handleOtpDispatched);
    };
  }, []);

  // =========================================================================
  // STEP 3 STATE: Doctor Profile Information
  // =========================================================================
  const [doctorName, setDoctorName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [specialty, setSpecialty] = useState<string>('');
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [hospital, setHospital] = useState<string>('');
  const [files, setFiles] = useState<UploadedFileItem[]>([]);
  const [step3Errors, setStep3Errors] = useState<{
    doctorName?: string;
    phone?: string;
    specialty?: string;
    licenseNumber?: string;
    hospital?: string;
    files?: string;
  }>({});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // =========================================================================
  // STEP 4 STATE: Password Security
  // =========================================================================
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [passwordMismatchError, setPasswordMismatchError] = useState<boolean>(false);
  const [passwordCriteriaError, setPasswordCriteriaError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  // Password criteria evaluation
  const hasMinLength = password.length >= 8;
  const hasUpperAndLower = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const getPasswordStrength = () => {
    if (!password) {
      return {
        label: 'Chưa nhập',
        score: 0,
        colorText: 'text-slate-400',
        barColor: 'bg-slate-200',
      };
    }

    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperAndLower) score++;
    if (hasDigit) score++;
    if (hasSpecial) score++;

    if (score <= 1) {
      return {
        label: 'Yếu',
        score: 1,
        colorText: 'text-rose-500',
        barColor: 'bg-rose-500',
      };
    }
    if (score === 2) {
      return {
        label: 'Trung bình',
        score: 2,
        colorText: 'text-amber-500',
        barColor: 'bg-amber-500',
      };
    }
    if (score === 3) {
      return {
        label: 'Mạnh',
        score: 3,
        colorText: 'text-[#447C72]',
        barColor: 'bg-[#447C72]',
      };
    }
    return {
      label: 'Rất mạnh',
      score: 4,
      colorText: 'text-emerald-600',
      barColor: 'bg-emerald-600',
    };
  };

  const strength = getPasswordStrength();

  // Sidebar text matching Figma
  const stepMeta = [
    {
      step: 1,
      stepLabel: 'Email đăng ký',
      leftTitle: 'Đồng hành cùng bác sĩ trong hành trình chăm sóc thai sản',
      leftDesc:
        'Tạo hồ sơ bác sĩ để gửi xét duyệt chuyên môn. Quyền truy cập chỉ được cấp sau khi hồ sơ được phê duyệt.',
    },
    {
      step: 2,
      stepLabel: 'Xác minh email',
      leftTitle: 'Một bước xác minh, thêm niềm tin kết nối',
      leftDesc:
        'Xác minh email để tiếp tục hoàn thiện hồ sơ. Đây chưa phải là bước kích hoạt tài khoản hoặc cấp quyền truy cập.',
    },
    {
      step: 3,
      stepLabel: 'Thông tin bác sĩ',
      leftTitle: 'Hoàn thiện hồ sơ bác sĩ',
      leftDesc:
        'Cung cấp thông tin và tài liệu chuyên môn để PreCare xét duyệt hồ sơ. Xác minh email không đồng nghĩa với phê duyệt.',
    },
    {
      step: 4,
      stepLabel: 'Thiết lập bảo mật',
      leftTitle: 'Bảo mật tài khoản, an tâm đồng hành',
      leftDesc:
        'Sau khi gửi, hồ sơ của bác sĩ sẽ được xét duyệt chuyên môn. PreCare sẽ thông báo kết quả qua email trước khi cấp quyền truy cập.',
    },
    {
      step: 5,
      stepLabel: 'Chờ xét duyệt',
      leftTitle: 'Đăng ký đang chờ duyệt',
      leftDesc:
        'Hệ thống PreCare đang tiến hành xác minh thông tin chứng chỉ hành nghề và hồ sơ chuyên môn của bạn. Quá trình này thường mất từ 24 - 48 giờ làm việc.',
    },
  ];

  const currentMeta = stepMeta[Math.min(step - 1, 4)];

  // Helper kiểm tra email hợp lệ
  const validateEmailFormat = (val: string): boolean => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim());
  };

  // Helper định dạng giây -> mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // HANDLERS BƯỚC 1: EMAIL & TERMS
  // =========================================================================
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setTermsError('');
    setEmailAlreadyExists(false);

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setEmailError('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!validateEmailFormat(cleanEmail)) {
      setEmailError('Email chưa đúng định dạng. Vui lòng kiểm tra lại, ví dụ: bacsi@gmail.com.');
      return;
    }

    if (!agreedTerms) {
      setTermsError('Vui lòng đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của PreCare.');
      return;
    }

    // Kiểm tra email đã tồn tại hay chưa thông qua API / Store
    setIsSendingOtp(true);
    try {
      const emailCheck = await authApi.checkEmailAvailability(cleanEmail);
      if (!emailCheck.isAvailable) {
        setEmailAlreadyExists(true);
        setIsSendingOtp(false);
        return;
      }

      // Gửi mã OTP thực tế đến email
      const otpRes = await authApi.sendVerificationOtp(cleanEmail);
            setShowOtpBanner(true);
      setTimerSeconds(59);
      setCanResendOtp(false);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setOtpSuccess(false);

      setIsSendingOtp(false);
      setStep(2);
    } catch (err: any) {
      setIsSendingOtp(false);
      setEmailError(err.message || 'Không thể gửi mã xác minh. Vui lòng thử lại.');
    }
  };

  // =========================================================================
  // HANDLERS BƯỚC 2: OTP
  // =========================================================================
  const handleOtpChange = (index: number, val: string) => {
    setOtpError('');
    setOtpSuccess(false);

    // Xử lý dán nhiều chữ số (paste)
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = digits[i] || '';
      }
      setOtp(newOtp);
      const nextFocus = Math.min(digits.length, 5);
      otpInputRefs.current[nextFocus]?.focus();

      if (digits.length === 6) {
        verifyEnteredOtp(newOtp.join(''));
      }
      return;
    }

    const cleanVal = val.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Tự động nhảy ô tiếp theo
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Tự động kiểm tra khi nhập đủ 6 ô
    if (cleanVal && index === 5) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) {
        verifyEnteredOtp(fullOtp);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const verifyEnteredOtp = async (enteredCode: string): Promise<boolean> => {
    setIsVerifyingOtp(true);
    try {
      const res = await authApi.verifyOtp(email, enteredCode);
      setIsVerifyingOtp(false);
      if (!res.isValid) {
        setOtpError(res.error || 'Mã xác minh không đúng. Vui lòng nhập lại.');
        setOtpSuccess(false);
        return false;
      }
      setOtpError('');
      setOtpSuccess(true);
      return true;
    } catch {
      setIsVerifyingOtp(false);
      setOtpError('Lỗi xác minh mã OTP. Vui lòng thử lại.');
      setOtpSuccess(false);
      return false;
    }
  };

  const handleResendOtp = async () => {
    try {
      const otpRes = await authApi.sendVerificationOtp(email);
            setShowOtpBanner(true);
      setTimerSeconds(59);
      setCanResendOtp(false);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setOtpSuccess(false);
      otpInputRefs.current[0]?.focus();
    } catch {
      setOtpError('Không thể gửi lại mã xác minh. Vui lòng thử lại sau.');
    }
  };

  const handleStep2Submit = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setOtpError('Vui lòng nhập đủ 6 chữ số mã xác thực.');
      return;
    }

    const isOk = await verifyEnteredOtp(fullOtp);
    if (!isOk) return;

    setStep(3);
  };
  // =========================================================================
  // HANDLERS BƯỚC 3: THÔNG TIN BÁC SĨ (VALIDATION THEO YÊU CẦU ĐỀ BÀI)
  // =========================================================================
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: typeof step3Errors = {};

    // 1. Validate Họ và tên bác sĩ
    if (!doctorName.trim()) {
      errors.doctorName = 'Vui lòng nhập họ và tên bác sĩ.';
    }

    // 2. Validate Số điện thoại
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

    if (!cleanPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!phoneRegex.test(cleanPhone)) {
      // Bắt buộc hiển thị lỗi khi Số điện thoại sai định dạng
      errors.phone = 'Số điện thoại sai định dạng. Vui lòng nhập số điện thoại hợp lệ (VD: 0903123456).';
    } else {
      // Bắt buộc hiển thị lỗi khi Số điện thoại đã gắn với tài khoản khác
      const phoneCheck = await authApi.checkPhoneAvailability(cleanPhone);
      if (!phoneCheck.isAvailable) {
        errors.phone = phoneCheck.message || 'Số điện thoại đã gắn với tài khoản khác. Vui lòng sử dụng số điện thoại khác.';
      }
    }

    // 3. Validate Chuyên khoa
    if (!specialty.trim()) {
      errors.specialty = 'Vui lòng nhập chuyên khoa (VD: Sản khoa).';
    }

    // 4. Validate Số chứng chỉ hành nghề
    if (!licenseNumber.trim()) {
      errors.licenseNumber = 'Vui lòng nhập số chứng chỉ hành nghề.';
    }

    // 5. Validate Nơi công tác
    if (!hospital.trim()) {
      errors.hospital = 'Vui lòng nhập nơi công tác (bệnh viện / phòng khám).';
    }

    // 6. Validate Tài liệu chuyên môn
    if (files.length === 0) {
      errors.files = 'Vui lòng tải lên ít nhất một tài liệu chuyên môn (CCHN, bằng cấp...).';
    }

    if (Object.keys(errors).length > 0) {
      setStep3Errors(errors);
      return;
    }

    setStep3Errors({});
    setStep(4);
  };

  const handleFileUpload = (incomingFiles: FileList | null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;
    const addedItems: UploadedFileItem[] = Array.from(incomingFiles).map((file, i) => {
      const isTooLarge = file.size > 10 * 1024 * 1024;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        id: `upload-${Date.now()}-${i}`,
        name: file.name,
        size: isTooLarge
          ? `${sizeMb} MB • Tệp vượt quá 10 MB. Vui lòng chọn tệp nhỏ hơn.`
          : `${sizeMb} MB • Đã tải lên`,
        status: isTooLarge ? 'error' : 'success',
        errorMessage: isTooLarge ? 'Tệp vượt quá 10 MB. Vui lòng chọn tệp nhỏ hơn.' : undefined,
      };
    });
    setFiles((prev) => [...prev, ...addedItems]);
    if (step3Errors.files) {
      setStep3Errors((prev) => ({ ...prev, files: undefined }));
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // =========================================================================
  // HANDLERS BƯỚC 4: THIẾT LẬP MẬT KHẨU & GỬI API ĐĂNG KÝ
  // =========================================================================
  const handleStep4Submit = async () => {
    setPasswordMismatchError(false);
    setPasswordCriteriaError('');
    setSubmitError('');

    if (!hasMinLength || !hasUpperAndLower || !hasDigit || !hasSpecial) {
      setPasswordCriteriaError('Mật khẩu chưa đáp ứng đủ 4 tiêu chí bảo mật.');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordMismatchError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      // Kết nối API POST /api/v1/auth/register dựa trên API_Contract_STORY-2.1_Auth.md
      await authApi.register({
        email: email.trim(),
        password,
        full_name: doctorName.trim(),
        phone_number: phone.trim(),
        role: 'doctor',
        specialty,
        license_number: licenseNumber,
        hospital,
      });

      setIsSubmitting(false);
      setStep(5); // Chuyển sang màn hình Chờ duyệt
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Đăng ký không thành công. Vui lòng thử lại sau.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] font-sans antialiased text-slate-800 overflow-x-hidden selection:bg-[#447C72]/20 selection:text-[#447C72]">
      {/* =========================================================================
          LEFT PANEL (SOLID DEEP TEAL/CHARCOAL #0E262E - 40% WIDTH)
          ========================================================================= */}
      <aside className="w-full lg:w-[40%] xl:w-[38%] min-h-[300px] lg:min-h-screen bg-[#0E262E] text-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between shrink-0 select-none relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-[#447C72]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#447C72]/10 blur-3xl pointer-events-none" />

        {/* Top: Logo PreCare with "ĐĂNG KÝ BÁC SĨ" */}
        <div className="relative z-10">
          <PreCareLogo
            variant="dark"
            size="md"
            subtitle="ĐĂNG KÝ BÁC SĨ"
            onClick={handleNavigateToLogin}
          />
        </div>

        {/* Lower Content matching Figma screenshot */}
        <div className="mt-auto mb-6 lg:mb-16 max-w-[420px] relative z-10 pt-10">
          {step === 5 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#447C72]/20 text-[#5EEAD4] border border-[#5EEAD4]/30 text-[11px] font-bold tracking-wider uppercase mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Đang xét duyệt hồ sơ</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl lg:text-[30px] font-bold text-white leading-[1.3] tracking-tight">
            {currentMeta.leftTitle}
          </h1>

          <p className="mt-4 text-xs sm:text-[13.5px] text-[#94A3B8] leading-[1.65]">
            {currentMeta.leftDesc}
          </p>
        </div>

        {/* Bottom subtle system watermark / copyright */}
        <div className="relative z-10 pt-4 border-t border-white/5 text-[11px] text-slate-500 hidden sm:block">
          PreCare Doctor Portal • Cổng tiếp nhận hồ sơ xét duyệt chuyên môn Sản khoa
        </div>
      </aside>

      {/* =========================================================================
          RIGHT CONTENT PANEL (Clean #F8FAFC, Centered White Card)
          ========================================================================= */}
      <main className="flex-1 min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-[490px] bg-white border border-slate-200/90 rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.035)] p-6 sm:p-8 space-y-6">
          {/* ========================================================
              STEP PROGRESS HEADER (Steps 1 to 4)
              ======================================================== */}
          {step <= 4 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[11px] font-bold text-[#447C72] tracking-wider uppercase">
                  BƯỚC {step} TRÊN 4
                </span>
                <span className="text-slate-500 font-medium">
                  {currentMeta.stepLabel}
                </span>
              </div>

              {/* 4 Segment Progress Bar */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      // Cho phép nhảy bước khi đang kiểm tra
                      setStep(idx);
                    }}
                    title={`Chuyển tới bước ${idx}`}
                    className={`h-[3px] rounded-full transition-all duration-200 cursor-pointer ${
                      idx <= step ? 'bg-[#447C72]' : 'bg-slate-200 hover:bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ========================================================
              BƯỚC 1: EMAIL ĐĂNG KÝ
              ======================================================== */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
                  Đăng ký tài khoản bác sĩ
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                  Nhập email để bắt đầu đăng ký và gửi hồ sơ xét duyệt chuyên môn.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Địa chỉ email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (emailAlreadyExists) setEmailAlreadyExists(false);
                  }}
                  placeholder="bacsi.nguyen@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition-colors ${
                    emailError || emailAlreadyExists
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                  }`}
                />

                {emailError && (
                  <p className="text-[11.5px] text-rose-500 font-medium animate-in fade-in flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailError}</span>
                  </p>
                )}

                {emailAlreadyExists && (
                  <div className="pt-1 space-y-1">
                    <p className="text-[11.5px] text-rose-600 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.</span>
                    </p>
                    <button
                      type="button"
                      onClick={handleNavigateToLogin}
                      className="text-xs font-semibold text-[#447C72] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Đăng nhập với email này</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Checkbox: Terms & Privacy */}
              <div className="space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-slate-600 leading-relaxed">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => {
                      setAgreedTerms(e.target.checked);
                      if (e.target.checked && termsError) setTermsError('');
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#447C72] accent-[#447C72] focus:ring-[#447C72] cursor-pointer shrink-0"
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="font-semibold text-[#447C72] hover:underline cursor-pointer"
                    >
                      Điều khoản dịch vụ
                    </span>{' '}
                    và{' '}
                    <span
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }}
                      className="font-semibold text-[#447C72] hover:underline cursor-pointer"
                    >
                      Chính sách bảo mật
                    </span>{' '}
                    của PreCare.
                  </span>
                </label>
                {termsError && (
                  <p className="text-[11.5px] text-rose-500 font-medium pl-6">
                    {termsError}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSendingOtp}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#447C72] hover:bg-[#38675F] active:scale-[0.99] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isSendingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang gửi mã xác thực...</span>
                  </>
                ) : (
                  <span>Tiếp tục</span>
                )}
              </button>

              {/* Footer Login Link */}
              <div className="text-center text-xs text-slate-500 pt-1">
                <span>Đã có tài khoản bác sĩ? </span>
                <button
                  type="button"
                  onClick={handleNavigateToLogin}
                  className="font-semibold text-[#447C72] hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          )}
          {/* ========================================================
              BƯỚC 2: XÁC MINH EMAIL
              ======================================================== */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
                  Xác minh địa chỉ email
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                  Nhập mã gồm 6 chữ số được gửi đến email của bạn. Mã có hiệu lực trong 5 phút.
                </p>
              </div>

              {/* Thông báo đã gửi email đến hộp thư Gmail (Tuyệt đối KHÔNG hiển thị mã OTP trên giao diện) */}
              {showOtpBanner && (
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-emerald-800 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <span className="font-semibold block text-emerald-900 text-xs sm:text-[13px]">
                        Đã gửi mã xác minh đến {email}
                      </span>
                      <p className="text-[11.5px] text-emerald-700 leading-relaxed">
                        Hệ thống đã gửi mã OTP gồm 6 chữ số đến hộp thư của bạn. Vui lòng kiểm tra hộp thư đến (hoặc thư mục Spam/Thư rác) và nhập mã vào các ô bên dưới.
                      </p>
                      {email.toLowerCase().includes('gmail.com') && (
                        <button
                          type="button"
                          onClick={() => window.open('https://mail.google.com', '_blank')}
                          className="inline-flex items-center gap-1 font-semibold text-[#0d8a7c] hover:underline pt-0.5 cursor-pointer text-[11.5px]"
                        >
                          <span>Mở hộp thư Gmail</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOtpBanner(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer shrink-0"
                    title="Đóng thông báo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Dòng email & thay đổi email */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 truncate max-w-[280px]">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs font-semibold text-[#447C72] hover:underline cursor-pointer shrink-0"
                >
                  Thay đổi email
                </button>
              </div>

              {/* 6 Ô NHẬP MÃ OTP VỚI VIỀN NỔI BẬT THEO YÊU CẦU ĐỀ BÀI */}
              <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                {otp.map((val, idx) => {
                  const isErr = !!otpError;
                  return (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-full h-13 sm:h-14 rounded-lg border-1.5 bg-white text-center text-xl sm:text-2xl font-bold focus:outline-none focus:ring-2 shadow-2xs transition-all border-[#447C72] text-[#447C72] focus:ring-[#447C72]/30 ${
                        isErr ? 'border-rose-500! text-rose-600! focus:ring-rose-500/30!' : ''
                      }`}
                      style={{
                        borderWidth: '1.5px',
                        borderStyle: 'solid',
                        borderColor: isErr ? '#ef4444' : '#447C72',
                      }}
                    />
                  );
                })}
              </div>

              {/* Dòng trạng thái xác minh */}
              {otpError && (
                <div className="text-xs text-rose-500 text-center font-medium animate-in fade-in flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpSuccess && (
                <div className="text-xs text-[#447C72] text-center font-medium animate-in fade-in flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Email đã xác minh. Bạn sẽ được chuyển sang bước điền thông tin hồ sơ.</span>
                </div>
              )}

              {/* Đếm ngược gửi lại mã OTP */}
              <div className="text-center text-xs text-slate-500">
                {canResendOtp ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-semibold text-[#447C72] hover:underline cursor-pointer"
                  >
                    Gửi lại mã xác minh
                  </button>
                ) : (
                  <span>
                    Không nhận được mã? Gửi lại mã sau{' '}
                    <strong className="text-slate-800 font-semibold">{formatTime(timerSeconds)}</strong>
                  </span>
                )}
              </div>

              {/* Callout Notice Box */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-semibold text-slate-900">
                  Hồ sơ sẽ được xét duyệt chuyên môn
                </div>
                <div className="text-[11.5px] text-slate-500 leading-relaxed">
                  Xác minh email không kích hoạt tài khoản. Bác sĩ chỉ được truy cập sau khi hồ sơ được phê duyệt.
                </div>
              </div>

              {/* Primary Button */}
              <button
                type="button"
                onClick={handleStep2Submit}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#447C72] hover:bg-[#38675F] active:scale-[0.99] transition-all shadow-xs cursor-pointer"
              >
                Tiếp tục hoàn thiện hồ sơ
              </button>

              {/* Quay lại Bước 1 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Quay lại bước nhập email
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              BƯỚC 3: THÔNG TIN BÁC SĨ (VỚI VALIDATION RÕ RÀNG)
              ======================================================== */}
          {step === 3 && (
            <form onSubmit={handleStep3Submit} className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
                  Thông tin hồ sơ bác sĩ
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                  Các trường có dấu <span className="text-rose-500 font-semibold">*</span> là bắt buộc. Thông tin cần trùng khớp với giấy tờ chuyên môn.
                </p>
              </div>

              {/* Row 1: Doctor Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-900">
                    Họ và tên bác sĩ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => {
                      setDoctorName(e.target.value);
                      if (step3Errors.doctorName) {
                        setStep3Errors((prev) => ({ ...prev, doctorName: undefined }));
                      }
                    }}
                    placeholder="Nguyễn Minh Hoàng"
                    className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-[13px] text-slate-900 focus:outline-none transition-colors ${
                      step3Errors.doctorName
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                    }`}
                  />
                  {step3Errors.doctorName && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{step3Errors.doctorName}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-900">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (step3Errors.phone) {
                        setStep3Errors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                    placeholder="0903123456"
                    className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-[13px] text-slate-900 focus:outline-none transition-colors ${
                      step3Errors.phone
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                    }`}
                  />
                  {step3Errors.phone && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{step3Errors.phone}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Specialty & Practice License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-900">
                    Chuyên khoa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={(e) => {
                      setSpecialty(e.target.value);
                      if (step3Errors.specialty) {
                        setStep3Errors((prev) => ({ ...prev, specialty: undefined }));
                      }
                    }}
                    placeholder="Sản khoa"
                    className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-[13px] text-slate-900 focus:outline-none transition-colors ${
                      step3Errors.specialty
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                    }`}
                  />
                  {step3Errors.specialty && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{step3Errors.specialty}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-900">
                    Số chứng chỉ hành nghề <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => {
                      setLicenseNumber(e.target.value);
                      if (step3Errors.licenseNumber) {
                        setStep3Errors((prev) => ({ ...prev, licenseNumber: undefined }));
                      }
                    }}
                    placeholder="012345/HNO-CCHN"
                    className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-[13px] text-slate-900 focus:outline-none transition-colors ${
                      step3Errors.licenseNumber
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                    }`}
                  />
                  {step3Errors.licenseNumber && (
                    <span className="text-[11px] text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{step3Errors.licenseNumber}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: Workplace / Hospital */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-900">
                  Nơi công tác <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hospital}
                  onChange={(e) => {
                    setHospital(e.target.value);
                    if (step3Errors.hospital) {
                      setStep3Errors((prev) => ({ ...prev, hospital: undefined }));
                    }
                  }}
                  placeholder="Bệnh viện Phụ sản Hà Nội"
                  className={`w-full px-3 py-2 rounded-lg border text-xs sm:text-[13px] text-slate-900 focus:outline-none transition-colors ${
                    step3Errors.hospital
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                  }`}
                />
                {step3Errors.hospital && (
                  <span className="text-[11px] text-rose-500 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{step3Errors.hospital}</span>
                  </span>
                )}
              </div>            

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#447C72] hover:bg-[#38675F] active:scale-[0.99] transition-all shadow-xs cursor-pointer"
              >
                Tiếp tục tạo mật khẩu
              </button>

              {/* Quay lại Bước 2 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Quay lại
                </button>
              </div>
            </form>
          )}
          {/* ========================================================
              BƯỚC 4: THIẾT LẬP BẢO MẬT & MẬT KHẨU
              ======================================================== */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-[22px] font-bold text-slate-900 tracking-tight">
                  Thiết lập mật khẩu
                </h2>
                <p className="mt-1 text-xs sm:text-[13px] text-slate-500 leading-relaxed">
                  Tạo mật khẩu bảo mật để hoàn tất hồ sơ đăng ký bác sĩ.
                </p>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordMismatchError) setPasswordMismatchError(false);
                      if (passwordCriteriaError) setPasswordCriteriaError('');
                    }}
                    placeholder="PreCare2026@Doctor"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Strength Box */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Độ mạnh mật khẩu</span>
                  <span className={`font-semibold ${strength.colorText}`}>
                    {strength.label}
                  </span>
                </div>

                {/* 4 Segment strength bars */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((barIdx) => (
                    <div
                      key={barIdx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        barIdx <= strength.score ? strength.barColor : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Checklist Rules */}
                <div className="space-y-1.5 pt-1 text-xs">
                  <div
                    className={`flex items-center gap-2 ${
                      hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Tối thiểu 8 ký tự</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      hasUpperAndLower ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Chứa chữ hoa & chữ thường</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      hasDigit ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Có ít nhất 1 chữ số</span>
                  </div>

                  <div
                    className={`flex items-center gap-2 ${
                      hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Có ít nhất 1 ký tự đặc biệt</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-900">
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (passwordMismatchError) setPasswordMismatchError(false);
                    }}
                    placeholder="PreCare2026@Doctor"
                    className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition-colors ${
                      passwordMismatchError
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : 'border-slate-300 focus:border-[#447C72] focus:ring-1 focus:ring-[#447C72]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {passwordMismatchError && (
                  <p className="text-[11.5px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Mật khẩu xác nhận chưa khớp. Vui lòng nhập lại mật khẩu ở trên.</span>
                  </p>
                )}

                {passwordCriteriaError && (
                  <p className="text-[11.5px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{passwordCriteriaError}</span>
                  </p>
                )}
              </div>

              {/* Lỗi từ API nếu có */}
              {submitError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Callout Notice Box */}
              <div className="bg-[#F8FAFC] border border-slate-100 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-semibold text-slate-900">
                  Hồ sơ sẽ được xét duyệt chuyên môn
                </div>
                <div className="text-[11.5px] text-slate-500 leading-relaxed">
                  Xác minh email không kích hoạt tài khoản. Bác sĩ chỉ được truy cập sau khi hồ sơ được phê duyệt.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleStep4Submit}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#447C72] hover:bg-[#38675F] active:scale-[0.99] transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang kết nối API gửi hồ sơ...</span>
                  </>
                ) : (
                  <span>Gửi hồ sơ xét duyệt</span>
                )}
              </button>

              {/* Back to Step 3 */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  ← Quay lại thông tin hồ sơ
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 5: HOÀN TẤT & CHỜ DUYỆT (PENDING APPROVAL STATE)
              ======================================================== */}
          {step === 5 && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
                <Clock className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Hồ sơ đang chờ duyệt
                </h2>
                <p className="mt-2 text-xs sm:text-[13px] text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Cảm ơn Bác sĩ <b className="text-slate-900">{doctorName}</b> đã gửi hồ sơ đăng ký. Ban chuyên môn PreCare đang tiến hành thẩm định và đối chiếu thông tin chứng chỉ hành nghề.
                </p>
              </div>

              {/* Bảng theo dõi tiến độ thẩm định */}
              <RegistrationStatusCard
                emailStatus={{
                  label: 'Email xác thực',
                  sublabel: email,
                  statusText: 'Đã xác minh',
                  tone: 'green',
                }}
                profileStatus={{
                  label: 'Hồ sơ bác sĩ',
                  sublabel: `${specialty} • ${licenseNumber}`,
                  statusText: 'Chờ duyệt',
                  tone: 'amber',
                }}
                accountStatus={{
                  label: 'Trạng thái tài khoản',
                  sublabel: 'Quyền truy cập cổng y tế Sản khoa',
                  statusText: 'Chưa kích hoạt',
                  tone: 'gray',
                }}
              />

              {/* Thông tin tóm tắt đã nộp */}
              <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-3.5 text-left text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Bác sĩ đăng ký:</span>
                  <span className="font-semibold text-slate-800">{doctorName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-semibold text-slate-800">{phone}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Nơi công tác:</span>
                  <span className="font-semibold text-slate-800">{hospital}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-slate-500">Tài liệu đính kèm:</span>
                  <span className="font-semibold text-[#447C72]">{files.length} tệp tin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian phản hồi dự kiến:</span>
                  <span className="font-semibold text-amber-700">24 - 48 giờ làm việc</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleNavigateToLogin}
                  className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#447C72] hover:bg-[#38675F] transition-all shadow-xs cursor-pointer"
                >
                  Về trang Đăng nhập
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCompleteRegistration({
                      email,
                      doctorName,
                      phone,
                      specialty,
                      licenseNumber,
                      hospital,
                      role: 'doctor',
                    });
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#447C72] bg-[#447C72]/10 hover:bg-[#447C72]/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Trải nghiệm giao diện Bác sĩ (Demo)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Đăng ký hồ sơ khác
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =========================================================================
          TERMS & PRIVACY POLICY MODAL
          ========================================================================= */}
      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Điều khoản & Chính sách PreCare
              </h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                <b>1. Mục đích xét duyệt:</b> PreCare là nền tảng số hỗ trợ theo dõi hồ sơ thai sản chuyên sâu. Để bảo vệ dữ liệu y tế của thai phụ và đảm bảo tính chính xác trong chẩn đoán, chỉ các bác sĩ có chứng chỉ hành nghề hợp lệ được cấp quyền truy cập vào portal.
              </p>
              <p>
                <b>2. Bảo mật thông tin:</b> Mọi tài liệu và chứng chỉ hành nghề của bạn được mã hóa an toàn theo tiêu chuẩn HIPAA/GDPR y tế và chỉ sử dụng cho mục đích thẩm định hồ sơ.
              </p>
              <p>
                <b>3. Thời gian xử lý:</b> Ban chuyên môn PreCare thẩm định hồ sơ trong vòng 24 - 48 giờ làm việc. Thông báo chấp thuận hoặc yêu cầu bổ sung sẽ được gửi trực tiếp tới email đăng ký của bạn.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#447C72] hover:bg-[#38675F] cursor-pointer transition-colors"
              >
                Đã hiểu và đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
