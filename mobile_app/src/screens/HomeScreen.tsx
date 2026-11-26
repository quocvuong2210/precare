import React, { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';
import {
  calculatePregnancyProfile,
  currentAccessToken,
  currentUserProfile,
  fetchCurrentUserFromDB,
  fetchPregnancyProfileFromDB,
  restoreSession,
} from '../services/api';
import { formatIsoToDmy, getTodayISO } from '../utils/date';

type PregnancySummary = {
  weeks: number | null;
  days: number;
  trimesterNumber: number | null;
  trimesterVi: string;
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

function parseSavedWeeks(value?: string): { weeks: number | null; days: number } {
  const match = value?.match(/(\d+)\s*tuần(?:\s*(\d+)\s*ngày)?/i);
  return match
    ? { weeks: Number(match[1]), days: Number(match[2] || 0) }
    : { weeks: null, days: 0 };
}

function inferTrimesterNumber(weeks: number | null, rawName?: string): number | null {
  if (rawName) {
    if (rawName.includes('1') || rawName.toLowerCase().includes('đầu')) return 1;
    if (rawName.includes('2') || rawName.toLowerCase().includes('giữa')) return 2;
    if (rawName.includes('3') || rawName.toLowerCase().includes('cuối')) return 3;
  }
  if (weeks === null || !Number.isFinite(weeks)) return null;
  if (weeks < 14) return 1;
  if (weeks < 28) return 2;
  return 3;
}

function formatTrimesterLabel(
  trimesterNumber: number | null,
  trimesterVi: string,
  lang: 'vi' | 'en',
): string {
  if (!trimesterNumber && !trimesterVi) return '';
  if (lang === 'en') {
    if (trimesterNumber === 1) return '1st Trimester (First 3 months)';
    if (trimesterNumber === 2) return '2nd Trimester (Second 3 months)';
    if (trimesterNumber === 3) return '3rd Trimester (Last 3 months)';
    return '';
  }
  if (trimesterVi) return trimesterVi;
  if (trimesterNumber === 1) return 'Tam cá nguyệt 1';
  if (trimesterNumber === 2) return 'Tam cá nguyệt 2';
  if (trimesterNumber === 3) return 'Tam cá nguyệt 3';
  return '';
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [displayName, setDisplayName] = useState(
    () => currentUserProfile?.full_name || 'Mẹ bầu PreCare',
  );
  const [pregnancy, setPregnancy] = useState<PregnancySummary>({
    weeks: null,
    days: 0,
    trimesterNumber: null,
    trimesterVi: '',
    dueDate: '',
  });
  const [assignedDoctorName, setAssignedDoctorName] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadPregnancySummary() {
        try {
          const restored = currentUserProfile || (await restoreSession());
          const account = (await fetchCurrentUserFromDB(currentAccessToken)) || restored;
          if (isActive && account?.full_name) {
            setDisplayName(account.full_name);
          }
          let dbProfile: any = null;
          try {
            dbProfile = await fetchPregnancyProfileFromDB(currentAccessToken);
            const doctor = dbProfile?.primary_doctor || dbProfile?.doctor || null;
            const doctorName =
              doctor?.full_name ||
              doctor?.fullName ||
              dbProfile?.primary_doctor_name ||
              dbProfile?.doctor_name ||
              '';
            if (isActive) setAssignedDoctorName(String(doctorName || '').trim());
          } catch (doctorError) {
            console.log('Không tải được bác sĩ phụ trách:', doctorError);
            if (isActive) setAssignedDoctorName('');
          }

          if (dbProfile && typeof dbProfile === 'object') {
            const ga = dbProfile.current_gestational_age;
            const dbWeeks = ga?.weeks;
            const dbDays = ga?.remaining_days ?? 0;
            const tNum = ga?.trimester ?? inferTrimesterNumber(dbWeeks, ga?.trimester_name);
            const dbTrimesterVi =
              ga?.trimester_name ||
              (tNum ? `Tam cá nguyệt ${tNum}` : '');
            const dbDueDate = formatIsoToDmy(dbProfile.edd);

            if (Number.isFinite(dbWeeks)) {
              if (isActive) {
                setPregnancy({
                  weeks: dbWeeks,
                  days: dbDays,
                  trimesterNumber: tNum,
                  trimesterVi: dbTrimesterVi,
                  dueDate: dbDueDate,
                });
              }
              return;
            }
          }

          const identifier = (account?.email || account?.id || 'guest').trim().toLowerCase();
          const raw = await AsyncStorage.getItem(`precare_account_record_${identifier}`);
          if (!raw) {
            if (isActive) {
              setPregnancy({ weeks: null, days: 0, trimesterNumber: null, trimesterVi: '', dueDate: '' });
            }
            return;
          }

          const saved: SavedAccountRecord = JSON.parse(raw);
          const profile = saved.profile || {};
          const parsedSaved = parseSavedWeeks(saved.gestationalAge);
          let next: PregnancySummary = {
            ...parsedSaved,
            trimesterNumber: inferTrimesterNumber(parsedSaved.weeks, saved.trimester),
            trimesterVi: saved.trimester || '',
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
              const tNum = data?.gestational_age?.trimester ?? inferTrimesterNumber(weeks, data?.gestational_age?.trimester_name);
              const trimesterVi = data?.gestational_age?.trimester_name ||
                (tNum ? `Tam cá nguyệt ${tNum}` : '');
              const dueDate = formatIsoToDmy(data?.calculated_edd || data?.override_edd);

              if (Number.isFinite(weeks)) {
                next = {
                  weeks,
                  days,
                  trimesterNumber: tNum,
                  trimesterVi,
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
    ? (isEn ? 'Gestational age not set' : 'Chưa cập nhật tuổi thai')
    : isEn
      ? `${pregnancy.weeks} weeks ${pregnancy.days} days`
      : `${pregnancy.weeks} tuần ${pregnancy.days} ngày`;
  const trimesterLabel = formatTrimesterLabel(
    pregnancy.trimesterNumber,
    pregnancy.trimesterVi,
    preferences.language,
  );
  const weekProgress = pregnancy.weeks === null
    ? 0
    : Math.min(100, Math.max(0, (pregnancy.weeks / 40) * 100));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.tealSoft }]}>
            <Ionicons name="person" size={25} color={theme.tealText} />
          </View>

          <View style={styles.userTextCol}>
            <Text style={[styles.hello, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
              {isEn ? 'Hello,' : 'Xin chào,'}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.userName, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}
            >
              {displayName}
            </Text>
          </View>
        </View>

        <View style={[styles.weekBadge, { backgroundColor: theme.tealSoft }]}>
          <Text style={[styles.weekText, fontStyle(12.5, { min: 11.5, max: 15 }), { color: theme.tealText }]}>
            {pregnancy.weeks === null
              ? (isEn ? 'Not set' : 'Chưa cập nhật')
              : (isEn ? `Week ${pregnancy.weeks}` : `Tuần thứ ${pregnancy.weeks}`)}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pregnancyCard}>
          <View style={styles.pregnancyInfo}>
            <Text style={[styles.smallWhite, fontStyle(11.5, { min: 11, max: 13.5 })]}>
              {isEn ? 'CURRENT GESTATIONAL AGE' : 'TUỔI THAI HIỆN TẠI'}
            </Text>
            <Text style={[styles.weekNumber, fontStyle(24, { min: 22, max: 28 })]}>{ageText}</Text>
            <Text style={[styles.dueDate, fontStyle(12.5, { lineHeight: 18, min: 11.5 })]}>
              {pregnancy.dueDate
                ? `${isEn ? 'Due date' : 'Dự sinh'}: ${pregnancy.dueDate}`
                : isEn ? 'Due date: Not set' : 'Ngày dự sinh: Chưa cập nhật'}
              {trimesterLabel ? ` • ${trimesterLabel}` : ''}
            </Text>

            <View style={styles.progressBackground}>
              <View style={[styles.progress, { width: `${weekProgress}%` as `${number}%` }]} />
            </View>

            <Text style={[styles.progressText, fontStyle(12, { lineHeight: 17, min: 11 })]}>
              {pregnancy.weeks === null
                ? (isEn ? 'Complete your pregnancy setup to track progress' : 'Cập nhật thông tin trong Hồ sơ để theo dõi thai kỳ')
                : (isEn ? `Week ${pregnancy.weeks} of 40-week journey` : `Tuần ${pregnancy.weeks} trên hành trình 40 tuần`)}
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

        <View
          style={[
            styles.doctorCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            !assignedDoctorName && { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.doctorIcon,
              !assignedDoctorName && { backgroundColor: theme.iconBackground, shadowOpacity: 0, elevation: 0 },
            ]}
          >
            <Ionicons
              name={assignedDoctorName ? 'medical' : 'person-add-outline'}
              size={21}
              color={assignedDoctorName ? '#FFFFFF' : theme.muted}
            />
          </View>
          <View style={styles.doctorInfo}>
            <Text style={[styles.doctorLabel, fontStyle(11, { lineHeight: 15, min: 10.5, max: 13 }), { color: theme.muted }]}>
              {isEn ? 'PRIMARY DOCTOR' : 'BÁC SĨ PHỤ TRÁCH'}
            </Text>
            <View style={styles.doctorNameRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.assignedDoctorName,
                  fontStyle(15.5, { lineHeight: 22, min: 14 }),
                  { color: assignedDoctorName ? theme.text : theme.muted },
                ]}
              >
                {assignedDoctorName || (isEn ? 'Unassigned' : 'Chưa phân công')}
              </Text>
              {assignedDoctorName ? (
                <View style={[styles.assignedBadge, { backgroundColor: theme.tealSoft }]}>
                  <View style={styles.assignedDot} />
                  <Text style={[styles.assignedBadgeText, fontStyle(11.5, { min: 10.5, max: 13.5 }), { color: theme.tealText }]}>
                    {isEn ? 'Assigned' : 'Đang phụ trách'}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
          {isEn ? 'Quick Actions' : 'Lối tắt nhanh'}
        </Text>

        <View style={styles.quickGrid}>
          <QuickButton
            icon="add-circle-outline"
            title={isEn ? 'Upload scan' : 'Tải phiếu khám'}
            onPress={() => navigation.navigate('Upload')}
          />

          <QuickButton
            icon="analytics-outline"
            title={isEn ? 'Result history' : 'Lịch sử kết quả'}
            onPress={() => navigation.navigate('HistoryResults')}
          />

          <QuickButton
            icon="pulse-outline"
            title={isEn ? 'Growth charts' : 'Biểu đồ thai'}
            onPress={() => navigation.navigate('Charts')}
          />

          <QuickButton
            icon="calendar-outline"
            title={isEn ? 'Appointments' : 'Lịch hẹn khám'}
            onPress={() => navigation.navigate('Appointments')}
          />
        </View>

        <Text style={[styles.sectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
          {isEn ? 'Upcoming Appointments' : 'Lịch khám sắp tới'}
        </Text>

        <TouchableOpacity
          style={[
            styles.appointmentCard,
            { backgroundColor: theme.tealSoft, borderColor: theme.tealBorder },
          ]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Appointments')}
        >
          <View style={styles.appointmentInfo}>
            <Text style={[styles.appointmentTitle, fontStyle(15, { min: 14 }), { color: theme.tealText }]}>
              {isEn ? 'No upcoming appointments' : 'Chưa có lịch khám nào'}
            </Text>
            <Text style={[styles.appointmentNote, fontStyle(13, { lineHeight: 19, min: 12 }), { color: theme.muted }]}>
              {isEn
                ? 'Appointments will appear here once scheduled.'
                : 'Lịch hẹn sẽ hiển thị tại đây sau khi được tạo.'}
            </Text>
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
  const { theme, fontStyle } = useAppSettings();
  return (
    <TouchableOpacity
      style={[styles.quickButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, { backgroundColor: theme.tealSoft }]}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={[styles.quickTitle, fontStyle(14, { lineHeight: 19, min: 13, max: 16.5 }), { color: theme.text }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 75,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  userTextCol: { flex: 1 },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hello: { fontSize: 13 },
  userName: { marginTop: 2, fontSize: 16, fontWeight: '800' },
  weekBadge: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },
  weekText: { fontSize: 12.5, fontWeight: '700' },
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
  smallWhite: { fontSize: 11.5, color: '#D8F7F2', letterSpacing: 0.5 },
  weekNumber: { marginTop: 3, fontSize: 24, fontWeight: '800', color: colors.white },
  dueDate: { marginTop: 3, fontSize: 12.5, color: '#D8F7F2' },
  progressBackground: {
    marginTop: 10,
    width: '100%',
    height: 4,
    borderRadius: 5,
    backgroundColor: '#2B918A',
    overflow: 'hidden',
  },
  progress: { width: '60%', height: '100%', backgroundColor: colors.white },
  progressText: { marginTop: 5, fontSize: 12, color: '#D8F7F2' },
  pregnancyImageContainer: {
    width: 54,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pregnancyImage: { width: '100%', height: '100%' },
  doctorCard: {
    marginTop: 12,
    minHeight: 72,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.055,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  doctorIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  doctorInfo: { flex: 1, marginLeft: 12 },
  doctorLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.7 },
  doctorNameRow: { marginTop: 3, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  assignedDoctorName: { flexShrink: 1, fontSize: 15.5, lineHeight: 22, fontWeight: '800' },
  assignedBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  assignedDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5, backgroundColor: '#18A878' },
  assignedBadgeText: { fontSize: 11.5, fontWeight: '700' },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickButton: {
    width: '48%',
    minHeight: 65,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  quickTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  appointmentCard: {
    minHeight: 66,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentInfo: { flex: 1 },
  appointmentTitle: { fontSize: 15, fontWeight: '700' },
  appointmentNote: { marginTop: 3, fontSize: 13 },
});
