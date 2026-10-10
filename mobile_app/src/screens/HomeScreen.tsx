import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import { colors } from '../theme/colors';
import type { MainTabParamList } from '../navigation/MainTabs';

import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

/* ================= DỮ LIỆU MẪU (sau này thay bằng API) ================= */
const user = { name: 'Nguyễn Thị Lan' };

const pregnancy = {
  weeks: 32,
  days: 4,
  dueDate: '15/12/2024',
  trimester: 3,
  totalWeeks: 40,
};

const appointment = {
  month: 'T06',
  day: '15',
  title: 'Khám định kỳ lúc 08:30 AM',
  doctor: 'BS. Lê Minh',
  place: 'Phòng khám 402 - BV Phụ sản TW',
};

type Shortcut = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  target?: keyof MainTabParamList | 'Appointments'; // tab sẽ chuyển tới khi bấm
};

const shortcuts: Shortcut[] = [
  { label: 'Tải phiếu khám',  icon: 'add-circle-outline', target: 'Upload' },
  { label: 'Lịch sử kết quả', icon: 'library-outline',    target: 'Records' },
  { label: 'Biểu đồ thai',    icon: 'pulse-outline',      target: 'Charts' },
  { label: 'Lịch hẹn khám',   icon: 'calendar-outline',   target: 'Appointments'},
];

export default function HomeScreen({ navigation }: Props) {
  // Tiến độ thai kỳ: (32 tuần + 4/7 ngày) / 40 tuần
  const progress = (pregnancy.weeks + pregnancy.days / 7) / pregnancy.totalWeeks;

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* Muốn dùng ảnh thật: thay View này bằng <Image source={...} style={styles.avatar} /> */}
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>

            <View style={styles.greetingBox}>
              <Text style={styles.greeting}>Xin chào,</Text>
              <Text style={styles.userName}>{user.name}</Text>
            </View>
          </View>

          <View style={styles.weekBadge}>
            <Text style={styles.weekBadgeText}>Tuần thứ {pregnancy.weeks}</Text>
          </View>
        </View>

        {/* ================= THẺ TUỔI THAI ================= */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroLeft}>
            <Text style={styles.heroLabel}>TUỔI THAI HIỆN TẠI</Text>

            <Text style={styles.heroTitle}>
              {pregnancy.weeks} tuần {pregnancy.days} ngày
            </Text>

            <Text style={styles.heroSub}>
              Dự sinh: {pregnancy.dueDate} • Tam cá nguyệt {pregnancy.trimester}
            </Text>

            {/* Thanh tiến độ */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>

            <Text style={styles.progressText}>
              Tuần {pregnancy.weeks} trên hành trình {pregnancy.totalWeeks} tuần
            </Text>
          </View>

          <View style={styles.heroImageBox}>
            {/* Thay bằng ảnh minh hoạ của bạn nếu có */}
            <Image
              source={require('../assets/pregnant.jpg')}
              style={styles.heroImage}
              resizeMode="cover"
            />
          </View>
        </LinearGradient>

        {/* ================= LỐI TẮT NHANH ================= */}
        <Text style={styles.sectionTitle}>Lối tắt nhanh</Text>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => item.target && navigation.navigate(item.target)}
              style={({ pressed }) => [styles.shortcutCard, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.shortcutIcon}>
                <Ionicons name={item.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ================= LỊCH KHÁM SẮP TỚI ================= */}
        <Text style={styles.sectionTitle}>Lịch khám sắp tới</Text>

        <View style={styles.appointmentCard}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>{appointment.month}</Text>
            <Text style={styles.dateDay}>{appointment.day}</Text>
          </View>

          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentTitle}>{appointment.title}</Text>
            <Text style={styles.appointmentDoctor}>{appointment.doctor}</Text>
            <Text style={styles.appointmentPlace}>{appointment.place}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F8FA' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },

  /* ================= HEADER ================= */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greetingBox: { marginLeft: 12 },
  greeting: { fontSize: 12, color: colors.textMuted },
  userName: { fontSize: 15, fontWeight: '800', color: colors.navy, marginTop: 1 },

  weekBadge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  weekBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },

  /* ================= THẺ TUỔI THAI ================= */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 18,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  heroLeft: { flex: 1, paddingRight: 12 },
  heroLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.white, marginTop: 6 },
  heroSub: { fontSize: 11.5, color: 'rgba(255,255,255,0.9)', marginTop: 6 },

  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.white },
  progressText: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginTop: 6 },

  heroImageBox: {
    width: 84,
    height: 104,
    borderRadius: 14,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%' },

  /* ================= TIÊU ĐỀ MỤC ================= */
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 26,
    marginBottom: 12,
  },

  /* ================= LỐI TẮT NHANH ================= */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  shortcutCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    paddingBottom: 16,
  },
  shortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  shortcutLabel: { fontSize: 13, fontWeight: '700', color: colors.navy },

  /* ================= LỊCH KHÁM ================= */
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
  },
  dateBox: {
    width: 54,
    height: 58,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  dateDay: { fontSize: 22, fontWeight: '800', color: colors.white, lineHeight: 26 },

  appointmentInfo: { flex: 1, marginLeft: 14 },
  appointmentTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  appointmentDoctor: { fontSize: 14, fontWeight: '800', color: colors.navy, marginTop: 3 },
  appointmentPlace: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },
});