import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../theme/colors';
import {
  calculatePregnancyProfile,
  currentAccessToken,
  currentUserProfile,
  restoreSession,
} from '../services/api';

type PregnancySummary = {
  weeks: number | null;
  days: number;
  trimester: string;
  dueDate: string;
};

type SavedAccountRecord = {
  profile?: {
    lmp?: string;
    q1_ultrasound_date?: string;
    q1_gestational_weeks?: string;
    q1_gestational_days?: string;
    crl_mm?: string;
    override_edd?: string;
  };
  gestationalAge?: string;
  trimester?: string;
  dueDate?: string;
};

function getTodayISO(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatDueDate(value?: string): string {
  if (!value) return '';
  const normalized = value.slice(0, 10);
  const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : normalized;
}

function parseSavedWeeks(value?: string): { weeks: number | null; days: number } {
  const match = value?.match(/(\d+)\s*tuần(?:\s*(\d+)\s*ngày)?/i);
  return match
    ? { weeks: Number(match[1]), days: Number(match[2] || 0) }
    : { weeks: null, days: 0 };
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const displayName = currentUserProfile?.full_name || 'Nguyễn Thị Lan';
  const [pregnancy, setPregnancy] = useState<PregnancySummary>({
    weeks: null,
    days: 0,
    trimester: '',
    dueDate: '',
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPregnancySummary() {
        try {
          const account = currentUserProfile || (await restoreSession());
          const identifier = (account?.email || account?.id || 'guest').trim().toLowerCase();
          const raw = await AsyncStorage.getItem(`precare_account_record_${identifier}`);
          if (!raw) {
            if (isActive) {
              setPregnancy({ weeks: null, days: 0, trimester: '', dueDate: '' });
            }
            return;
          }

          const saved: SavedAccountRecord = JSON.parse(raw);
          const profile = saved.profile || {};
          let next: PregnancySummary = {
            ...parseSavedWeeks(saved.gestationalAge),
            trimester: saved.trimester || '',
            dueDate: saved.dueDate || '',
          };

          const hasPregnancyInput =
            profile.lmp ||
            profile.q1_ultrasound_date ||
            profile.crl_mm ||
            profile.override_edd;

          if (hasPregnancyInput) {
            const payload: {
              target_date: string;
              lmp?: string;
              q1_ultrasound_date?: string;
              q1_gestational_weeks?: number;
              q1_gestational_days?: number;
              crl_mm?: number;
              override_edd?: string;
            } = { target_date: getTodayISO() };

            if (profile.lmp) payload.lmp = profile.lmp;
            if (profile.q1_ultrasound_date) payload.q1_ultrasound_date = profile.q1_ultrasound_date;
            if (profile.q1_gestational_weeks !== undefined && profile.q1_gestational_weeks !== '') {
              payload.q1_gestational_weeks = Number(profile.q1_gestational_weeks);
            }
            if (profile.q1_gestational_days !== undefined && profile.q1_gestational_days !== '') {
              payload.q1_gestational_days = Number(profile.q1_gestational_days);
            }
            if (profile.crl_mm) payload.crl_mm = Number(profile.crl_mm);
            if (profile.override_edd) payload.override_edd = profile.override_edd;

            try {
              const response = await calculatePregnancyProfile(payload, currentAccessToken);
              const data = response?.data || response;
              const weeks = data?.gestational_age?.weeks;
              const days = data?.gestational_age?.remaining_days ?? 0;
              const trimester = data?.gestational_age?.trimester_name ||
                (weeks < 14 ? 'Tam cá nguyệt 1' : weeks < 28 ? 'Tam cá nguyệt 2' : 'Tam cá nguyệt 3');
              const dueDate = formatDueDate(data?.calculated_edd || data?.override_edd);

              if (Number.isFinite(weeks)) {
                next = {
                  weeks,
                  days,
                  trimester,
                  dueDate: dueDate || next.dueDate,
                };
              }
            } catch {
              // Keep the last summary saved by the Profile screen when offline.
            }
          }

          if (isActive) setPregnancy(next);
        } catch (error) {
          console.log('Không tải được tuổi thai trên trang chủ:', error);
        }
      }

      void loadPregnancySummary();
      return () => {
        isActive = false;
      };
    }, []),
  );

  const ageText = pregnancy.weeks === null
    ? 'Chưa cập nhật tuổi thai'
    : `${pregnancy.weeks} tuần ${pregnancy.days} ngày`;
  const weekProgress = pregnancy.weeks === null
    ? 0
    : Math.min(100, Math.max(0, (pregnancy.weeks / 40) * 100));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={25} color={colors.primaryDark} />
          </View>

          <View>
            <Text style={styles.hello}>Xin chào,</Text> 
            <Text style={styles.userName}>{displayName}</Text>
          </View>
        </View>

        <View style={styles.weekBadge}>
          <Text style={styles.weekText}>
            {pregnancy.weeks === null ? 'Chưa cập nhật' : `Tuần thứ ${pregnancy.weeks}`}
          </Text>
        </View>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================= PREGNANCY CARD ================= */}
        <View style={styles.pregnancyCard}>
          <View style={styles.pregnancyInfo}>
            <Text style={styles.smallWhite}>TUỔI THAI HIỆN TẠI</Text>
            <Text style={styles.weekNumber}>{ageText}</Text>
            <Text style={styles.dueDate}>
              {pregnancy.dueDate ? `Dự sinh: ${pregnancy.dueDate}` : 'Ngày dự sinh: Chưa cập nhật'}
              {pregnancy.trimester ? ` • ${pregnancy.trimester}` : ''}
            </Text>

            <View style={styles.progressBackground}>
              <View style={[styles.progress, { width: `${weekProgress}%` as `${number}%` }]} />
            </View>

            <Text style={styles.progressText}>
              {pregnancy.weeks === null
                ? 'Cập nhật thông tin trong Hồ sơ để theo dõi thai kỳ'
                : `Tuần ${pregnancy.weeks} trên hành trình 40 tuần`}
            </Text>
          </View>

          <View style={styles.pregnancyImageContainer}>
            <Image
              source={require('../assets/home.png')}
              style={styles.pregnancyImage}
              resizeMode="cover"
            />
          </View>
        </View>

        {/* ================= QUICK ACCESS ================= */}
        <Text style={styles.sectionTitle}>Lối tắt nhanh</Text>

        <View style={styles.quickGrid}>
          <QuickButton
            icon="add-circle-outline"
            title="Tải phiếu khám"
            onPress={() => navigation.navigate('Upload')}
          />

          <QuickButton
            icon="analytics-outline"
            title="Lịch sử kết quả"
            onPress={() => navigation.navigate('HistoryResults')}
          />

          <QuickButton
            icon="pulse-outline"
            title="Biểu đồ thai"
            onPress={() => navigation.navigate('Charts')}
          />

          <QuickButton
            icon="calendar-outline"
            title="Lịch hẹn khám"
            onPress={() => navigation.navigate('Appointments')}
          />
        </View>

        {/* ================= APPOINTMENT ================= */}
        <Text style={styles.sectionTitle}>Lịch khám sắp tới</Text>

        <TouchableOpacity
          style={styles.appointmentCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Appointments')}
        >
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>T06</Text>
            <Text style={styles.dateNumber}>15</Text>
          </View>

          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentTitle}>Khám định kỳ lúc 08:30 AM</Text>
            <Text style={styles.doctor}>BS. Lê Minh</Text>
            <Text style={styles.location}>Phòng khám 402 - BV Phụ sản TW</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickButton({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickButton} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FBFC' },
  header: {
    height: 75,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FBFC',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#DDEDEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hello: { fontSize: 11, color: '#7C8B98' },
  userName: { marginTop: 2, fontSize: 14, fontWeight: '800', color: colors.navy },
  weekBadge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#D9FAF4',
  },
  weekText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  pregnancyCard: {
    minHeight: 113,
    borderRadius: 16,
    backgroundColor: '#087F77',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#087F77',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  pregnancyInfo: { flex: 1, paddingRight: 10 },
  smallWhite: { fontSize: 9, color: '#D8F7F2', letterSpacing: 0.5 },
  weekNumber: { marginTop: 3, fontSize: 22, fontWeight: '800', color: colors.white },
  dueDate: { marginTop: 3, fontSize: 9, color: '#D8F7F2' },
  progressBackground: {
    marginTop: 10,
    width: '100%',
    height: 4,
    borderRadius: 5,
    backgroundColor: '#2B918A',
    overflow: 'hidden',
  },
  progress: { width: '60%', height: '100%', backgroundColor: colors.white },
  progressText: { marginTop: 5, fontSize: 8, color: '#D8F7F2' },
  pregnancyImageContainer: {
    width: 54,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pregnancyImage: { width: '100%', height: '100%' },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    height: 65,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1EAF0',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#E9FAF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  quickTitle: { flex: 1, fontSize: 10.5, fontWeight: '600', color: colors.navy },
  appointmentCard: {
    minHeight: 66,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A8EEDF',
    backgroundColor: '#F0FFFC',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBox: {
    width: 39,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: { fontSize: 8, color: colors.white, fontWeight: '600' },
  dateNumber: { marginTop: 1, fontSize: 18, color: colors.white, fontWeight: '800' },
  appointmentInfo: { flex: 1, marginLeft: 10 },
  appointmentTitle: { fontSize: 10.5, color: colors.primaryDark, fontWeight: '700' },
  doctor: { marginTop: 2, fontSize: 10.5, color: colors.navy, fontWeight: '600' },
  location: { marginTop: 2, fontSize: 8.5, color: '#7B8C99' },
});
