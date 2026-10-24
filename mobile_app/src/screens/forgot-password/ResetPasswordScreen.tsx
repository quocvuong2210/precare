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
import { Ionicons } from '@expo/vector-icons';

import { resetPassword } from '../../services/api';
import { colors } from '../../theme/colors';

export default function ResetPasswordScreen({ navigation, route }: any) {
  const email = route.params?.email || '';
  const otp_code = route.params?.otp_code || '';

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
      ? 'Chưa có'
      : strengthCount <= 1
        ? 'Yếu'
        : strengthCount <= 2
          ? 'Trung bình'
          : strengthCount === 3
            ? 'Khá mạnh'
            : 'Rất mạnh';

  const passwordsMismatch =
    submitted &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  const handleResetPassword = async () => {
    setSubmitted(true);

    if (loading) return;

    if (!newPassword || !confirmPassword) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ mật khẩu.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Thông báo', 'Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      setLoading(true);

      const result = await resetPassword(email, otp_code, newPassword);

      Alert.alert(
        'Thành công',
        result.message || 'Mật khẩu đã được thay đổi.',
        [
          {
            text: 'Về đăng nhập',
            onPress: () => navigation.navigate('Login'),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Không thể đổi mật khẩu',
        error.message || 'OTP không hợp lệ hoặc đã hết hạn.',
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
        color={valid ? '#22B981' : '#A3AFBF'}
      />
      <Text
        style={[
          styles.requirementText,
          valid && styles.requirementValid,
        ]}
      >
        {text}
      </Text>
    </View>
  );

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
              <View style={styles.progressDone} />
              <View style={styles.progressActive} />
            </View>

            <Text style={styles.progressText}>
              Bước 3/3 · Mật khẩu mới
            </Text>
          </View>

          <Text style={styles.title}>Đặt mật khẩu mới</Text>

          <Text style={styles.description}>
            Tạo mật khẩu mới để bảo vệ tài khoản và hồ sơ thai kỳ
            của mẹ.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>
              Mật khẩu mới
              <Text style={styles.required}> *</Text>
            </Text>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="#94A3B8"
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
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.labelConfirm}>
              Xác nhận mật khẩu mới
              <Text style={styles.required}> *</Text>
            </Text>

            <View
              style={[
                styles.inputContainer,
                passwordsMismatch && styles.inputError,
              ]}
            >
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#94A3B8"
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
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {passwordsMismatch ? (
              <View style={styles.errorRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={14}
                  color="#EF4444"
                />
                <Text style={styles.errorText}>
                  Mật khẩu xác nhận không khớp. Vui lòng nhập lại.
                </Text>
              </View>
            ) : null}

            <View style={styles.strengthCard}>
              <View style={styles.strengthHeader}>
                <Text style={styles.strengthTitle}>
                  Độ mạnh mật khẩu
                </Text>

                <Text
                  style={[
                    styles.strengthLabel,
                    strengthCount >= 3 && styles.strengthStrong,
                    strengthCount <= 1 && newPassword.length > 0
                      ? styles.strengthWeak
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

              {renderRequirement(
                hasMinLength,
                'Có ít nhất 8 ký tự',
              )}
              {renderRequirement(
                hasUppercase,
                'Chứa chữ thường và chữ viết hoa',
              )}
              {renderRequirement(
                hasNumber,
                'Có ít nhất một chữ số',
              )}
              {renderRequirement(
                hasSpecial,
                'Có ít nhất một ký tự đặc biệt',
              )}
            </View>

            <View style={styles.note}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color="#21877F"
              />
              <Text style={styles.noteText}>
                Không chia sẻ mật khẩu của bạn với bất kỳ ai,
                kể cả người tự xưng là nhân viên PreCare.
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
                <Text style={styles.buttonText}>
                  Đổi mật khẩu
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footer}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
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
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#263449',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  labelConfirm: {
    color: '#263449',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 19,
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    height: 47,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingLeft: 12,
    paddingRight: 5,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#263449',
    fontSize: 13,
  },
  eyeButton: {
    width: 35,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
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