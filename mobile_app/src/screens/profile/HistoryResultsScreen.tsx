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

                  {hasVitals && (
                    <View style={styles.sectionBlock}>
                      <Text style={[styles.valueLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                        {isEn ? 'Maternal vitals' : 'Sinh hiệu của mẹ'}
                      </Text>
                      <View style={styles.metricsGrid}>
                        {item.vitals.weight_kg !== null && (
                          <View
                            style={[
                              styles.metricTile,
                              { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                            ]}
                          >
                            <Text style={[styles.metricTileLabel, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.muted }]}>
                              {isEn ? 'Maternal weight' : 'Cân nặng mẹ'}
                            </Text>
                            <Text style={[styles.metricTileValue, fontStyle(17, { lineHeight: 23, min: 15.5 }), { color: theme.text }]}>
                              {item.vitals.weight_kg} kg
                            </Text>
                          </View>
                        )}
                        {item.vitals.blood_pressure_systolic !== null &&
                          item.vitals.blood_pressure_diastolic !== null && (
                            <View
                              style={[
                                styles.metricTile,
                                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                              ]}
                            >
                              <Text style={[styles.metricTileLabel, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.muted }]}>
                                {isEn ? 'Blood pressure' : 'Huyết áp'}
                              </Text>
                              <Text style={[styles.metricTileValue, fontStyle(17, { lineHeight: 23, min: 15.5 }), { color: theme.text }]}>
                                {item.vitals.blood_pressure_systolic}/
                                {item.vitals.blood_pressure_diastolic} mmHg
                              </Text>
                              <Text
                                style={[
                                  styles.metricTileNote,
                                  fontStyle(13, { min: 12 }),
                                  { color: isBpAlert ? theme.danger : theme.tealText },
                                ]}
                              >
                                {bpStatusText}
                              </Text>
                            </View>
                          )}
                      </View>
                    </View>
                  )}

                  {(biometricGridItems.length > 0 || efwValue) && (
                    <View style={styles.sectionBlock}>
                      <Text style={[styles.valueLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.textSecondary }]}>
                        {isEn ? 'Fetal biometry' : 'Chỉ số sinh trắc thai nhi'}
                      </Text>
                      {biometricGridItems.length > 0 && (
                        <View style={styles.metricsGrid}>
                          {biometricGridItems.map((metric) => (
                            <View
                              key={metric.key}
                              style={[
                                styles.metricTile,
                                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                              ]}
                            >
                              <Text style={[styles.metricTileLabel, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.muted }]}>
                                {metric.label}
                              </Text>
                              <Text style={[styles.metricTileValue, fontStyle(17, { lineHeight: 23, min: 15.5 }), { color: theme.text }]}>
                                {metric.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {efwValue && (
                        <View
                          style={[
                            styles.efwHighlightCard,
                            { backgroundColor: theme.tealSoft, borderColor: theme.tealBorder },
                          ]}
                        >
                          <Text style={[styles.efwLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.tealText }]}>
                            {isEn ? 'EFW · Estimated fetal weight' : 'EFW · Cân nặng thai ước tính'}
                          </Text>
                          <Text style={[styles.efwValue, fontStyle(18, { min: 16.5, max: 21 }), { color: theme.tealText }]}>
                            {efwValue}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {!!item.notes && (
                    <View
                      style={[
                        styles.descriptionBox,
                        { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                      ]}
                    >
                      <Text style={[styles.descriptionLabel, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
                        {isEn ? 'Clinical notes' : 'Nhận xét của bác sĩ'}
                      </Text>
                      <Text style={[styles.description, fontStyle(15, { lineHeight: 22, min: 14 }), { color: theme.text }]}>
                        {item.notes}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <Text style={[styles.footerText, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
          {isEn
            ? 'Checkup records synced to your account from PreCare database'
            : 'Dữ liệu lần khám đồng bộ theo tài khoản từ cơ sở dữ liệu PreCare'}
        </Text>
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filterButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 11,
  },
  toolbarText: { fontSize: 14, fontWeight: '600' },
  searchBox: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 11,
  },
  searchInput: { flex: 1, padding: 0, fontSize: 15 },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sectionGroup: { marginTop: 4, marginBottom: 14 },
  groupHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  resultTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
  },
  weekSubtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: '500',
    marginTop: 3,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  sectionBlock: { marginTop: 14 },
  valueLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flexGrow: 1,
    minWidth: '46%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricTileLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  metricTileValue: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
    marginTop: 3,
  },
  metricTileNote: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  efwHighlightCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  efwLabel: {
    fontSize: 14.5,
    fontWeight: '700',
    flexShrink: 1,
  },
  efwValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  descriptionBox: {
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#008F83',
    padding: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  description: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  goUploadBtn: {
    marginTop: 8,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#008F83',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goUploadBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footer: {
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
