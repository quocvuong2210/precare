
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import {
  loadRememberedLoginState,
  login,
  resolvePostAuthDestination,
  saveRememberMePreference,
  verifySessionWithBackend,
} from '../services/api';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoAuthenticating, setAutoAuthenticating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const initialMessage = route.params?.sessionMessage;
    const skipAutoLogin = route.params?.skipAutoLogin === true;

    if (initialMessage) {
      setError(initialMessage);
    }

    const initializeLoginState = async () => {
      try {
        const state = await loadRememberedLoginState();

        if (!isMounted) {
          return;
        }

        if (state.rememberedEmail) {
          setEmail(state.rememberedEmail);
          setRememberMe(true);
        } else {
          setRememberMe(state.rememberMeEnabled);
        }

        if (!skipAutoLogin && state.rememberMeEnabled && state.hasStoredToken) {
          setAutoAuthenticating(true);
          const result = await verifySessionWithBackend({ requireRememberMe: true });
          if (!isMounted) {
            return;
          }

          if (result.status === 'authenticated') {
            navigation.replace(result.destination);
            return;
          }

          if (result.rememberedEmail) {
            setEmail(result.rememberedEmail);
          }
          if (result.message) {
            setError(result.message);
          }
        }
      } catch {
        if (isMounted) {
          setError(
            isEn
              ? 'Unable to load saved login credentials.'
              : 'Không thể tải thông tin đăng nhập đã lưu.',
          );
        }
      } finally {
        if (isMounted) {
          setAutoAuthenticating(false);
        }
      }
    };

    void initializeLoginState();

    return () => {
      isMounted = false;
    };
  }, [isEn, navigation, route.params?.sessionMessage, route.params?.skipAutoLogin]);

  const isBusy = loading || autoAuthenticating;

  const handleLogin = async () => {
    if (isBusy) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(isEn ? 'Please enter email and password.' : 'Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await login(trimmedEmail, password);

      if (!data.access_token) {
        throw new Error(isEn ? 'Server did not return an access token.' : 'API không trả về access_token.');
      }
      console.log('Đăng nhập thành công!');

      let credentialStorageFailed = Boolean(rememberMe && data.tokenStorageFailed);
      try {
        await saveRememberMePreference(rememberMe, trimmedEmail);
      } catch {
        credentialStorageFailed = true;
      }

      const destination = await resolvePostAuthDestination(
        data.access_token,
        data.user?.email || trimmedEmail,
      );
      if (credentialStorageFailed) {
        Alert.alert(
          isEn ? 'Unable to update saved credentials' : 'Không thể cập nhật thông tin đã lưu',
          isEn
            ? 'Signed in successfully, but Remember Me details could not be saved.'
            : 'Bạn đã đăng nhập thành công, nhưng thông tin ghi nhớ chưa được cập nhật.',
          [
            {
              text: isEn ? 'Continue' : 'Tiếp tục',
              onPress: () => navigation.replace(destination),
            },
          ],
          { cancelable: false },
        );
        return;
      }

      navigation.replace(destination);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (isEn ? 'Unable to connect to server. Please try again.' : 'Không thể kết nối máy chủ. Vui lòng thử lại.');

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Sign in' : 'Đăng nhập'}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <LinearGradient
        colors={[theme.gradientTop, theme.gradientBottom]}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={[styles.logo, { borderColor: theme.border }]}>
              <Ionicons
                name="heart"
                size={36}
                color={colors.white}
              />
            </View>

            <Text style={[styles.appName, fontStyle(25, { lineHeight: 30, min: 23, max: 29 }), { color: theme.tealText }]}>PreCare</Text>

            <Text style={[styles.tagline, fontStyle(12, { lineHeight: 17, min: 11, max: 14 }), { color: theme.muted }]}>
              {isEn ? 'TRACK YOUR PREGNANCY JOURNEY' : 'THEO DÕI THAI KỲ CỦA BẠN'}
            </Text>
          </View>

          <View style={[styles.photoShadow, { backgroundColor: theme.surface }]}>
            <Image
              source={require('../assets/image-login.png')}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>

          <Text style={[styles.label, fontStyle(14.5, { min: 13.5, max: 17 }), { color: theme.textSecondary }]}>
            {isEn ? 'Patient email' : 'Email của thai phụ'}
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
              placeholder={isEn ? 'Enter email' : 'Nhập email'}
              placeholderTextColor={theme.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!isBusy}
            />
          </View>

          <Text style={[styles.labelPassword, fontStyle(14.5, { min: 13.5, max: 17 }), { color: theme.textSecondary }]}>
            {isEn ? 'Password' : 'Mật khẩu'}
          </Text>

          <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.passwordInput, fontStyle(15.5, { min: 14.5, max: 18 }), { color: theme.text }]}
              placeholder={isEn ? 'Enter password' : 'Nhập mật khẩu'}
              placeholderTextColor={theme.muted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              value={password}
              onChangeText={setPassword}
              editable={!isBusy}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              disabled={isBusy}
            >
              <Ionicons
                name={showPassword ? 'eye' : 'eye-outline'}
                size={20}
                color={theme.muted}
              />
            </Pressable>
          </View>

          {error ? (
            <Text style={[styles.errorText, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.danger }]}>{error}</Text>
          ) : null}

          <View style={styles.optionsRow}>
            <Pressable
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isBusy}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxActive,
                ]}
              >
                {rememberMe && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={colors.white}
                  />
                )}
              </View>

              <Text style={[styles.rememberText, fontStyle(13.5, { min: 12.5, max: 16 }), { color: theme.muted }]}>
                {isEn ? 'Remember me' : 'Ghi nhớ tôi'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.linkTouch}
              disabled={isBusy}
            >
              <Text style={[styles.forgotPassword, fontStyle(13.5, { min: 12.5, max: 16 }), { color: theme.tealText }]}>
                {isEn ? 'Forgot password?' : 'Quên mật khẩu?'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.spacer} />

          <PrimaryButton
            title={
              autoAuthenticating
                ? (isEn ? 'Verifying session...' : 'Đang xác thực phiên...')
                : loading
                  ? (isEn ? 'Signing in...' : 'Đang đăng nhập...')
                  : (isEn ? 'Sign in' : 'Đăng nhập')
            }
            onPress={handleLogin}
            disabled={isBusy}
          />

          {isBusy && (
            <ActivityIndicator
              color={colors.primary}
              style={styles.loading}
            />
          )}

          <View style={styles.registerRow}>
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 19,
  },

  brand: {
    alignItems: 'center',
    marginBottom: 28,
  },

  logo: {
    width: 56,
    height: 56,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  appName: {
    marginTop: 12,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
  },

  tagline: {
    marginTop: 3,
    fontSize: 10.5,
    lineHeight: 15,
    letterSpacing: 0.5,
    color: colors.textLight,
    textAlign: 'center',
  },

  photoShadow: {
    width: '100%',
    aspectRatio: 2.05,
    borderRadius: 16,
    backgroundColor: colors.white,
    padding: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
    marginBottom: 22,
  },

  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
  },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 7,
  },

  labelPassword: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 18,
    marginBottom: 7,
  },

  inputContainer: {
    width: '100%',
    height: 41,
    borderRadius: 9,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D9E3EC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },

  input: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.navy,
  },

  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.navy,
  },

  eyeButton: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 8,
  },

  optionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },

  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  checkboxActive: {
    backgroundColor: colors.primary,
  },

  rememberText: {
    marginLeft: 7,
    fontSize: 11.5,
    color: '#64748B',
  },

  forgotPassword: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primaryDark,
  },

  spacer: {
    flex: 1,
  },

  loading: {
    marginTop: 8,
  },

  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  registerText: {
    fontSize: 11.5,
    color: '#64748B',
  },

  registerLink: {
    marginLeft: 4,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
});
