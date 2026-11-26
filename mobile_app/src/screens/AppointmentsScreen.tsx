import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Appointments'>;

type Appointment = {
  id: string;
  date: string;
  title: string;
  doctor: string;
  pregnancyWeek: number;
  time: string;
  status: 'upcoming' | 'done';
};

const APPOINTMENTS: Appointment[] = [];

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_NAMES_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const WEEKDAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type Cell = { date: Date; inMonth: boolean };

function buildMonth(year: number, month: number): Cell[][] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
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
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [view, setView] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const [selected, setSelected] = useState(() => new Date());
  const [reminder, setReminder] = useState(true);

  const weekdays = isEn ? WEEKDAYS_EN : WEEKDAYS_VI;
  const formatDate = (d: Date) =>
    `${isEn ? WEEKDAY_NAMES_EN[d.getDay()] : WEEKDAY_NAMES_VI[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

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
    if (!cell.inMonth) {
      setView({ year: cell.date.getFullYear(), month: cell.date.getMonth() });
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.surface }]} edges={['top', 'bottom']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title={isEn ? 'Appointments' : 'Lịch hẹn khám'}
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        onRightPress={() => {}}
        rightAccessibilityLabel={isEn ? 'Options' : 'Tùy chọn'}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.calendarCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.monthRow}>
            <Text style={[styles.monthTitle, fontStyle(16, { min: 14.5, max: 19 }), { color: theme.text }]}>
              {isEn
                ? `${MONTH_NAMES_EN[view.month]} ${view.year}`
                : `Tháng ${view.month + 1}, ${view.year}`}
            </Text>

            <View style={styles.monthArrows}>
              <Pressable onPress={() => changeMonth(-1)} hitSlop={10}>
                <Ionicons name="chevron-back" size={18} color={theme.text} />
              </Pressable>
              <Pressable onPress={() => changeMonth(1)} hitSlop={10} style={{ marginLeft: 14 }}>
                <Ionicons name="chevron-forward" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekRow}>
            {weekdays.map((w) => (
              <Text key={w} style={[styles.weekday, fontStyle(12, { min: 11, max: 13.5 }), { color: theme.muted }]}>
                {w}
              </Text>
            ))}
          </View>

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
                          fontStyle(14, { min: 12.5, max: 16 }),
                          { color: cell.inMonth ? theme.text : theme.muted, opacity: cell.inMonth ? 1 : 0.45 },
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cell.date.getDate()}
                      </Text>

                      {hasAppointment && !isSelected && <View style={styles.dot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={[styles.reminderCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.reminderIcon, { backgroundColor: theme.tealSoft }]}>
            <Ionicons name="notifications-outline" size={18} color={theme.tealText} />
          </View>

          <View style={styles.reminderInfo}>
            <Text style={[styles.reminderTitle, fontStyle(15, { lineHeight: 21, min: 14 }), { color: theme.text }]}>
              {isEn ? 'Appointment reminder' : 'Nhắc nhở trước lịch khám'}
            </Text>
            <Text style={[styles.reminderSub, fontStyle(13, { lineHeight: 18, min: 12 }), { color: theme.muted }]}>
              {isEn ? 'Notify 24 hours before checkup' : 'Thông báo trước 24 giờ'}
            </Text>
          </View>

          <Switch
            value={reminder}
            onValueChange={setReminder}
            trackColor={{ false: theme.switchTrack, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={theme.switchTrack}
          />
        </View>

        <Text style={[styles.sectionTitle, fontStyle(15.5, { min: 14.5 }), { color: theme.textSecondary }]}>
          {isEn ? 'Appointment details' : 'Chi tiết lịch hẹn'}
        </Text>

        {todaysAppointments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyText, fontStyle(14.5, { lineHeight: 21, min: 13.5 }), { color: theme.muted }]}>
              {isEn ? 'No appointments on this date' : 'Không có lịch hẹn trong ngày này'}
            </Text>
          </View>
        ) : (
          todaysAppointments.map((item) => (
            <View key={item.id} style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.detailIcon, { backgroundColor: theme.tealSoft }]}>
                <Ionicons name="heart" size={22} color={theme.tealText} />
              </View>

              <View style={styles.detailInfo}>
                <View style={styles.detailTitleRow}>
                  <Text
                    style={[styles.detailTitle, fontStyle(15, { lineHeight: 21, min: 14 }), { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  {item.status === 'upcoming' && (
                    <View style={[styles.badge, { backgroundColor: theme.badgeGreenBg }]}>
                      <Text style={[styles.badgeText, fontStyle(12, { min: 11, max: 13.5 }), { color: theme.badgeGreenText }]}>
                        {isEn ? 'Upcoming' : 'Sắp tới'}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.detailDoctor, fontStyle(13.5, { lineHeight: 19, min: 12.5 }), { color: theme.textSecondary }]}>
                  {item.doctor} • {isEn ? `Week ${item.pregnancyWeek}` : `Tuần thai ${item.pregnancyWeek}`}
                </Text>

                <Text style={[styles.detailTime, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.muted }]}>
                  {item.time} • {formatDate(selected)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          title={isEn ? '+ Add new appointment' : '+ Thêm lịch hẹn mới'}
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthTitle: { fontSize: 16, fontWeight: '800' },
  monthArrows: { flexDirection: 'row', alignItems: 'center' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  dayCell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 14, fontWeight: '500' },
  dayTextSelected: { color: colors.white, fontWeight: '800', opacity: 1 },
  dot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderInfo: { flex: 1, marginLeft: 12 },
  reminderTitle: { fontSize: 15, fontWeight: '700' },
  reminderSub: { fontSize: 13, marginTop: 2 },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
  },
  detailCard: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  detailIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailInfo: { flex: 1, marginLeft: 12 },
  detailTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { flex: 1, fontSize: 15, fontWeight: '800', marginRight: 8 },
  detailDoctor: { fontSize: 13.5, marginTop: 4 },
  detailTime: { fontSize: 12.5, marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14.5 },
  bottomBar: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
});
