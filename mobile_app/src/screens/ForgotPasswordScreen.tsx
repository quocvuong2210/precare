
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Step =
  | 'email'
  | 'emailError'
  | 'otp'
  | 'otpExpired'
  | 'password'
  | 'passwordError'
  | 'success';

const GREEN = '#07998B';
const DARK = '#172338';
const GRAY = '#7B8798';
const LIGHT_GREEN = '#EAFBF7';
const BORDER = '#DCE5ED';

export default function ForgotScreen() {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [seconds, setSeconds] = useState(120);
  const [error, setError] = useState('');

  const otpRef = useRef<TextInput>(null);

  useEffect(() => {
    if (step !== 'otp' || seconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSeconds((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, seconds]);

  useEffect(() => {
    if (step === 'otp' && seconds === 0) {
      setStep('otpExpired');
    }
  }, [step, seconds]);

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60);
    const remainingSeconds = value % 60;

    return `${String(minutes).padStart(2, '0')}:${String(
      remainingSeconds,
    ).padStart(2, '0')}`;
  };

  const goBack = () => {
    if (step === 'email' || step === 'emailError') {
      navigation.goBack();
      return;
    }

    if (step === 'otp' || step === 'otpExpired') {
      setStep('email');
      setOtp('');
      return;
    }

    if (step === 'password' || step === 'passwordError') {
      setStep('otp');
      setSeconds(120);
      return;
    }

    navigation.goBack();
  };

  const sendOtp = () => {
    Keyboard.dismiss();

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError('Vui lòng nhập địa chỉ email.');
      setStep('emailError');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      setError('Email không hợp lệ. Vui lòng kiểm tra lại.');
      setStep('emailError');
      return;
    }

    setEmail(normalizedEmail);
    setError('');
    setOtp('');
    setSeconds(120);
    setStep('otp');

    // Giao diện demo: mã OTP thử nghiệm là 123456.
    // Khi kết nối backend, hãy thay bằng API gửi OTP thật.
  };

  const verifyOtp = () => {
    Keyboard.dismiss();

    if (seconds <= 0) {
      setStep('otpExpired');
      return;
    }

    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 số OTP.');
      return;
    }

    // Chỉ dùng để thử giao diện khi chưa kết nối backend.
    if (otp !== '123456') {
      setError('Mã OTP không chính xác. Vui lòng thử lại.');
      return;
    }

    setError('');
    setPassword('');
    setConfirmPassword('');
    setStep('password');
  };

  const resendOtp = () => {
    setOtp('');
    setError('');
    setSeconds(120);
    setStep('otp');

    // TODO: Gọi API gửi lại OTP khi backend hỗ trợ.
  };

  const validatePassword = () => {
    Keyboard.dismiss();

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.');
      setStep('passwordError');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ cái viết hoa.');
      setStep('passwordError');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ cái viết thường.');
      setStep('passwordError');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError('Mật khẩu cần có ít nhất 1 chữ số.');
      setStep('passwordError');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
      setStep('passwordError');
      return;
    }

    setError('');
    setStep('success');

    // TODO: Gọi API đổi mật khẩu thật tại đây.
  };

  const renderHeader = (title: string, progress: number) => (
    <>
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <View
              style={[styles.progressFill, { width: `${progress}%` }]}
            />
          </View>

          <Text style={styles.progressText}>
            Bước {progress === 33 ? '1/3' : progress === 66 ? '2/3' : '3/3'} ·{' '}
            {progress === 33
              ? 'Thông tin tài khoản'
              : progress === 66
                ? 'Xác thực tài khoản'
                : 'Mật khẩu mới'}
          </Text>
        </View>
      )}
    </>
  );

  const renderLogo = () => (
    <View style={styles.logoContainer}>
      <View style={styles.logoBox}>
        <Text style={styles.logoIcon}>✚</Text>
      </View>
      <Text style={styles.logoText}>PreCare</Text>
    </View>
  );

  const renderHint = (message: string) => (
    <View style={styles.hintBox}>
      <Text style={styles.hintIcon}>ⓘ</Text>
      <Text style={styles.hintText}>{message}</Text>
    </View>
  );

  const renderEmailScreen = () => (
    <>
      {renderHeader('Quên mật khẩu', 33)}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderLogo()}

        <Text style={styles.title}>Bạn quên mật khẩu?</Text>
        <Text style={styles.description}>
          Đừng lo, PreCare sẽ giúp bạn lấy lại quyền truy cập. Nhập email hoặc
          số điện thoại đã đăng ký hệ thống.
        </Text>

        <Text style={styles.label}>
          Email hoặc số điện thoại <Text style={styles.required}>*</Text>
        </Text>

        <TextInput
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError('');
            if (step === 'emailError') setStep('email');
          }}
          placeholder="nguyenlan@gmail.com"
          placeholderTextColor="#A0AAB8"
          keyboardType="email-address"
          autoCapitalize="none"
          style={[
            styles.input,
            step === 'emailError' && styles.inputError,
          ]}
        />

        {step === 'emailError' && (
          <Text style={styles.errorText}>ⓘ {error}</Text>
        )}

        {renderHint(
          'Mã xác thực sẽ được gửi đến email hoặc số điện thoại mà bạn đã nhập.',
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={sendOtp}>
            <Text style={styles.primaryButtonText}>Gửi mã xác thực</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );

  const renderOtpScreen = (expired: boolean) => (
    <>
      {renderHeader('Xác thực tài khoản', 66)}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nhập mã xác thực</Text>

        <Text style={styles.description}>
          Nhập mã OTP gồm 6 chữ số được gửi đến email để tiếp tục đặt lại mật
          khẩu.
        </Text>

        <View style={styles.emailRow}>
          <Text style={styles.emailText}>
            {email.replace(/^(.{2}).*(@.*)$/, '$1***$2')}
          </Text>

          <TouchableOpacity
            onPress={() => {
              setStep('email');
              setError('');
            }}
          >
            <Text style={styles.changeLink}>Thay đổi</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mã OTP</Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => otpRef.current?.focus()}
          style={styles.otpContainer}
        >
          {Array.from({ length: 6 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                otp.length === index && !expired && styles.otpBoxActive,
                expired && styles.otpBoxExpired,
              ]}
            >
              <Text style={styles.otpDigit}>
                {otp[index] || (expired ? '–' : '')}
              </Text>
            </View>
          ))}
        </TouchableOpacity>

        <TextInput
          ref={otpRef}
          value={otp}
          onChangeText={(value) => {
            setOtp(value.replace(/[^0-9]/g, '').slice(0, 6));
            setError('');
          }}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenOtpInput}
          autoFocus={!expired}
          editable={!expired}
        />

        {expired ? (
          <Text style={styles.errorText}>
            ⓘ Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.
          </Text>
        ) : error ? (
          <Text style={styles.errorText}>ⓘ {error}</Text>
        ) : (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              ◷ Mã sẽ hết hạn trong {formatTime(seconds)}
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={resendOtp} style={styles.resendContainer}>
          <Text style={styles.descriptionSmall}>
            {expired ? 'Bạn chưa nhận được mã?' : 'Chưa nhận được mã?'}{' '}
          </Text>
          <Text style={styles.changeLink}>Gửi lại mã</Text>
        </TouchableOpacity>

        {renderHint(
          'Không chia sẻ mã OTP với bất kỳ ai, kể cả người tự xưng là nhân viên PreCare.',
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              expired && styles.disabledButton,
            ]}
            disabled={expired}
            onPress={verifyOtp}
          >
            <Text style={styles.primaryButtonText}>Xác nhận mã</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );

  const renderPasswordScreen = (hasError: boolean) => (
    <>
      {renderHeader('Bảo mật tài khoản', 100)}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Đặt mật khẩu mới</Text>

        <Text style={styles.description}>
          Tạo một mật khẩu mới để bảo vệ tài khoản và hồ sơ thai kỳ của bạn.
        </Text>

        <Text style={styles.label}>
          Mật khẩu mới <Text style={styles.required}>*</Text>
        </Text>

        <View
          style={[
            styles.passwordInputContainer,
            hasError && password.length > 0 && styles.inputError,
          ]}
        >
          <TextInput
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError('');
              if (step === 'passwordError') setStep('password');
            }}
            placeholder="Nhập mật khẩu mới"
            placeholderTextColor="#A0AAB8"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
          />

          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.showPassword}>
              {showPassword ? 'Ẩn' : 'Xem'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>
          Xác nhận mật khẩu mới <Text style={styles.required}>*</Text>
        </Text>

        <View
          style={[
            styles.passwordInputContainer,
            hasError && confirmPassword.length > 0 && styles.inputError,
          ]}
        >
          <TextInput
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setError('');
              if (step === 'passwordError') setStep('password');
            }}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor="#A0AAB8"
            secureTextEntry={!showConfirmPassword}
            style={styles.passwordInput}
          />

          <TouchableOpacity
            onPress={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
          >
            <Text style={styles.showPassword}>
              {showConfirmPassword ? 'Ẩn' : 'Xem'}
            </Text>
          </TouchableOpacity>
        </View>

        {hasError && <Text style={styles.errorText}>ⓘ {error}</Text>}

        <View style={styles.passwordRules}>
          <Text style={styles.rulesTitle}>ⓘ Mật khẩu cần có</Text>

          <Text
            style={[
              styles.ruleText,
              password.length >= 8 && styles.rulePassed,
            ]}
          >
            {password.length >= 8 ? '✓' : '○'} Ít nhất 8 ký tự
          </Text>

          <Text
            style={[
              styles.ruleText,
              /[A-Z]/.test(password) && styles.rulePassed,
            ]}
          >
            {/[A-Z]/.test(password) ? '✓' : '○'} Chứa ít nhất 1 chữ viết hoa
          </Text>

          <Text
            style={[
              styles.ruleText,
              /[a-z]/.test(password) && styles.rulePassed,
            ]}
          >
            {/[a-z]/.test(password) ? '✓' : '○'} Chứa ít nhất 1 chữ viết thường
          </Text>

          <Text
            style={[
              styles.ruleText,
              /[0-9]/.test(password) && styles.rulePassed,
            ]}
          >
            {/[0-9]/.test(password) ? '✓' : '○'} Chứa ít nhất 1 chữ số
          </Text>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={validatePassword}
          >
            <Text style={styles.primaryButtonText}>Đổi mật khẩu</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.linkText}>Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );

  const renderSuccessScreen = () => (
    <>
      {renderHeader('Khôi phục tài khoản', 0)}

      <View style={styles.successContent}>
        {renderLogo()}

        <View style={styles.successIcon}>
          <Text style={styles.successCheck}>✓</Text>
        </View>

        <Text style={styles.successTitle}>Đổi mật khẩu thành công!</Text>

        <Text style={styles.successDescription}>
          Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập bằng mật
          khẩu mới để tiếp tục theo dõi hồ sơ thai kỳ của mình.
        </Text>

        {renderHint(
          'Thông tin và hồ sơ thai kỳ của bạn vẫn được lưu giữ an toàn trên PreCare.',
        )}

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.primaryButtonText}>Trở về đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />

      {step === 'email' || step === 'emailError'
        ? renderEmailScreen()
        : null}

      {step === 'otp' ? renderOtpScreen(false) : null}

      {step === 'otpExpired' ? renderOtpScreen(true) : null}

      {step === 'password' ? renderPasswordScreen(false) : null}

      {step === 'passwordError' ? renderPasswordScreen(true) : null}

      {step === 'success' ? renderSuccessScreen() : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  backButton: {
    width: 36,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 32,
    lineHeight: 36,
    color: DARK,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DARK,
  },
  headerRight: {
    width: 36,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  progressBackground: {
    height: 2,
    backgroundColor: '#DDE6EE',
    borderRadius: 2,
  },
  progressFill: {
    height: 2,
    backgroundColor: GREEN,
    borderRadius: 2,
  },
  progressText: {
    marginTop: 8,
    fontSize: 10,
    color: GRAY,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  logoBox: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
    borderRadius: 10,
  },
  logoIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
  },
  logoText: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '700',
    color: GREEN,
  },
  title: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '700',
    color: DARK,
    marginBottom: 7,
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    color: GRAY,
    marginBottom: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: DARK,
    marginBottom: 8,
    marginTop: 6,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 13,
    color: DARK,
  },
  inputError: {
    borderColor: '#FF5555',
  },
  errorText: {
    color: '#E53935',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
    marginBottom: 4,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LIGHT_GREEN,
    padding: 11,
    borderRadius: 6,
    marginTop: 16,
  },
  hintIcon: {
    color: GREEN,
    fontSize: 14,
    marginRight: 8,
  },
  hintText: {
    flex: 1,
    color: '#178D80',
    fontSize: 11,
    lineHeight: 17,
  },
  bottomActions: {
    marginTop: 'auto',
    paddingTop: 28,
    gap: 12,
  },
  primaryButton: {
    height: 46,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#DDE4EC',
  },
  linkText: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    marginBottom: 22,
  },
  emailText: {
    fontSize: 12,
    color: DARK,
  },
  changeLink: {
    fontSize: 12,
    fontWeight: '600',
    color: GREEN,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  otpBox: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: GREEN,
    borderWidth: 1.5,
  },
  otpBoxExpired: {
    backgroundColor: '#F0F3F7',
  },
  otpDigit: {
    fontSize: 21,
    fontWeight: '600',
    color: DARK,
  },
  hiddenOtpInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    top: 0,
    left: 0,
  },
  timerContainer: {
    marginTop: 14,
    alignItems: 'center',
  },
  timerText: {
    color: GRAY,
    fontSize: 11,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  descriptionSmall: {
    fontSize: 11,
    color: GRAY,
  },
  passwordInputContainer: {
    height: 44,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    color: DARK,
    fontSize: 12,
    paddingVertical: 0,
  },
  showPassword: {
    color: GRAY,
    fontSize: 11,
    padding: 6,
  },
  passwordRules: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCEFE9',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: DARK,
    marginBottom: 8,
  },
  ruleText: {
    color: GRAY,
    fontSize: 11,
    lineHeight: 20,
  },
  rulePassed: {
    color: '#0BA879',
  },
  successContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
  },
  successIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#C9FAF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 22,
  },
  successCheck: {
    fontSize: 36,
    color: GREEN,
  },
  successTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: GRAY,
    textAlign: 'center',
    marginBottom: 12,
  },
});
