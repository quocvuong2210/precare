import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import type { MainTabParamList } from '../navigation/MainTabs';
import type { UploadStackParamList } from '../navigation/UploadNavigator';

type Props = CompositeScreenProps<
  NativeStackScreenProps<UploadStackParamList, 'UploadHome'>,
  BottomTabScreenProps<MainTabParamList, 'Upload'>
>;

/* ================= KIỂU DỮ LIỆU ================= */
type Status = 'processing' | 'done' | 'pending';

type UploadItem = {
  id: string;
  name: string;
  time: string;
  status: Status;
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// Nhãn + màu của từng trạng thái
const STATUS_STYLE: Record<Status, { label: string; bg: string; color: string }> = {
  processing: { label: 'Đang xử lý',   bg: '#FEF9C3', color: '#A16207' },
  done:       { label: 'Hoàn thành',   bg: '#CCFBF1', color: colors.primaryDark },
  pending:    { label: 'Chờ xác nhận', bg: '#FEE2E2', color: '#DC2626' },
};

/* ================= DỮ LIỆU MẪU (sau này thay bằng API) ================= */
const INITIAL_ITEMS: UploadItem[] = [
  { id: '1', name: 'Siêu âm thai 4D',     time: 'Hôm nay, 10:15', status: 'processing' },
  { id: '2', name: 'Công thức máu toàn bộ', time: '02/06/2026',   status: 'done' },
  { id: '3', name: 'Xét nghiệm nước tiểu', time: '15/05/2026',    status: 'pending' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const nowLabel = () => {
  const d = new Date();
  return `Hôm nay, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function UploadScreen({ navigation }: Props) {
  const [items, setItems] = useState<UploadItem[]>(INITIAL_ITEMS);

  /* ================= THÊM TÀI LIỆU VÀO DANH SÁCH ================= */
  const addItem = (name: string, size?: number | null) => {
    if (size && size > MAX_SIZE) {
      Alert.alert('File quá lớn', 'Vui lòng chọn file tối đa 10MB.');
      return;
    }

    // TODO: gọi API upload ở đây (POST ảnh/PDF lên backend)
    setItems((prev) => [
      { id: String(Date.now()), name, time: nowLabel(), status: 'processing' },
      ...prev,
    ]);
  };

  /* ================= CHỤP ẢNH ================= */
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Chưa cấp quyền', 'Hãy cho phép ứng dụng dùng camera trong Cài đặt.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    const asset = result.assets[0];
    addItem(asset.fileName ?? 'Phiếu khám (ảnh chụp)', asset.fileSize);
  };

  /* ================= CHỌN ẢNH TỪ THƯ VIỆN ================= */
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;

    const asset = result.assets[0];
    addItem(asset.fileName ?? 'Phiếu khám (ảnh)', asset.fileSize);
  };

  /* ================= CHỌN FILE PDF ================= */
  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    addItem(asset.name, asset.size);
  };

  /* ================= MENU CHỌN CÁCH TẢI ================= */
  const openChooser = () => {
    Alert.alert('Chọn tài liệu', 'Bạn muốn tải lên bằng cách nào?', [
      { text: 'Chụp ảnh', onPress: takePhoto },
      { text: 'Chọn từ thư viện ảnh', onPress: pickImage },
      { text: 'Chọn file PDF', onPress: pickPdf },
      { text: 'Huỷ', style: 'cancel' },
    ]);
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <StatusBar style="dark" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={18} color={colors.navy} />
        </Pressable>

        <Text style={styles.headerTitle}>Tải lên phiếu khám</Text>

        <Pressable style={styles.headerButton} onPress={() => {}}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= KHUNG TẢI LÊN ================= */}
        <Pressable style={styles.dropZone} onPress={openChooser}>
          <View style={styles.cameraCircle}>
            <Ionicons name="camera-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.dropTitle}>Chụp ảnh hoặc chọn file PDF</Text>
          <Text style={styles.dropSub}>Hỗ trợ định dạng JPG, PNG, PDF tối đa 10MB</Text>

          <Pressable
            onPress={openChooser}
            style={({ pressed }) => [styles.chooseButton, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.chooseText}>Chọn tài liệu</Text>
          </Pressable>
        </Pressable>

        {/* ================= TÀI LIỆU GẦN ĐÂY ================= */}
        <Text style={styles.sectionTitle}>Tài liệu tải lên gần đây</Text>

        {items.map((item) => {
          const s = STATUS_STYLE[item.status];
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text-outline" size={18} color="#475569" />
              </View>

              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemTime}>{item.time}</Text>
              </View>

              <View style={[styles.badge, { backgroundColor: s.bg }]}>
                <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
              </View>
            </View>
          );
        })}

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('ManualResultEntry')}
          style={({ pressed }) => [styles.manualButton, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.manualButtonText}>Nhập kết quả thủ công</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F8FA' },

  /* ================= HEADER ================= */
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.navy },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },

  /* ================= KHUNG TẢI LÊN ================= */
  dropZone: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  cameraCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  dropTitle: { fontSize: 14.5, fontWeight: '800', color: colors.navy },
  dropSub: { fontSize: 11.5, color: colors.textLight, marginTop: 6, textAlign: 'center' },
  chooseButton: {
    marginTop: 18,
    height: 38,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseText: { fontSize: 13, fontWeight: '700', color: colors.white },

  /* ================= DANH SÁCH ================= */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 24,
    marginBottom: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  fileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  itemName: { fontSize: 13.5, fontWeight: '700', color: colors.navy },
  itemTime: { fontSize: 11, color: colors.textLight, marginTop: 3 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 10.5, fontWeight: '700' },

  manualButton: {
    marginTop: 36,
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  manualButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
