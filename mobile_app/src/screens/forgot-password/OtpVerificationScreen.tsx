
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import { forgotPassword } from '../../services/api';

const OTP_VALID_SECONDS = 15 * 60;
const RESEND_WAIT_SECONDS = 3 * 60;
const MAX_RESEND_COUNT = 3;

const translations = {
  vi: {
    notice: 'Thông báo',
    limitReached: 'Bạn đã sử dụng hết 3 lượt gửi lại OTP.',
    pleaseWait: 'Vui lòng chờ',
    waitMessage: (time: string) => `Bạn có thể gửi lại mã sau ${time}.`,
    resendSuccessTitle: 'Gửi mã thành công',
    resendSuccessBody:
      'OTP mới đã được gửi đến email của bạn. Mã có hiệu lực trong 15 phút.',
    resendErrorTitle: 'Không thể gửi mã',
    retryLater: 'Vui lòng thử lại sau.',
    expiredTitle: 'OTP đã hết hạn',
    expiredBody: 'Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.',
    enterSixDigits: 'Vui lòng nhập đủ 6 chữ số OTP.',
    stepText: 'Bước 2/3 · Xác thực tài khoản',
    title: 'Nhập mã xác thực',
    description:
      'Nhập mã OTP 6 số được gửi đến email để tiếp tục đặt lại mật khẩu.',
    change: 'Thay đổi',
    otpLabel: 'Mã OTP',
    digitAccessibility: (idx: number) => `Chữ số OTP ${idx}`,
    otpExpiredText: 'Mã OTP đã hết hạn',
    validFor: (time: string) => `Mã có hiệu lực trong ${time}`,
    sendingCode: 'Đang gửi mã...',
    noMoreResends: 'Đã hết 3 lượt gửi lại',
    resendIn: (time: string) => `Gửi lại mã sau ${time}`,
    resendPrompt: 'Chưa nhận được mã? Gửi lại mã',
    resentCount: (count: number, max: number) =>
      `Đã gửi lại ${count}/${max} lượt`,
    sentNotice: 'Mã OTP đã được gửi đến email của bạn',
    securityTip:
      'Không chia sẻ mã OTP với bất kỳ ai, kể cả người tự xưng là nhân viên PreCare.',
    confirmButton: 'Xác nhận mã',
    backToLogin: 'Quay lại đăng nhập',
  },
  en: {
    notice: 'Notice',
    limitReached: 'You have used all 3 OTP resend attempts.',
    pleaseWait: 'Please wait',
    waitMessage: (time: string) => `You can resend a code in ${time}.`,
    resendSuccessTitle: 'Code sent',
    resendSuccessBody:
      'A new OTP has been sent to your email. It is valid for 15 minutes.',
    resendErrorTitle: 'Unable to send code',
    retryLater: 'Please try again later.',
    expiredTitle: 'OTP expired',
    expiredBody: 'The verification code has expired. Please request a new one.',
    enterSixDigits: 'Please enter all 6 OTP digits.',
    stepText: 'Step 2/3 · Verify account',
    title: 'Enter verification code',
    description:
      'Enter the 6-digit OTP sent to your email to continue resetting your password.',
    change: 'Change',
    otpLabel: 'OTP Code',
    digitAccessibility: (idx: number) => `OTP digit ${idx}`,
    otpExpiredText: 'OTP code has expired',
    validFor: (time: string) => `Code expires in ${time}`,
    sendingCode: 'Sending code...',
    noMoreResends: 'All 3 resends used',
    resendIn: (time: string) => `Resend code in ${time}`,
    resendPrompt: "Didn't receive a code? Resend",
    resentCount: (count: number, max: number) =>
      `Resent ${count}/${max} times`,
    sentNotice: 'An OTP code has been sent to your email',
    securityTip:
      'Never share your OTP code with anyone, even someone claiming to be PreCare staff.',
    confirmButton: 'Verify code',
    backToLogin: 'Back to Sign in',
  },
};

export default function OtpVerificationScreen({ navigation, route }: any) {
  const email = route.params?.email || '';
  const { preferences, theme, fontStyle } = useAppSettings();
  const isDark = preferences.darkMode;
  const copy = translations[preferences.language];

  const [otp, setOtp] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(OTP_VALID_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_WAIT_SECONDS);
  const [resendCount, setResendCount] = useState(0);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Đếm ngược thời hạn OTP và thời gian chờ gửi lại.
  useEffect(() => {
    if (otpExpiresIn === 0 && resendCooldown === 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpExpiresIn((prev) => Math.max(0, prev - 1));
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [otpExpiresIn, resendCooldown]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`;
  };

  const maskedEmail = (value: string) => {
    const parts = value.split('@');

    if (parts.length !== 2) {
      return value;
    }

    const username = parts[0];
    const visible = username.slice(0, Math.min(3, username.length));

    return `${visible}***@${parts[1]}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (otpExpiresIn === 0) {
      return;
    }

    // Hỗ trợ nhập nhanh hoặc dán mã OTP 6 số.
    const digits = value.replace(/[^0-9]/g, '');

    if (digits.length > 1) {
      const nextOtp = digits.slice(0, 6);
      setOtp(nextOtp);

      if (nextOtp.length === 6) {
        inputRefs.current[5]?.focus();
        Keyboard.dismiss();
      } else {
        inputRefs.current[nextOtp.length]?.focus();
      }

      return;
    }

    const currentOtp = otp.split('');
    currentOtp[index] = digits;

    const nextOtp = currentOtp.join('').slice(0, 6);
    setOtp(nextOtp);

    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (nextOtp.length === 6) {
      Keyboard.dismiss();
    }
  };

  // Gửi OTP mới ngay tại màn hình hiện tại.
  const handleResendOtp = async () => {
    if (resending) {
      return;
    }

    if (resendCount >= MAX_RESEND_COUNT) {
      Alert.alert(copy.notice, copy.limitReached);
      return;
    }

    if (resendCooldown > 0) {
      Alert.alert(copy.pleaseWait, copy.waitMessage(formatTime(resendCooldown)));
      return;
    }

    try {
      setResending(true);

      // Sử dụng lại API gửi OTP hiện có.
      await forgotPassword(email);

      // Chỉ cập nhật thời gian khi API gửi mã thành công.
      setOtp('');
      setOtpExpiresIn(OTP_VALID_SECONDS);
      setResendCooldown(RESEND_WAIT_SECONDS);
      setResendCount((prev) => prev + 1);

      Alert.alert(copy.resendSuccessTitle, copy.resendSuccessBody);
    } catch (error: any) {
      Alert.alert(copy.resendErrorTitle, error?.message || copy.retryLater);
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    if (otpExpiresIn === 0) {
      Alert.alert(copy.expiredTitle, copy.expiredBody);
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      Alert.alert(copy.notice, copy.enterSixDigits);
      return;
    }

    navigation.navigate('ResetPassword', {
      email,
      otp_code: otp,
    });
  };

  const canResend =
    resendCooldown === 0 &&
    resendCount < MAX_RESEND_COUNT &&
    !resending;

  const isOtpExpired = otpExpiresIn === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader
        title={preferences.language === 'en' ? 'Verify OTP' : 'Xác thực mã OTP'}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={styles.progressDone} />
              <View style={styles.progressActive} />
              <View
                style={[
                  styles.progressInactive,
                  { backgroundColor: theme.divider },
                ]}
              />
            </View>

            <Text style={[styles.progressText, fontStyle(12, { min: 11, max: 14 }), { color: theme.muted }]}>
              {copy.stepText}
            </Text>
          </View>

          <Text style={[styles.title, fontStyle(23, { lineHeight: 30, min: 21, max: 27 }), { color: theme.text }]}>
            {copy.title}
          </Text>

          <Text style={[styles.description, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.textSecondary }]}>
            {copy.description}
          </Text>

          <View style={styles.emailRow}>
            <Text style={[styles.emailText, fontStyle(14, { min: 13 }), { color: theme.text }]}>
              {maskedEmail(email)}
            </Text>

            <TouchableOpacity
              style={styles.linkTouch}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={[styles.changeEmail, fontStyle(13.5, { min: 12.5, max: 16 }), { color: theme.tealText }]}>
                {copy.change}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
            {copy.otpLabel}
          </Text>

          <View style={styles.otpRow}>
            {Array.from({ length: 6 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  fontStyle(21, { min: 19, max: 24 }),
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                  otp[index]
                    ? [styles.otpFilled, { borderColor: theme.tealText }]
                    : null,
                  index === otp.length && otp.length < 6
                    ? [styles.otpFocused, { borderColor: theme.tealText }]
                    : null,
                  isOtpExpired && [
                    styles.otpExpired,
                    { borderColor: theme.danger },
                  ],
                ]}
                value={otp[index] || ''}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (
                    nativeEvent.key === 'Backspace' &&
                    !otp[index] &&
                    index > 0
                  ) {
                    inputRefs.current[index - 1]?.focus();
                  }
                }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                selectTextOnFocus
                editable={!isOtpExpired}
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                accessibilityLabel={copy.digitAccessibility(index + 1)}
              />
            ))}
          </View>

          <View style={styles.timerArea}>
            <View style={styles.timerRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={isOtpExpired ? theme.danger : theme.muted}
              />
              <Text
                style={[
                  styles.timerText,
                  fontStyle(13, { min: 12 }),
                  { color: theme.muted },
                  isOtpExpired && { color: theme.danger },
                ]}
              >
                {isOtpExpired
                  ? copy.otpExpiredText
                  : copy.validFor(formatTime(otpExpiresIn))}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOtp}
              disabled={!canResend}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.resendText,
                  fontStyle(13.5, { min: 12.5 }),
                  { color: theme.tealText },
    backgroundColor: '#438F87',
    borderRadius: 3,
  },
  progressActive: {
    flex: 1,
    backgroundColor: '#258D83',
    borderRadius: 3,
  },
  progressInactive: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  progressText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 9,
  },
  title: {
    color: '#172033',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 6,
  },
  description: {
    color: '#718096',
    fontSize: 12,
    lineHeight: 19,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 24,
  },
  emailText: {
    color: '#263449',
    fontSize: 12,
    fontWeight: '700',
  },
  changeEmail: {
    color: '#258D83',
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    color: '#263449',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
  },
  otpInput: {
    flex: 1,
    height: 54,
    minWidth: 0,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#DCE5EF',
    backgroundColor: '#FFFFFF',
    color: '#172033',
    fontSize: 21,
    fontWeight: '800',
    paddingHorizontal: 0,
  },
  otpFilled: {
    borderColor: '#438F87',
  },
  otpFocused: {
    borderColor: '#258D83',
    borderWidth: 1.5,
  },
  otpExpired: {
    borderColor: '#DC2626',
  },
  timerArea: {
    alignItems: 'center',
    marginTop: 16,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    color: '#64748B',
    fontSize: 10,
  },
  expiredText: {
    color: '#DC2626',
  },
  resendButton: {
    paddingVertical: 10,
  },
  resendText: {
    color: '#438F87',
    fontSize: 10,
    fontWeight: '600',
  },
  resendDisabled: {
    color: '#94A3B8',
  },
  statusText: {
    color: '#39847E',
    fontSize: 11,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#F0FAF8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginTop: 10,
  },
  infoText: {
    flex: 1,
    color: '#39847E',
    fontSize: 10,
    lineHeight: 16,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: 28,
  },
  button: {
    height: 48,
    borderRadius: 7,
    backgroundColor: '#438F87',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E2E7EF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonTextDisabled: {
    color: '#94A3B8',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 13,
  },
  footerText: {
    color: '#168C80',
    fontSize: 11,
    fontWeight: '700',
  },
});
