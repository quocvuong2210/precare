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
import { register } from '../../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterDetails'>;

const PRIMARY = '#0D9488';

export default function RegisterDetailsScreen({ navigation, route }: Props) {
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
      Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường.');
      return;
    }

    if (!/^[0-9+()\s-]{9,20}$/.test(phone)) {
      Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng kiểm tra số điện thoại.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Mật khẩu quá ngắn', 'Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Mật khẩu không khớp', 'Vui lòng nhập lại mật khẩu xác nhận.');
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
        'Đăng ký thành công',
        role === 'doctor'
          ? 'Tài khoản bác sĩ đã được tạo và có thể cần được xét duyệt trước khi kích hoạt.'
          : 'Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.',
        [
          {
            text: 'Đến đăng nhập',
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
          : 'Không thể đăng ký. Vui lòng thử lại.';
      Alert.alert('Đăng ký thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.main}>
            <Pressable
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
            >
              <Ionicons name="arrow-back" size={23} color="#0F172A" />
            </Pressable>

            <View style={styles.brand}>
              <View style={styles.logo}>
                <Ionicons name="heart-outline" size={31} color="#FFFFFF" />
                <View style={styles.pulse}>
                  <Ionicons name="pulse" size={22} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.appName}>PreCare</Text>
            </View>

            <Text style={styles.title}>Hoàn tất đăng ký</Text>
            <Text style={styles.subtitle}>
              Email đã được xác minh. Vui lòng bổ sung thông tin để tạo tài khoản.
            </Text>

            <View style={styles.verifiedCard}>
              <Ionicons name="checkmark-circle" size={21} color={PRIMARY} />
              <View style={styles.verifiedContent}>
                <Text style={styles.verifiedLabel}>Email đã xác minh</Text>
                <Text style={styles.verifiedEmail}>{email}</Text>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={19} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={19} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  editable={!loading}
                />
              </View>

              <Text style={styles.label}>Mật khẩu <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={19} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Ít nhất 8 ký tự"
                  placeholderTextColor="#94A3B8"
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
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
                </Pressable>
              </View>

              <Text style={styles.label}>Xác nhận mật khẩu <Text style={styles.required}>*</Text></Text>
              <View style={styles.inputWrap}>
                <Ionicons name="shield-checkmark-outline" size={19} color="#94A3B8" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#94A3B8"
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
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={18} color="#64748B" />
                <Text style={styles.noteText}>
                  Tài khoản sẽ được tạo theo vai trò đã chọn ở bước gửi OTP. Không chia sẻ mật khẩu với người khác.
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
                    <Text style={styles.registerButtonText}>Tạo tài khoản</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#94A3B8" />
            <Text style={styles.footerText}>Thông tin của bạn được bảo vệ bởi PreCare</Text>
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
  subtitle: { marginTop: 7, fontSize: 13, lineHeight: 20, color: '#64748B' },
  verifiedCard: {
    marginTop: 22, padding: 14, borderRadius: 12,
    backgroundColor: '#E7F7F2', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  verifiedContent: { flex: 1 },
  verifiedLabel: { fontSize: 12, color: '#0F766E', fontWeight: '600' },
  verifiedEmail: { marginTop: 3, color: '#0F172A', fontSize: 13, fontWeight: '600' },
  form: { marginTop: 22 },
  label: { fontSize: 12, color: '#334155', fontWeight: '600', marginBottom: 8, marginTop: 16 },
  required: { color: '#EF4444' },
  inputWrap: {
    minHeight: 49, backgroundColor: '#FFFFFF', borderWidth: 1,
    borderColor: '#DFE8F3', borderRadius: 9, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 12, gap: 10,
  },
  input: { flex: 1, minHeight: 46, fontSize: 13, color: '#0F172A', paddingVertical: 8 },
  note: { flexDirection: 'row', gap: 8, padding: 13, marginTop: 24, backgroundColor: '#EDF3F8', borderRadius: 10 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 19, color: '#64748B' },
  registerButton: {
    minHeight: 50, marginTop: 25, borderRadius: 9,
    backgroundColor: PRIMARY, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 9,
  },
  registerButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.65 },
  footer: { marginTop: 'auto', paddingTop: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footerText: { fontSize: 11, color: '#94A3B8' },
});
