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

type Props = NativeStackScreenProps<RootStackParamList, 'PregnancySetup'>;
type Preview = { weeks: number; days: number; edd: string; trimester?: string };

const METHODS: { id: PregnancyCalculationMethod; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'lmp', title: 'Ngày kinh cuối', description: 'Mẹ nhớ ngày đầu của kỳ kinh cuối cùng.', icon: 'calendar-outline' },
  { id: 'q1_ultrasound', title: 'Siêu âm quý 1', description: 'Mẹ có phiếu siêu âm ghi tuần thai.', icon: 'scan-outline' },
  { id: 'crl', title: 'Chỉ số CRL', description: 'Mẹ có kết quả siêu âm ghi chiều dài đầu mông.', icon: 'resize-outline' },
  { id: 'direct_edd', title: 'Ngày dự sinh', description: 'Bác sĩ đã xác định ngày dự sinh cho mẹ.', icon: 'flag-outline' },
];

function toIsoDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function displayDate(value: string): string {
  return value ? value.slice(0, 10).split('-').reverse().join('/') : '';
}

export default function PregnancySetupScreen({ navigation }: Props) {
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

  const methodDescription = useMemo(() => METHODS.find((item) => item.id === method)?.description || '', [method]);

  const makePayload = (): PregnancyCalculateRequest & { calculation_method: PregnancyCalculationMethod } | null => {
    const payload: PregnancyCalculateRequest & { calculation_method: PregnancyCalculationMethod } = {
      target_date: todayIso(),
      calculation_method: method,
    };
    if (method === 'lmp') {
      const parsed = toIsoDate(lmp);
      if (!parsed) { setError('Mẹ nhập ngày kinh cuối theo dạng ngày/tháng/năm, ví dụ 12/05/2026.'); return null; }
      payload.lmp = parsed;
    } else if (method === 'q1_ultrasound' || method === 'crl') {
      const parsed = toIsoDate(ultrasoundDate);
      if (!parsed) { setError('Mẹ nhập ngày siêu âm theo dạng ngày/tháng/năm, ví dụ 12/05/2026.'); return null; }
      payload.q1_ultrasound_date = parsed;
      if (method === 'q1_ultrasound') {
        const gestationalWeeks = Number(weeks);
        const gestationalDays = Number(days || '0');
        if (!Number.isInteger(gestationalWeeks) || gestationalWeeks < 6 || gestationalWeeks > 14) {
          setError('Tuổi thai trên phiếu siêu âm quý 1 thường từ 6 đến 14 tuần.'); return null;
        }
        if (!Number.isInteger(gestationalDays) || gestationalDays < 0 || gestationalDays > 6) {
          setError('Số ngày lẻ cần nằm trong khoảng 0 đến 6.'); return null;
        }
        payload.q1_gestational_weeks = gestationalWeeks;
        payload.q1_gestational_days = gestationalDays;
      } else {
        const crlMm = Number(crl);
        if (!Number.isFinite(crlMm) || crlMm < 10 || crlMm > 84) {
          setError('CRL cần nằm trong khoảng 10 đến 84 mm theo phạm vi hỗ trợ hiện tại.'); return null;
        }
        payload.crl_mm = crlMm;
      }
    } else {
      const parsed = toIsoDate(edd);
      if (!parsed) { setError('Mẹ nhập ngày dự sinh theo dạng ngày/tháng/năm, ví dụ 12/02/2027.'); return null; }
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
        throw new Error('Máy chủ chưa trả đủ kết quả tuổi thai. Mẹ thử lại giúp mình nhé.');
      }
      setPreview({
        weeks: age.weeks,
        days: age.remaining_days ?? 0,
        edd: String(data.calculated_edd).slice(0, 10),
        trimester: age.trimester_name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa tính được tuổi thai. Mẹ kiểm tra thông tin rồi thử lại nhé.');
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
        name: account?.full_name || '',
        email: account?.email || '',
        phone: account?.phone_number || '',
        birthday: account?.birthday || '',
        blood: '',
        allergies: '',
        conditions: '',
        obstetricHistory: '',
        target_date: todayIso(),
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
        dueDate: displayDate(preview?.edd || ''),
        contacts: [],
      }));
      navigation.replace('Main');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa lưu được hồ sơ. Mẹ thử lại nhé.');
    } finally {
      setLoading(false);
    }
  };

  const dateField = (label: string, value: string, onChangeText: (text: string) => void, hint: string) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name="calendar-outline" size={19} color={colors.textMuted} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => { onChangeText(text); setPreview(null); setError(''); }}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={colors.textLight}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View style={styles.stepPill}><Text style={styles.stepText}>BƯỚC 1 / 1</Text></View>
            <Pressable onPress={() => navigation.replace('Main')} disabled={loading} accessibilityRole="button">
              <Text style={styles.skip}>Để sau</Text>
            </Pressable>
          </View>

          <View style={styles.heroIcon}><Ionicons name="heart" size={29} color="#FFFFFF" /></View>
          <Text style={styles.title}>Mình cùng thiết lập hồ sơ thai kỳ nhé</Text>
          <Text style={styles.subtitle}>Thông tin này giúp PreCare theo dõi tuổi thai và ngày dự sinh của mẹ. Mẹ có thể cập nhật lại trong mục Hồ sơ.</Text>

          <Text style={styles.sectionTitle}>Mẹ muốn tính tuổi thai theo cách nào?</Text>
          {METHODS.map((item) => {
            const selected = method === item.id;
            return (
              <Pressable key={item.id} onPress={() => { setMethod(item.id); setPreview(null); setError(''); }} style={[styles.methodCard, selected && styles.methodSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
                <View style={[styles.methodIcon, selected && styles.methodIconSelected]}><Ionicons name={item.icon} size={20} color={selected ? '#FFFFFF' : colors.primary} /></View>
                <View style={styles.methodCopy}><Text style={styles.methodTitle}>{item.title}</Text><Text style={styles.methodDescription}>{item.description}</Text></View>
                <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={selected ? colors.primary : '#94A3B8'} />
              </Pressable>
            );
          })}
          <Text style={styles.methodHelp}>{methodDescription}</Text>

          <View style={styles.formCard}>
            {method === 'lmp' && dateField('Ngày đầu kỳ kinh cuối cùng', lmp, setLmp, 'Nếu mẹ không nhớ chính xác, hãy chọn phương pháp siêu âm.')}
            {method === 'q1_ultrasound' && <>
              {dateField('Ngày siêu âm', ultrasoundDate, setUltrasoundDate, 'Ngày ghi trên phiếu siêu âm quý 1.')}
              <View style={styles.twoColumns}>
                <View style={[styles.field, styles.column]}><Text style={styles.label}>Tuần thai trên phiếu</Text><TextInput style={styles.simpleInput} value={weeks} onChangeText={(value) => { setWeeks(value); setPreview(null); setError(''); }} placeholder="Ví dụ: 8" placeholderTextColor={colors.textLight} keyboardType="number-pad" /></View>
                <View style={[styles.field, styles.column]}><Text style={styles.label}>Ngày lẻ</Text><TextInput style={styles.simpleInput} value={days} onChangeText={(value) => { setDays(value); setPreview(null); setError(''); }} placeholder="0–6" placeholderTextColor={colors.textLight} keyboardType="number-pad" /></View>
              </View>
            </>}
            {method === 'crl' && <>
              {dateField('Ngày siêu âm', ultrasoundDate, setUltrasoundDate, 'Ngày ghi trên phiếu có chỉ số CRL.')}
              <View style={styles.field}><Text style={styles.label}>Chiều dài đầu mông (CRL)</Text><View style={styles.inputWrap}><TextInput style={styles.input} value={crl} onChangeText={(value) => { setCrl(value); setPreview(null); setError(''); }} placeholder="Ví dụ: 24" placeholderTextColor={colors.textLight} keyboardType="decimal-pad" /><Text style={styles.unit}>mm</Text></View><Text style={styles.hint}>Mẹ có thể tìm chỉ số CRL trên phiếu siêu âm.</Text></View>
            </>}
            {method === 'direct_edd' && dateField('Ngày dự sinh bác sĩ đã xác định', edd, setEdd, 'Nhập ngày dự sinh trên giấy khám hoặc theo hướng dẫn của bác sĩ.')}
          </View>

          {!!error && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={19} color="#B91C1C" /><Text style={styles.errorText}>{error}</Text></View>}

          {preview && <View style={styles.previewCard}>
            <View style={styles.previewIcon}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>
            <View style={styles.previewText}><Text style={styles.previewTitle}>Thông tin dự kiến</Text><Text style={styles.previewAge}>{preview.weeks} tuần {preview.days} ngày</Text><Text style={styles.previewMeta}>{preview.trimester ? `${preview.trimester} · ` : ''}Ngày dự sinh: {displayDate(preview.edd)}</Text></View>
          </View>}

          {!preview ? (
            <Pressable onPress={calculate} disabled={loading} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, loading && styles.disabled]}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Xem tuổi thai dự kiến</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></>}
            </Pressable>
          ) : (
            <View style={styles.buttonRow}>
              <Pressable onPress={() => setPreview(null)} disabled={loading} style={styles.secondaryButton}><Text style={styles.secondaryText}>Sửa lại</Text></Pressable>
              <Pressable onPress={save} disabled={loading} style={({ pressed }) => [styles.primaryButton, styles.saveButton, pressed && styles.pressed, loading && styles.disabled]}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.primaryText}>Lưu và tiếp tục</Text><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></>}
              </Pressable>
            </View>
          )}
          <Text style={styles.disclaimer}>Kết quả chỉ để hỗ trợ theo dõi. Bác sĩ có thể điều chỉnh ngày dự sinh dựa trên hồ sơ khám của mẹ.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#F4F9FC' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  stepPill: { backgroundColor: '#DDF5F1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  stepText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  skip: { color: colors.textMuted, fontSize: 14, fontWeight: '600', padding: 8 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, marginBottom: 15 },
  title: { color: colors.navy, fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 9, marginBottom: 22 },
  sectionTitle: { color: colors.navy, fontSize: 16, fontWeight: '700', marginBottom: 11 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginBottom: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2EAF0', borderRadius: 15 },
  methodSelected: { borderColor: colors.primary, backgroundColor: '#F0FBF8' },
  methodIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F5F3' },
  methodIconSelected: { backgroundColor: colors.primary },
  methodCopy: { flex: 1 },
  methodTitle: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  methodDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  methodHelp: { color: colors.textMuted, fontSize: 12, marginTop: 0, marginBottom: 14 },
  formCard: { padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8EEF2', marginBottom: 14 },
  field: { marginBottom: 3 },
  label: { color: colors.navy, fontWeight: '700', fontSize: 13, marginBottom: 7 },
  inputWrap: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#D8E2E9', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, backgroundColor: '#FFFFFF' },
  input: { flex: 1, paddingVertical: 11, color: colors.navy, fontSize: 15 },
  unit: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 6, marginBottom: 13 },
  twoColumns: { flexDirection: 'row', gap: 12 },
  column: { flex: 1 },
  simpleInput: { minHeight: 48, borderRadius: 11, borderWidth: 1, borderColor: '#D8E2E9', paddingHorizontal: 12, color: colors.navy, fontSize: 15 },
  errorBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 11, backgroundColor: '#FEF2F2', marginBottom: 12 },
  errorText: { flex: 1, color: '#991B1B', fontSize: 13, lineHeight: 19 },
  previewCard: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 15, borderRadius: 15, backgroundColor: '#EAF8F4', borderWidth: 1, borderColor: '#BCE8DC', marginBottom: 14 },
  previewIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  previewText: { flex: 1 },
  previewTitle: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
  previewAge: { color: colors.navy, fontSize: 20, fontWeight: '800', marginTop: 2 },
  previewMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  saveButton: { flex: 1 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', gap: 10 },
  secondaryButton: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryText: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.65 },
  disclaimer: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 14, paddingHorizontal: 8 },
});
