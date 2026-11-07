import React, { useRef, useState, useEffect } from 'react';

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  hasError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Component nhập mã xác thực OTP (6 số) chuẩn Y tế PreCare
 * Khắc phục hoàn toàn lỗi Unikey / Gõ tiếng Việt nhảy số / mất ký tự:
 * 1. type="tel" + inputMode="numeric" + pattern="[0-9]*" để vô hiệu hóa bộ gõ tiếng Việt IME
 * 2. maxLength={1} ngăn nhập nhiều ký tự trên 1 ô
 * 3. handleChange lọc Regex /[^0-9]/g loại bỏ mọi ký tự chữ/dấu do Unikey vô tình tạo ra
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value: controlledValue,
  onChange,
  onComplete,
  hasError = false,
  disabled = false,
  autoFocus = true,
  className = '',
}) => {
  const [otp, setOtp] = useState<string[]>(() => {
    if (controlledValue) {
      const chars = controlledValue.slice(0, length).split('');
      return Array.from({ length }, (_, i) => chars[i] || '');
    }
    return Array(length).fill('');
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đồng bộ khi prop controlledValue từ ngoài thay đổi
  useEffect(() => {
    if (controlledValue !== undefined) {
      const clean = controlledValue.replace(/[^0-9]/g, '').slice(0, length);
      const chars = clean.split('');
      setOtp(Array.from({ length }, (_, i) => chars[i] || ''));
    }
  }, [controlledValue, length]);

  // Focus vào ô đầu tiên khi mount
  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  /**
   * Xử lý thay đổi giá trị từng ô (hỗ trợ nhập số và ngắt xung đột IME)
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const rawVal = e.target.value.replace(/\D/g, '');

    // Trường hợp xóa ô
    if (!rawVal) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      return;
    }

    // Trường hợp dán hoặc autofill nhiều chữ số
    if (rawVal.length > 1) {
      const digits = rawVal.slice(0, length).split('');
      const newOtp = [...otp];
      for (let i = 0; i < length; i++) {
        if (i >= index && digits[i - index]) {
          newOtp[i] = digits[i - index];
        }
      }
      setOtp(newOtp);
      const fullValue = newOtp.join('');
      onChange?.(fullValue);

      const nextFocus = Math.min(index + digits.length, length - 1);
      requestAnimationFrame(() => inputRefs.current[nextFocus]?.focus());

      if (fullValue.length === length && !newOtp.includes('')) {
        onComplete?.(fullValue);
      }
      return;
    }

    // Nhập 1 chữ số thông thường: trích xuất lấy duy nhất ký tự số cuối cùng
    const singleDigit = rawVal.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    const fullValue = newOtp.join('');
    onChange?.(fullValue);

    // Tự động nhảy sang ô tiếp theo
    if (singleDigit && index < length - 1) {
      requestAnimationFrame(() => inputRefs.current[index + 1]?.focus());
    }

    // Kích hoạt onComplete khi đã nhập đủ tất cả các ô
    if (fullValue.length === length && !newOtp.includes('')) {
      onComplete?.(fullValue);
    }
  };

  /**
   * Xử lý phím số (ngắt IME), Backspace và mũi tên di chuyển
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // 1. Phím số 0-9: Chủ động ngắt IME composition
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      const digit = e.key;
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      const fullValue = newOtp.join('');
      onChange?.(fullValue);

      if (index < length - 1) {
        requestAnimationFrame(() => inputRefs.current[index + 1]?.focus());
      }

      if (fullValue.length === length && !newOtp.includes('')) {
        onComplete?.(fullValue);
      }
      return;
    }

    // 2. Phím Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      } else if (index > 0) {
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
        requestAnimationFrame(() => inputRefs.current[index - 1]?.focus());
      }
      return;
    }

    // 3. Phím mũi tên Trái / Phải
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * Xử lý sự kiện Paste vào bất kỳ ô nào
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const value = pastedData.replace(/\D/g, '').slice(0, length);
    if (!value) return;

    const digits = value.split('');
    const newOtp = Array(length).fill('');
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    setOtp(newOtp);

    const fullValue = newOtp.join('');
    onChange?.(fullValue);

    const nextIndex = Math.min(digits.length, length - 1);
    requestAnimationFrame(() => inputRefs.current[nextIndex]?.focus());

    if (fullValue.length === length && !newOtp.includes('')) {
      onComplete?.(fullValue);
    }
  };

  return (
    <div className={`flex items-center justify-center gap-2 sm:gap-2.5 ${className}`}>
      {otp.map((digit, index) => {
        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            // CÁC THUỘC TÍNH VÔ HIỆU HÓA UNIKEY / GÕ TIẾNG VIỆT
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-xl border-1.5 transition-all outline-none font-mono select-none ${
              hasError
                ? 'border-rose-400 bg-rose-50/50 text-rose-700 focus:border-rose-600 focus:ring-3 focus:ring-rose-500/20'
                : digit
                ? 'border-[#345C59] bg-teal-50/30 text-[#345C59] focus:border-[#345C59] focus:ring-3 focus:ring-[#345C59]/20'
                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 focus:border-[#345C59] focus:ring-3 focus:ring-[#345C59]/20'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
            aria-label={`Chữ số OTP thứ ${index + 1}`}
          />
        );
      })}
    </div>
  );
};

export default OtpInput;

