import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenHeader from '../../components/ScreenHeader';
import { useAppSettings } from '../../context/AppSettingsContext';
import type { MainTabParamList } from '../../navigation/MainTabs';
import { colors } from '../../theme/colors';
import {
  currentUserProfile,
  fetchCurrentUserFromDB,
  fetchPregnancyProfileFromDB,
  mergeLocalAccountOverride,
  restoreSession,
  updateLocalUserAccount,
  type UserAccountInfo,
} from '../../services/api';
import { formatIsoToDmy, parseStrictDmyToIso } from '../../utils/date';

type AccountFields = {
  full_name: string;
  phone_number: string;
  email: string;
};

type PregnancyFields = {
  lmp: string;
  q1_ultrasound_date: string;
  q1_gestational_weeks: string;
  q1_gestational_days: string;
  crl_mm: string;
  edd: string;
};

type CachedAccountSummary = {
  profile: {
    lmp: string;
    q1_ultrasound_date: string;
    q1_gestational_weeks: string;
    q1_gestational_days: string;
    crl_mm: string;
    override_edd: string;
  };
  trimester: string;
  gestationalAge: string;
  dueDate: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\s-]{9,20}$/;

function getStorageKey(email?: string, id?: string): string {
  const identifier = (email || id || 'guest').trim().toLowerCase();
  return `precare_account_record_${identifier}`;
}

function emptyPregnancyFields(): PregnancyFields {
  return {
    lmp: '',
    q1_ultrasound_date: '',
    q1_gestational_weeks: '',
    q1_gestational_days: '',
    crl_mm: '',
    edd: '',
  };
}

function emptyAccountFields(user?: UserAccountInfo | null): AccountFields {
  return {
    full_name: user?.full_name || '',
    phone_number: user?.phone_number || '',
    email: user?.email || '',
  };
}

function mapDbRecordToFields(dbRecord: any): PregnancyFields {
  return {
    lmp: formatIsoToDmy(dbRecord?.lmp),
    q1_ultrasound_date: formatIsoToDmy(dbRecord?.q1_ultrasound_date),
    q1_gestational_weeks:
      dbRecord?.q1_gestational_weeks !== undefined && dbRecord?.q1_gestational_weeks !== null
        ? String(dbRecord.q1_gestational_weeks)
        : '',
    q1_gestational_days:
      dbRecord?.q1_gestational_days !== undefined && dbRecord?.q1_gestational_days !== null
        ? String(dbRecord.q1_gestational_days)
        : '',
    crl_mm:
      dbRecord?.crl_mm !== undefined && dbRecord?.crl_mm !== null
        ? String(dbRecord.crl_mm)
        : '',
    edd: formatIsoToDmy(dbRecord?.edd),
  };
}

function formatTrimester(trimesterNum: number | null, rawName: string, isEn: boolean): string {
  if (!trimesterNum && !rawName) return isEn ? 'Not updated' : 'Chưa cập nhật';
  if (isEn) {
    if (trimesterNum === 1) return '1st Trimester (First 3 months)';
    if (trimesterNum === 2) return '2nd Trimester (Second 3 months)';
    if (trimesterNum === 3) return '3rd Trimester (Last 3 months)';
    return 'Not updated';
  }
  return rawName || (trimesterNum ? `Tam cá nguyệt ${trimesterNum}` : 'Chưa cập nhật');
}

function formatStatus(status: string, isEn: boolean): string {
  if (!status) return isEn ? 'No profile yet' : 'Chưa tạo hồ sơ';
  if (status === 'active') return isEn ? 'Active' : 'Đang theo dõi';
  if (status === 'completed') return isEn ? 'Completed' : 'Đã hoàn thành';
  if (status === 'terminated') return isEn ? 'Terminated' : 'Đã kết thúc';
  return status;
}

function InfoRow({
  label,
  value,
  emptyText,
  last = false,
}: {
  label: string;
  value: string;
  emptyText: string;
  last?: boolean;
}) {
  const { theme, fontStyle } = useAppSettings();
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
      <Text style={[styles.label, fontStyle(14.5, { lineHeight: 20, min: 13.5 }), { color: theme.muted }]}>
        {label}
      </Text>
      <Text style={[styles.value, fontStyle(14.5, { lineHeight: 20, min: 13.5 }), { color: value ? theme.text : theme.muted }]}>
        {value || emptyText}
      </Text>
    </View>
  );
}

function OutlineButton({
  title,
  icon,
  onPress,
  disabled = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme, fontStyle } = useAppSettings();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        { backgroundColor: theme.surface, borderColor: theme.tealBorder },
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={17} color={theme.tealText} />
      <Text style={[styles.buttonText, fontStyle(14.5, { min: 13.5 }), { color: theme.tealText }]} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function RecordsScreen({ navigation, route }: BottomTabScreenProps<MainTabParamList, 'Records'>) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';

  const [account, setAccount] = useState<UserAccountInfo | null>(() => currentUserProfile);
  const [accountDraft, setAccountDraft] = useState<AccountFields>(() =>
    emptyAccountFields(currentUserProfile),
  );
  const [pregnancy, setPregnancy] = useState<PregnancyFields>(() => emptyPregnancyFields());
  const [accountEditorOpen, setAccountEditorOpen] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');

  const [trimesterNum, setTrimesterNum] = useState<number | null>(null);
  const [trimesterVi, setTrimesterVi] = useState('');
  const [gaWeeks, setGaWeeks] = useState<number | null>(null);
  const [gaDays, setGaDays] = useState<number>(0);
  const [doctorName, setDoctorName] = useState('');
  const [rawStatus, setRawStatus] = useState('');

  const goToHistoryScreen = useCallback(() => {
    const rootNav = navigation.getParent() as any;
    if (rootNav) {
      rootNav.navigate('HistoryResults');
    } else {
      (navigation as any).navigate('HistoryResults');
    }
  }, [navigation]);

  const applyDbRecordToState = useCallback(
    async (dbRecord: any, resolvedAccount: UserAccountInfo | null) => {
      const storageKey = getStorageKey(resolvedAccount?.email, resolvedAccount?.id);

      if (!dbRecord || typeof dbRecord !== 'object') {
        setPregnancy(emptyPregnancyFields());
        setTrimesterNum(null);
        setTrimesterVi('');
        setGaWeeks(null);
        setGaDays(0);
        setDoctorName('');
        setRawStatus('');
        await AsyncStorage.removeItem(storageKey).catch(() => {});
        return;
      }

      const nextFields = mapDbRecordToFields(dbRecord);
      const ga = dbRecord.current_gestational_age;
      const nextWeeks = ga?.weeks !== undefined && ga?.weeks !== null ? Number(ga.weeks) : null;
      const nextDays = ga?.remaining_days ?? 0;
      const nextTrimesterNum =
        ga?.trimester ??
        (nextWeeks !== null
          ? nextWeeks < 14
            ? 1
            : nextWeeks < 28
              ? 2
              : 3
          : null);
      const nextTrimesterVi =
        ga?.trimester_name || (nextTrimesterNum ? `Tam cá nguyệt ${nextTrimesterNum}` : '');
      const nextDoctorName = String(
        dbRecord.primary_doctor?.full_name || dbRecord.primary_doctor_name || '',
      ).trim();

      setPregnancy(nextFields);
      setGaWeeks(nextWeeks);
      setGaDays(nextDays);
      setTrimesterNum(nextTrimesterNum);
      setTrimesterVi(nextTrimesterVi);
      setDoctorName(nextDoctorName);
      setRawStatus(dbRecord.status || '');

      const cachePayload: CachedAccountSummary = {
        profile: {
          lmp: parseStrictDmyToIso(nextFields.lmp) || '',
          q1_ultrasound_date: parseStrictDmyToIso(nextFields.q1_ultrasound_date) || '',
          q1_gestational_weeks: nextFields.q1_gestational_weeks,
          q1_gestational_days: nextFields.q1_gestational_days,
          crl_mm: nextFields.crl_mm,
          override_edd: parseStrictDmyToIso(nextFields.edd) || '',
        },
        trimester: nextTrimesterVi,
        gestationalAge: nextWeeks !== null ? `${nextWeeks} tuần ${nextDays} ngày` : '--',
        dueDate: nextFields.edd || 'Chưa cập nhật',
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(cachePayload)).catch(() => {});
    },
    [],
  );

  const loadFromDatabase = useCallback(async (): Promise<UserAccountInfo | null> => {
    setLoadingData(true);
    setLoadError('');
    try {
      const restored = currentUserProfile || (await restoreSession());
      const freshUser = (await fetchCurrentUserFromDB()) || restored;
      setAccount(freshUser);

      const dbRecord = await fetchPregnancyProfileFromDB(undefined, { throwOnError: true });
      if (dbRecord?.patient && typeof dbRecord.patient === 'object') {
        const syncedUser = await mergeLocalAccountOverride({
          id: dbRecord.patient.id || freshUser?.id || '',
          full_name: dbRecord.patient.full_name || freshUser?.full_name || '',
          email: String(dbRecord.patient.email || freshUser?.email || '').trim().toLowerCase(),
          phone_number: dbRecord.patient.phone_number || freshUser?.phone_number || '',
        });
        setAccount(syncedUser);
        await applyDbRecordToState(dbRecord, syncedUser);
        return syncedUser;
      }
      await applyDbRecordToState(dbRecord, freshUser);
      return freshUser;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu hồ sơ từ máy chủ.';
      setLoadError(msg);
      return currentUserProfile;
    } finally {
      setLoadingData(false);
    }
  }, [applyDbRecordToState]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function runFocusLoad() {
        const loadedUser = await loadFromDatabase();
        if (!isActive) return;

        if (route.params?.section === 'personal') {
          setAccountDraft(emptyAccountFields(loadedUser));
          setError('');
          setAccountEditorOpen(true);
          navigation.setParams({ section: undefined });
        }
      }

      void runFocusLoad();

      return () => {
        isActive = false;
      };
    }, [loadFromDatabase, navigation, route.params?.section]),
  );

  const openAccountEditor = () => {
    setAccountDraft(emptyAccountFields(account));
    setError('');
    setAccountEditorOpen(true);
  };

  const saveAccount = async () => {
    if (saving) return;

    const fullName = accountDraft.full_name.trim();
    const phone = accountDraft.phone_number.trim();
    const email = accountDraft.email.trim().toLowerCase();

    if (!fullName) {
      setError(isEn ? 'Please enter your full name.' : 'Vui lòng nhập họ và tên.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError(isEn ? 'Invalid email address. Please check again.' : 'Email không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      setError(isEn ? 'Invalid phone number (9–20 characters).' : 'Số điện thoại không hợp lệ (từ 9 đến 20 ký tự số).');
      return;
    }

    const oldStorageKey = getStorageKey(account?.email, account?.id);
    setSaving(true);
    setError('');
    try {
      const updatedUser = await updateLocalUserAccount({
        full_name: fullName,
        phone_number: phone || null,
        email,
      });
      setAccount(updatedUser);

      const newStorageKey = getStorageKey(updatedUser.email, updatedUser.id);
      if (oldStorageKey !== newStorageKey) {
        const cached = await AsyncStorage.getItem(oldStorageKey).catch(() => null);
        if (cached) {
          await AsyncStorage.setItem(newStorageKey, cached).catch(() => {});
          await AsyncStorage.removeItem(oldStorageKey).catch(() => {});
        }
      }

      setAccountEditorOpen(false);
      Alert.alert(
        isEn ? 'Success' : 'Thành công',
        isEn ? 'Account information has been updated.' : 'Đã cập nhật thông tin tài khoản.',
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : (isEn ? 'Unable to update account information.' : 'Không thể cập nhật thông tin tài khoản.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const notUpdatedText = isEn ? 'Not updated' : 'Chưa cập nhật';
  const gestationalAgeText =
    gaWeeks !== null
      ? isEn
        ? `${gaWeeks} weeks ${gaDays} days`
        : `${gaWeeks} tuần ${gaDays} ngày`
      : '--';
  const q1AgeText =
    pregnancy.q1_gestational_weeks !== ''
      ? isEn
        ? `${pregnancy.q1_gestational_weeks}w ${pregnancy.q1_gestational_days || '0'}d`
        : `${pregnancy.q1_gestational_weeks} tuần ${pregnancy.q1_gestational_days || '0'} ngày`
      : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.surface }]} edges={['top']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Maternal Profile' : 'Hồ sơ mẹ bầu'}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
      />

      <ScrollView style={{ backgroundColor: theme.background }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Image
            source={require('../../assets/pregnant.jpg')}
            style={[styles.avatar, { borderColor: theme.surface }]}
            accessibilityLabel={isEn ? 'Maternal avatar' : 'Ảnh đại diện mẹ bầu'}
          />
          <View style={styles.identityText}>
            <Text style={styles.name}>{profile.name || 'Chưa cập nhật'}</Text>
            <Text style={styles.subtitle}>Hồ sơ của mẹ trên PreCare</Text>
          </View>
        </View>
        <OutlineButton title="Chỉnh sửa hồ sơ" icon="create-outline" onPress={() => openEditor('personal')} />

        <View style={styles.pregnancyCard}>
          <View style={styles.between}>
            <Text style={styles.pregnancyLabel}>Thai kỳ hiện tại</Text>
            <Text style={styles.trimester}>{trimester}</Text>
          </View>
          <Text style={styles.gestationalAge}>{gestationalAge}</Text>
          <View style={styles.dueRow}>
            <Text style={styles.label}>Ngày dự sinh</Text>
            <Text style={styles.value}>{dueDate}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.card}>
          <InfoRow label="Ngày sinh" value={profile.birthday} />
          <InfoRow label="Số điện thoại" value={profile.phone ? `${profile.phone.slice(0, 4)} *** ${profile.phone.slice(-2)}` : ''} />
          <InfoRow label="Email" value={profile.email} last />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Thông tin y tế</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Cập nhật thông tin y tế" hitSlop={10} onPress={() => openEditor('medical')}>
            <Text style={styles.actionText}>Cập nhật</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          {fields.medical.map((field, index) => (
            <InfoRow key={field.key} label={field.label} value={profile[field.key]} last={index === fields.medical.length - 1} />
          ))}
        </View>
        <Text style={styles.helper}>Bổ sung thông tin để bác sĩ hiểu rõ hơn về sức khỏe của mẹ.</Text>

        <Text style={styles.sectionTitle}>Liên hệ khẩn cấp</Text>
        <View style={[styles.card, styles.contactCard]}>
          <View style={styles.contactInfo}>
            <View style={styles.iconBox}><Ionicons name="call-outline" size={20} color={colors.primary} /></View>
            <View style={styles.contactText}>
              <Text style={styles.cardTitle}>{mainContact?.name || 'Chưa thêm người liên hệ'}</Text>
              <Text style={styles.subtitle}>{mainContact
                ? `${mainContact.relationship}\n${mainContact.phone}`
                : 'Thêm người thân để dễ liên lạc khi mẹ cần hỗ trợ.'}</Text>
            </View>
          </View>
          <OutlineButton title={contacts.length ? 'Quản lý người liên hệ' : 'Thêm người liên hệ'} icon="person-add-outline" onPress={() => setContactsVisible(true)} />
        </View>

        <Text style={styles.sectionTitle}>Hồ sơ khám & kết quả</Text>
        <Pressable
          accessibilityRole="button"
          onPress={goToHistoryScreen}
          style={({ pressed }) => [
            styles.card,
            styles.historyCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconBox}>
            <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          </View>

          <View style={styles.contactText}>
            <Text style={styles.cardTitle}>Xem lịch sử kết quả</Text>
            <Text style={styles.subtitle}>
              Phiếu khám, xét nghiệm và siêu âm đã lưu
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
        </Pressable>
      </ScrollView>

      <EmergencyContacts
        visible={contactsVisible}
        contacts={contacts}
        onChange={handleContactsChange}
        onClose={() => setContactsVisible(false)}
      />

      <Modal visible={editor !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditor(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={12} onPress={() => setEditor(null)}>
                <Ionicons name="close" size={24} color={colors.navy} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {editor && (
                <>
                  <Text style={styles.formNote}>Thông tin được lưu theo tài khoản của mẹ.</Text>
                  {fields[editor].map((field) => {
                    const isTargetDate = field.key === 'target_date';
                    return (
                      <View key={field.key} style={styles.field}>
                        <Text style={styles.inputLabel}>{field.label}</Text>
                        <TextInput
                          accessibilityLabel={field.label}
                          style={styles.input}
                          value={isTargetDate ? getTodayISO() : draft[field.key]}
                          editable={!isTargetDate}
                          placeholder={field.placeholder || field.label}
                          placeholderTextColor={colors.textLight}
                          keyboardType={field.key === 'email' ? 'email-address' : field.key.toLowerCase().includes('phone') ? 'phone-pad' : 'default'}
                          autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                          onChangeText={(value) => {
                            if (!isTargetDate) {
                              setDraft((current) => ({ ...current, [field.key]: value }));
                            }
                          }}
                        />
                      </View>
                    );
                  })}
                  {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                  <Pressable accessibilityRole="button" style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} onPress={save}>
                    <Text style={styles.saveText}>Lưu thay đổi</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { height: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E7EEF5' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: colors.navy },
  content: { paddingHorizontal: 18, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 24, gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.white, backgroundColor: '#E2E8F0' },
  identityText: { flex: 1 },
  name: { color: colors.navy, fontSize: 20, fontWeight: '700' },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  outlineButton: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#C9F0EC', borderRadius: 7, backgroundColor: colors.white, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.primary, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.65 },
  pregnancyCard: { marginTop: 20, backgroundColor: '#EFFDFA', borderColor: '#CCF5EF', borderWidth: 1, borderRadius: 15, padding: 15 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pregnancyLabel: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  trimester: { color: colors.primary, fontSize: 11 },
  gestationalAge: { fontSize: 26, lineHeight: 36, fontWeight: '700', color: '#008579', marginVertical: 10 },
  dueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#DFF7F2', paddingTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 25, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  card: { backgroundColor: colors.white, borderRadius: 15, borderWidth: 1, borderColor: '#E0E9F3', paddingHorizontal: 14, overflow: 'hidden' },
  infoRow: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  label: { fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  value: { fontSize: 13, color: colors.navy, textAlign: 'right', flexShrink: 1, maxWidth: '65%' },
  missing: { color: '#8295B0' },
  helper: { fontSize: 12, color: '#8295B0', lineHeight: 19, marginTop: 10 },
  contactCard: { padding: 14 },
  contactInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 15 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFFDFA', alignItems: 'center', justifyContent: 'center' },
  contactText: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', lineHeight: 19, color: colors.navy },
  historyCard: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14 },
  modalContainer: { flex: 1, backgroundColor: '#F7FAFC' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: '#E7EEF5' },
  modalTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: colors.navy },
  modalContent: { padding: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  formNote: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 20 },
  field: { marginBottom: 18 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: colors.navy, marginBottom: 8 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#DFE8F0', borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.navy },
  error: { color: '#B91C1C', marginBottom: 16, lineHeight: 21 },
  saveButton: { backgroundColor: colors.primary, padding: 15, alignItems: 'center', borderRadius: 10 },
  saveText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
