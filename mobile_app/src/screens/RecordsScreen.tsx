import React, { useCallback, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';

import type { MainTabParamList } from '../navigation/MainTabs';
import { colors } from '../theme/colors';
import EmergencyContacts, { type EmergencyContact } from '../components/EmergencyContacts';

type Editor = 'personal' | 'medical' | 'history' | null;
type Profile = {
  name: string; birthday: string; phone: string; email: string;
  blood: string; allergies: string; conditions: string; obstetricHistory: string;
};
type Field = { key: keyof Profile; label: string; placeholder?: string };

const fields: Record<'personal' | 'medical', Field[]> = {
  personal: [
    { key: 'name', label: 'Họ và tên' },
    { key: 'birthday', label: 'Ngày sinh', placeholder: 'DD/MM/YYYY' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'email', label: 'Email' },
  ],
  medical: [
    { key: 'blood', label: 'Nhóm máu', placeholder: 'Ví dụ: O+' },
    { key: 'allergies', label: 'Dị ứng' },
    { key: 'conditions', label: 'Bệnh nền' },
    { key: 'obstetricHistory', label: 'Tiền sử sản khoa' },
  ],
};

const initialProfile: Profile = {
  name: 'Nguyễn Thị Lan', birthday: '15/09/1996', phone: '0912345456',
  email: 'nguyen.lan@gmail.com', blood: '', allergies: '', conditions: '',
  obstetricHistory: '',
};

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
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsVisible, setContactsVisible] = useState(false);
  const mainContact = contacts.find((contact) => contact.primary) || contacts[0];

  useFocusEffect(useCallback(() => {
    const section = route.params?.section;
    if (!section) return;

    if (section === 'personal') {
      setDraft({ ...profile });
      setError('');
      setEditor('personal');
    } else if (section === 'contacts') {
      setContactsVisible(true);
    }

    navigation.setParams({ section: undefined });
  }, [navigation, profile, route.params?.section]));

  const openEditor = (section: Editor) => {
    setDraft({ ...profile });
    setError('');
    setEditor(section);
  };

  const save = () => {
    const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as Profile;
    if (editor === 'personal') {
      if (!next.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
        setError('Vui lòng nhập họ tên và email hợp lệ.'); return;
      }
      const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(next.birthday);
      const date = match ? new Date(+match[3], +match[2] - 1, +match[1]) : null;
      if (!match || !date || date.getDate() !== +match[1] || date.getMonth() !== +match[2] - 1 || date.getFullYear() !== +match[3] || date > new Date()) {
        setError('Ngày sinh chưa hợp lệ. Vui lòng nhập theo DD/MM/YYYY.'); return;
      }
    }
    if (editor === 'personal' && !/^\+?\d{9,15}$/.test(next.phone.replace(/[\s.-]/g, ''))) {
      setError('Vui lòng nhập đầy đủ tên và số điện thoại hợp lệ.'); return;
    }
    setProfile(next);
    setEditor(null);
  };

  const modalTitle = editor === 'personal' ? 'Chỉnh sửa hồ sơ' : editor === 'medical'
    ? 'Thông tin y tế' : 'Lịch sử kết quả';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}><Text style={styles.headerTitle}>Hồ sơ mẹ bầu</Text></View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Image source={require('../assets/pregnant.jpg')} style={styles.avatar} accessibilityLabel="Ảnh đại diện mẹ bầu" />
          <View style={styles.identityText}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.subtitle}>Hồ sơ của mẹ trên PreCare</Text>
          </View>
        </View>
        <OutlineButton title="Chỉnh sửa hồ sơ" icon="create-outline" onPress={() => openEditor('personal')} />

        <View style={styles.pregnancyCard}>
          <View style={styles.between}>
            <Text style={styles.pregnancyLabel}>Thai kỳ hiện tại</Text>
            <Text style={styles.trimester}>Tam cá nguyệt 3</Text>
          </View>
          <Text style={styles.gestationalAge}>32 tuần 4 ngày</Text>
          <View style={styles.dueRow}>
            <Text style={styles.label}>Ngày dự sinh</Text>
            <Text style={styles.value}>03/12/2026</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
        <View style={styles.card}>
          <InfoRow label="Ngày sinh" value={profile.birthday} />
          <InfoRow label="Số điện thoại" value={`${profile.phone.slice(0, 4)} *** ${profile.phone.slice(-2)}`} />
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
                ? `${mainContact.relationship} • ${mainContact.phone}`
                : 'Thêm người thân để dễ liên lạc khi mẹ cần hỗ trợ.'}</Text>
            </View>
          </View>
          <OutlineButton title={contacts.length ? 'Quản lý người liên hệ' : 'Thêm người liên hệ'} icon="person-add-outline" onPress={() => setContactsVisible(true)} />
        </View>

        <Text style={styles.sectionTitle}>Hồ sơ khám & kết quả</Text>
        {/* phần được sửa */}
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

      <EmergencyContacts visible={contactsVisible} contacts={contacts} onChange={setContacts} onClose={() => setContactsVisible(false)} />
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
                  <Text style={styles.formNote}>Thông tin hiện được lưu tạm trong phiên sử dụng.</Text>
                  {fields[editor].map((field) => (
                    <View key={field.key} style={styles.field}>
                      <Text style={styles.inputLabel}>{field.label}</Text>
                      <TextInput accessibilityLabel={field.label} style={styles.input}
                        value={draft[field.key]} placeholder={field.placeholder || field.label}
                        placeholderTextColor={colors.textLight}
                        keyboardType={field.key === 'email' ? 'email-address' : field.key.toLowerCase().includes('phone') ? 'phone-pad' : 'default'}
                        autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                        onChangeText={(value) => setDraft((current) => ({ ...current, [field.key]: value }))} />
                    </View>
                  ))}
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
