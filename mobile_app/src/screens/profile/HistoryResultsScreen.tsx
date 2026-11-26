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

        <Text style={styles.headerTitle}>Lịch sử kết quả ({historyList.length})</Text>
      </View>

      {/* THANH LỌC & TÌM KIẾM */}
      <View style={styles.toolbar}>
        <Pressable style={styles.filterButton} onPress={chooseFilter}>
          <Ionicons name="filter-outline" size={16} color="#008F83" />
          <Text style={styles.toolbarText}>{filterLabel}</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên phiếu, tuần thai, chỉ số..."
            placeholderTextColor="#94A3B8"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
          />
          {keyword.length > 0 && (
            <Pressable onPress={() => setKeyword('')}>
              <Ionicons name="close-circle" size={17} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color="#008F83" />
            <Text style={styles.emptyDescription}>Đang tải lịch sử kết quả của bạn...</Text>
          </View>
        ) : historyList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="documents-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Chưa có lịch sử kết quả nào</Text>
            <Text style={styles.emptyDescription}>
              Tài khoản của bạn chưa có phiếu khám hoặc kết quả siêu âm nào được lưu. Hãy tải phiếu khám PDF/Ảnh hoặc nhập thủ công để hệ thống ghi nhận.
            </Text>
            <Pressable
              style={styles.goUploadBtn}
              onPress={() => navigation.navigate('Main', { screen: 'Upload' })}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
              <Text style={styles.goUploadBtnText}>Tải lên phiếu khám ngay</Text>
            </Pressable>
          </View>
        ) : filteredResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={42} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Không tìm thấy kết quả phù hợp</Text>
            <Text style={styles.emptyDescription}>
              Thử từ khóa khác hoặc bấm chọn lại bộ lọc "Tất cả".
            </Text>
          </View>
        ) : (
          groupedResults.map((group, idx) => (
            <View key={`${group.date}-${idx}`} style={styles.dateGroup}>
              <View style={styles.dateHeading}>
                <Ionicons name="calendar-outline" size={16} color="#009688" />
                <Text style={styles.dateText}>
                  {group.date} • {group.week}
                </Text>
              </View>

              {group.items.map((item) => {
                const badgeStyle =
                  item.severity === 'danger'
                    ? styles.dangerBadge
                    : item.severity === 'warning'
                    ? styles.followBadge
                    : styles.normalBadge;

                const badgeTextStyle =
                  item.severity === 'danger'
                    ? styles.dangerText
                    : item.severity === 'warning'
                    ? styles.followText
                    : styles.normalText;

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.resultCard,
                      item.severity === 'danger' && { borderColor: '#FCA5A5' },
                      item.severity === 'warning' && { borderColor: '#FDE047' },
                    ]}
                    onPress={() => {
                      const detailLines = item.metrics
                        .map(
                          (m) =>
                            `• ${m.label}: ${m.value} ${m.unit} (${m.refRange})`
                        )
                        .join('\n');
                      Alert.alert(
                        item.title,
                        `Tệp: ${item.fileName}\n\n${detailLines}\n\nNhận định: ${item.description}`
                      );
                    }}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.resultTitle}>{item.title}</Text>
                        <Text style={styles.fileSubtitle} numberOfLines={1}>
                          Nguồn: {item.fileName}
                        </Text>
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