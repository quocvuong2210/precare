import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { UploadStackParamList } from '../navigation/UploadNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<UploadStackParamList, 'ManualResultEntry'>;
type MetricKey = 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';
type Metric = { key: MetricKey; label: string; unit: string };

const METRICS: Metric[] = [
  { key: 'bpd', label: 'BPD · ĐK lưỡng đỉnh', unit: 'mm' },
  { key: 'hc', label: 'HC · Chu vi đầu', unit: 'mm' },
  { key: 'ac', label: 'AC · Chu vi bụng', unit: 'mm' },
  { key: 'fl', label: 'FL · Dài xương đùi', unit: 'mm' },
  { key: 'efw', label: 'EFW · Cân nặng thai ước tính', unit: 'g' },
];

// Dữ liệu mẫu theo thiết kế; thay bằng ngày dự sinh từ hồ sơ khi nối API.
const DUE_DATE = Date.UTC(2026, 8, 22);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (value: number) => String(value).padStart(2, '0');

function parseDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date
    : null;
}

function getGestationalAge(date: Date | null) {
  if (!date) return null;
  const totalDays = 280 - Math.round((DUE_DATE - date.getTime()) / DAY_IN_MS);
  if (totalDays < 0 || totalDays > 42 * 7 + 6) return null;
  return { weeks: String(Math.floor(totalDays / 7)), days: String(totalDays % 7) };
}

function getMetricError(key: MetricKey, value: string): string | null {
  if (!value.trim()) return 'Vui lòng nhập chỉ số này.';
  const numericValue = Number(value.replace(',', '.'));
  if (!/^\d+(?:[.,]\d+)?$/.test(value) || !Number.isFinite(numericValue) || numericValue <= 0) {
    return 'Nhập một số lớn hơn 0.';
  }
  // Kiểm tra sơ bộ lỗi nhập/đơn vị, không phải khoảng tham chiếu theo tuổi thai.
  if (key === 'efw' && numericValue > 6000) return 'Hãy kiểm tra lại giá trị và đơn vị trên phiếu khám.';
  return null;
}

export default function ManualResultEntryScreen({ navigation }: Props) {
  const [examDate, setExamDate] = useState('05/06/2026');
  const [autoAge, setAutoAge] = useState(true);
  const [manualAge, setManualAge] = useState({ weeks: '24', days: '3' });
  const [values, setValues] = useState<Record<MetricKey, string>>({
    bpd: '61', hc: '222', ac: '198', fl: '44', efw: '6500',
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 5 });

  const parsedDate = parseDate(examDate);
  const calculatedAge = getGestationalAge(parsedDate);
  const age = autoAge ? calculatedAge ?? { weeks: '', days: '' } : manualAge;
  const ageValid = /^\d{1,2}$/.test(age.weeks) && /^\d$/.test(age.days)
    && Number(age.weeks) <= 42 && Number(age.days) <= 6;
  const metricErrors = METRICS.filter((metric) => getMetricError(metric.key, values[metric.key]));
  const efwNeedsReview = Number(values.efw.replace(',', '.')) > 6000;
  const canSave = Boolean(parsedDate) && ageValid && metricErrors.length === 0;

  const calendarOffset = (new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + 1, 0)).getUTCDate();
  const calendarCells = Array.from(
    { length: Math.ceil((calendarOffset + daysInMonth) / 7) * 7 },
    (_, index) => index >= calendarOffset && index < calendarOffset + daysInMonth ? index - calendarOffset + 1 : null,
  );

  const openCalendar = () => {
    Keyboard.dismiss();
    if (parsedDate) {
      setCalendarMonth({ year: parsedDate.getUTCFullYear(), month: parsedDate.getUTCMonth() });
    }
    setCalendarOpen(true);
  };

  const changeMonth = (delta: number) => {
    const nextMonth = new Date(Date.UTC(calendarMonth.year, calendarMonth.month + delta, 1));
    if (nextMonth.getUTCFullYear() < 1900 || nextMonth.getUTCFullYear() > 2100) return;
    setCalendarMonth({ year: nextMonth.getUTCFullYear(), month: nextMonth.getUTCMonth() });
  };

  const toggleAutoAge = (enabled: boolean) => {
    if (!enabled && calculatedAge) setManualAge(calculatedAge);
    setAutoAge(enabled);
  };

  const renderMetric = (metric: Metric) => {
    const error = getMetricError(metric.key, values[metric.key]);
    return (
      <View key={metric.key} style={metric.key === 'efw' ? styles.fullField : styles.halfField}>
        <Text style={styles.fieldLabel}>{metric.label}</Text>
        <View style={[styles.inputBox, error && styles.inputBoxWarning]}>
          <TextInput
            accessibilityLabel={metric.label}
            accessibilityHint={`Đơn vị ${metric.unit}`}
            value={values[metric.key]}
            onChangeText={(value) => setValues((previous) => ({ ...previous, [metric.key]: value }))}
            keyboardType="decimal-pad"
            maxLength={8}
            selectTextOnFocus
            style={[styles.inputText, error && styles.warningInputText]}
          />
          <Text style={styles.unit}>{metric.unit}</Text>
          {error && <Ionicons name="warning-outline" size={17} color={WARNING_COLOR} style={styles.inputWarningIcon} />}
        </View>
        {error && metric.key !== 'efw' && <Text style={styles.fieldError}>{error}</Text>}
        {error && metric.key === 'efw' && !efwNeedsReview && <Text style={styles.fieldError}>{error}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={20} color="#475569" />
        </Pressable>
        <Text style={styles.headerTitle}>Nhập kết quả thủ công</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Kết quả khám thai</Text>
          <Text style={styles.subtitle}>Nhập theo phiếu khám. Tất cả trường đều bắt buộc.</Text>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Ngày khám</Text>
            <View style={[styles.inputBox, !parsedDate && styles.inputBoxWarning]}>
              <TextInput
                accessibilityLabel="Ngày khám, định dạng ngày tháng năm"
                value={examDate}
                onChangeText={setExamDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={colors.textLight}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={styles.inputText}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Chọn ngày khám" onPress={openCalendar} hitSlop={10}>
                <Ionicons name="calendar-outline" size={19} color="#334155" />
              </Pressable>
            </View>
            {!parsedDate && <Text style={styles.fieldError}>Nhập ngày hợp lệ theo định dạng DD/MM/YYYY.</Text>}

            <View style={styles.ageLabelRow}>
              <Text style={styles.ageLabel}>Tuổi thai tại ngày khám</Text>
              <View style={styles.autoAgeControl}>
                <Text style={styles.autoAgeText}>Tự tính</Text>
                <Switch
                  accessibilityLabel="Tự tính tuổi thai theo ngày dự sinh"
                  value={autoAge}
                  onValueChange={toggleAutoAge}
                  trackColor={{ false: '#CBD5E1', true: colors.primary }}
                  thumbColor={colors.white}
                  ios_backgroundColor="#CBD5E1"
                  style={styles.ageSwitch}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <View style={[styles.inputBox, styles.ageInput, autoAge && styles.readOnlyInput]}>
                  <TextInput
                    accessibilityLabel="Tuổi thai, số tuần"
                    value={age.weeks}
                    onChangeText={(weeks) => setManualAge((previous) => ({ ...previous, weeks }))}
                    editable={!autoAge}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={styles.inputText}
                  />
                  <Text style={styles.unit}>tuần</Text>
                </View>
              </View>
              <View style={styles.halfField}>
                <View style={[styles.inputBox, styles.ageInput, autoAge && styles.readOnlyInput]}>
                  <TextInput
                    accessibilityLabel="Tuổi thai, số ngày"
                    value={age.days}
                    onChangeText={(days) => setManualAge((previous) => ({ ...previous, days }))}
                    editable={!autoAge}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={styles.inputText}
                  />
                  <Text style={styles.unit}>ngày</Text>
                </View>
              </View>
            </View>
            {!ageValid && (
              <Text style={styles.fieldError}>
                {autoAge ? 'Kiểm tra lại ngày khám hoặc tắt “Tự tính” để nhập tuổi thai.' : 'Nhập tuần từ 0–42 và ngày từ 0–6.'}
              </Text>
            )}
            <Text style={styles.ageHint}>
              Theo ngày dự sinh 22/09/2026 trong hồ sơ. Tắt “Tự tính” để nhập tuần và ngày theo phiếu khám.
            </Text>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Chỉ số siêu âm</Text>
            {metricErrors.length > 0 && (
              <View style={styles.warningBadge}>
                <Text style={styles.warningBadgeText}>{metricErrors.length} chỉ số cần kiểm tra</Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            <View style={styles.fieldRow}>{METRICS.slice(0, 2).map(renderMetric)}</View>
            <View style={[styles.fieldRow, styles.metricRow]}>{METRICS.slice(2, 4).map(renderMetric)}</View>
            <View style={styles.metricRow}>{renderMetric(METRICS[4])}</View>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={15} color="#475569" />
              <Text style={styles.infoText}>Chỉ nhập số lớn hơn 0; dùng dấu phẩy cho số thập phân (ví dụ: 61,5).</Text>
            </View>
          </View>

          {efwNeedsReview && (
            <View style={styles.warningCard} accessibilityLiveRegion="polite">
              <Ionicons name="warning-outline" size={19} color="#B45309" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Kiểm tra lại EFW: {values.efw} g</Text>
                <Text style={styles.warningDescription}>
                  Giá trị có thể thừa chữ số hoặc chưa đúng đơn vị. Hãy đối chiếu phiếu khám và sửa trước khi lưu.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.saveHint}>
            {canSave ? 'Các thông tin đã hợp lệ. Bạn có thể lưu kết quả.' : 'Chỉ có thể lưu khi tất cả thông tin hợp lệ.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={() => {
              // TODO: gửi kết quả lên API khi backend sẵn sàng.
              Alert.alert('Chưa thể lưu kết quả', 'Chức năng lưu kết quả sẽ được cập nhật sau.');
            }}
            style={({ pressed }) => [styles.saveButton, !canSave && styles.saveButtonDisabled, pressed && styles.pressed]}
          >
            <Ionicons name={canSave ? 'save-outline' : 'lock-closed-outline'} size={18} color={canSave ? colors.white : '#7C8FA8'} />
            <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>Lưu kết quả</Text>
          </Pressable>
          <Text style={styles.footerNote}>
            Sau khi lưu, bản ghi được đánh dấu “Đã xác nhận hợp lệ” và thêm vào Lịch sử lần khám của bạn.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCalendarOpen(false)} accessibilityRole="button" accessibilityLabel="Đóng lịch" />
          <View style={styles.calendarCard} accessibilityViewIsModal>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Chọn ngày khám</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng lịch" onPress={() => setCalendarOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.calendarMonthRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <Ionicons name="chevron-back" size={20} color={colors.navy} />
              </Pressable>
              <Text style={styles.calendarMonth}>Tháng {calendarMonth.month + 1}, {calendarMonth.year}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => changeMonth(1)} style={styles.monthButton}>
                <Ionicons name="chevron-forward" size={20} color={colors.navy} />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((day) => <Text key={day} style={styles.calendarWeekday}>{day}</Text>)}
              {calendarCells.map((day, index) => {
                const selected = day !== null && parsedDate?.getUTCFullYear() === calendarMonth.year
                  && parsedDate.getUTCMonth() === calendarMonth.month && parsedDate.getUTCDate() === day;
                return (
                  <View key={index} style={styles.calendarCell}>
                    {day !== null && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${day}/${calendarMonth.month + 1}/${calendarMonth.year}`}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setExamDate(`${pad(day)}/${pad(calendarMonth.month + 1)}/${calendarMonth.year}`);
                          setCalendarOpen(false);
                        }}
                        style={[styles.calendarDay, selected && styles.calendarDaySelected]}
                      >
                        <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{day}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const WARNING_COLOR = '#D97706';
const BORDER_COLOR = '#DCE5F0';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    height: 54, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  backButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F9FC' },
  headerSpacer: { width: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.navy },
  pressed: { opacity: 0.75 },
  scrollContent: { padding: 18, paddingBottom: 18 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  subtitle: { fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: 5, marginBottom: 14 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: BORDER_COLOR, padding: 14 },
  fieldLabel: { fontSize: 11.5, lineHeight: 17, color: '#344663', marginBottom: 5 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', minHeight: 42, borderWidth: 1,
    borderColor: BORDER_COLOR, borderRadius: 7, paddingHorizontal: 10, backgroundColor: colors.white,
  },
  inputText: { flex: 1, minWidth: 0, paddingVertical: 9, paddingHorizontal: 0, fontSize: 15, fontWeight: '600', color: colors.navy },
  unit: { fontSize: 11, color: colors.textMuted, marginLeft: 5 },
  fieldError: { fontSize: 10.5, lineHeight: 15, color: '#B45309', marginTop: 5 },
  ageLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 7 },
  ageLabel: { flex: 1, fontSize: 11.5, color: '#344663' },
  autoAgeControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoAgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryDark },
  ageSwitch: { transform: [{ scale: 0.75 }], marginVertical: -6, marginRight: -6 },
  fieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  halfField: { flex: 1, minWidth: 0 },
  fullField: { width: '100%' },
  ageInput: { minHeight: 38 },
  readOnlyInput: { backgroundColor: '#F7F9FC', borderColor: '#F7F9FC' },
  ageHint: { fontSize: 10.5, lineHeight: 16, color: colors.textMuted, marginTop: 10 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
  warningBadge: { backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  warningBadgeText: { fontSize: 10, fontWeight: '600', color: '#B45309' },
  metricRow: { marginTop: 10 },
  inputBoxWarning: { backgroundColor: '#FFFBEB', borderColor: '#FCD34D' },
  warningInputText: { color: WARNING_COLOR },
  inputWarningIcon: { marginLeft: 7 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 10 },
  infoText: { flex: 1, fontSize: 10.5, lineHeight: 16, color: colors.textMuted },
  warningCard: { flexDirection: 'row', gap: 9, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 10, padding: 11, marginTop: 12 },
  warningContent: { flex: 1 },
  warningTitle: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: '#B45309' },
  warningDescription: { fontSize: 11, lineHeight: 16, color: '#B45309', marginTop: 3 },
  footer: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 16 },
  saveHint: { textAlign: 'center', fontSize: 11.5, lineHeight: 17, color: '#344663', marginBottom: 8 },
  saveButton: { minHeight: 46, borderRadius: 7, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 10 },
  saveButtonDisabled: { backgroundColor: '#E2E8F0' },
  saveButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  saveButtonTextDisabled: { color: '#7C8FA8' },
  footerNote: { textAlign: 'center', fontSize: 10.5, lineHeight: 16, color: colors.textMuted, marginTop: 10 },
  modalOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.35)' },
  calendarCard: { width: '100%', maxWidth: 380, alignSelf: 'center', padding: 16, borderRadius: 18, backgroundColor: colors.white },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  calendarMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarMonth: { fontSize: 14, fontWeight: '600', color: colors.navy },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: { width: '14.285714%', textAlign: 'center', fontSize: 11, color: colors.textMuted, paddingVertical: 8 },
  calendarCell: { width: '14.285714%', height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarDay: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { backgroundColor: colors.primary },
  calendarDayText: { fontSize: 13, color: colors.navy },
  calendarDayTextSelected: { color: colors.white, fontWeight: '700' },
});
