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
import { colors } from '../../theme/colors';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = async () => {
    if (loading) return;

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ. Vui lòng kiểm tra và nhập lại.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await forgotPassword(email.trim());

      Alert.alert(
        'Thông báo',
        result.message || 'Vui lòng kiểm tra email để nhận OTP.',
        [
          {
            text: 'Tiếp tục',
            onPress: () =>
              navigation.navigate('OtpVerification', {
                email: email.trim(),
              }),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể gửi OTP. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F7F9FC', '#F4F8FB']}
      style={styles.flex}
    >
      <StatusBar style="dark" />

      <SafeAreaView style={styles.flex}>
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
                <View style={styles.progressInactive} />
                <View style={styles.progressInactive} />
              </View>

              <Text style={styles.progressText}>
                Bước 1/3 · Thông tin tài khoản
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

              <Text style={styles.appName}>PreCare</Text>
            </View>

            <View style={styles.heading}>
              <Text style={styles.title}>Quên mật khẩu?</Text>

              <Text style={styles.description}>
                Đừng lo, PreCare sẽ giúp bạn lấy lại quyền truy cập.
                Nhập email hoặc số điện thoại đã đăng ký nhé.
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>
                Email hoặc số điện thoại
                <Text style={styles.required}> *</Text>
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  error ? styles.inputError : null,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="nguyen.lan@gmail.com"
                  placeholderTextColor="#94A3B8"
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
                    color="#EF4444"
                  />
                ) : null}
              </View>

              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle"
                    size={14}
                    color="#EF4444"
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.infoBox}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color="#21877F"
                />
                <Text style={styles.infoText}>
                  Mã xác thực 6 số sẽ được gửi đến email hoặc
                  số điện thoại mà bạn nhập.
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
                  <Text style={styles.buttonText}>
                    Gửi mã xác thực
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footer}
                onPress={() => navigation.navigate('Login')}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={styles.footerText}>
                  Quay lại đăng nhập
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
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
    fontSize: 10,
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
    fontSize: 12,
    lineHeight: 18,
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
  required: {
    color: '#EF4444',
  },
  inputContainer: {
    height: 48,
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
    height: '100%',
    color: '#263449',
    fontSize: 13,
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
    fontSize: 10,
    lineHeight: 15,
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
    fontSize: 10,
    lineHeight: 16,
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: 28,
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
    justifyContent: 'center',
    paddingTop: 13,
    paddingBottom: 2,
  },
  footerText: {
    color: '#168C80',
    fontSize: 11,
    fontWeight: '700',
  },
});