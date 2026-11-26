import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { forgotPassword } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import { colors } from '../../theme/colors';

export default function ForgotPasswordScreen({ navigation }: any) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (loading) return;

    if (!email.trim()) {
      setError(isEn ? 'Please enter your email address.' : 'Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(isEn ? 'Invalid email address. Please try again.' : 'Email không hợp lệ. Vui lòng kiểm tra và nhập lại.');
      return;
    }

     try {
    setLoading(true);
    setError('');

    const result = await forgotPassword(email.trim());
    console.log('1. API OK:', result);

    console.log('2. Chuẩn bị navigate');
    navigation.navigate('ForgotOtpVerification', {
      email: email.trim(),
    });
    console.log('3. Đã gọi navigate');
  } catch (err: any) {
    console.log('FAIL:', err?.message);
    setError(err?.message || (isEn ? 'Unable to send OTP. Please try again.' : 'Không thể gửi OTP. Vui lòng thử lại.'));
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Forgot password' : 'Quên mật khẩu'}
        onBack={() => navigation.goBack()}
      />

      <LinearGradient
        colors={[theme.gradientTop, theme.gradientBottom]}
        style={styles.flex}
      >
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
                <View style={styles.progressActive} />
                <View style={[styles.progressInactive, { backgroundColor: theme.border }]} />
                <View style={[styles.progressInactive, { backgroundColor: theme.border }]} />
              </View>

              <Text style={[styles.progressText, fontStyle(12, { min: 11, max: 14 }), { color: theme.muted }]}>
                {isEn ? 'Step 1/3 · Account details' : 'Bước 1/3 · Thông tin tài khoản'}
              </Text>
            </View>

            <View style={styles.brand}>
              <View style={styles.logoIcon}>
                <Ionicons
                  name="heart"
                  size={24}
                  color="#FFFFFF"
                />
              </View>

              <Text style={[styles.appName, fontStyle(19, { min: 17.5, max: 22 }), { color: theme.tealText }]}>PreCare</Text>
            </View>

            <View style={styles.heading}>
              <Text style={[styles.title, fontStyle(23, { lineHeight: 30, min: 21, max: 27 }), { color: theme.text }]}>
                {isEn ? 'Forgot password?' : 'Quên mật khẩu?'}
              </Text>

              <Text style={[styles.description, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
                {isEn
                  ? "Don't worry, PreCare will help you restore access. Enter your registered email address."
                  : 'Đừng lo, PreCare sẽ giúp bạn lấy lại quyền truy cập. Nhập email hoặc số điện thoại đã đăng ký nhé.'}
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Registered email' : 'Email hoặc số điện thoại'}
                <Text style={styles.required}> *</Text>
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  error ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                  placeholder="nguyen.lan@gmail.com"
                  placeholderTextColor={theme.muted}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  returnKeyType="send"
                  onSubmitEditing={handleSendOtp}
                />

                {error ? (
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={theme.danger}
                  />
                ) : null}
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color={theme.danger}
                  />
                  <Text style={[styles.errorText, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.danger }]}>{error}</Text>
                </View>
              ) : null}

              <View style={[styles.infoBox, { backgroundColor: theme.tealSoft }]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={theme.tealText}
                />
                <Text style={[styles.infoText, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.tealText }]}>
                  {isEn
                    ? 'A 6-digit verification code will be sent to your email.'
                    : 'Mã xác thực 6 số sẽ được gửi đến email hoặc số điện thoại mà bạn nhập.'}
                </Text>
              </View>
            </View>

            <View style={styles.bottomArea}>
              <TouchableOpacity
                style={[
                  styles.button,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.buttonText, fontStyle(15.5, { min: 14.5, max: 18 })]}>
                    {isEn ? 'Send verification code' : 'Gửi mã xác thực'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footer}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerText, fontStyle(14, { min: 13, max: 16 }), { color: theme.tealText }]}>
                  {isEn ? 'Back to sign in' : 'Quay lại đăng nhập'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
    fontSize: 12,
    marginTop: 9,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 25,
  },
  logoIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 8,
  },
  heading: {
    marginBottom: 20,
  },
  title: {
    color: '#172033',
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 5,
  },
  description: {
    color: '#718096',
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#263449',
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9,
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    color: '#263449',
    fontSize: 15.5,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    gap: 5,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 13,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FAF8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginTop: 15,
    gap: 9,
  },
  infoText: {
    flex: 1,
    color: '#39847E',
    fontSize: 13.5,
    lineHeight: 19,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: 28,
  },
  button: {
    minHeight: 48,
    paddingVertical: 12,
    backgroundColor: '#438F87',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  footer: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  footerText: {
    color: '#168C80',
    fontSize: 14,
    fontWeight: '700',
  },
});