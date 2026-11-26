import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader title="PreCare" />

      <LinearGradient
        colors={[theme.gradientTop, theme.gradientBottom]}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={[styles.logo, { borderColor: theme.border }]}>
              <Ionicons name="heart" size={36} color={colors.white} />
            </View>

            <Text style={[styles.appName, fontStyle(25, { lineHeight: 31, min: 22, max: 29 }), { color: theme.tealText }]}>
              PreCare
            </Text>

            <Text style={[styles.tagline, fontStyle(12, { lineHeight: 17, min: 11, max: 14 }), { color: theme.muted }]}>
              {isEn ? 'TRACK YOUR PREGNANCY JOURNEY' : 'THEO DÕI THAI KỲ CỦA BẠN'}
            </Text>
          </View>

          <View style={[styles.photoShadow, { backgroundColor: theme.surface }]}>
            <Image
              source={require('../assets/pregnant.jpg')}
              style={styles.photo}
              resizeMode="cover"
            />
          </View>

          <Text style={[styles.title, fontStyle(21, { lineHeight: 28, min: 19, max: 25 }), { color: theme.text }]}>
            {isEn
              ? 'Monitor your pregnancy safely,\nunderstand every metric'
              : 'Theo dõi thai kỳ an toàn, hiểu rõ\ntừng chỉ số'}
          </Text>

          <Text style={[styles.desc, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
            {isEn
              ? 'Digitize lab and ultrasound results with a single photo. Sync directly with your obstetrician.'
              : 'Số hóa kết quả xét nghiệm chỉ với 1 bức ảnh. Đồng bộ trực tiếp với bác sỹ sản khoa của bạn.'}
          </Text>

          <View style={styles.spacer} />

          <PrimaryButton
            title={isEn ? 'Sign in' : 'Đăng nhập'}
            onPress={() => navigation.navigate('Login')}
          />

          <View style={styles.buttonGap} />

          <PrimaryButton
            title={isEn ? 'Create an account' : 'Đăng ký tài khoản'}
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />

          <Text style={[styles.version, fontStyle(12, { lineHeight: 18, min: 11 }), { color: theme.muted }]}>
            {isEn ? 'Version v2.4.0 • MoH Standards' : 'Phiên bản v2.4.0 • Chuẩn Bộ Y tế'}
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 44, paddingBottom: 14 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  appName: { marginTop: 12, fontSize: 25, lineHeight: 31, fontWeight: '800', textAlign: 'center' },
  tagline: { marginTop: 3, fontSize: 12, lineHeight: 17, letterSpacing: 0.7, textAlign: 'center' },
  photoShadow: {
    width: '100%',
    aspectRatio: 1.62,
    borderRadius: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
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