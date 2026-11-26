import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  evaluateMetricByWeek,
  getFetalMetricBoundsByWeek,
  getPregnancyStageInfo,
  type SeverityLevel,
} from './UploadScreen';
import { fetchPregnancyProfileFromDB } from '../services/api';
import {
  MANUAL_FIELD_BOUNDS,
  parseMetricNumber,
  submitManualFormResult,
  type ManualFormValues,
  type ManualNumericFieldKey,
} from '../services/manualEntry.service';

type Props = NativeStackScreenProps<UploadStackParamList, 'ManualResultEntry'>;
type FetalCoreKey = 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';
type MetricMeta<K extends string = string> = {
  key: K;
  label: string;
  unit: string;
  required: boolean;
  hint?: string;
  keyboardType?: 'decimal-pad' | 'default';
  placeholder?: string;
};

const CORE_BIOMETRIC_META: MetricMeta<FetalCoreKey>[] = [
  { key: 'bpd', label: 'BPD · Đường kính lưỡng đỉnh', unit: 'mm', required: true },
  { key: 'hc', label: 'HC · Chu vi đầu', unit: 'mm', required: true },
  { key: 'ac', label: 'AC · Chu vi vòng bụng', unit: 'mm', required: true },
  { key: 'fl', label: 'FL · Chiều dài xương đùi', unit: 'mm', required: true },
  { key: 'efw', label: 'EFW · Cân nặng thai ước tính', unit: 'g', required: true },
];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
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

function getLocalTodayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function getGestationalAge(date: Date | null, eddDate: Date | null) {
  if (!date || !eddDate) return null;
  const totalDays = 280 - Math.round((eddDate.getTime() - date.getTime()) / DAY_IN_MS);
  if (totalDays < 0 || totalDays > 42 * 7 + 6) return null;
  return { weeks: String(Math.floor(totalDays / 7)), days: String(totalDays % 7) };
}

export default function ManualResultEntryScreen({ navigation }: Props) {
  const [examDate, setExamDate] = useState('');
  const [autoAge, setAutoAge] = useState(true);
  const [manualAge, setManualAge] = useState({ weeks: '', days: '' });
  const [values, setValues] = useState<ManualFormValues>({
    bpd: '',
    hc: '',
    ac: '',
    fl: '',
    efw: '',
    weight: '',
    systolicBp: '',
    diastolicBp: '',
    notes: '',
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [eddDate, setEddDate] = useState<Date | null>(null);
  const [calendarMonth, setCalendarMonth] = useState({ year: 2026, month: 5 });
  const [submitting, setSubmitting] = useState(false);

  const setFieldValue = (key: keyof ManualFormValues, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
  };

  const parsedDate = parseDate(examDate);
  const isFutureDate = Boolean(parsedDate && parsedDate.getTime() > getLocalTodayUtcMidnight().getTime());
  const dateValid = Boolean(parsedDate) && !isFutureDate;

  useEffect(() => {
    fetchPregnancyProfileFromDB().then((profile) => {
      const rawEdd = profile?.edd || profile?.estimated_due_date;
      if (typeof rawEdd === 'string') {
        const date = new Date(`${rawEdd.slice(0, 10)}T00:00:00Z`);
        if (!Number.isNaN(date.getTime())) setEddDate(date);
      }
    }).catch(() => undefined);
  }, []);
  const calculatedAge = getGestationalAge(parsedDate, eddDate);
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
  const stageInfo = getPregnancyStageInfo(activeWeek);

  const evaluatedCoreMetrics = CORE_BIOMETRIC_META.map((meta) => {
    const rawVal = values[meta.key].trim();
    const bounds = getFetalMetricBoundsByWeek(meta.key, activeWeek, meta.unit);
    const fieldBound = MANUAL_FIELD_BOUNDS[meta.key];
    const num = parseMetricNumber(rawVal);
    const inRange = num !== undefined && num >= fieldBound.min && num <= fieldBound.max;

    if (!rawVal) {
      return {
        meta,
        bounds,
        isFilled: false,
        isValidNumber: false,
        status: 'normal' as SeverityLevel,
        badgeText: 'Bắt buộc *',
        message: `Chỉ số quan trọng cần nhập (${fieldBound.min}–${fieldBound.max} ${meta.unit}).`,
      };
    }

    if (!inRange) {
      return {
        meta,
        bounds,
        isFilled: true,
        isValidNumber: false,
        status: 'danger' as SeverityLevel,
        badgeText: 'Ngoài ngưỡng',
        message: `Vui lòng nhập số hợp lệ từ ${fieldBound.min} đến ${fieldBound.max} ${meta.unit}.`,
      };
    }

    const evalRes = evaluateMetricByWeek(meta.key, rawVal, activeWeek);
    const badgeText =
      evalRes.severity === 'danger'
        ? 'Nguy hiểm (Đỏ)'
        : evalRes.severity === 'warning'
        ? 'Cần theo dõi (Vàng)'
        : 'Đạt chuẩn tuần ' + bounds.clampedWeek;

    return {
      meta,
      bounds,
      isFilled: true,
      isValidNumber: true,
      status: evalRes.severity,
      badgeText,
      message: evalRes.clinicalNote,
    };
  });

  // Đánh giá Sinh hiệu mẹ (tùy chọn)
  const rawWeight = (values.weight ?? '').trim();
  const weightNum = parseMetricNumber(rawWeight);
  const weightBound = MANUAL_FIELD_BOUNDS.weight;
  const weightValid =
    !rawWeight || (weightNum !== undefined && weightNum >= weightBound.min && weightNum <= weightBound.max);

  const rawSys = (values.systolicBp ?? '').trim();
  const rawDia = (values.diastolicBp ?? '').trim();
  const sysNum = parseMetricNumber(rawSys);
  const diaNum = parseMetricNumber(rawDia);
  const sysBound = MANUAL_FIELD_BOUNDS.systolicBp;
  const diaBound = MANUAL_FIELD_BOUNDS.diastolicBp;
  const bothBpBlank = !rawSys && !rawDia;
  const bothBpPresent = Boolean(rawSys) && Boolean(rawDia);
  const bpValid =
    bothBpBlank ||
    (bothBpPresent &&
      sysNum !== undefined &&
      diaNum !== undefined &&
      sysNum >= sysBound.min &&
      sysNum <= sysBound.max &&
      diaNum >= diaBound.min &&
      diaNum <= diaBound.max &&
      sysNum > diaNum);
  const bpEval =
    bothBpPresent && bpValid
      ? evaluateMetricByWeek('bp', `${Math.round(sysNum!)}/${Math.round(diaNum!)}`, activeWeek)
      : null;

  const allRequiredCoreValid = evaluatedCoreMetrics.every((item) => item.isValidNumber);
  const allOptionalValid = weightValid && bpValid;

  const dangerCount = [
    ...evaluatedCoreMetrics.filter((i) => i.isFilled && i.status === 'danger'),
    ...(bpEval?.severity === 'danger' ? [bpEval] : []),
  ].length;
  const warningCount = [
    ...evaluatedCoreMetrics.filter((i) => i.isFilled && i.status === 'warning'),
    ...(bpEval?.severity === 'warning' ? [bpEval] : []),
  ].length;

  const canSave = dateValid && ageValid && allRequiredCoreValid && allOptionalValid;

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
    if (!canSave || !dateValid || submitting) return;
    Keyboard.dismiss();
    setSubmitting(true);

    try {
      await submitManualFormResult({
        examDate,
        values,
        gestationalAge: {
          weeks: age.weeks,
          days: effectiveDays,
        },
      });

      Alert.alert(
        'Gửi kết quả thành công',
        'Kết quả phiếu khám đã được lưu vào hệ thống và đang chờ Bác sĩ duyệt.',
        [
          {
            text: 'Đồng ý',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      console.log('Lỗi gửi kết quả nhập tay:', err);
      Alert.alert(
        'Không thể lưu kết quả',
        err?.message || 'Có lỗi xảy ra khi gửi dữ liệu lên máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={styles.title}>Kết quả khám thai đầy đủ</Text>
          <Text style={styles.subtitle}>
            Form chỉ hiển thị các mục có trường lưu riêng cho lần khám. Ngưỡng đối chiếu sẽ cập nhật theo ngày khám và tuổi thai.
          </Text>

          <View style={styles.requiredLegendBox}>
            <Ionicons name="information-circle-outline" size={16} color="#0F766E" />
            <Text style={styles.requiredLegendText}>
              Các mục có dấu <Text style={styles.requiredStar}>*</Text> là chỉ số bắt buộc. Cân nặng mẹ và huyết áp là tùy chọn, có thể để trống nếu phiếu không ghi.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>
              Ngày khám <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.inputBox, !dateValid && styles.inputBoxDanger, { marginTop: 4 }]}>
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chọn ngày khám"
                onPress={openCalendar}
                hitSlop={10}
              >
                <Ionicons name="calendar-outline" size={19} color="#334155" />
              </Pressable>
            </View>
            {!dateValid && (
              <Text style={styles.dangerErrorText}>
                {isFutureDate
                  ? 'Ngày khám không được lớn hơn ngày hiện tại.'
                  : 'Nhập ngày hợp lệ theo định dạng DD/MM/YYYY.'}
              </Text>
            )}

            <View style={styles.ageLabelRow}>
              <Text style={styles.ageLabel}>
                Tuổi thai tại ngày khám (12 – 41 tuần) <Text style={styles.requiredStar}>*</Text>
              </Text>
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
                    onChangeText={(weeks) => setManualAge((prev) => ({ ...prev, weeks }))}
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
                    onChangeText={(days) => setManualAge((prev) => ({ ...prev, days }))}
                    editable={!autoAge}
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
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
              <Text style={styles.dangerErrorText}>
                {autoAge
                  ? 'Ngày khám không khớp tuổi thai 12–41 tuần. Hãy tắt “Tự tính” để nhập số tuần trực tiếp.'
                  : 'Vui lòng nhập tuần thai từ 12–41 (ô ngày từ 0–6, nếu để trống sẽ tính là 0 ngày).'}
              </Text>
            )}

            <View style={styles.stageBanner}>
              <Ionicons name="analytics-outline" size={16} color="#0F766E" />
              <Text style={styles.stageBannerText}>
                Đang so sánh theo chuẩn: {stageInfo.stageLabel}
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              Chỉ số siêu âm bắt buộc (*) · Tuần {stageInfo.clampedWeek}
            </Text>
            {(dangerCount > 0 || warningCount > 0) && (
              <View style={[styles.warningBadge, dangerCount > 0 && styles.dangerBadge]}>
                <Text style={[styles.warningBadgeText, dangerCount > 0 && styles.dangerBadgeText]}>
                  {dangerCount > 0
                    ? `${dangerCount} chỉ số báo ĐỎ`
                    : `${warningCount} chỉ số báo VÀNG`}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.metricsList}>
            {evaluatedCoreMetrics.map(({ meta, bounds, isFilled, isValidNumber, status, badgeText, message }) => {
              const showInvalid = isFilled && !isValidNumber;
              const frameStyle = showInvalid || (isFilled && status === 'danger')
                ? styles.metricFrameDanger
                : isFilled && status === 'warning'
                ? styles.metricFrameWarning
                : styles.metricFrameNormal;

              const pillStyle = !isFilled
                ? styles.pillRequired
                : status === 'danger'
                ? styles.pillDanger
                : status === 'warning'
                ? styles.pillWarning
                : styles.pillNormal;

              const pillTextStyle = !isFilled
                ? styles.pillTextRequired
                : status === 'danger'
                ? styles.pillTextDanger
                : status === 'warning'
                ? styles.pillTextWarning
                : styles.pillTextNormal;

              return (
                <View key={meta.key} style={[styles.metricFrame, frameStyle]}>
                  <View style={styles.metricHeaderRow}>
                    <Text style={styles.fieldLabel}>
                      {meta.label} <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <View style={[styles.statusPill, pillStyle]}>
                      <Text style={[styles.statusPillText, pillTextStyle]}>{badgeText}</Text>
                    </View>
                  </View>

                  <Text style={styles.rangeHintText}>
                    Chuẩn Tuần {bounds.clampedWeek} (Tháng {stageInfo.month}): {bounds.minNormal} – {bounds.maxNormal} {meta.unit} · Báo đỏ khi {'<'} {bounds.dangerLow} hoặc {'>'} {bounds.dangerHigh} {meta.unit}
                  </Text>

                  <View
                    style={[
                      styles.inputBox,
                      isFilled && status === 'danger' && styles.inputBoxDanger,
                      isFilled && status === 'warning' && styles.inputBoxWarning,
                    ]}
                  >
                    <TextInput
                      accessibilityLabel={`${meta.label}, bắt buộc`}
                      value={values[meta.key]}
                      onChangeText={(val) => setFieldValue(meta.key, val)}
                      keyboardType="decimal-pad"
                      maxLength={8}
                      selectTextOnFocus
                      placeholder="Bắt buộc nhập..."
                      placeholderTextColor="#94A3B8"
                      style={[
                        styles.inputText,
                        isFilled && status === 'danger' && styles.dangerInputText,
                        isFilled && status === 'warning' && styles.warningInputText,
                      ]}
                    />
                    <Text style={styles.unit}>{meta.unit}</Text>
                    {isFilled && status !== 'normal' && (
                      <Ionicons
                        name={status === 'danger' ? 'alert-circle' : 'warning'}
                        size={18}
                        color={status === 'danger' ? '#DC2626' : WARNING_COLOR}
                        style={styles.inputWarningIcon}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.evalNoteText,
                      !isFilled && styles.optionalNoteText,
                      isFilled && status === 'warning' && styles.warningErrorText,
                      isFilled && status === 'danger' && styles.dangerErrorText,
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Sinh hiệu của mẹ (Tùy chọn)</Text>
          </View>
          <View style={styles.metricsList}>
            <View style={[styles.metricFrame, !weightValid ? styles.metricFrameDanger : styles.metricFrameNormal]}>
              <View style={styles.metricHeaderRow}>
                <Text style={styles.fieldLabel}>Cân nặng mẹ</Text>
                <View style={[styles.statusPill, !rawWeight ? styles.pillMuted : weightValid ? styles.pillNormal : styles.pillDanger]}>
                  <Text style={[styles.statusPillText, !rawWeight ? styles.pillTextMuted : weightValid ? styles.pillTextNormal : styles.pillTextDanger]}>
                    {!rawWeight ? 'Tùy chọn' : weightValid ? 'Hợp lệ' : 'Ngoài ngưỡng'}
                  </Text>
                </View>
              </View>
              <View style={[styles.inputBox, !weightValid && styles.inputBoxDanger]}>
                <TextInput
                  accessibilityLabel="Cân nặng mẹ"
                  value={values.weight ?? ''}
                  onChangeText={(val) => setFieldValue('weight', val)}
                  keyboardType="decimal-pad"
                  maxLength={6}
                  placeholder="Để trống nếu không đo..."
                  placeholderTextColor="#94A3B8"
                  style={styles.inputText}
                />
                <Text style={styles.unit}>kg</Text>
              </View>
              {!weightValid && (
                <Text style={styles.dangerErrorText}>Cân nặng mẹ cần trong khoảng 30–200 kg.</Text>
              )}
            </View>

            <View
              style={[
                styles.metricFrame,
                !bpValid || bpEval?.severity === 'danger'
                  ? styles.metricFrameDanger
                  : bpEval?.severity === 'warning'
                  ? styles.metricFrameWarning
                  : styles.metricFrameNormal,
              ]}
            >
              <View style={styles.metricHeaderRow}>
                <Text style={styles.fieldLabel}>Huyết áp mẹ (Tâm thu / Tâm trương)</Text>
                <View
                  style={[
                    styles.statusPill,
                    bothBpBlank
                      ? styles.pillMuted
                      : !bpValid || bpEval?.severity === 'danger'
                      ? styles.pillDanger
                      : bpEval?.severity === 'warning'
                      ? styles.pillWarning
                      : styles.pillNormal,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      bothBpBlank
                        ? styles.pillTextMuted
                        : !bpValid || bpEval?.severity === 'danger'
                        ? styles.pillTextDanger
                        : bpEval?.severity === 'warning'
                        ? styles.pillTextWarning
                        : styles.pillTextNormal,
                    ]}
                  >
                    {bothBpBlank
                      ? 'Tùy chọn'
                      : !bpValid
                      ? 'Chưa hợp lệ'
                      : bpEval?.severity === 'danger'
                      ? 'Cần lưu ý (Đỏ)'
                      : bpEval?.severity === 'warning'
                      ? 'Theo dõi (Vàng)'
                      : 'Ổn định'}
                  </Text>
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.halfField}>
                  <View style={[styles.inputBox, !bpValid && styles.inputBoxDanger]}>
                    <TextInput
                      accessibilityLabel="Huyết áp tâm thu"
                      value={values.systolicBp ?? ''}
                      onChangeText={(val) => setFieldValue('systolicBp', val)}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="Tâm thu (VD: 118)"
                      placeholderTextColor="#94A3B8"
                      style={styles.inputText}
                    />
                    <Text style={styles.unit}>mmHg</Text>
                  </View>
                </View>
                <View style={styles.halfField}>
                  <View style={[styles.inputBox, !bpValid && styles.inputBoxDanger]}>
                    <TextInput
                      accessibilityLabel="Huyết áp tâm trương"
                      value={values.diastolicBp ?? ''}
                      onChangeText={(val) => setFieldValue('diastolicBp', val)}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="Tâm trương (VD: 76)"
                      placeholderTextColor="#94A3B8"
                      style={styles.inputText}
                    />
                    <Text style={styles.unit}>mmHg</Text>
                  </View>
                </View>
              </View>
              <Text
                style={[
                  styles.evalNoteText,
                  bothBpBlank && styles.optionalNoteText,
                  bpEval?.severity === 'warning' && styles.warningErrorText,
                  (!bpValid || bpEval?.severity === 'danger') && styles.dangerErrorText,
                ]}
              >
                {bothBpBlank
                  ? 'Có thể bỏ trống nếu không đo; nếu nhập cần điền đủ cả 2 ô.'
                  : !bpValid
                  ? 'Cần nhập đủ Tâm thu (60–250) > Tâm trương (40–150).'
                  : bpEval?.clinicalNote}
              </Text>
            </View>
          </View>

          <View style={styles.metricsList}>
            <View style={[styles.metricFrame, styles.metricFrameNormal]}>
              <View style={styles.metricHeaderRow}>
                <Text style={styles.fieldLabel}>Ghi chú thêm từ phiếu khám</Text>
                <View style={[styles.statusPill, styles.pillMuted]}>
                  <Text style={[styles.statusPillText, styles.pillTextMuted]}>Tùy chọn</Text>
                </View>
              </View>
              <TextInput
                accessibilityLabel="Ghi chú thêm từ phiếu khám"
                value={values.notes ?? ''}
                onChangeText={(val) => setFieldValue('notes', val)}
                placeholder="VD: Ngôi thai thuận, dặn dò của bác sĩ..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={styles.notesInput}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.saveHint}>
            {canSave
              ? `Đã đủ các mục bắt buộc (*) theo ${stageInfo.stageLabel}. Bạn có thể gửi kết quả để Bác sĩ duyệt.`
              : 'Vui lòng nhập Ngày khám (*), Tuổi thai (*) và đủ 5 chỉ số siêu âm (*). Cân nặng mẹ và huyết áp có thể bỏ trống.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave || submitting }}
            disabled={!canSave || submitting}
            onPress={handleSaveManualResult}
            style={({ pressed }) => [
              styles.saveButton,
              (!canSave || submitting) && styles.saveButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name={canSave ? 'cloud-upload-outline' : 'lock-closed-outline'}
                size={18}
                color={canSave ? colors.white : '#7C8FA8'}
              />
            )}
            <Text style={[styles.saveButtonText, (!canSave || submitting) && styles.saveButtonTextDisabled]}>
              {submitting ? 'Đang gửi kết quả...' : 'Gửi kết quả cho bác sĩ duyệt'}
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
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCalendarOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Đóng lịch"
          />
          <View style={styles.calendarCard} accessibilityViewIsModal>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Chọn ngày khám</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng lịch"
                onPress={() => setCalendarOpen(false)}
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.calendarMonthRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tháng trước"
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-back" size={20} color={colors.navy} />
              </Pressable>
              <Text style={styles.calendarMonth}>
                Tháng {calendarMonth.month + 1}, {calendarMonth.year}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tháng sau"
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
              >
                <Ionicons name="chevron-forward" size={20} color={colors.navy} />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.calendarWeekday}>
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
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F9FC',
  },
  headerSpacer: { width: 32 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.navy },
  pressed: { opacity: 0.75 },
  scrollContent: { padding: 18, paddingBottom: 24 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 5,
    marginBottom: 10,
  },
  requiredLegendBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 14,
  },
  requiredLegendText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#115E59',
    fontWeight: '600',
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '900',
  },
  optionalGroupHint: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: -4,
    marginBottom: 10,
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
  pillRequired: { backgroundColor: '#FEE2E2' },
  pillMuted: { backgroundColor: '#F1F5F9' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  pillTextNormal: { color: '#15803D' },
  pillTextWarning: { color: '#854D0E' },
  pillTextDanger: { color: '#991B1B' },
  pillTextRequired: { color: '#B91C1C' },
  pillTextMuted: { color: '#64748B' },
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
  optionalNoteText: { color: '#64748B', fontWeight: '500' },
  warningErrorText: { color: WARNING_COLOR, fontWeight: '700' },
  dangerErrorText: { fontSize: 11, lineHeight: 15, color: '#DC2626', marginTop: 6, fontWeight: '700' },
  notesInput: {
    minHeight: 74,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    fontSize: 13,
    color: colors.navy,
  },
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
