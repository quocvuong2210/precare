import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import type { RootStackParamList } from '../navigation/AppNavigator';
import {
  calculatePregnancyProfile,
  currentUserProfile,
  restoreSession,
  savePregnancyProfileToDB,
  type PregnancyCalculateRequest,
  type PregnancyCalculationMethod,
} from '../services/api';
import { colors } from '../theme/colors';
import {
  formatDmyInput,
  formatIsoToDmy,
  getTodayISO,
  parseStrictDmyToIso,
} from '../utils/date';

type Props = NativeStackScreenProps<RootStackParamList, 'PregnancySetup'>;
type Preview = { weeks: number; days: number; edd: string; trimesterNum?: number; trimester?: string };

const METHODS: {
  id: PregnancyCalculationMethod;
  titleVi: string;
  titleEn: string;
  descVi: string;
  descEn: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: 'lmp',
    titleVi: 'Ngày kinh cuối',
    titleEn: 'Last menstrual period',
    descVi: 'Mẹ nhớ ngày đầu của kỳ kinh cuối cùng.',
    descEn: 'Use the first day of your last menstrual period.',
    icon: 'calendar-outline',
  },
  {
    id: 'q1_ultrasound',
    titleVi: 'Siêu âm quý 1',
    titleEn: '1st trimester ultrasound',
    descVi: 'Mẹ có phiếu siêu âm ghi tuần thai.',
    descEn: 'Enter the gestational age shown on your Q1 scan report.',
    icon: 'scan-outline',
  },
  {
    id: 'crl',
    titleVi: 'Chỉ số CRL',
    titleEn: 'CRL measurement',
    descVi: 'Mẹ có kết quả siêu âm ghi chiều dài đầu mông.',
    descEn: 'Enter crown-rump length (CRL) from your Q1 scan.',
    icon: 'resize-outline',
  },
  {
    id: 'direct_edd',
    titleVi: 'Ngày dự sinh',
    titleEn: 'Estimated due date',
    descVi: 'Bác sĩ đã xác định ngày dự sinh cho mẹ.',
    descEn: 'Use the due date already assigned by your doctor.',
    icon: 'flag-outline',
  },
];

export default function PregnancySetupScreen({ navigation }: Props) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';

  const [method, setMethod] = useState<PregnancyCalculationMethod>('lmp');
  const [lmp, setLmp] = useState('');
  const [ultrasoundDate, setUltrasoundDate] = useState('');
  const [weeks, setWeeks] = useState('');
  const [days, setDays] = useState('0');
  const [crl, setCrl] = useState('');
  const [edd, setEdd] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const methodDescription = useMemo(() => {
    const found = METHODS.find((item) => item.id === method);
    return found ? (isEn ? found.descEn : found.descVi) : '';
  }, [isEn, method]);

  const makePayload = (): (PregnancyCalculateRequest & { calculation_method: PregnancyCalculationMethod }) | null => {
    const payload: PregnancyCalculateRequest & { calculation_method: PregnancyCalculationMethod } = {
      target_date: getTodayISO(),
      calculation_method: method,
    };
    if (method === 'lmp') {
      const parsed = parseStrictDmyToIso(lmp);
      if (!parsed) {
        setError(
          isEn
            ? 'Please enter LMP in DD/MM/YYYY format, e.g. 12/05/2026.'
            : 'Mẹ nhập ngày kinh cuối đúng định dạng DD/MM/YYYY, ví dụ 12/05/2026.',
        );
        return null;
      }
      payload.lmp = parsed;
    } else if (method === 'q1_ultrasound' || method === 'crl') {
      const parsed = parseStrictDmyToIso(ultrasoundDate);
      if (!parsed) {
        setError(
          isEn
            ? 'Please enter scan date in DD/MM/YYYY format, e.g. 12/05/2026.'
            : 'Mẹ nhập ngày siêu âm đúng định dạng DD/MM/YYYY, ví dụ 12/05/2026.',
        );
        return null;
      }
      payload.q1_ultrasound_date = parsed;
      if (method === 'q1_ultrasound') {
        const gestationalWeeks = Number(weeks);
        const gestationalDays = Number(days || '0');
        if (!Number.isInteger(gestationalWeeks) || gestationalWeeks < 6 || gestationalWeeks > 14) {
          setError(
            isEn
              ? 'First-trimester scan weeks are typically between 6 and 14.'
              : 'Tuần thai trên phiếu siêu âm quý 1 thường từ 6 đến 14 tuần.',
          );
          return null;
        }
        if (!Number.isInteger(gestationalDays) || gestationalDays < 0 || gestationalDays > 6) {
          setError(
            isEn
              ? 'Remaining days must be between 0 and 6.'
              : 'Số ngày lẻ cần nằm trong khoảng 0 đến 6.',
          );
          return null;
        }
        payload.q1_gestational_weeks = gestationalWeeks;
        payload.q1_gestational_days = gestationalDays;
      } else {
        const crlMm = Number(crl);
        if (!Number.isFinite(crlMm) || crlMm < 10 || crlMm > 84) {
          setError(
            isEn
              ? 'CRL must be between 10 and 84 mm.'
              : 'CRL cần nằm trong khoảng 10 đến 84 mm theo phạm vi hỗ trợ hiện tại.',
          );
          return null;
        }
        payload.crl_mm = crlMm;
      }
    } else {
      const parsed = parseStrictDmyToIso(edd);
      if (!parsed) {
        setError(
          isEn
            ? 'Please enter due date in DD/MM/YYYY format, e.g. 12/02/2027.'
            : 'Mẹ nhập ngày dự sinh đúng định dạng DD/MM/YYYY, ví dụ 12/02/2027.',
        );
        return null;
      }
      payload.override_edd = parsed;
    }
    return payload;
  };

  const calculate = async () => {
    setError('');
    setPreview(null);
    const payload = makePayload();
    if (!payload) return;
    setLoading(true);
    try {
      const result = await calculatePregnancyProfile(payload);
      const data = result?.data || result;
      const age = data?.gestational_age;
      if (age?.weeks === undefined || !data?.calculated_edd) {
        throw new Error(
          isEn
            ? 'Server did not return gestational age. Please try again.'
            : 'Máy chủ chưa trả đủ kết quả tuổi thai. Mẹ thử lại giúp mình nhé.',
        );
      }
      setPreview({
        weeks: age.weeks,
        days: age.remaining_days ?? 0,
        edd: String(data.calculated_edd).slice(0, 10),
        trimesterNum: age.trimester,
        trimester: age.trimester_name,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (isEn ? 'Unable to calculate gestational age. Please check your inputs.' : 'Chưa tính được tuổi thai. Mẹ kiểm tra thông tin rồi thử lại nhé.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setError('');
    const payload = makePayload();
    if (!payload) return;
    setLoading(true);
    try {
      await savePregnancyProfileToDB({ ...payload, edd: preview?.edd });

      const account = currentUserProfile || (await restoreSession());
      const identifier = (account?.email || account?.id || 'guest').trim().toLowerCase();
      const savedProfile = {
        lmp: payload.lmp || '',
        q1_ultrasound_date: payload.q1_ultrasound_date || '',
        q1_gestational_weeks: payload.q1_gestational_weeks === undefined ? '' : String(payload.q1_gestational_weeks),
        q1_gestational_days: payload.q1_gestational_days === undefined ? '' : String(payload.q1_gestational_days),
        crl_mm: payload.crl_mm === undefined ? '' : String(payload.crl_mm),
        override_edd: payload.override_edd || '',
      };
      await AsyncStorage.setItem(`precare_account_record_${identifier}`, JSON.stringify({
        profile: savedProfile,
        trimester: preview?.trimester || '',
        gestationalAge: `${preview?.weeks ?? 0} tuần ${preview?.days ?? 0} ngày`,
        dueDate: formatIsoToDmy(preview?.edd || ''),
      }));

      navigation.replace('Main');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : (isEn ? 'Unable to save profile. Please try again.' : 'Chưa lưu được hồ sơ. Mẹ thử lại nhé.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const dateField = (label: string, value: string, onChangeText: (text: string) => void, hint: string) => (
    <View style={styles.field}>
      <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
        <Ionicons name="calendar-outline" size={19} color={theme.muted} />
        <TextInput
          style={[styles.input, fontStyle(15.5, { min: 14.5 }), { color: theme.text }]}
          value={value}
          onChangeText={(text) => {
            onChangeText(formatDmyInput(text, value));
            setPreview(null);
            setError('');
          }}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={theme.muted}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      </View>
      <Text style={[styles.hint, fontStyle(13, { lineHeight: 19, min: 12 }), { color: theme.muted }]}>{hint}</Text>
    </View>
  );

  const previewTrimester = preview
    ? isEn
      ? preview.trimesterNum === 1
        ? '1st Trimester'
        : preview.trimesterNum === 2
          ? '2nd Trimester'
          : preview.trimesterNum === 3
            ? '3rd Trimester'
            : ''
      : preview.trimester || ''
    : '';

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Pregnancy profile' : 'Hồ sơ thai kỳ'}
        rightElement={
          <Pressable
            onPress={() => navigation.replace('Main')}
            disabled={loading}
            accessibilityRole="button"
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}
          >
            <Text style={[styles.skip, fontStyle(14.5, { min: 13.5, max: 17 }), { color: theme.muted }]}>
              {isEn ? 'Skip for now' : 'Để sau'}
            </Text>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={[styles.flex, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View style={[styles.stepPill, { backgroundColor: theme.tealSoft }]}>
              <Text style={[styles.stepText, fontStyle(12, { min: 11, max: 14 }), { color: theme.tealText }]}>
                {isEn ? 'STEP 1 / 1' : 'BƯỚC 1 / 1'}
              </Text>
            </View>
          </View>

          <View style={styles.heroIcon}><Ionicons name="heart" size={29} color="#FFFFFF" /></View>
          <Text style={[styles.title, fontStyle(24, { lineHeight: 32, min: 21, max: 28 }), { color: theme.text }]}>
            {isEn ? "Let's set up your pregnancy profile" : 'Mình cùng thiết lập hồ sơ thai kỳ nhé'}
          </Text>
          <Text style={[styles.subtitle, fontStyle(15.5, { lineHeight: 23, min: 14.5 }), { color: theme.muted }]}>
            {isEn
              ? 'This information helps PreCare track your gestational age and due date based on your confirmed baseline.'
              : 'Thông tin này giúp PreCare theo dõi tuổi thai và ngày dự sinh của mẹ theo chỉ số ban đầu đã xác nhận.'}
          </Text>

          <Text style={[styles.sectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
            {isEn ? 'How would you like to calculate gestational age?' : 'Mẹ muốn tính tuổi thai theo cách nào?'}
          </Text>
          {METHODS.map((item) => {
            const selected = method === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setMethod(item.id);
                  setPreview(null);
                  setError('');
                }}
                style={[
                  styles.methodCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  selected && { borderColor: colors.primary, backgroundColor: theme.tealSoft },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[styles.methodIcon, { backgroundColor: selected ? colors.primary : theme.tealSoft }]}>
                  <Ionicons name={item.icon} size={20} color={selected ? '#FFFFFF' : theme.tealText} />
                </View>
                <View style={styles.methodCopy}>
                  <Text style={[styles.methodTitle, fontStyle(15, { min: 14 }), { color: theme.text }]}>
                    {isEn ? item.titleEn : item.titleVi}
                  </Text>
                  <Text style={[styles.methodDescription, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.muted }]}>
                    {isEn ? item.descEn : item.descVi}
                  </Text>
                </View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={selected ? colors.primary : theme.muted} />
              </Pressable>
            );
          })}
          <Text style={[styles.methodHelp, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.muted }]}>
            {methodDescription}
          </Text>

          <View style={[styles.formCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {method === 'lmp' &&
              dateField(
                isEn ? 'First day of last menstrual period' : 'Ngày đầu kỳ kinh cuối cùng',
                lmp,
                setLmp,
                isEn
                  ? 'If you do not remember the exact date, choose an ultrasound method.'
                  : 'Nếu mẹ không nhớ chính xác, hãy chọn phương pháp siêu âm.',
              )}
            {method === 'q1_ultrasound' && (
              <>
                {dateField(
                  isEn ? 'Ultrasound date' : 'Ngày siêu âm',
                  ultrasoundDate,
                  setUltrasoundDate,
                  isEn ? 'Date printed on your Q1 scan report.' : 'Ngày ghi trên phiếu siêu âm quý 1.',
                )}
                <View style={styles.twoColumns}>
                  <View style={[styles.field, styles.column]}>
                    <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
                      {isEn ? 'Gestational weeks' : 'Tuần thai trên phiếu'}
                    </Text>
                    <TextInput
                      style={[
                        styles.simpleInput,
                        fontStyle(15.5, { min: 14.5 }),
                        { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
                      ]}
                      value={weeks}
                      onChangeText={(value) => { setWeeks(value); setPreview(null); setError(''); }}
                      placeholder={isEn ? 'e.g. 8' : 'Ví dụ: 8'}
                      placeholderTextColor={theme.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={[styles.field, styles.column]}>
                    <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
                      {isEn ? 'Days' : 'Ngày lẻ'}
                    </Text>
                    <TextInput
                      style={[
                        styles.simpleInput,
                        fontStyle(15.5, { min: 14.5 }),
                        { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.text },
                      ]}
                      value={days}
                      onChangeText={(value) => { setDays(value); setPreview(null); setError(''); }}
                      placeholder="0–6"
                      placeholderTextColor={theme.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </>
            )}
            {method === 'crl' && (
              <>
                {dateField(
                  isEn ? 'Ultrasound date' : 'Ngày siêu âm',
                  ultrasoundDate,
                  setUltrasoundDate,
                  isEn ? 'Date on your CRL scan report.' : 'Ngày ghi trên phiếu có chỉ số CRL.',
                )}
                <View style={styles.field}>
                  <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
                    {isEn ? 'Crown-rump length (CRL)' : 'Chiều dài đầu mông (CRL)'}
                  </Text>
                  <View style={[styles.inputWrap, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.input, fontStyle(15.5, { min: 14.5 }), { color: theme.text }]}
                      value={crl}
                      onChangeText={(value) => { setCrl(value); setPreview(null); setError(''); }}
                      placeholder={isEn ? 'e.g. 24' : 'Ví dụ: 24'}
                      placeholderTextColor={theme.muted}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.unit, fontStyle(14.5, { min: 13.5 }), { color: theme.muted }]}>mm</Text>
                  </View>
                  <Text style={[styles.hint, fontStyle(13, { lineHeight: 19, min: 12 }), { color: theme.muted }]}>
                    {isEn ? 'Find the CRL measurement on your scan printout.' : 'Mẹ có thể tìm chỉ số CRL trên phiếu siêu âm.'}
                  </Text>
                </View>
              </>
            )}
            {method === 'direct_edd' &&
              dateField(
                isEn ? 'Doctor-assigned due date' : 'Ngày dự sinh bác sĩ đã xác định',
                edd,
                setEdd,
                isEn ? 'Enter the due date given by your doctor.' : 'Nhập ngày dự sinh trên giấy khám hoặc theo hướng dẫn của bác sĩ.',
              )}
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: theme.dangerBackground }]}>
              <Ionicons name="alert-circle-outline" size={19} color={theme.danger} />
              <Text style={[styles.errorText, fontStyle(14, { lineHeight: 20, min: 13 }), { color: theme.danger }]}>
                {error}
              </Text>
            </View>
          )}

          {preview && (
            <View style={[styles.previewCard, { backgroundColor: theme.tealSoft, borderColor: theme.tealBorder }]}>
              <View style={styles.previewIcon}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>
              <View style={styles.previewText}>
                <Text style={[styles.previewTitle, fontStyle(13.5, { min: 12.5 }), { color: theme.tealText }]}>
                  {isEn ? 'Estimated details' : 'Thông tin dự kiến'}
                </Text>
                <Text style={[styles.previewAge, fontStyle(21, { min: 19, max: 25 }), { color: theme.text }]}>
                  {isEn ? `${preview.weeks} weeks ${preview.days} days` : `${preview.weeks} tuần ${preview.days} ngày`}
                </Text>
                <Text style={[styles.previewMeta, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.muted }]}>
                  {previewTrimester ? `${previewTrimester} · ` : ''}
                  {isEn ? 'Due date:' : 'Ngày dự sinh:'} {formatIsoToDmy(preview.edd)}
                </Text>
              </View>
            </View>
          )}

          {!preview ? (
            <Pressable
              onPress={calculate}
              disabled={loading}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={[styles.primaryText, fontStyle(15.5, { min: 14.5 })]}>
                    {isEn ? 'Calculate gestational age' : 'Xem tuổi thai dự kiến'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </Pressable>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => setPreview(null)}
                disabled={loading}
                style={[styles.secondaryButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              >
                <Text style={[styles.secondaryText, fontStyle(15, { min: 14 }), { color: theme.text }]}>
                  {isEn ? 'Edit' : 'Sửa lại'}
                </Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={loading}
                style={({ pressed }) => [styles.primaryButton, styles.saveButton, pressed && styles.pressed, loading && styles.disabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={[styles.primaryText, fontStyle(15.5, { min: 14.5 })]}>
                      {isEn ? 'Save & Continue' : 'Lưu và tiếp tục'}
                    </Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          )}
          <Text style={[styles.disclaimer, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.muted }]}>
            {isEn
              ? 'Results are for tracking support only. Your doctor may adjust the due date based on clinical exams.'
              : 'Kết quả chỉ để hỗ trợ theo dõi. Bác sĩ có thể điều chỉnh ngày dự sinh dựa trên hồ sơ khám của mẹ.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  stepPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  stepText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  skip: { fontSize: 14, fontWeight: '600', padding: 8 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginBottom: 15 },
  title: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 11 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginBottom: 9, borderWidth: 1, borderRadius: 15 },
  methodIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  methodCopy: { flex: 1 },
  methodTitle: { fontSize: 14, fontWeight: '700' },
  methodDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  methodHelp: { fontSize: 12, marginTop: 0, marginBottom: 14 },
  formCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  field: { marginBottom: 3 },
  label: { fontWeight: '700', fontSize: 13, marginBottom: 7 },
  inputWrap: { minHeight: 48, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 11, fontSize: 15 },
  unit: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 13 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  simpleInput: { minHeight: 48, borderRadius: 11, borderWidth: 1, paddingHorizontal: 12, fontSize: 15 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 11, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 19 },
  previewCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, borderRadius: 15, borderWidth: 1, marginBottom: 14 },
  previewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1 },
  previewTitle: { fontSize: 12, fontWeight: '700' },
  previewAge: { fontSize: 20, fontWeight: '800', marginTop: 2 },
  previewMeta: { fontSize: 12, marginTop: 3 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  saveButton: { flex: 1 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.65 },
  disclaimer: { fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 14, paddingHorizontal: 8 },
});
