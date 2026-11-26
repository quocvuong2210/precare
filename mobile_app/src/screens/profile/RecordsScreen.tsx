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
            <Text style={[styles.name, fontStyle(20, { min: 18, max: 24 }), { color: theme.text }]}>
              {account?.full_name || notUpdatedText}
            </Text>
          </View>
        </View>

        {!!loadError && (
          <View
            style={[
              styles.loadErrorBox,
              { backgroundColor: theme.dangerBackground, borderColor: theme.dangerBorder },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
            <Text style={[styles.loadErrorText, fontStyle(13.5, { lineHeight: 20, min: 12.5 }), { color: theme.danger }]}>
              {loadError}
            </Text>
            <Pressable onPress={() => void loadFromDatabase()} hitSlop={8}>
              <Text style={[styles.retryLink, fontStyle(13.5, { min: 12.5 }), { color: theme.tealText }]}>
                {isEn ? 'Retry' : 'Tải lại'}
              </Text>
            </Pressable>
          </View>
        )}

        <OutlineButton
          title={isEn ? 'Edit account' : 'Chỉnh sửa tài khoản'}
          icon="person-outline"
          disabled={loadingData}
          onPress={openAccountEditor}
        />

        <View
          style={[
            styles.pregnancyCard,
            { backgroundColor: theme.tealSoft, borderColor: theme.tealBorder },
          ]}
        >
          <View style={styles.between}>
            <Text style={[styles.pregnancyLabel, fontStyle(13.5, { min: 12.5 }), { color: theme.tealText }]}>
              {isEn ? 'Current pregnancy' : 'Thai kỳ hiện tại'}
            </Text>
            {loadingData ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.trimester, fontStyle(12.5, { min: 11.5, max: 15 }), { color: theme.tealText }]}>
                {formatTrimester(trimesterNum, trimesterVi, isEn)}
              </Text>
            )}
          </View>
          <Text style={[styles.gestationalAge, fontStyle(26, { lineHeight: 35, min: 23, max: 31 }), { color: theme.tealText }]}>
            {gestationalAgeText}
          </Text>
          <View style={[styles.dueRow, { borderTopColor: theme.tealBorder }]}>
            <Text style={[styles.label, fontStyle(14.5, { min: 13.5 }), { color: theme.muted }]}>
              {isEn ? 'Estimated due date (EDD)' : 'Ngày dự sinh (EDD)'}
            </Text>
            <Text style={[styles.value, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
              {pregnancy.edd || notUpdatedText}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, styles.standaloneSectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
          {isEn ? 'Saved pregnancy metrics' : 'Chỉ số thai kỳ đã lưu'}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow
            label={isEn ? 'Last menstrual period (LMP)' : 'Ngày kinh cuối (LMP)'}
            value={pregnancy.lmp}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? '1st trimester ultrasound date' : 'Ngày siêu âm Quý 1'}
            value={pregnancy.q1_ultrasound_date}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Gestational age at Q1 scan' : 'Tuổi thai siêu âm Q1'}
            value={q1AgeText}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Crown-rump length (CRL)' : 'Chiều dài đầu mông (CRL)'}
            value={pregnancy.crl_mm ? `${pregnancy.crl_mm} mm` : ''}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Estimated due date' : 'Ngày dự sinh'}
            value={pregnancy.edd}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Primary doctor' : 'Bác sĩ phụ trách'}
            value={doctorName || (isEn ? 'Unassigned' : 'Chưa phân công')}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Profile status' : 'Trạng thái hồ sơ'}
            value={formatStatus(rawStatus, isEn)}
            emptyText={notUpdatedText}
            last
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
            {isEn ? 'Account information' : 'Thông tin tài khoản'}
          </Text>
          <Pressable onPress={openAccountEditor} disabled={loadingData} hitSlop={8}>
            <Text style={[styles.sectionEditLink, fontStyle(14.5, { min: 13.5 }), { color: theme.tealText }]}>
              {isEn ? 'Edit' : 'Chỉnh sửa'}
            </Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <InfoRow
            label={isEn ? 'Full name' : 'Họ và tên'}
            value={account?.full_name || ''}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label={isEn ? 'Phone number' : 'Số điện thoại'}
            value={account?.phone_number || ''}
            emptyText={notUpdatedText}
          />
          <InfoRow
            label="Email"
            value={account?.email || ''}
            emptyText={notUpdatedText}
            last
          />
        </View>

        <Text style={[styles.sectionTitle, styles.standaloneSectionTitle, fontStyle(16, { min: 15, max: 19 }), { color: theme.text }]}>
          {isEn ? 'Checkups & Results' : 'Hồ sơ khám & kết quả'}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={goToHistoryScreen}
          style={({ pressed }) => [
            styles.card,
            styles.historyCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: theme.tealSoft }]}>
            <Ionicons name="document-text-outline" size={20} color={theme.tealText} />
          </View>

          <View style={styles.contactText}>
            <Text style={[styles.cardTitle, fontStyle(15, { lineHeight: 21, min: 14 }), { color: theme.text }]}>
              {isEn ? 'View result history' : 'Xem lịch sử kết quả'}
            </Text>
            <Text style={[styles.subtitle, fontStyle(13.5, { lineHeight: 20, min: 12.5 }), { color: theme.muted }]}>
              {isEn
                ? 'Checkup visits and biometric metrics linked to your account'
                : 'Lần khám và chỉ số sinh trắc theo tài khoản Precare của bạn'}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={theme.muted} />
        </Pressable>
      </ScrollView>

      <Modal
        visible={accountEditorOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !saving && setAccountEditorOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View
              style={[
                styles.modalHeader,
                { backgroundColor: theme.surface, borderBottomColor: theme.divider },
              ]}
            >
              <Text style={[styles.modalTitle, fontStyle(19, { max: 22 }), { color: theme.text }]}>
                {isEn ? 'Edit account information' : 'Chỉnh sửa thông tin tài khoản'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEn ? 'Close' : 'Đóng'}
                hitSlop={12}
                disabled={saving}
                onPress={() => setAccountEditorOpen(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={[styles.formNote, fontStyle(14.5, { lineHeight: 22, min: 13.5 }), { color: theme.muted }]}>
                {isEn
                  ? 'Update your display name, phone number, and email on this device. Initial pregnancy metrics are locked here to keep clinical records consistent.'
                  : 'Cập nhật họ tên, số điện thoại và email hiển thị cho tài khoản PreCare trên thiết bị này. Chỉ số thai kỳ ban đầu được khóa chỉnh sửa tại đây để đảm bảo nhất quán hồ sơ y tế.'}
              </Text>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
                  {isEn ? 'Full name' : 'Họ và tên'}
                </Text>
                <TextInput
                  accessibilityLabel={isEn ? 'Full name' : 'Họ và tên'}
                  style={[
                    styles.input,
                    fontStyle(15.5, { min: 14.5 }),
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                  ]}
                  value={accountDraft.full_name}
                  editable={!saving}
                  placeholder={isEn ? 'Enter full name' : 'Nhập họ và tên'}
                  placeholderTextColor={theme.muted}
                  onChangeText={(value) => {
                    setAccountDraft((cur) => ({ ...cur, full_name: value }));
                    setError('');
                  }}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>
                  {isEn ? 'Phone number' : 'Số điện thoại'}
                </Text>
                <TextInput
                  accessibilityLabel={isEn ? 'Phone number' : 'Số điện thoại'}
                  style={[
                    styles.input,
                    fontStyle(15.5, { min: 14.5 }),
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                  ]}
                  value={accountDraft.phone_number}
                  editable={!saving}
                  placeholder={isEn ? 'e.g. 0912345678' : 'VD: 0912345678'}
                  placeholderTextColor={theme.muted}
                  keyboardType="phone-pad"
                  maxLength={20}
                  onChangeText={(value) => {
                    setAccountDraft((cur) => ({ ...cur, phone_number: value }));
                    setError('');
                  }}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, fontStyle(14.5, { min: 13.5 }), { color: theme.text }]}>Email</Text>
                <TextInput
                  accessibilityLabel="Email"
                  style={[
                    styles.input,
                    fontStyle(15.5, { min: 14.5 }),
                    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
                  ]}
                  value={accountDraft.email}
                  editable={!saving}
                  placeholder="example@email.com"
                  placeholderTextColor={theme.muted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setAccountDraft((cur) => ({ ...cur, email: value }));
                    setError('');
                  }}
                />
              </View>

              {!!error && (
                <Text
                  accessibilityRole="alert"
                  style={[styles.error, fontStyle(14, { lineHeight: 20, min: 13 }), { color: theme.danger }]}
                >
                  {error}
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveButton,
                  (pressed || saving) && styles.pressed,
                ]}
                onPress={() => void saveAccount()}
              >
                {saving ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[styles.saveText, fontStyle(15.5, { min: 14.5 })]}>
                    {isEn ? 'Save account changes' : 'Lưu thông tin tài khoản'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  content: { paddingHorizontal: 18, paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', paddingVertical: 22, gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    backgroundColor: '#E2E8F0',
  },
  identityText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13.5, lineHeight: 20, marginTop: 3 },
  loadErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  loadErrorText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  retryLink: { fontSize: 13.5, fontWeight: '700' },
  outlineButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 9,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 14.5, fontWeight: '600', flexShrink: 1 },
  pressed: { opacity: 0.65 },
  pregnancyCard: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
  },
  between: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pregnancyLabel: { fontSize: 13.5, fontWeight: '600' },
  trimester: { fontSize: 12.5 },
  gestationalAge: { fontSize: 26, lineHeight: 35, fontWeight: '700', marginVertical: 10 },
  dueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  standaloneSectionTitle: { marginTop: 24, marginBottom: 10 },
  sectionEditLink: { fontSize: 14.5, fontWeight: '600' },
  card: {
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  infoRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  label: { fontSize: 14.5, flexShrink: 1 },
  value: { fontSize: 14.5, textAlign: 'right', flexShrink: 1, maxWidth: '62%' },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  historyCard: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { flex: 1, fontSize: 19, fontWeight: '700' },
  modalContent: { padding: 20, width: '100%', maxWidth: 600, alignSelf: 'center' },
  formNote: { fontSize: 14.5, lineHeight: 22, marginBottom: 20 },
  field: { marginBottom: 18 },
  inputLabel: { fontSize: 14.5, fontWeight: '600', marginBottom: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15.5,
  },
  error: { marginBottom: 16, lineHeight: 21 },
  saveButton: {
    minHeight: 50,
    backgroundColor: colors.primary,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginTop: 6,
  },
  saveText: { color: colors.white, fontSize: 15.5, fontWeight: '700' },
});
