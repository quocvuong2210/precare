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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import { resetPassword } from '../../services/api';

const translations = {
  vi: {
    strengthNone: 'Chưa có',
    strengthWeak: 'Yếu',
    strengthMedium: 'Trung bình',
    strengthStrong: 'Khá mạnh',
    strengthVeryStrong: 'Rất mạnh',
    notice: 'Thông báo',
    fillBothPasswords: 'Vui lòng nhập đầy đủ mật khẩu.',
    minLengthError: 'Mật khẩu phải có ít nhất 8 ký tự.',
    mismatchError: 'Mật khẩu xác nhận không khớp.',
    successTitle: 'Thành công',
    defaultSuccessMsg: 'Mật khẩu đã được thay đổi.',
    backToLoginBtn: 'Về đăng nhập',
    errorTitle: 'Không thể đổi mật khẩu',
    defaultErrorMsg: 'OTP không hợp lệ hoặc đã hết hạn.',
    stepText: 'Bước 3/3 · Mật khẩu mới',
    title: 'Đặt mật khẩu mới',
    description:
      'Tạo mật khẩu mới để bảo vệ tài khoản và hồ sơ thai kỳ của mẹ.',
    newPasswordLabel: 'Mật khẩu mới',
    newPasswordPlaceholder: 'Nhập mật khẩu mới',
    confirmPasswordLabel: 'Xác nhận mật khẩu mới',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu mới',
    mismatchInline: 'Mật khẩu xác nhận không khớp. Vui lòng nhập lại.',
    strengthTitle: 'Độ mạnh mật khẩu',
    reqMinLength: 'Có ít nhất 8 ký tự',
    reqUpperLower: 'Chứa chữ thường và chữ viết hoa',
    reqNumber: 'Có ít nhất một chữ số',
    reqSpecial: 'Có ít nhất một ký tự đặc biệt',
    securityNote:
      'Không chia sẻ mật khẩu của bạn với bất kỳ ai, kể cả người tự xưng là nhân viên PreCare.',
    submitButton: 'Đổi mật khẩu',
    backToLogin: 'Quay lại đăng nhập',
  },
  en: {
    strengthNone: 'None',
    strengthWeak: 'Weak',
    strengthMedium: 'Fair',
    strengthStrong: 'Strong',
    strengthVeryStrong: 'Very strong',
    notice: 'Notice',
    fillBothPasswords: 'Please fill in both password fields.',
    minLengthError: 'Password must be at least 8 characters long.',
    mismatchError: 'Confirmation password does not match.',
    successTitle: 'Success',
    defaultSuccessMsg: 'Your password has been updated.',
    backToLoginBtn: 'Go to Sign in',
    errorTitle: 'Unable to reset password',
    defaultErrorMsg: 'Invalid or expired OTP.',
    stepText: 'Step 3/3 · New password',
    title: 'Set a new password',
    description:
      'Create a new password to protect your account and pregnancy records.',
    newPasswordLabel: 'New password',
    newPasswordPlaceholder: 'Enter new password',
    confirmPasswordLabel: 'Confirm new password',
    confirmPasswordPlaceholder: 'Re-enter new password',
    mismatchInline: 'Confirmation password does not match. Please try again.',
    strengthTitle: 'Password strength',
    reqMinLength: 'At least 8 characters',
    reqUpperLower: 'Contains lowercase and uppercase letters',
    reqNumber: 'Contains at least one number',
    reqSpecial: 'Contains at least one special character',
    securityNote:
      'Never share your password with anyone, even someone claiming to be PreCare staff.',
    submitButton: 'Update password',
    backToLogin: 'Back to Sign in',
  },
};

export default function ResetPasswordScreen({ navigation, route }: any) {
  const email = route.params?.email || '';
  const otp_code = route.params?.otp_code || '';
  const { preferences, theme, fontStyle } = useAppSettings();
  const isDark = preferences.darkMode;
  const copy = translations[preferences.language];

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const strengthCount = [
    hasMinLength,
    hasUppercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const strengthLabel =
    !newPassword
      ? copy.strengthNone
      : strengthCount <= 1
        ? copy.strengthWeak
        : strengthCount <= 2
          ? copy.strengthMedium
          : strengthCount === 3
            ? copy.strengthStrong
            : copy.strengthVeryStrong;

  const passwordsMismatch =
    submitted &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  const handleResetPassword = async () => {
    setSubmitted(true);

    if (loading) return;

    if (!newPassword || !confirmPassword) {
      Alert.alert(copy.notice, copy.fillBothPasswords);
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert(copy.notice, copy.minLengthError);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(copy.notice, copy.mismatchError);
      return;
    }

    try {
      setLoading(true);

      const result = await resetPassword(email, otp_code, newPassword);

      Alert.alert(
        copy.successTitle,
        result.message || copy.defaultSuccessMsg,
        [
          {
            text: copy.backToLoginBtn,
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        copy.errorTitle,
        error.message || copy.defaultErrorMsg,
      );
    } finally {
      setLoading(false);
    }
  };

  const renderRequirement = (valid: boolean, text: string) => (
    <View style={styles.requirementRow} key={text}>
      <Ionicons
        name={valid ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={valid ? '#22B981' : theme.muted}
      />
      <Text
        style={[
          styles.requirementText,
          fontStyle(13.5, { lineHeight: 19, min: 12.5 }),
          { color: theme.muted },
          valid && styles.requirementValid,
        ]}
      >
        {text}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ScreenHeader
        title={preferences.language === 'en' ? 'Reset password' : 'Đặt lại mật khẩu'}
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
              <View style={styles.progressDone} />
              <View style={styles.progressActive} />
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

          <View style={styles.form}>
            <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
              {copy.newPasswordLabel}
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TextInput
                style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                placeholder={copy.newPasswordPlaceholder}
                placeholderTextColor={theme.muted}
                value={newPassword}
                onChangeText={(value) => {
                  setNewPassword(value);
                  setSubmitted(false);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="next"
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={19}
                  color={theme.muted}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.labelConfirm, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
              {copy.confirmPasswordLabel}
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                { backgroundColor: theme.surface, borderColor: theme.border },
                passwordsMismatch && [
                  styles.inputError,
                  { borderColor: theme.danger },
                ],
              ]}
            >
              <TextInput
                style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                placeholder={copy.confirmPasswordPlaceholder}
                placeholderTextColor={theme.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />

              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                disabled={loading}
              >
                <Ionicons
                  name={
                    showConfirmPassword ? 'eye-outline' : 'eye-off-outline'
                  }
                  size={19}
                  color={theme.muted}
                />
              </TouchableOpacity>
            </View>

            {passwordsMismatch ? (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color={theme.danger}
                />
                <Text style={[styles.errorText, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.danger }]}>
                  {copy.mismatchInline}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.strengthCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View style={styles.strengthHeader}>
                <Text
                  style={[styles.strengthTitle, fontStyle(13.5, { min: 12.5 }), { color: theme.textSecondary }]}
                >
                  {copy.strengthTitle}
                </Text>

                <Text
                  style={[
                    styles.strengthLabel,
                    fontStyle(13, { min: 12 }),
                    { color: theme.muted },
                    strengthCount >= 3 && styles.strengthStrong,
                    strengthCount <= 1 && newPassword.length > 0
                      ? [styles.strengthWeak, { color: theme.danger }]
                      : null,
                  ]}
                >
                  {strengthLabel}
                </Text>
              </View>

              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: theme.divider },
                      index < strengthCount && {
                        backgroundColor:
                          strengthCount <= 1
                            ? '#EF4444'
                            : strengthCount === 2
                              ? '#F59E0B'
                              : '#22B981',
                      },
                    ]}
                  />
                ))}
              </View>

              {renderRequirement(hasMinLength, copy.reqMinLength)}
              {renderRequirement(hasUppercase, copy.reqUpperLower)}
              {renderRequirement(hasNumber, copy.reqNumber)}
              {renderRequirement(hasSpecial, copy.reqSpecial)}
            </View>

            <View
              style={[
                styles.note,
                {
                  backgroundColor: theme.tealSoft,
                  borderColor: theme.tealBorder,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={theme.tealText}
              />
              <Text style={[styles.noteText, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.tealText }]}>
                {copy.securityNote}
              </Text>
            </View>
          </View>

          <View style={styles.bottomArea}>
            <TouchableOpacity
              style={[
                styles.button,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, fontStyle(15.5, { min: 14.5, max: 18 })]}>{copy.submitButton}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footer}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={[styles.footerText, fontStyle(14, { min: 13, max: 16 }), { color: theme.tealText }]}>
                {copy.backToLogin}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 6,
  },
  errorText: {
    flex: 1,
    color: '#EF4444',
    fontSize: 10,
    lineHeight: 15,
  },
  strengthCard: {
    padding: 12,
    marginTop: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E7EDF3',
    borderRadius: 10,
  },
  strengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  strengthTitle: {
    color: '#64748B',
    fontSize: 11,
  },
  strengthLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  strengthStrong: {
    color: '#22B981',
  },
  strengthWeak: {
    color: '#EF4444',
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginBottom: 10,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  requirementText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  requirementValid: {
    color: '#22A879',
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#F0FAF8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginTop: 17,
  },
  noteText: {
    flex: 1,
    color: '#39847E',
    fontSize: 10,
    lineHeight: 16,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  button: {
    height: 48,
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
    fontSize: 12,
    fontWeight: '700',
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