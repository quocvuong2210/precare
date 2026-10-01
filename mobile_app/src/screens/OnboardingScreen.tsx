import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  return (
    <LinearGradient
      colors={['#F2FCFC', '#E5F7FF']}
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
              source={require('../assets/pregnant.jpg')}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>


          {/* ================= TIÊU ĐỀ ================= */}
          <Text style={styles.title}>
            Theo dõi thai kỳ an toàn, hiểu rõ
            {'\n'}
            từng chỉ số
          </Text>


          {/* ================= MÔ TẢ ================= */}
          <Text style={styles.desc}>
            Số hóa kết quả xét nghiệm chỉ với 1 bức ảnh. Đồng bộ
            {'\n'}
            trực tiếp với bác sỹ sản khoa của bạn.
          </Text>


          {/* Đẩy button xuống dưới */}
          <View style={styles.spacer} />


          {/* ================= BUTTON ĐĂNG NHẬP ================= */}
          <PrimaryButton
            title="Đăng nhập"
            onPress={() => navigation.navigate('Login')}
          />

          <View style={styles.buttonGap} />


          {/* ================= BUTTON ĐĂNG KÝ ================= */}
          <PrimaryButton
            title="Đăng ký tài khoản"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />


          {/* ================= VERSION ================= */}
          <Text style={styles.version}>
            Phiên bản v2.4.0 • Chuẩn Bộ Y tế
          </Text>

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
    paddingHorizontal: 22,
    paddingTop: 68,
    paddingBottom: 10,
  },


  /* ================= BRAND ================= */

  brand: {
    alignItems: 'center',
    marginBottom: 29,
  },


  /* ================= LOGO ================= */

  logo: {
    width: 58,
    height: 58,
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

    letterSpacing: 0.7,

    color: colors.textLight,

    textAlign: 'center',
  },


  /* ================= KHUNG ẢNH ================= */

  photoShadow: {
    width: '100%',

    aspectRatio: 1.62,

    borderRadius: 18,

    backgroundColor: colors.white,

    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 12,

    shadowOffset: {
      width: 0,
      height: 7,
    },

    elevation: 6,

    overflow: 'hidden',
  },


  /* ================= ẢNH ================= */

  photo: {
    width: '100%',
    height: '100%',

    borderRadius: 18,
  },


  /* ================= TITLE ================= */

  title: {
    marginTop: 28,

    fontSize: 20,

    lineHeight: 25,

    fontWeight: '800',

    color: colors.navy,

    textAlign: 'center',

    paddingHorizontal: 4,
  },


  /* ================= DESCRIPTION ================= */

  desc: {
    marginTop: 12,

    fontSize: 12.5,

    lineHeight: 19,

    color: colors.textMuted,

    textAlign: 'center',

    paddingHorizontal: 2,
  },


  /* ================= SPACER ================= */

  spacer: {
    flex: 1,
  },


  /* ================= KHOẢNG CÁCH BUTTON ================= */

  buttonGap: {
    height: 10,
  },


  version: {
    marginTop: 11,

    fontSize: 10.5,

    lineHeight: 16,

    color: colors.textLight,

    textAlign: 'center',
  },

});