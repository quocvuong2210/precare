import React, { useState } from 'react';
import {
  Image,
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
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <LinearGradient
      colors={['#F4F9FC', '#EAF8FA']}
      style={styles.flex}
    >

      <StatusBar style="dark" />

      <SafeAreaView style={styles.flex}>

        <View style={styles.content}>

          {/* ================= LOGO ================= */}

          <View style={styles.brand}>

            <View style={styles.logo}>
              <Ionicons
                name="heart"
                size={36}
                color={colors.white}
              />
            </View>

            <Text style={styles.appName}>
              PreCare
            </Text>

            <Text style={styles.tagline}>
              THEO DÕI THAI KỲ CỦA BẠN
            </Text>

          </View>


          {/* ================= ẢNH ================= */}

          <View style={styles.photoShadow}>

            <Image
              source={require('../assets/image-login.png')}
              style={styles.photo}
              resizeMode="cover"
            />

          </View>


          {/* ================= EMAIL ================= */}

          <Text style={styles.label}>
            Email của thai phụ
          </Text>

          <View style={styles.inputContainer}>

            <TextInput
              style={styles.input}
              placeholder="Nhập email"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />

          </View>


          {/* ================= MẬT KHẨU ================= */}

          <Text style={styles.labelPassword}>
            Mật khẩu
          </Text>

          <View style={styles.inputContainer}>

            <TextInput
              style={styles.passwordInput}
              placeholder="Nhập mật khẩu"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >

              <Ionicons
                name={showPassword ? 'eye' : 'eye-outline'}
                size={20}
                color="#8FA3BA"
              />

            </Pressable>

          </View>


          {/* ================= GHI NHỚ + QUÊN MẬT KHẨU ================= */}

          <View style={styles.optionsRow}>

            {/* Ghi nhớ */}

            <Pressable
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
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

              <Text style={styles.rememberText}>
                Ghi nhớ tôi
              </Text>

            </Pressable>


            {/* Quên mật khẩu */}

            <Pressable
              onPress={() => {}}
            >

              <Text style={styles.forgotPassword}>
                Quên mật khẩu?
              </Text>

            </Pressable>

          </View>


          {/* ================= KHOẢNG TRỐNG ================= */}

          <View style={styles.spacer} />


          {/* ================= ĐĂNG NHẬP ================= */}

          <PrimaryButton
            title="Đăng nhập"
            onPress={() => navigation.navigate('Login')}
          />


          {/* ================= ĐĂNG KÝ ================= */}

          <View style={styles.registerRow}>

            <Text style={styles.registerText}>
              Chưa có tài khoản?
            </Text>

            <Pressable
              onPress={() => navigation.navigate('Register')}
            >

              <Text style={styles.registerLink}>
                Đăng ký ngay
              </Text>

            </Pressable>

          </View>

        </View>

      </SafeAreaView>

    </LinearGradient>
  );
}


const styles = StyleSheet.create({

  /* ================= MÀN HÌNH ================= */

  flex: {
    flex: 1,
  },


  /* ================= CONTENT ================= */

  content: {
    flex: 1,

    paddingHorizontal: 28,

    paddingTop: 10,

    paddingBottom: 19,
  },


  /* ================= BRAND ================= */

  brand: {
    alignItems: 'center',

    marginBottom: 28,
  },


  /* ================= LOGO ================= */

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
    shadowOpacity: 0.10,
    shadowRadius: 7,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },


  /* ================= TÊN APP ================= */

  appName: {
    marginTop: 12,

    fontSize: 25,
    lineHeight: 30,

    fontWeight: '800',

    color: colors.primaryDark,

    textAlign: 'center',
  },


  /* ================= TAGLINE ================= */

  tagline: {
    marginTop: 3,

    fontSize: 10.5,
    lineHeight: 15,

    letterSpacing: 0.5,

    color: colors.textLight,

    textAlign: 'center',
  },


  /* ================= ẢNH ================= */

  photoShadow: {
    width: '100%',

    aspectRatio: 2.05,

    borderRadius: 16,

    backgroundColor: colors.white,

    padding: 8,

    shadowColor: '#0F172A',

    shadowOpacity: 0.10,

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


  /* ================= LABEL ================= */

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


  /* ================= INPUT ================= */

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


  /* ================= PASSWORD ================= */

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


  /* ================= OPTIONS ================= */

  optionsRow: {
    width: '100%',

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: 15,
  },


  /* ================= REMEMBER ================= */

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


  /* ================= QUÊN MẬT KHẨU ================= */

  forgotPassword: {
    fontSize: 11.5,

    fontWeight: '600',

    color: colors.primaryDark,
  },


  /* ================= SPACER ================= */

  spacer: {
    flex: 1,
  },


  /* ================= REGISTER ================= */

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