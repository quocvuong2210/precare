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
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { UploadStackParamList } from '../navigation/UploadNavigator';
import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';
import {
  evaluateMetricByWeek,
  getFetalMetricBoundsByWeek,
  getPregnancyStageInfo,
  resolveAccountStorageKey,
  summarizeAnalysisState,
  type SeverityLevel,
} from './UploadScreen';

type Props = NativeStackScreenProps<UploadStackParamList, 'ManualResultEntry'>;
type MetricKey = 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';

type MetricMeta = {
  key: MetricKey;
  labelVi: string;
  labelEn: string;
  unit: string;
};

const METRICS_META: MetricMeta[] = [
  { key: 'bpd', labelVi: 'BPD · Đường kính lưỡng đỉnh', labelEn: 'BPD · Biparietal diameter', unit: 'mm' },
  { key: 'hc',  labelVi: 'HC · Chu vi đầu',             labelEn: 'HC · Head circumference', unit: 'mm' },
  { key: 'ac',  labelVi: 'AC · Chu vi vòng bụng',       labelEn: 'AC · Abdominal circumference', unit: 'mm' },
  { key: 'fl',  labelVi: 'FL · Chiều dài xương đùi',    labelEn: 'FL · Femur length', unit: 'mm' },
  { key: 'efw', labelVi: 'EFW · Cân nặng thai ước tính', labelEn: 'EFW · Estimated fetal weight', unit: 'g' },
];

const DUE_DATE = Date.UTC(2026, 8, 22);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (value: number) => String(value).padStart(2, '0');

function parseDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  if (year < 1900 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

function getGestationalAge(date: Date | null) {
  if (!date) return null;
  const totalDays = 280 - Math.round((DUE_DATE - date.getTime()) / DAY_IN_MS);
  if (totalDays < 0 || totalDays > 42 * 7 + 6) return null;
  return { weeks: String(Math.floor(totalDays / 7)), days: String(totalDays % 7) };
}

export default function ManualResultEntryScreen({ navigation }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [examDate, setExamDate] = useState('05/06/2026');
  const [autoAge, setAutoAge] = useState(true);
  const [manualAge, setManualAge] = useState({ weeks: '24', days: '3' });
  const [values, setValues] = useState<Record<MetricKey, string>>({
    bpd: '58',
    hc: '215',
    ac: '195',
    fl: '43',
    efw: '710',
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 5 });

  const parsedDate = parseDate(examDate);
  const calculatedAge = getGestationalAge(parsedDate);
  const age = autoAge ? calculatedAge ?? { weeks: '', days: '' } : manualAge;

  // Nếu để trống ô "ngày" thì mặc định hiểu là 0 ngày (tròn tuần)
  const effectiveDays = age.days.trim() === '' ? '0' : age.days.trim();
  const ageValid =
    /^\d{1,2}$/.test(age.weeks.trim()) &&
    /^\d$/.test(effectiveDays) &&
    Number(age.weeks) >= 12 &&
    Number(age.weeks) <= 41 &&
    Number(effectiveDays) >= 0 &&
    Number(effectiveDays) <= 6;

  const activeWeek = ageValid ? Number(age.weeks) : 24;
  const stageInfo = getPregnancyStageInfo(activeWeek, preferences.language);
  const stageLabelDisplay = isEn
    ? `Week ${stageInfo.clampedWeek} (Month ${stageInfo.month})`
    : stageInfo.stageLabel;

  const evaluatedMetrics = METRICS_META.map((meta) => {
    const rawVal = values[meta.key].trim();
    const bounds = getFetalMetricBoundsByWeek(
      meta.key,
      activeWeek,
      meta.unit,
      preferences.language
    );
    const num = Number(rawVal.replace(',', '.'));
    const isValidNumber =
      Boolean(rawVal) && /^\d+(?:[.,]\d+)?$/.test(rawVal) && Number.isFinite(num) && num > 0;

    if (!isValidNumber) {
      return {
        meta: { ...meta, label: isEn ? meta.labelEn : meta.labelVi },
        bounds,
        isValidNumber: false,
        status: 'danger' as SeverityLevel,
        badgeText: !rawVal
          ? (isEn ? 'Required' : 'Chưa nhập')
          : (isEn ? 'Invalid format' : 'Sai định dạng'),
        message: isEn ? 'Please enter a number greater than 0.' : 'Vui lòng nhập một số lớn hơn 0.',
      };
    }

    const evalRes = evaluateMetricByWeek(
      meta.key,
      rawVal,
      activeWeek,
      preferences.language
    );
    const badgeText =
      evalRes.severity === 'danger'
        ? (isEn ? 'High Risk (Red)' : 'Nguy hiểm (Đỏ)')
        : evalRes.severity === 'warning'
        ? (isEn ? 'Monitor (Yellow)' : 'Cần theo dõi (Vàng)')
        : (isEn ? `Normal Week ${bounds.clampedWeek}` : `Đạt chuẩn tuần ${bounds.clampedWeek}`);

    return {
      meta: { ...meta, label: isEn ? meta.labelEn : meta.labelVi },
      bounds,
      isValidNumber: true,
      status: evalRes.severity,
      badgeText,
      message: evalRes.clinicalNote,
    };
  });

  const allNumbersValid = evaluatedMetrics.every((item) => item.isValidNumber);
  const dangerCount = evaluatedMetrics.filter((item) => item.status === 'danger').length;
  const warningCount = evaluatedMetrics.filter((item) => item.status === 'warning').length;
  const canSave = Boolean(parsedDate) && ageValid && allNumbersValid;

  const calendarOffset =
    (new Date(Date.UTC(calendarMonth.year, calendarMonth.month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(calendarMonth.year, calendarMonth.month + 1, 0)
  ).getUTCDate();
  const calendarCells = Array.from(
    { length: Math.ceil((calendarOffset + daysInMonth) / 7) * 7 },
    (_, index) =>
      index >= calendarOffset && index < calendarOffset + daysInMonth
        ? index - calendarOffset + 1
        : null
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

  const handleSaveManualResult = async () => {
    if (!canSave) return;

    try {
      const storageKey = await resolveAccountStorageKey();
      const existingData = await AsyncStorage.getItem(storageKey);
      const currentList = existingData ? JSON.parse(existingData) : [];

      const builtMetrics = evaluatedMetrics.map((item) => ({
        key: item.meta.key,
        label: item.meta.label,
        value: values[item.meta.key].trim(),
        unit: item.meta.unit,
        refRange: item.bounds.refRange,
        severity: item.status,
        clinicalNote: item.message,
      }));

      const summaryState = summarizeAnalysisState(
        builtMetrics,
        isEn ? `Checkup report on ${examDate}` : `Phiếu khám ngày ${examDate}`,
        activeWeek,
        preferences.language
      );

      const newManualRecord = {
        id: String(Date.now()),
        name: isEn
          ? `Manual Ultrasound Report (${examDate})`
          : `Phiếu siêu âm thủ công (${examDate})`,
        time: isEn
          ? `Exam date: ${examDate} · ${stageInfo.stageLabel}`
          : `Ngày khám: ${examDate} · ${stageInfo.stageLabel}`,
        status: 'done',
        analysis: {
          recordType: isEn
            ? `Ultrasound Results (${age.weeks.trim()}w ${effectiveDays}d · Month ${stageInfo.month})`
            : `Kết quả siêu âm (${age.weeks.trim()} tuần ${effectiveDays} ngày · Tháng thứ ${stageInfo.month})`,
          gestationalWeek: activeWeek,
          gestationalDays: Number(effectiveDays) || 0,
          gestationalAge: stageInfo.stageLabel,
          summary: isEn
            ? `Matched against biometry standards for ${stageInfo.stageLabel}.`
            : `Đã đối chiếu chuẩn sinh trắc học theo ${stageInfo.stageLabel}.`,
          doctorConclusion: summaryState.doctorConclusion,
          overallSeverity: summaryState.overallSeverity,
          savedToProfile: true,
          metrics: builtMetrics,
        },
      };

      const updatedList = [newManualRecord, ...currentList];
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));

      Keyboard.dismiss();
      navigation.navigate('UploadHome');
    } catch {
      Alert.alert(
        isEn ? 'Error' : 'Lỗi',
        isEn ? 'Unable to save result to device memory.' : 'Không thể lưu kết quả vào bộ nhớ máy.',
      );
    }
  };

  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_VI;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.surface }]} edges={['top']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Manual Result Entry' : 'Nhập kết quả thủ công'}
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.title, fontStyle(18.5, { min: 17, max: 22 }), { color: theme.text }]}>
            {isEn ? 'Weekly Ultrasound Results' : 'Kết quả khám thai theo tuần'}
          </Text>
          <Text style={[styles.subtitle, fontStyle(14, { lineHeight: 21, min: 13 }), { color: theme.muted }]}>
            {isEn
              ? 'Each gestational week has different reference thresholds. When you change the exam date or week, normal ranges update automatically.'
              : 'Mỗi tuần và tháng thai kỳ có ngưỡng chuẩn khác nhau. Khi bạn đổi ngày khám hoặc số tuần, bảng chuẩn dưới đây sẽ tự động cập nhật theo.'}
          </Text>

          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.fieldLabel, fontStyle(14.5, { lineHeight: 20, min: 13.5 }), { color: theme.text }]}>
              {isEn ? 'Checkup date' : 'Ngày khám'}
            </Text>
            <View
              style={[
                styles.inputBox,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                !parsedDate && { borderColor: theme.danger, borderWidth: 1.5 },
                { marginTop: 4 },
              ]}
            >
              <TextInput
                accessibilityLabel={isEn ? 'Checkup date DD/MM/YYYY' : 'Ngày khám, định dạng ngày tháng năm'}
                value={examDate}
                onChangeText={setExamDate}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={theme.muted}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                style={[styles.inputText, fontStyle(16, { min: 15 }), { color: theme.text }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Select checkup date' : 'Chọn ngày khám'}
                onPress={openCalendar}
                hitSlop={10}
              >
                <Ionicons name="calendar-outline" size={19} color={theme.text} />
              </Pressable>
            </View>
            {!parsedDate && (
              <Text style={[styles.dangerErrorText, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.danger }]}>
                {isEn ? 'Enter a valid date in DD/MM/YYYY format.' : 'Nhập ngày hợp lệ theo định dạng DD/MM/YYYY.'}
              </Text>
            )}

            <View style={styles.ageLabelRow}>
              <Text style={[styles.ageLabel, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.textSecondary }]}>
                {isEn ? 'Gestational age at checkup (12–41 weeks)' : 'Tuổi thai tại ngày khám (12 – 41 tuần)'}
              </Text>
              <View style={styles.autoAgeControl}>
                <Text style={[styles.autoAgeText, fontStyle(13, { min: 12 }), { color: theme.tealText }]}>
                  {isEn ? 'Auto' : 'Tự tính'}
                </Text>
                <Switch
                  accessibilityLabel={isEn ? 'Auto-calculate gestational age' : 'Tự tính tuổi thai theo ngày dự sinh'}
                  value={autoAge}
                  onValueChange={toggleAutoAge}
                  trackColor={{ false: theme.switchTrack, true: colors.primary }}
                  thumbColor={colors.white}
                  ios_backgroundColor={theme.switchTrack}
                  style={styles.ageSwitch}
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <View
                  style={[
                    styles.inputBox,
                    styles.ageInput,
                    { backgroundColor: autoAge ? theme.surfaceAlt : theme.surface, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    accessibilityLabel={isEn ? 'Gestational age, weeks' : 'Tuổi thai, số tuần'}
                    value={age.weeks}
                    onChangeText={(weeks) => setManualAge((prev) => ({ ...prev, weeks }))}
                    editable={!autoAge}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    style={[styles.inputText, fontStyle(16, { min: 15 }), { color: theme.text }]}
                  />
                  <Text style={[styles.unit, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
                    {isEn ? 'wks' : 'tuần'}
                  </Text>
                </View>
              </View>
              <View style={styles.halfField}>
                <View
                  style={[
                    styles.inputBox,
                    styles.ageInput,
                    { backgroundColor: autoAge ? theme.surfaceAlt : theme.surface, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    accessibilityLabel={isEn ? 'Gestational age, days' : 'Tuổi thai, số ngày'}
                    value={age.days}
                    onChangeText={(days) => setManualAge((prev) => ({ ...prev, days }))}
                    editable={!autoAge}
                    placeholder="0"
                    placeholderTextColor={theme.muted}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[styles.inputText, fontStyle(16, { min: 15 }), { color: theme.text }]}
                  />
                  <Text style={[styles.unit, fontStyle(13, { min: 12 }), { color: theme.muted }]}>
                    {isEn ? 'days' : 'ngày'}
                  </Text>
                </View>
              </View>
            </View>
            {!ageValid && (
              <Text style={[styles.dangerErrorText, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.danger }]}>
                {autoAge
                  ? (isEn
                      ? 'Date is outside 12–41 weeks. Turn off Auto to enter weeks manually.'
                      : 'Ngày khám không khớp tuổi thai 12–41 tuần. Hãy tắt “Tự tính” để nhập số tuần trực tiếp.')
                  : (isEn
                      ? 'Enter weeks between 12 and 41 (days 0–6).'
                      : 'Vui lòng nhập tuần thai từ 12–41 (ô ngày từ 0–6, nếu để trống sẽ tính là 0 ngày).')}
              </Text>
            )}

            <View style={[styles.stageBanner, { backgroundColor: theme.tealSoft }]}>
              <Ionicons name="analytics-outline" size={16} color={theme.tealText} />
              <Text style={[styles.stageBannerText, fontStyle(13, { lineHeight: 19, min: 12 }), { color: theme.tealText }]}>
                {isEn ? `Comparing against reference: ${stageLabelDisplay}` : `Đang so sánh theo chuẩn: ${stageLabelDisplay}`}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, fontStyle(15.5, { min: 14.5 }), { color: theme.text }]}>
              {isEn ? `Ultrasound Metrics (Week ${stageInfo.clampedWeek})` : `Chỉ số siêu âm (Chuẩn Tuần ${stageInfo.clampedWeek})`}
            </Text>
            {(dangerCount > 0 || warningCount > 0) && (
              <View style={[styles.warningBadge, { backgroundColor: dangerCount > 0 ? theme.dangerBackground : theme.badgeWarnBg }]}>
                <Text style={[styles.warningBadgeText, fontStyle(12, { min: 11, max: 14 }), { color: dangerCount > 0 ? theme.danger : theme.badgeWarnText }]}>
                  {dangerCount > 0
                    ? (isEn ? `${dangerCount} RED alert(s)` : `${dangerCount} chỉ số báo ĐỎ`)
                    : (isEn ? `${warningCount} YELLOW alert(s)` : `${warningCount} chỉ số báo VÀNG`)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metricsList}>
            {evaluatedMetrics.map(({ meta, bounds, status, badgeText, message }) => {
              const frameBg =
                status === 'danger'
                  ? theme.dangerBackground
                  : status === 'warning'
                    ? (preferences.darkMode ? '#2E2411' : '#FEFCE8')
                    : theme.surface;
              const frameBorder =
                status === 'danger'
                  ? theme.danger
                  : status === 'warning'
                    ? '#FACC15'
                    : theme.border;

              const pillStyle =
                status === 'danger'
                  ? { backgroundColor: theme.dangerBackground }
                  : status === 'warning'
                  ? { backgroundColor: theme.badgeWarnBg }
                  : { backgroundColor: theme.badgeGreenBg };

              const pillTextStyle =
                status === 'danger'
                  ? { color: theme.danger }
                  : status === 'warning'
                  ? { color: theme.badgeWarnText }
                  : { color: theme.badgeGreenText };

              return (
                <View key={meta.key} style={[styles.metricFrame, { backgroundColor: frameBg, borderColor: frameBorder }]}>
                  <View style={styles.metricHeaderRow}>
                    <Text style={[styles.fieldLabel, fontStyle(14.5, { lineHeight: 20, min: 13.5 }), { color: theme.text }]}>
                      {meta.label}
                    </Text>
                    <View style={[styles.statusPill, pillStyle]}>
                      <Text style={[styles.statusPillText, fontStyle(11.5, { min: 10.5, max: 13 }), pillTextStyle]}>
                        {badgeText}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.rangeHintText, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.tealText }]}>
                    {isEn
                      ? `Week ${bounds.clampedWeek} (Month ${stageInfo.month}): ${bounds.minNormal}–${bounds.maxNormal} ${meta.unit} · Red if < ${bounds.dangerLow} or > ${bounds.dangerHigh} ${meta.unit}`
                      : `Chuẩn Tuần ${bounds.clampedWeek} (Tháng ${stageInfo.month}): ${bounds.minNormal} – ${bounds.maxNormal} ${meta.unit} · Báo đỏ khi < ${bounds.dangerLow} hoặc > ${bounds.dangerHigh} ${meta.unit}`}
                  </Text>

                  <View
                    style={[
                      styles.inputBox,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      status === 'danger' && { borderColor: theme.danger, borderWidth: 1.5 },
                      status === 'warning' && { borderColor: '#F59E0B', borderWidth: 1.5 },
                    ]}
                  >
                    <TextInput
                      accessibilityLabel={meta.label}
                      value={values[meta.key]}
                      onChangeText={(val) => setValues((prev) => ({ ...prev, [meta.key]: val }))}
                      keyboardType="decimal-pad"
                      maxLength={8}
                      selectTextOnFocus
                      placeholder={isEn ? 'Enter value...' : 'Nhập chỉ số...'}
                      placeholderTextColor={theme.muted}
                      style={[
                        styles.inputText,
                        fontStyle(16, { min: 15 }),
                        { color: theme.text },
                        status === 'danger' && { color: theme.danger, fontWeight: '800' },
                        status === 'warning' && styles.warningInputText,
                      ]}
                    />
                    <Text style={[styles.unit, fontStyle(13, { min: 12 }), { color: theme.muted }]}>{meta.unit}</Text>
                    {status !== 'normal' && (
                      <Ionicons
                        name={status === 'danger' ? 'alert-circle' : 'warning'}
                        size={18}
                        color={status === 'danger' ? theme.danger : WARNING_COLOR}
                        style={styles.inputWarningIcon}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.evalNoteText,
                      fontStyle(13, { lineHeight: 19, min: 12 }),
                      { color: status === 'danger' ? theme.danger : status === 'warning' ? WARNING_COLOR : theme.tealText },
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <Text style={[styles.saveHint, fontStyle(13, { lineHeight: 19, min: 12 }), { color: theme.textSecondary }]}>
            {canSave
              ? (isEn
                  ? `Compared against ${stageLabelDisplay}. Tap Save to view on Upload screen.`
                  : `Đã đối chiếu theo ${stageLabelDisplay}. Bấm Lưu để chuyển sang trang Tải lên.`)
              : (isEn
                  ? 'Please enter valid gestational age (12–41 weeks) and values greater than 0.'
                  : 'Vui lòng nhập đầy đủ tuổi thai (12–41 tuần) và các chỉ số lớn hơn 0.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            disabled={!canSave}
            onPress={handleSaveManualResult}
            style={({ pressed }) => [
              styles.saveButton,
              !canSave && { backgroundColor: theme.surfaceAlt },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={canSave ? 'save-outline' : 'lock-closed-outline'}
              size={18}
              color={canSave ? colors.white : theme.muted}
            />
            <Text style={[styles.saveButtonText, fontStyle(15, { min: 14, max: 17 }), !canSave && { color: theme.muted }]}>
              {isEn ? 'Save & View on Upload' : 'Lưu kết quả & Xem trên trang Tải lên'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCalendarOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={isEn ? 'Close calendar' : 'Đóng lịch'}
          />
          <View style={[styles.calendarCard, { backgroundColor: theme.surface }]} accessibilityViewIsModal>
            <View style={styles.calendarHeader}>
              <Text style={[styles.calendarTitle, fontStyle(17, { max: 20 }), { color: theme.text }]}>
                {isEn ? 'Select checkup date' : 'Chọn ngày khám'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Close calendar' : 'Đóng lịch'}
                onPress={() => setCalendarOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={theme.muted} />
              </Pressable>
            </View>
            <View style={styles.calendarMonthRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Previous month' : 'Tháng trước'}
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-back" size={20} color={theme.text} />
              </Pressable>
              <Text style={[styles.calendarMonth, fontStyle(15, { min: 14, max: 17.5 }), { color: theme.text }]}>
                {isEn
                  ? `${MONTH_NAMES_EN[calendarMonth.month]} ${calendarMonth.year}`
                  : `Tháng ${calendarMonth.month + 1}, ${calendarMonth.year}`}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Next month' : 'Tháng sau'}
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {weekdays.map((day) => (
                <Text key={day} style={[styles.calendarWeekday, fontStyle(12.5, { min: 11.5, max: 14 }), { color: theme.muted }]}>
                  {day}
                </Text>
              ))}
              {calendarCells.map((day, index) => {
                const selected =
                  day !== null &&
                  parsedDate?.getUTCFullYear() === calendarMonth.year &&
                  parsedDate.getUTCMonth() === calendarMonth.month &&
                  parsedDate.getUTCDate() === day;
                return (
                  <View key={index} style={styles.calendarCell}>
                    {day !== null && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${day}/${calendarMonth.month + 1}/${calendarMonth.year}`}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setExamDate(
                            `${pad(day)}/${pad(calendarMonth.month + 1)}/${calendarMonth.year}`
                          );
                          setCalendarOpen(false);
                        }}
                        style={[styles.calendarDay, selected && styles.calendarDaySelected]}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            fontStyle(14, { min: 12.5, max: 16 }),
                            { color: theme.text },
                            selected && styles.calendarDayTextSelected,
                          ]}
                        >
                          {day}
                        </Text>
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

const WARNING_COLOR = '#B45309';
const BORDER_COLOR = '#DCE5F0';

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F7F9FC' },
  header: {
    height: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },
  headerSpacer: { width: 40 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16.5, fontWeight: '700', color: colors.navy },
  pressed: { opacity: 0.75 },
  scrollContent: { padding: 18, paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 5,
    marginBottom: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 14,
  },
  stageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  stageBannerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
    flex: 1,
  },
  metricsList: {
    gap: 12,
  },
  metricFrame: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
  },
  metricFrameNormal: {
    backgroundColor: colors.white,
    borderColor: BORDER_COLOR,
  },
  metricFrameWarning: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FACC15',
  },
  metricFrameDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  fieldLabel: { fontSize: 12.5, fontWeight: '800', color: colors.navy, flex: 1 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillNormal: { backgroundColor: '#DCFCE7' },
  pillWarning: { backgroundColor: '#FEF08A' },
  pillDanger: { backgroundColor: '#FEE2E2' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  pillTextNormal: { color: '#15803D' },
  pillTextWarning: { color: '#854D0E' },
  pillTextDanger: { color: '#991B1B' },
  rangeHintText: { fontSize: 11, color: '#0F766E', fontWeight: '700', marginBottom: 8, lineHeight: 15 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.white,
  },
  inputBoxWarning: { backgroundColor: '#FFFFFF', borderColor: '#F59E0B', borderWidth: 1.5 },
  inputBoxDanger: { backgroundColor: '#FFFFFF', borderColor: '#DC2626', borderWidth: 1.5 },
  inputText: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 0,
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  warningInputText: { color: WARNING_COLOR, fontWeight: '800' },
  dangerInputText: { color: '#DC2626', fontWeight: '800' },
  unit: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, marginLeft: 5 },
  inputWarningIcon: { marginLeft: 7 },
  evalNoteText: { fontSize: 11, lineHeight: 15, color: '#15803D', marginTop: 6, fontWeight: '600' },
  warningErrorText: { color: WARNING_COLOR, fontWeight: '700' },
  dangerErrorText: { fontSize: 11, lineHeight: 15, color: '#DC2626', marginTop: 6, fontWeight: '700' },
  ageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 7,
  },
  ageLabel: { flex: 1, fontSize: 11.5, fontWeight: '700', color: '#344663' },
  autoAgeControl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoAgeText: { fontSize: 11, fontWeight: '600', color: colors.primaryDark },
  ageSwitch: { transform: [{ scale: 0.75 }], marginVertical: -6, marginRight: -6 },
  fieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  halfField: { flex: 1, minWidth: 0 },
  ageInput: { minHeight: 38 },
  readOnlyInput: { backgroundColor: '#F7F9FC', borderColor: '#F7F9FC' },
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14.5, fontWeight: '800', color: '#334155' },
  warningBadge: { backgroundColor: '#FEF08A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  warningBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#854D0E' },
  dangerBadge: { backgroundColor: '#FEE2E2' },
  dangerBadgeText: { color: '#DC2626' },
  footer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
  },
  saveHint: { textAlign: 'center', fontSize: 11.5, lineHeight: 17, color: '#344663', marginBottom: 8 },
  saveButton: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  saveButtonDisabled: { backgroundColor: '#E2E8F0' },
  saveButtonText: { fontSize: 13.5, fontWeight: '800', color: colors.white },
  saveButtonTextDisabled: { color: '#7C8FA8' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  calendarCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  calendarMonth: { fontSize: 14, fontWeight: '600', color: colors.navy },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarWeekday: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: 8,
  },
  calendarCell: {
    width: '14.285714%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDay: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: { backgroundColor: colors.primary },
  calendarDayText: { fontSize: 13, color: colors.navy },
  calendarDayTextSelected: { color: colors.white, fontWeight: '700' },
});