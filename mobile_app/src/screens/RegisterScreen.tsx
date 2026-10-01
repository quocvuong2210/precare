import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {

  // =========================
  // STATE
  // =========================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [agree, setAgree] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');


  return (
    <LinearGradient
      colors={['#F2FCFC', '#E5F7FF']}
      style={styles.flex}
    >

      <StatusBar style="dark" />

      <SafeAreaView style={styles.flex}>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <View style={styles.content}>

            {/* ================================================= */}
            {/* LOGO */}
            {/* ================================================= */}

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


            {/* ================================================= */}
            {/* ẢNH MẸ BẦU */}
            {/* ================================================= */}

            <View style={styles.photoContainer}>

              <Image
                source={require('../assets/image-login.png')}
                style={styles.photo}
                resizeMode="cover"
              />

            </View>


            {/* ================================================= */}
            {/* HỌ VÀ TÊN */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Họ và tên
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="person-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#9AAEC4"
                autoCapitalize="words"
              />

            </View>


            {/* ================================================= */}
            {/* EMAIL */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Email
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="mail-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Nhập email"
                placeholderTextColor="#9AAEC4"
                keyboardType="email-address"
                autoCapitalize="none"
              />

            </View>


            {/* ================================================= */}
            {/* MẬT KHẨU */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Mật khẩu
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#9AAEC4"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >

                <Ionicons
                  name={showPassword ? 'eye' : 'eye-outline'}
                  size={21}
                  color="#7891B0"
                />

              </Pressable>

            </View>


            {/* ================================================= */}
            {/* XÁC NHẬN MẬT KHẨU */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Xác nhận mật khẩu
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#9AAEC4"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
              >

                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye'
                      : 'eye-outline'
                  }
                  size={21}
                  color="#7891B0"
                />

              </Pressable>

            </View>


            {/* ================================================= */}
            {/* NGÀY SINH */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Ngày sinh
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="calendar-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#9AAEC4"
                keyboardType="numeric"
                maxLength={10}
              />

              <Ionicons
                name="calendar-outline"
                size={20}
                color="#7891B0"
              />

            </View>


            {/* ================================================= */}
            {/* SỐ ĐIỆN THOẠI */}
            {/* ================================================= */}

            <Text style={styles.label}>
              Số điện thoại
            </Text>

            <View style={styles.inputContainer}>

              <Ionicons
                name="call-outline"
                size={20}
                color="#7891B0"
                style={styles.inputIcon}
              />

              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Nhập số điện thoại"
                placeholderTextColor="#9AAEC4"
                keyboardType="phone-pad"
              />

            </View>


            {/* ================================================= */}
            {/* ĐIỀU KHOẢN */}
            {/* ================================================= */}

            <Pressable
              style={styles.agreeContainer}
              onPress={() => setAgree(!agree)}
            >

              <View
                style={[
                  styles.checkbox,
                  agree && styles.checkboxActive,
                ]}
              >

                {agree && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={colors.white}
                  />
                )}

              </View>

              <Text style={styles.agreeText}>
                Tôi đồng ý với{' '}

                <Text style={styles.agreeLink}>
                  Điều khoản sử dụng
                </Text>

                {' '}và{' '}

                <Text style={styles.agreeLink}>
                  Chính sách bảo mật
                </Text>

              </Text>

            </Pressable>


            {/* ================================================= */}
            {/* NÚT ĐĂNG KÝ */}
            {/* ================================================= */}

            <View style={styles.registerButton}>

              <PrimaryButton
                title="Đăng ký"
                onPress={() => {
                  // Xử lý đăng ký sau
                }}
              />

            </View>


            {/* ================================================= */}
            {/* ĐĂNG NHẬP */}
            {/* ================================================= */}

            <View style={styles.loginRow}>

              <Text style={styles.loginText}>
                Đã có tài khoản?
              </Text>

              <Pressable
                onPress={() => navigation.navigate('Login')}
              >

                <Text style={styles.loginLink}>
                  Đăng nhập ngay
                </Text>

              </Pressable>

            </View>

          </View>

        </ScrollView>

      </SafeAreaView>

    </LinearGradient>
  );
}


const styles = StyleSheet.create({

  /* ================================================= */
  /* MÀN HÌNH */
  /* ================================================= */

  flex: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 35,
    paddingBottom: 25,
  },


  /* ================================================= */
  /* LOGO */
  /* ================================================= */

  brand: {
    alignItems: 'center',
    marginBottom: 24,
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
    shadowOpacity: 0.10,
    shadowRadius: 7,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  appName: {
    marginTop: 11,

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

    letterSpacing: 0.6,

    color: colors.textLight,

    textAlign: 'center',
  },


  /* ================================================= */
  /* ẢNH */
  /* ================================================= */

  photoContainer: {
    width: '100%',
    height: 115,

    borderRadius: 17,

    backgroundColor: colors.white,

    padding: 7,

    marginBottom: 23,

    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  photo: {
    width: '100%',
    height: '100%',

    borderRadius: 11,
  },


  /* ================================================= */
  /* LABEL */
  /* ================================================= */

  label: {
    marginTop: 14,
    marginBottom: 7,

    fontSize: 13,

    fontWeight: '600',

    color: '#475569',
  },


  /* ================================================= */
  /* INPUT */
  /* ================================================= */

  inputContainer: {
    width: '100%',
    height: 45,

    borderRadius: 10,

    backgroundColor: colors.white,

    borderWidth: 1,

    borderColor: '#D5E1EC',

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,

    height: '100%',

    fontSize: 13,

    color: colors.navy,
  },

  eyeButton: {
    width: 30,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ================================================= */
  /* CHECKBOX */
  /* ================================================= */

  agreeContainer: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    marginTop: 17,

    paddingRight: 4,
  },

  checkbox: {
    width: 18,
    height: 18,

    borderRadius: 4,

    borderWidth: 1.5,

    borderColor: colors.primary,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 1,

    flexShrink: 0,
  },

  checkboxActive: {
    backgroundColor: colors.primary,
  },

  agreeText: {
    flex: 1,

    marginLeft: 9,

    fontSize: 11.5,

    lineHeight: 18,

    color: '#64748B',
  },

  agreeLink: {
    color: colors.primaryDark,

    fontWeight: '600',
  },


  /* ================================================= */
  /* BUTTON */
  /* ================================================= */

  registerButton: {
    marginTop: 20,
  },


  /* ================================================= */
  /* ĐĂNG NHẬP */
  /* ================================================= */

  loginRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    marginTop: 15,
  },

  loginText: {
    fontSize: 11.5,

    color: '#64748B',
  },

  loginLink: {
    marginLeft: 5,

    fontSize: 11.5,

    fontWeight: '700',

    color: colors.primaryDark,
  },

});