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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  resolveAccountStorageKey,
  type MedicalMetric,
  type SeverityLevel,
  type UploadItem,
} from '../UploadScreen';

type Props = NativeStackScreenProps<any>;

type HistoryItem = {
  id: string;
  fileName: string;
  date: string;
  week: string;
  title: string;
  valueSummary: string;
  severity: SeverityLevel;
  statusLabel: 'Bình thường' | 'Cần theo dõi' | 'Nguy hiểm';
  description: string;
  metrics: MedicalMetric[];
  isConfirmed: boolean;
};

export default function HistoryResultsScreen({ navigation }: Props) {
  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<'all' | 'normal' | 'follow' | 'danger'>('all');
  const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Tự động tải 100% lịch sử thật của tài khoản đang đăng nhập (Không có dữ liệu mẫu)
  const loadRealHistory = useCallback(async () => {
    try {
      setLoading(true);
      const storageKey = await resolveAccountStorageKey();
      const raw = await AsyncStorage.getItem(storageKey);

      if (!raw) {
        setHistoryList([]);
        return;
      }

      const uploadedItems: UploadItem[] = JSON.parse(raw);
      const mapped: HistoryItem[] = uploadedItems
        .filter((item) => item.analysis)
        .map((item) => {
          const analysis = item.analysis!;
          const severity: SeverityLevel = analysis.overallSeverity || 'normal';
          const statusLabel =
            severity === 'danger'
              ? 'Nguy hiểm'
              : severity === 'warning'
              ? 'Cần theo dõi'
              : 'Bình thường';

          const metricsSummary = analysis.metrics
            .map((m) => `${m.label}: ${m.value}${m.unit ? ` ${m.unit}` : ''}`)
            .join(' • ');

          return {
            id: item.id,
            fileName: item.name,
            date: item.time,
            week: `Tuần ${analysis.gestationalWeek || 24}`,
            title: analysis.recordType,
            valueSummary: metricsSummary || 'Đã trích xuất chỉ số',
            severity,
            statusLabel,
            description: analysis.doctorConclusion || analysis.summary,
            metrics: analysis.metrics || [],
            isConfirmed: item.status === 'done' || Boolean(analysis.savedToProfile),
          };
        });

      setHistoryList(mapped);
    } catch (e) {
      console.log('Lỗi đọc lịch sử kết quả:', e);
      setHistoryList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRealHistory();
    }, [loadRealHistory])
  );

  // Xoá 1 bản ghi lịch sử nếu người dùng muốn dọn dẹp
  const handleDeleteRecord = (id: string, title: string) => {
    Alert.alert(
      'Xoá lịch sử kết quả',
      `Bạn có chắc chắn muốn xoá "${title}" khỏi lịch sử không?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              const storageKey = await resolveAccountStorageKey();
              const raw = await AsyncStorage.getItem(storageKey);
              if (raw) {
                const list: UploadItem[] = JSON.parse(raw);
                const next = list.filter((i) => i.id !== id);
                await AsyncStorage.setItem(storageKey, JSON.stringify(next));
              }
              setHistoryList((prev) => prev.filter((i) => i.id !== id));
            } catch (e) {
              console.log('Lỗi xoá lịch sử:', e);
            }
          },
        },
      ]
    );
  };

  const filteredResults = useMemo(() => {
    return historyList.filter((item) => {
      const q = keyword.trim().toLowerCase();
      const matchesKeyword =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q) ||
        item.valueSummary.toLowerCase().includes(q) ||
        item.week.toLowerCase().includes(q);

      const matchesFilter =
        filter === 'all' ||
        (filter === 'normal' && item.severity === 'normal') ||
        (filter === 'follow' && item.severity === 'warning') ||
        (filter === 'danger' && item.severity === 'danger');

      return matchesKeyword && matchesFilter;
    });
  }, [historyList, keyword, filter]);

  const groupedResults = useMemo(() => {
    const groups: { date: string; week: string; items: HistoryItem[] }[] = [];

    filteredResults.forEach((item) => {
      let group = groups.find((g) => g.date === item.date && g.week === item.week);
      if (!group) {
        group = { date: item.date, week: item.week, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [filteredResults]);

  const chooseFilter = () => {
    Alert.alert('Lọc kết quả', 'Chọn trạng thái kết quả cần xem', [
      { text: 'Tất cả', onPress: () => setFilter('all') },
      { text: 'Bình thường (Xanh)', onPress: () => setFilter('normal') },
      { text: 'Cần theo dõi (Vàng)', onPress: () => setFilter('follow') },
      { text: 'Nguy hiểm / Bất thường (Đỏ)', onPress: () => setFilter('danger') },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const filterLabel =
    filter === 'all'
      ? 'Lọc: Tất cả'
      : filter === 'normal'
      ? 'Bình thường'
      : filter === 'follow'
      ? 'Cần theo dõi'
      : 'Nguy hiểm';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />

      {/* HEADER TRANG RIÊNG */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Quay lại"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
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