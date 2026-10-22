import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Appointments'>;

/* ================= DỮ LIỆU MẪU (sau này thay bằng API) ================= */
type Appointment = {
  id: string;
  date: string; // định dạng YYYY-MM-DD
  title: string;
  doctor: string;
  pregnancyWeek: number;
  time: string;
  status: 'upcoming' | 'done';
};

const APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    date: '2026-06-15',
    title: 'Khám định kỳ + Siêu âm',
    doctor: 'BS. Lê Minh',
    pregnancyWeek: 28,
    time: '08:30 AM',
    status: 'upcoming',
  },
];

/* ================= HÀM HỖ TRỢ LỊCH ================= */
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAY_NAMES = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDate = (d: Date) =>
  `${WEEKDAY_NAMES[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

type Cell = { date: Date; inMonth: boolean };

// Sinh lưới lịch của 1 tháng, mỗi hàng 7 ngày, bắt đầu từ Thứ 2
function buildMonth(year: number, month: number): Cell[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // T2 = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((offset + daysInMonth) / 7) * 7;

  const cells: Cell[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(year, month, 1 - offset + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export default function AppointmentsScreen({ navigation }: Props) {
  // Mặc định mở tháng 6/2026, chọn ngày 15 giống thiết kế
  const [view, setView] = useState({ year: 2026, month: 5 }); // month: 0-11
  const [selected, setSelected] = useState(new Date(2026, 5, 15));
  const [reminder, setReminder] = useState(true);

  const rows = buildMonth(view.year, view.month);
  const selectedKey = toKey(selected);
  const appointmentDates = new Set(APPOINTMENTS.map((a) => a.date));
  const todaysAppointments = APPOINTMENTS.filter((a) => a.date === selectedKey);

  const changeMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const onPickDay = (cell: Cell) => {
    setSelected(cell.date);
    // Bấm vào ngày của tháng khác thì nhảy sang tháng đó
    if (!cell.inMonth) {
      setView({ year: cell.date.getFullYear(), month: cell.date.getMonth() });
    }
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color={colors.navy} />
        </Pressable>

        <Text style={styles.headerTitle}>Lịch hẹn khám</Text>

        <Pressable style={styles.headerButton} onPress={() => {}}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= LỊCH ================= */}
        <View style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Text style={styles.monthTitle}>
              Tháng {view.month + 1}, {view.year}
            </Text>

            <View style={styles.monthArrows}>
              <Pressable onPress={() => changeMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={18} color={colors.navy} />
              </Pressable>
              <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={{ marginLeft: 14 }}>
                <Ionicons name="chevron-forward" size={18} color={colors.navy} />
              </Pressable>
            </View>
          </View>

          {/* Hàng thứ trong tuần */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          {/* Các ngày */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((cell) => {
                const key = toKey(cell.date);
                const isSelected = key === selectedKey;
                const hasAppointment = appointmentDates.has(key);

                return (
                  <Pressable key={key} style={styles.dayCell} onPress={() => onPickDay(cell)}>
                    <View style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}>
                      <Text
                        style={[
                          styles.dayText,
                          !cell.inMonth && styles.dayTextMuted,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>

                      {/* Chấm nhỏ báo ngày có lịch hẹn */}
                      {hasAppointment && !isSelected && <View style={styles.dot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* ================= NHẮC NHỞ ================= */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          </View>

          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>Nhắc nhở trước lịch khám</Text>
            <Text style={styles.reminderSub}>Thông báo trước 24 giờ</Text>
          </View>

          <Switch
            value={reminder}
            onValueChange={setReminder}
            trackColor={{ false: '#CBD5E1', true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor="#CBD5E1"
          />
        </View>

        {/* ================= CHI TIẾT LỊCH HẸN ================= */}
        <Text style={styles.sectionTitle}>Chi tiết lịch hẹn</Text>

        {todaysAppointments.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Không có lịch hẹn trong ngày này</Text>
          </View>
        ) : (
          todaysAppointments.map((item) => (
            <View key={item.id} style={styles.detailCard}>
              <View style={styles.detailIcon}>
                <Ionicons name="heart" size={22} color={colors.primary} />
              </View>

              <View style={styles.detailInfo}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailTitle} numberOfLines={1}>{item.title}</Text>

                  {item.status === 'upcoming' && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Sắp tới</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.detailDoctor}>
                  {item.doctor} • Tuần thai {item.pregnancyWeek}
                </Text>

                <Text style={styles.detailTime}>
                  {item.time} • {formatDate(selected)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* ================= NÚT THÊM LỊCH ================= */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title="+ Thêm lịch hẹn mới"
          onPress={() => {
            // TODO: mở màn hình / modal thêm lịch hẹn
          }}
        />
      </View>
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

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },

  /* ================= LỊCH ================= */
  calendarCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  monthArrows: { flexDirection: 'row', alignItems: 'center' },

  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 6,
  },

  dayCell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 13, fontWeight: '500', color: colors.navy },
  dayTextMuted: { color: '#CBD5E1' },
  dayTextSelected: { color: colors.white, fontWeight: '800' },
  dot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },

  /* ================= NHẮC NHỞ ================= */
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 14,
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfo: { flex: 1, marginLeft: 12 },
  reminderTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  reminderSub: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  /* ================= CHI TIẾT ================= */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 22,
    marginBottom: 10,
  },
  detailCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  detailIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: { flex: 1, marginLeft: 12 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.navy, marginRight: 8 },
  detailDoctor: { fontSize: 12, color: '#475569', marginTop: 4 },
  detailTime: { fontSize: 11, color: colors.textLight, marginTop: 4 },

  badge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: colors.primaryDark },

  emptyBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12.5, color: colors.textMuted },

  /* ================= NÚT DƯỚI ================= */
  bottomBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
});