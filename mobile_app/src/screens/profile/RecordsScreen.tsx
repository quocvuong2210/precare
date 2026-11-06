import React, { useCallback, useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MainTabParamList } from '../../navigation/MainTabs';
import { colors } from '../../theme/colors';
import EmergencyContacts, { type EmergencyContact } from '../../components/EmergencyContacts';
import {
  calculatePregnancyProfile,
  currentUserProfile,
  fetchPregnancyProfileFromDB,
  restoreSession,
  savePregnancyProfileToDB,
  type PregnancyCalculateRequest,
} from '../../services/api';

type Editor = 'personal' | 'medical' | 'history' | null;
type Profile = {
  name: string; birthday: string; phone: string; email: string;
  blood: string; allergies: string; conditions: string; obstetricHistory: string;
  target_date: string; lmp: string; q1_ultrasound_date: string;
  q1_gestational_weeks: string; q1_gestational_days: string; crl_mm: string; override_edd: string;
};
type Field = { key: keyof Profile; label: string; placeholder?: string };

type SavedAccountRecord = {
  profile: Profile;
  trimester: string;
  gestationalAge: string;
  dueDate: string;
  contacts: EmergencyContact[];
};

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeIsoDate(raw: string): string {
  const s = String(raw || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\s]/g, '')
    .replace(/[–—−/]/g, '-');

  const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  return s;
}

function getStorageKey(email?: string, id?: string): string {
  const identifier = (email || id || 'guest').trim().toLowerCase();
  return `precare_account_record_${identifier}`;
}

const fields: Record<'personal' | 'medical', Field[]> = {
  personal: [
    { key: 'name', label: 'Họ và tên' },
    { key: 'birthday', label: 'Ngày sinh', placeholder: 'DD/MM/YYYY' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'target_date', label: 'Ngày tính toán (Target Date)', placeholder: 'Tự động lấy ngày hiện tại' },
    { key: 'lmp', label: 'Ngày kinh cuối (LMP)', placeholder: 'YYYY-MM-DD (VD: 2026-01-20)' },
    { key: 'q1_ultrasound_date', label: 'Ngày siêu âm Quý 1', placeholder: 'YYYY-MM-DD' },
    { key: 'q1_gestational_weeks', label: 'Tuần thai siêu âm Q1', placeholder: 'VD: 6' },
    { key: 'q1_gestational_days', label: 'Ngày lẻ thai siêu âm Q1', placeholder: 'VD: 0' },
    { key: 'crl_mm', label: 'Chiều dài đầu mông CRL (mm)', placeholder: 'VD: 10' },
    { key: 'override_edd', label: 'Ngày dự sinh ấn định (Override EDD)', placeholder: 'YYYY-MM-DD' },
  ],
  medical: [
    { key: 'blood', label: 'Nhóm máu', placeholder: 'Ví dụ: O+' },
    { key: 'allergies', label: 'Dị ứng' },
    { key: 'conditions', label: 'Bệnh nền' },
    { key: 'obstetricHistory', label: 'Tiền sử sản khoa' },
  ],
};

function createEmptyProfile(account?: { full_name?: string; email?: string; phone_number?: string; birthday?: string } | null): Profile {
  return {
    name: account?.full_name || '',
    birthday: account?.birthday || '',
    phone: account?.phone_number || '',
    email: account?.email || '',
    blood: '',
    allergies: '',
    conditions: '',
    obstetricHistory: '',
    target_date: getTodayISO(),
    lmp: '',
    q1_ultrasound_date: '',
    q1_gestational_weeks: '',
    q1_gestational_days: '',
    crl_mm: '',
    override_edd: '',
  };
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, !value && styles.missing]}>{value || 'Chưa cập nhật'}</Text>
    </View>
  );
}

function OutlineButton({ title, icon, onPress }: {
  title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={17} color={colors.primary} />
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export default function RecordsScreen({ navigation, route }: BottomTabScreenProps<MainTabParamList, 'Records'>) {
  const [profile, setProfile] = useState<Profile>(() => createEmptyProfile(currentUserProfile));
  const [draft, setDraft] = useState<Profile>(() => createEmptyProfile(currentUserProfile));
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsVisible, setContactsVisible] = useState(false);
  const mainContact = contacts.find((contact) => contact.primary) || contacts[0];

  const [trimester, setTrimester] = useState('Chưa cập nhật');
  const [gestationalAge, setGestationalAge] = useState('--');
  const [dueDate, setDueDate] = useState('Chưa cập nhật');

  const persistAccountData = async (
    nextProfile: Profile,
    nextTrimester: string,
    nextGestationalAge: string,
    nextDueDate: string,
    nextContacts: EmergencyContact[],
  ) => {
    try {
      const account = currentUserProfile || (await restoreSession());
      const storageKey = getStorageKey(account?.email || nextProfile.email, account?.id);
      const payload: SavedAccountRecord = {
        profile: nextProfile,
        trimester: nextTrimester,
        gestationalAge: nextGestationalAge,
        dueDate: nextDueDate,
        contacts: nextContacts,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (e) {
      console.log('Lỗi lưu dữ liệu tài khoản:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadCurrentAccountData() {
        const today = getTodayISO();
        const account = currentUserProfile || (await restoreSession());
        const storageKey = getStorageKey(account?.email, account?.id);

        let loadedProfile = createEmptyProfile(account);
        let loadedTrimester = 'Chưa cập nhật';
        let loadedAge = '--';
        let loadedDue = 'Chưa cập nhật';
        let loadedContacts: EmergencyContact[] = [];

        try {
          const raw = await AsyncStorage.getItem(storageKey);
          if (raw) {
            const parsed: SavedAccountRecord = JSON.parse(raw);
            if (parsed.profile) {
              loadedProfile = {
                ...loadedProfile,
                ...parsed.profile,
                name: parsed.profile.name || account?.full_name || '',
                email: parsed.profile.email || account?.email || '',
                phone: parsed.profile.phone || account?.phone_number || '',
                birthday: parsed.profile.birthday || account?.birthday || '',
                target_date: today,
              };
            }
            if (parsed.trimester) loadedTrimester = parsed.trimester;
            if (parsed.gestationalAge) loadedAge = parsed.gestationalAge;
            if (parsed.dueDate) loadedDue = parsed.dueDate;
            if (Array.isArray(parsed.contacts)) loadedContacts = parsed.contacts;
          }
        } catch (e) {
          console.log('Lỗi đọc dữ liệu tài khoản:', e);
        }

        const dbRecord = await fetchPregnancyProfileFromDB();
        if (dbRecord && typeof dbRecord === 'object') {
          if (dbRecord.lmp) loadedProfile.lmp = String(dbRecord.lmp).slice(0, 10);
          if (dbRecord.q1_ultrasound_date) {
            loadedProfile.q1_ultrasound_date = String(dbRecord.q1_ultrasound_date).slice(0, 10);
          }
          if (dbRecord.q1_gestational_weeks !== undefined && dbRecord.q1_gestational_weeks !== null) {
            loadedProfile.q1_gestational_weeks = String(dbRecord.q1_gestational_weeks);
          }
          if (dbRecord.q1_gestational_days !== undefined && dbRecord.q1_gestational_days !== null) {
            loadedProfile.q1_gestational_days = String(dbRecord.q1_gestational_days);
          }
          if (dbRecord.crl_mm !== undefined && dbRecord.crl_mm !== null) {
            loadedProfile.crl_mm = String(dbRecord.crl_mm);
          }
          if (dbRecord.edd && loadedDue === 'Chưa cập nhật') {
            loadedDue = String(dbRecord.edd).slice(0, 10).split('-').reverse().join('/');
          }
        }

        const hasPregnancyInput =
          loadedProfile.lmp ||
          loadedProfile.q1_ultrasound_date ||
          loadedProfile.crl_mm ||
          loadedProfile.override_edd;

        if (hasPregnancyInput) {
          try {
            const body: PregnancyCalculateRequest = { target_date: today };
            if (loadedProfile.lmp) body.lmp = loadedProfile.lmp;
            if (loadedProfile.q1_ultrasound_date) body.q1_ultrasound_date = loadedProfile.q1_ultrasound_date;
            if (loadedProfile.q1_gestational_weeks !== '') {
              body.q1_gestational_weeks = Number(loadedProfile.q1_gestational_weeks);
            }
            if (loadedProfile.q1_gestational_days !== '') {
              body.q1_gestational_days = Number(loadedProfile.q1_gestational_days);
            }
            if (loadedProfile.crl_mm !== '') {
              body.crl_mm = Number(loadedProfile.crl_mm);
            }
            if (loadedProfile.override_edd) {
              body.override_edd = loadedProfile.override_edd;
            }

            const res = await calculatePregnancyProfile(body);
            const responseData = res?.data || res;
            const w = responseData.gestational_age?.weeks;
            const days = responseData.gestational_age?.remaining_days ?? 0;
            const edd = responseData.calculated_edd || responseData.override_edd;
            const trimesterName = responseData.gestational_age?.trimester_name;

            if (w !== undefined) {
              loadedAge = `${w} tuần ${days} ngày`;
              loadedTrimester =
                trimesterName ||
                (w < 14 ? 'Tam cá nguyệt 1' : w < 28 ? 'Tam cá nguyệt 2' : 'Tam cá nguyệt 3');
            }
            if (edd) {
              loadedDue = String(edd).slice(0, 10).split('-').reverse().join('/');
            }
          } catch (e) {
            // Giữ nguyên kết quả
          }
        }

        if (!isActive) return;

        setProfile(loadedProfile);
        setDraft(loadedProfile);
        setTrimester(loadedTrimester);
        setGestationalAge(loadedAge);
        setDueDate(loadedDue);
        setContacts(loadedContacts);

        const section = route.params?.section;
        if (section === 'personal') {
          setError('');
          setEditor('personal');
          navigation.setParams({ section: undefined });
        } else if (section === 'contacts') {
          setContactsVisible(true);
          navigation.setParams({ section: undefined });
        }
      }

      loadCurrentAccountData();

      return () => {
        isActive = false;
      };
    }, [navigation, route.params?.section]),
  );

  const openEditor = (section: Editor) => {
    setDraft({
      ...profile,
      target_date: getTodayISO(),
    });
    setError('');
    setEditor(section);
  };

  const handleContactsChange = (nextContacts: EmergencyContact[]) => {
    setContacts(nextContacts);
    persistAccountData(profile, trimester, gestationalAge, dueDate, nextContacts);
    Alert.alert('Thành công', 'Đã cập nhật danh sách liên hệ khẩn cấp.')
  };

  const save = async () => {
    const today = getTodayISO();
    const next = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [
        key,
        String(value || '').replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim(),
      ]),
    ) as Profile;

    next.target_date = today;

    let nextTrimester = trimester;
    let nextGestationalAge = gestationalAge;
    let nextDueDate = dueDate;

    if (editor === 'personal') {
      const isoDate = /^\d{4}-\d{2}-\d{2}$/;
      for (const k of ['lmp', 'q1_ultrasound_date', 'override_edd'] as const) {
        if (next[k]) {
          next[k] = normalizeIsoDate(next[k]);
          if (!isoDate.test(next[k])) {
            setError('Ngày thai kỳ phải theo định dạng YYYY-MM-DD (VD: 2026-05-01).');
            return;
          }
        }
      }

      for (const k of ['q1_gestational_weeks', 'q1_gestational_days', 'crl_mm'] as const) {
        if (next[k] !== '' && Number.isNaN(Number(next[k]))) {
          setError('Tuần thai, ngày lẻ và CRL phải là số.');
          return;
        }
      }

      if (next.phone) {
        const cleanedPhone = next.phone.replace(/[\s.-]/g, '');
        if (!/^\+?\d{9,15}$/.test(cleanedPhone)) {
          setError('Số điện thoại không hợp lệ.');
          return;
        }
      }

      const hasInput = next.lmp || next.q1_ultrasound_date || next.crl_mm || next.override_edd;
      if (hasInput) {
        try {
          const body: PregnancyCalculateRequest = {
            target_date: today,
          };
          if (next.lmp) body.lmp = next.lmp;
          if (next.q1_ultrasound_date) body.q1_ultrasound_date = next.q1_ultrasound_date;
          if (next.q1_gestational_weeks !== '') body.q1_gestational_weeks = Number(next.q1_gestational_weeks);
          if (next.q1_gestational_days !== '') body.q1_gestational_days = Number(next.q1_gestational_days);
          if (next.crl_mm !== '') body.crl_mm = Number(next.crl_mm);
          if (next.override_edd) body.override_edd = next.override_edd;

          const res = await calculatePregnancyProfile(body);
          const responseData = res?.data || res;

          const w = responseData.gestational_age?.weeks;
          const days = responseData.gestational_age?.remaining_days ?? 0;
          const edd = responseData.calculated_edd || responseData.override_edd;
          const trimesterName = responseData.gestational_age?.trimester_name;

          if (w !== undefined) {
            nextGestationalAge = `${w} tuần ${days} ngày`;
            nextTrimester =
              trimesterName ||
              (w < 14 ? 'Tam cá nguyệt 1' : w < 28 ? 'Tam cá nguyệt 2' : 'Tam cá nguyệt 3');
            setGestationalAge(nextGestationalAge);
            setTrimester(nextTrimester);
          }

          if (edd) {
            nextDueDate = String(edd).slice(0, 10).split('-').reverse().join('/');
            setDueDate(nextDueDate);
          }

          await savePregnancyProfileToDB({
            ...body,
            edd: edd ? String(edd).slice(0, 10) : undefined,
          });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Lỗi tính toán tuổi thai từ máy chủ.');
          return;
        }
      } else {
        nextGestationalAge = '--';
        nextTrimester = 'Chưa cập nhật';
        nextDueDate = 'Chưa cập nhật';
        setGestationalAge(nextGestationalAge);
        setTrimester(nextTrimester);
        setDueDate(nextDueDate);
      }
    }

    if (currentUserProfile) {
      if (next.name) currentUserProfile.full_name = next.name;
      if (next.email) currentUserProfile.email = next.email;
      if (next.phone) currentUserProfile.phone_number = next.phone;
      if (next.birthday) currentUserProfile.birthday = next.birthday;
      await AsyncStorage.setItem('precare_current_user', JSON.stringify(currentUserProfile));
    }

    setProfile(next);
    await persistAccountData(next, nextTrimester, nextGestationalAge, nextDueDate, contacts);
    setEditor(null);

    // Hiển thị thông báo thành công khi lưu thay đổi hồ sơ
    Alert.alert('Thành công', 'Đã lưu thông tin hồ sơ và đồng bộ vào cơ sở dữ liệu.');
  };

  const modalTitle = editor === 'personal' ? 'Chỉnh sửa hồ sơ' : editor === 'medical'
    ? 'Thông tin y tế' : 'Lịch sử kết quả';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}><Text style={styles.headerTitle}>Hồ sơ mẹ bầu</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Image source={require('../../assets/pregnant.jpg')} style={styles.avatar} accessibilityLabel="Ảnh đại diện mẹ bầu" />
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
          onPress={() =>
            navigation.getParent()?.navigate('HistoryResults' as never)
          }
          style={({ pressed }) => [
            styles.card,
            styles.historyCard,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.iconBox}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.contactText}>
            <Text style={styles.cardTitle}>Xem lịch sử kết quả</Text>
            <Text style={styles.subtitle}>
              Phiếu khám, xét nghiệm và siêu âm đã lưu
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textLight}
          />
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
              {editor === 'history' ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}><Ionicons name="documents-outline" size={32} color={colors.primary} /></View>
                  <Text style={styles.name}>Chưa có kết quả để hiển thị</Text>
                  <Text style={styles.emptyDescription}>Tải phiếu khám, xét nghiệm hoặc siêu âm của mẹ để bắt đầu lưu hồ sơ.</Text>
                  <OutlineButton title="Tải phiếu khám" icon="cloud-upload-outline" onPress={() => {
                    setEditor(null); navigation.navigate('Upload', { screen: 'UploadHome' });
                  }} />
                </View>
              ) : editor && (
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
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 18 },
  emptyIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6FAF5', borderRadius: 36 },
  emptyDescription: { color: colors.textMuted, textAlign: 'center', fontSize: 14, lineHeight: 22 },
});