import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/AppNavigator';
import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import { register } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterDetails'>;

const PRIMARY = '#0D9488';

export default function RegisterDetailsScreen({ navigation, route }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const { email, role, verificationToken } = route.params;

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    const name = fullName.trim();
    const phone = phoneNumber.trim();

    if (!name || !phone || !password || !confirmPassword) {
      Alert.alert(
        isEn ? 'Missing information' : 'Thiếu thông tin',
        isEn ? 'Please fill in all required fields.' : 'Vui lòng điền đầy đủ các trường.',
      );
      return;
    }

    if (!/^[0-9+()\s-]{9,20}$/.test(phone)) {
      Alert.alert(
        isEn ? 'Invalid phone number' : 'Số điện thoại không hợp lệ',
        isEn ? 'Please check your phone number.' : 'Vui lòng kiểm tra số điện thoại.',
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        isEn ? 'Password too short' : 'Mật khẩu quá ngắn',
        isEn ? 'Password must be at least 8 characters.' : 'Mật khẩu phải có ít nhất 8 ký tự.',
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        isEn ? 'Passwords do not match' : 'Mật khẩu không khớp',
        isEn ? 'Please re-enter the confirmation password.' : 'Vui lòng nhập lại mật khẩu xác nhận.',
      );
      return;
    }

    try {
      setLoading(true);

      await register(
        {
          email,
          full_name: name,
          role,
          phone_number: phone,
          password,
        },
        verificationToken
      );

      Alert.alert(
        isEn ? 'Registration successful' : 'Đăng ký thành công',
        role === 'doctor'
          ? (isEn
              ? 'Doctor account created and may require review before activation.'
              : 'Tài khoản bác sĩ đã được tạo và có thể cần được xét duyệt trước khi kích hoạt.')
          : (isEn
              ? 'Your account has been created. Please sign in to continue.'
              : 'Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.'),
        [
          {
            text: isEn ? 'Go to sign in' : 'Đến đăng nhập',
            onPress: () =>
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
          },
        ],
        { cancelable: false }
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (isEn ? 'Unable to register. Please try again.' : 'Không thể đăng ký. Vui lòng thử lại.');
      Alert.alert(isEn ? 'Registration failed' : 'Đăng ký thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Complete registration' : 'Hoàn tất đăng ký'}
        onBack={() => navigation.goBack()}
        backDisabled={loading}
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
          <View style={styles.main}>
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="heart-outline" size={31} color="#FFFFFF" />
                <View style={styles.pulse}>
                  <Ionicons name="pulse" size={22} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.appName, fontStyle(19, { min: 17.5, max: 22 }), { color: theme.tealText }]}>PreCare</Text>
            </View>

            <Text style={[styles.title, fontStyle(24, { lineHeight: 32, min: 22, max: 28 }), { color: theme.text }]}>
              {isEn ? 'Complete registration' : 'Hoàn tất đăng ký'}
            </Text>
            <Text style={[styles.subtitle, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'Your email has been verified. Complete your details to create an account.'
                : 'Email đã được xác minh. Vui lòng bổ sung thông tin để tạo tài khoản.'}
            </Text>

            <View style={[styles.verifiedCard, { backgroundColor: theme.tealSoft }]}>
              <Ionicons name="checkmark-circle" size={21} color={PRIMARY} />
              <View style={styles.verifiedContent}>
                <Text style={[styles.verifiedLabel, fontStyle(13.5, { min: 12.5, max: 16 }), { color: theme.tealText }]}>
                  {isEn ? 'Email verified' : 'Email đã xác minh'}
                </Text>
                <Text style={[styles.verifiedEmail, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>{email}</Text>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Full name' : 'Họ và tên'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="person-outline" size={19} color={theme.muted} />
                <TextInput
                  style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                  placeholder={isEn ? 'Enter full name' : 'Nhập họ và tên'}
                  placeholderTextColor={theme.muted}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>

              <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Phone number' : 'Số điện thoại'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={19} color={theme.muted} />
                <TextInput
                  style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                  placeholder={isEn ? 'Enter phone number' : 'Nhập số điện thoại'}
                  placeholderTextColor={theme.muted}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                />
              </View>

              <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Password' : 'Mật khẩu'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="lock-closed-outline" size={19} color={theme.muted} />
                <TextInput
                  style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                  placeholder={isEn ? 'At least 8 characters' : 'Ít nhất 8 ký tự'}
                  placeholderTextColor={theme.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowPassword(v => !v)}
                  style={styles.eyeButton}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword
                      ? (isEn ? 'Hide password' : 'Ẩn mật khẩu')
                      : (isEn ? 'Show password' : 'Hiện mật khẩu')
                  }
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
                </Pressable>
              </View>

              <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Confirm password' : 'Xác nhận mật khẩu'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="shield-checkmark-outline" size={19} color={theme.muted} />
                <TextInput
                  style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
                  placeholder={isEn ? 'Re-enter password' : 'Nhập lại mật khẩu'}
                  placeholderTextColor={theme.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  editable={!loading}
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(v => !v)}
                  style={styles.eyeButton}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? (isEn ? 'Hide confirm password' : 'Ẩn mật khẩu xác nhận')
                      : (isEn ? 'Show confirm password' : 'Hiện mật khẩu xác nhận')
                  }
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
                </Pressable>
              </View>

              <View style={[styles.note, { backgroundColor: theme.surfaceAlt }]}>
                <Ionicons name="information-circle-outline" size={18} color={theme.muted} />
                <Text style={[styles.noteText, fontStyle(13.5, { lineHeight: 20, min: 12.5 }), { color: theme.muted }]}>
                  {isEn
                    ? 'Your account will be created with the selected role. Never share your password.'
                    : 'Tài khoản sẽ được tạo theo vai trò đã chọn ở bước gửi OTP. Không chia sẻ mật khẩu với người khác.'}
                </Text>
              </View>

              <Pressable
                onPress={handleRegister}
                disabled={loading}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.registerButton,
                  pressed && styles.pressed,
                  loading && styles.disabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={[styles.registerButtonText, fontStyle(15.5, { min: 14.5, max: 18 })]}>
                      {isEn ? 'Create account' : 'Tạo tài khoản'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={theme.muted} />
            <Text style={[styles.footerText, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
              {isEn ? 'Your data is protected by PreCare' : 'Thông tin của bạn được bảo vệ bởi PreCare'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F7FAFC' },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  main: { paddingTop: 4 },
  backButton: { width: 44, height: 44, justifyContent: 'center', marginBottom: 5 },
  brand: { alignItems: 'center', marginTop: 4, marginBottom: 22 },
  logo: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
  },
  pulse: { position: 'absolute' },
  appName: { marginTop: 10, fontSize: 19, fontWeight: '700', color: '#00847C' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: '#0F172A' },
  subtitle: { marginTop: 7, fontSize: 15, lineHeight: 22, color: '#64748B' },
  verifiedCard: {
    marginTop: 22, padding: 14, borderRadius: 12,
    backgroundColor: '#E7F7F2', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  verifiedContent: { flex: 1 },
  verifiedLabel: { fontSize: 13.5, color: '#0F766E', fontWeight: '600' },
  verifiedEmail: { marginTop: 3, color: '#0F172A', fontSize: 14.5, fontWeight: '600' },
  form: { marginTop: 22 },
  label: { fontSize: 14.5, color: '#334155', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  required: { color: '#EF4444' },
  inputWrap: {
    minHeight: 49, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#DFE8F3', borderRadius: 9, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, gap: 10,
  },
  input: { flex: 1, minHeight: 46, fontSize: 15.5, color: '#0F172A', paddingVertical: 8 },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, padding: 13, marginTop: 24, backgroundColor: '#EDF3F8', borderRadius: 10 },
  noteText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: '#64748B' },
  registerButton: {
    minHeight: 50, marginTop: 25, borderRadius: 9,
    backgroundColor: PRIMARY, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 9, paddingVertical: 12,
  },
  registerButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15.5 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
  footer: { marginTop: 'auto', paddingTop: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerText: { fontSize: 13, color: '#94A3B8' },
});
