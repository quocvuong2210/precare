import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import {
  currentUserProfile,
  fetchCheckupHistoryFromDB,
  fetchCurrentUserFromDB,
  fetchPregnancyProfileFromDB,
  restoreSession,
  type CheckupRecordFromDB,
} from '../../services/api';
import { formatIsoToDmy } from '../../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryResults'>;

type FilterType = 'all' | 'verified' | 'pending';

const BP_STATUS_LABELS: Record<'vi' | 'en', Record<string, string>> = {
  vi: {
    normal: 'Bình thường',
    elevated: 'Huyết áp hơi cao',
    stage1_hypertension: 'Tăng huyết áp',
    crisis: 'Cảnh báo huyết áp cao',
  },
  en: {
    normal: 'Normal',
    elevated: 'Elevated BP',
    stage1_hypertension: 'Hypertension',
    crisis: 'Hypertensive crisis',
  },
};

export default function HistoryResultsScreen({ navigation }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [checkups, setCheckups] = useState<CheckupRecordFromDB[]>([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const formatDate = (raw?: string | null): string =>
    formatIsoToDmy(raw) || (isEn ? 'Unknown date' : 'Chưa rõ ngày');

  const loadDatabaseHistory = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setCheckups([]);
    try {
      const restored = currentUserProfile || (await restoreSession());
      const activeAccount = (await fetchCurrentUserFromDB()) || restored;
      const profile = await fetchPregnancyProfileFromDB(undefined, { throwOnError: true });

      const profilePatientId = profile?.patient?.id ? String(profile.patient.id).trim() : '';
      const accountId = activeAccount?.id ? String(activeAccount.id).trim() : '';
      if (!profile?.id || (profilePatientId && accountId && profilePatientId !== accountId)) {
        setHasProfile(false);
        setCheckups([]);
        return;
      }

      setHasProfile(true);
      const profileId = String(profile.id);
      const checkupRows = await fetchCheckupHistoryFromDB(profileId);
      const scopedRows = checkupRows.filter(
        (item) => String(item.pregnancy_profile_id) === profileId,
      );
      setCheckups([...scopedRows].reverse());
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : (isEn ? 'Unable to load checkup history from server.' : 'Không thể tải lịch sử khám từ cơ sở dữ liệu.'),
      );
      setCheckups([]);
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useFocusEffect(
    useCallback(() => {
      void loadDatabaseHistory();
    }, [loadDatabaseHistory]),
  );

  const normalizedQuery = keyword.trim().toLowerCase();

  const filteredCheckups = useMemo(() => {
    return checkups.filter((c) => {
      const bioStatus = c.biometric_data?.status;
      if (filter === 'verified' && bioStatus !== 'verified') return false;
      if (filter === 'pending' && bioStatus === 'verified') return false;
      if (!normalizedQuery) return true;
      const haystack = [
        formatIsoToDmy(c.checkup_date),
        c.gestational_age.formatted,
        `tuần ${c.gestational_age.weeks}`,
        `week ${c.gestational_age.weeks}`,
        c.doctor?.full_name || '',
        c.notes || '',
        c.biometric_data?.bpd ?? '',
        c.biometric_data?.hc ?? '',
        c.biometric_data?.ac ?? '',
        c.biometric_data?.fl ?? '',
        c.biometric_data?.efw ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [checkups, filter, normalizedQuery]);

  const totalCount = checkups.length;
  const visibleCount = filteredCheckups.length;

  const chooseFilter = () => {
    Alert.alert(
      isEn ? 'Filter checkups' : 'Lọc lần khám',
      isEn ? 'Select result status to display' : 'Chọn trạng thái kết quả muốn hiển thị',
      [
        { text: isEn ? 'All checkups' : 'Tất cả lần khám', onPress: () => setFilter('all') },
        { text: isEn ? 'Verified' : 'Đã xác thực', onPress: () => setFilter('verified') },
        { text: isEn ? 'Pending' : 'Chờ duyệt', onPress: () => setFilter('pending') },
        { text: isEn ? 'Cancel' : 'Hủy', style: 'cancel' },
      ],
    );
  };

  const filterLabel =
    filter === 'all'
      ? (isEn ? 'Filter: All' : 'Lọc: Tất cả')
      : filter === 'verified'
        ? (isEn ? 'Verified' : 'Đã xác thực')
        : (isEn ? 'Pending' : 'Chờ duyệt');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={['top']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title={isEn ? `Result History (${totalCount})` : `Lịch sử kết quả (${totalCount})`}
        onBack={() => navigation.goBack()}
      />

      <View style={[styles.flexOne, { backgroundColor: theme.background }]}>
      <View style={styles.toolbar}>
        <Pressable
          style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={chooseFilter}
        >
          <Ionicons name="filter-outline" size={16} color={theme.tealText} />
          <Text style={[styles.toolbarText, fontStyle(14, { min: 13, max: 16.5 }), { color: theme.text }]}>
            {filterLabel}
          </Text>
        </Pressable>

        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={17} color={theme.muted} />
          <TextInput
            style={[styles.searchInput, fontStyle(15, { min: 14 }), { color: theme.text }]}
            placeholder={isEn ? 'Search date, doctor, metrics...' : 'Tìm theo ngày, bác sĩ, chỉ số...'}
            placeholderTextColor={theme.muted}
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <Pressable onPress={() => setKeyword('')}>
              <Ionicons name="close-circle" size={17} color={theme.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color={theme.tealText} />
            <Text style={[styles.emptyDescription, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {isEn ? 'Loading checkup history...' : 'Đang tải lịch sử khám từ cơ sở dữ liệu...'}
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={44} color={theme.danger} />
            <Text style={[styles.emptyTitle, fontStyle(18, { min: 16.5, max: 21 }), { color: theme.text }]}>
              {isEn ? 'Unable to load history' : 'Không tải được lịch sử'}
            </Text>
            <Text style={[styles.emptyDescription, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {loadError}
            </Text>
            <Pressable style={styles.goUploadBtn} onPress={() => void loadDatabaseHistory()}>
              <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.goUploadBtnText, fontStyle(15, { min: 14 })]}>
                {isEn ? 'Retry' : 'Thử lại'}
              </Text>
            </Pressable>
          </View>
        ) : !hasProfile ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={theme.muted} />
            <Text style={[styles.emptyTitle, fontStyle(18, { min: 16.5, max: 21 }), { color: theme.text }]}>
              {isEn ? 'No active pregnancy profile' : 'Chưa có hồ sơ thai kỳ'}
            </Text>
            <Text style={[styles.emptyDescription, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'This account does not have an active pregnancy profile yet to display checkup history.'
                : 'Tài khoản hiện tại chưa có hồ sơ thai kỳ hoạt động trên hệ thống để hiển thị lịch sử lần khám.'}
            </Text>
          </View>
        ) : totalCount === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={48} color={theme.muted} />
            <Text style={[styles.emptyTitle, fontStyle(18, { min: 16.5, max: 21 }), { color: theme.text }]}>
              {isEn ? 'No checkup records found' : 'Chưa có lần khám trong Database'}
            </Text>
            <Text style={[styles.emptyDescription, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'No antenatal checkups or fetal biometric records have been saved for this account yet.'
                : 'Tài khoản này chưa có lượt khám thai hay chỉ số sinh trắc nào được lưu trong cơ sở dữ liệu.'}
            </Text>
            <Pressable
              style={styles.goUploadBtn}
              onPress={() => navigation.navigate('Main')}
            >
              <Ionicons name="home-outline" size={18} color="#FFFFFF" />
              <Text style={[styles.goUploadBtnText, fontStyle(15, { min: 14 })]}>
                {isEn ? 'Back to Home' : 'Quay lại trang chính'}
              </Text>
            </Pressable>
          </View>
        ) : visibleCount === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={42} color={theme.muted} />
            <Text style={[styles.emptyTitle, fontStyle(18, { min: 16.5, max: 21 }), { color: theme.text }]}>
              {isEn ? 'No matching results' : 'Không tìm thấy kết quả phù hợp'}
            </Text>
            <Text style={[styles.emptyDescription, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'Try another keyword or switch back to "All checkups".'
                : 'Thử từ khóa khác hoặc bấm chọn lại bộ lọc "Tất cả lần khám".'}
            </Text>
          </View>
        ) : (
          <View style={styles.sectionGroup}>
            <Text style={[styles.groupHeading, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
              {isEn
                ? `Checkups & Fetal Biometrics (${filteredCheckups.length})`
                : `Lần khám & Chỉ số sinh trắc (${filteredCheckups.length})`}
            </Text>
            {filteredCheckups.map((item) => {
              const bio = item.biometric_data;
              const biometricGridItems = bio
                ? [
                    bio.bpd !== null && bio.bpd !== undefined
                      ? { key: 'bpd', label: isEn ? 'BPD · Biparietal' : 'BPD · Lưỡng đỉnh', value: `${bio.bpd} mm` }
                      : null,
                    bio.hc !== null && bio.hc !== undefined
                      ? { key: 'hc', label: isEn ? 'HC · Head circ.' : 'HC · Chu vi đầu', value: `${bio.hc} mm` }
                      : null,
                    bio.ac !== null && bio.ac !== undefined
                      ? { key: 'ac', label: isEn ? 'AC · Abdominal circ.' : 'AC · Chu vi bụng', value: `${bio.ac} mm` }
                      : null,
                    bio.fl !== null && bio.fl !== undefined
                      ? { key: 'fl', label: isEn ? 'FL · Femur length' : 'FL · Xương đùi', value: `${bio.fl} mm` }
                      : null,
                  ].filter((v): v is { key: string; label: string; value: string } => Boolean(v))
                : [];
              const efwValue =
                bio?.efw !== null && bio?.efw !== undefined
                  ? `${bio.efw.toLocaleString(isEn ? 'en-US' : 'vi-VN')} g`
                  : null;
              const hasVitals =
                item.vitals.weight_kg !== null ||
                (item.vitals.blood_pressure_systolic !== null &&
                  item.vitals.blood_pressure_diastolic !== null);
              const bpStatusText =
                BP_STATUS_LABELS[preferences.language][item.vitals.blood_pressure_status] ||
                item.vitals.blood_pressure_status;
              const isBpAlert =
                item.vitals.blood_pressure_status &&
                item.vitals.blood_pressure_status !== 'normal';

              const gaLine = isEn
                ? `Week ${item.gestational_age.weeks}${item.gestational_age.remaining_days > 0 ? ` ${item.gestational_age.remaining_days}d` : ''}`
                : `Tuần ${item.gestational_age.weeks}${item.gestational_age.remaining_days > 0 ? ` ${item.gestational_age.remaining_days} ngày` : ''}`;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.resultCard,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.flexOne}>
                      <Text style={[styles.resultTitle, fontStyle(17, { lineHeight: 24, min: 15.5 }), { color: theme.text }]}>
                        {isEn
                          ? `Checkup ${formatDate(item.checkup_date)}`
                          : `Khám ngày ${formatDate(item.checkup_date)}`}
                      </Text>
                      <Text style={[styles.weekSubtitle, fontStyle(14.5, { lineHeight: 21, min: 13.5 }), { color: theme.muted }]}>
                        {gaLine} · {item.doctor?.full_name || (isEn ? 'Doctor not assigned' : 'Chưa rõ bác sĩ')}
                      </Text>
                    </View>

                    {bio && (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              bio.status === 'verified' ? theme.badgeGreenBg : theme.badgeWarnBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            fontStyle(12.5, { min: 11.5, max: 14.5 }),
                            {
                              color:
                                bio.status === 'verified' ? theme.badgeGreenText : theme.badgeWarnText,
                            },
                          ]}
                        >
                          {bio.status === 'verified'
                            ? (isEn ? 'Verified' : 'Đã xác thực')
                            : (isEn ? 'Pending' : 'Chờ duyệt')}
                        </Text>
                      </View>
                    )}
                  </View>

                      <View style={[styles.statusBadge, badgeStyle]}>
                        <Text style={[styles.statusText, badgeTextStyle]}>
                          {item.statusLabel}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleDeleteRecord(item.id, item.fileName)}
                        hitSlop={8}
                        style={styles.deleteIconBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </Pressable>
                    </View>

                    <Text style={styles.valueLabel}>Các chỉ số đã lưu:</Text>
                    <View style={styles.metricsChipsWrap}>
                      {item.metrics.map((m) => (
                        <View
                          key={m.key}
                          style={[
                            styles.metricChip,
                            m.severity === 'danger' && styles.metricChipDanger,
                            m.severity === 'warning' && styles.metricChipWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.metricChipText,
                              m.severity === 'danger' && { color: '#DC2626' },
                              m.severity === 'warning' && { color: '#A16207' },
                            ]}
                          >
                            {m.label}: {m.value} {m.unit}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.descriptionBox}>
                      <Text style={styles.description}>{item.description}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Dữ liệu đồng bộ trực tiếp từ hồ sơ tài khoản của bạn
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    height: 54,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EAF0',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#172B4D',
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterButton: {
    height: 36,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7EF',
    borderRadius: 9,
  },
  toolbarText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  searchBox: {
    flex: 1,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E7EF',
    borderRadius: 9,
  },
  searchInput: { flex: 1, padding: 0, fontSize: 12, color: '#334155' },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  dateGroup: { marginBottom: 10 },
  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  dateText: { fontSize: 12.5, fontWeight: '800', color: '#008F83' },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2EAF2',
    borderRadius: 13,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  fileSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  normalBadge: { backgroundColor: '#CCFBF1' },
  followBadge: { backgroundColor: '#FEF08A' },
  dangerBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 10, fontWeight: '800' },
  normalText: { color: '#008F83' },
  followText: { color: '#854D0E' },
  dangerText: { color: '#DC2626' },
  deleteIconBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  valueLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 10, marginBottom: 6 },
  metricsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metricChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricChipWarning: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FACC15',
  },
  metricChipDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  metricChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  descriptionBox: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 9, borderWidth: 1, borderColor: '#E2E8F0' },
  description: { fontSize: 11, lineHeight: 16, color: '#334155', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20, gap: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#334155' },
  emptyDescription: { fontSize: 12.5, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  goUploadBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#008F83',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goUploadBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  footer: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5EAF0',
  },
  footerText: { fontSize: 10.5, color: '#64748B', fontWeight: '600' },
});