
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
import { Ionicons } from '@expo/vector-icons';

import { forgotPassword } from '../../services/api';

const OTP_VALID_SECONDS = 15 * 60;
const RESEND_WAIT_SECONDS = 3 * 60;
const MAX_RESEND_COUNT = 3;

export default function OtpVerificationScreen({ navigation, route }: any) {
  const email = route.params?.email || '';

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
      Alert.alert(
        'Thông báo',
        'Bạn đã sử dụng hết 3 lượt gửi lại OTP.',
      );
      return;
    }

    if (resendCooldown > 0) {
      Alert.alert(
        'Vui lòng chờ',
        `Bạn có thể gửi lại mã sau ${formatTime(resendCooldown)}.`,
      );
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

      Alert.alert(
        'Gửi mã thành công',
        'OTP mới đã được gửi đến email của bạn. Mã có hiệu lực trong 15 phút.',
      );
    } catch (error: any) {
      Alert.alert(
        'Không thể gửi mã',
        error?.message || 'Vui lòng thử lại sau.',
      );
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    if (otpExpiresIn === 0) {
      Alert.alert(
        'OTP đã hết hạn',
        'Mã xác thực đã hết hạn. Vui lòng gửi lại mã mới.',
      );
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      Alert.alert('Thông báo', 'Vui lòng nhập đủ 6 chữ số OTP.');
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
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
              <View style={styles.progressInactive} />
            </View>

            <Text style={styles.progressText}>
              Bước 2/3 · Xác thực tài khoản
            </Text>
          </View>

          <Text style={styles.title}>Nhập mã xác thực</Text>

          <Text style={styles.description}>
            Nhập mã OTP 6 số được gửi đến email để tiếp tục
            đặt lại mật khẩu.
          </Text>

          <View style={styles.emailRow}>
            <Text style={styles.emailText}>
              {maskedEmail(email)}
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.changeEmail}>Thay đổi</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Mã OTP</Text>

          <View style={styles.otpRow}>
            {Array.from({ length: 6 }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  otp[index] ? styles.otpFilled : null,
                  index === otp.length && otp.length < 6
                    ? styles.otpFocused
                    : null,
                  isOtpExpired && styles.otpExpired,
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
                accessibilityLabel={`Chữ số OTP ${index + 1}`}
              />
            ))}
          </View>

          <View style={styles.timerArea}>
            <View style={styles.timerRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={isOtpExpired ? '#DC2626' : '#64748B'}
              />
              <Text
                style={[
                  styles.timerText,
                  isOtpExpired && styles.expiredText,
                ]}
              >
                {isOtpExpired
                  ? 'Mã OTP đã hết hạn'
                  : `Mã có hiệu lực trong ${formatTime(otpExpiresIn)}`}
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
                  !canResend && styles.resendDisabled,
                ]}
              >
                {resending
                  ? 'Đang gửi mã...'
                  : resendCount >= MAX_RESEND_COUNT
                    ? 'Đã hết 3 lượt gửi lại'
                    : resendCooldown > 0
                      ? `Gửi lại mã sau ${formatTime(resendCooldown)}`
                      : 'Chưa nhận được mã? Gửi lại mã'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.statusText}>
              {resendCount > 0
                ? `Đã gửi lại ${resendCount}/${MAX_RESEND_COUNT} lượt`
                : 'Mã OTP đã được gửi đến email của bạn'}
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={16}
              color="#21877F"
            />
            <Text style={styles.infoText}>
              Không chia sẻ mã OTP với bất kỳ ai, kể cả người
              tự xưng là nhân viên PreCare.
            </Text>
          </View>

          <View style={styles.bottomArea}>
            <TouchableOpacity
              style={[
                styles.button,
                (otp.length !== 6 || isOtpExpired) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={otp.length !== 6 || isOtpExpired}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.buttonText,
                  (otp.length !== 6 || isOtpExpired) &&
                    styles.buttonTextDisabled,
                ]}
              >
                Xác nhận mã
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footer}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.footerText}>
                Quay lại đăng nhập
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
  },
  progressArea: {
    marginBottom: 25,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 3,
    gap: 4,
  },
  progressDone: {
    flex: 1,
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
