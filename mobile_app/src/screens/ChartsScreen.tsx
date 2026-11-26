import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/MainTabs';
import ScreenHeader from '../components/ScreenHeader';
import { useAppSettings } from '../context/AppSettingsContext';
import { colors } from '../theme/colors';

const weeks = [16, 20, 24, 28, 32, 36];
const METRIC_ITEMS = [
  {
    id: 'weight',
    labelVi: 'Cân nặng thai nhi',
    labelEn: 'Estimated fetal weight',
    titleVi: 'Biểu đồ cân nặng thai nhi',
    titleEn: 'Fetal weight trajectory',
    unit: 'g',
    max: 3500,
    ticks: [100, 1000, 2000, 3000],
    values: [150, 340, 670, 1100, 1800, 2600],
    range: [200, 2800],
  },
  {
    id: 'bpd',
    labelVi: 'Đường kính lưỡng đỉnh',
    labelEn: 'Biparietal diameter (BPD)',
    titleVi: 'Biểu đồ đường kính lưỡng đỉnh',
    titleEn: 'Biparietal diameter (BPD) chart',
    unit: 'mm',
    max: 100,
    ticks: [20, 40, 60, 80],
    values: [34, 47, 60, 72, 82, 90],
    range: [25, 90],
  },
  {
    id: 'hc',
    labelVi: 'Chu vi vòng đầu',
    labelEn: 'Head circumference (HC)',
    titleVi: 'Biểu đồ chu vi vòng đầu',
    titleEn: 'Head circumference (HC) chart',
    unit: 'mm',
    max: 360,
    ticks: [80, 160, 240, 320],
    values: [125, 175, 220, 260, 295, 325],
    range: [100, 330],
  },
] as const;

type Metric = (typeof METRIC_ITEMS)[number];

function GrowthChart({ metric, selected, onSelect }: { metric: Metric; selected: number; onSelect: (index: number) => void }) {
  const { preferences, theme, scaleText } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [width, setWidth] = useState(0);
  const plotHeight = 144;
  const plotWidth = Math.max(0, width - 58);
  const x = (index: number) => 48 + (index / (weeks.length - 1)) * plotWidth;
  const y = (value: number) => 16 + plotHeight * (1 - value / metric.max);
  return (
    <View
      style={[s.chart, { backgroundColor: theme.surfaceAlt }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 58 && (
        <>
          <View
            style={[
              s.range,
              {
                backgroundColor: theme.tealSoft,
                left: 44,
                width: width - 54,
                top: y(metric.range[1]),
                height: y(metric.range[0]) - y(metric.range[1]),
              },
            ]}
          />
          {metric.ticks.map((tick) => (
            <React.Fragment key={tick}>
              <Text
                style={[
                  s.yLabel,
                  {
                    color: theme.muted,
                    top: y(tick) - 6,
                    fontSize: scaleText(10.5, { min: 10, max: 12 }),
                  },
                ]}
              >
                {tick}{metric.unit}
              </Text>
              <View style={[s.gridline, { backgroundColor: theme.tealBorder, top: y(tick), left: 44, width: width - 54 }]} />
            </React.Fragment>
          ))}
          {metric.values.slice(0, -1).map((value, index) => {
            const dx = x(index + 1) - x(index);
            const dy = y(metric.values[index + 1]) - y(value);
            const length = Math.hypot(dx, dy);
            return (
              <View
                key={weeks[index]}
                pointerEvents="none"
                style={[
                  s.segment,
                  {
                    left: (x(index) + x(index + 1)) / 2 - length / 2,
                    top: (y(value) + y(metric.values[index + 1])) / 2 - 1,
                    width: length,
                    backgroundColor: index < selected ? colors.primary : '#FB7185',
                    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                  },
                ]}
              />
            );
          })}
          {metric.values.map((value, index) => (
            <Pressable
              key={weeks[index]}
              accessibilityRole="button"
              accessibilityLabel={`${isEn ? 'Week' : 'Tuần'} ${weeks[index]}, ${value} ${metric.unit}`}
              accessibilityState={{ selected: index === selected }}
              onPress={() => onSelect(index)}
              style={[s.pointTarget, { left: x(index) - 20, top: y(value) - 20 }]}
            >
              <View style={[s.dot, index === selected && s.selectedDot]} />
            </Pressable>
          ))}
          {weeks.map((week, index) => (
            <Pressable
              key={week}
              accessibilityRole="button"
              accessibilityLabel={`${isEn ? 'View week' : 'Xem tuần'} ${week}`}
              onPress={() => onSelect(index)}
              style={[s.weekTarget, { left: x(index) - 20 }]}
            >
              <Text
                style={[
                  s.week,
                  { color: theme.muted, fontSize: scaleText(11.5, { min: 10.5, max: 13 }) },
                  selected === index && { color: theme.tealText, fontWeight: '700' },
                ]}
              >
                W{week}
              </Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

export default function ChartsScreen({ navigation }: BottomTabScreenProps<MainTabParamList, 'Charts'>) {
  const { preferences, theme, fontStyle } = useAppSettings();
  const isEn = preferences.language === 'en';
  const [metric, setMetric] = useState<Metric>(METRIC_ITEMS[0]);
  const [selected, setSelected] = useState(3);
  const [expanded, setExpanded] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const value = metric.values[selected].toLocaleString('en-US');
  const metricLabel = isEn ? metric.labelEn : metric.labelVi;
  const metricTitle = isEn ? metric.titleEn : metric.titleVi;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.surface }]} edges={['top']}>
      <StatusBar style={preferences.darkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isEn ? 'Growth Charts' : 'Biểu đồ tăng trưởng'}
        onBack={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        backLabel={isEn ? 'Go back' : 'Quay lại'}
        rightIcon="ellipsis-vertical"
        onRightPress={() => setShowInfo(true)}
        rightAccessibilityLabel={isEn ? 'Chart info' : 'Thông tin biểu đồ'}
      />
      <ScrollView style={{ backgroundColor: theme.background }} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={{ backgroundColor: theme.surface }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isEn ? 'Select growth metric' : 'Chọn chỉ số tăng trưởng'}
            accessibilityState={{ expanded }}
            style={[s.selectorButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={[s.selectorText, fontStyle(15, { min: 14 }), { color: theme.text }]}>{metricLabel}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={theme.muted} />
          </Pressable>
          {expanded &&
            METRIC_ITEMS.filter((item) => item.id !== metric.id).map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                style={s.option}
                onPress={() => {
                  setMetric(item);
                  setExpanded(false);
                }}
              >
                <Text style={[s.selectorText, fontStyle(15, { min: 14 }), { color: theme.text }]}>
                  {isEn ? item.labelEn : item.labelVi}
                </Text>
              </Pressable>
            ))}
        </View>

        <View style={s.body}>
          <View style={[s.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={s.cardHeader}>
              <View style={s.flex}>
                <Text style={[s.cardTitle, fontStyle(16, { lineHeight: 22, min: 14.5 }), { color: theme.text }]}>
                  {metricTitle}
                </Text>
              </View>
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  s.valueBadge,
                  fontStyle(14, { min: 13, max: 16.5 }),
                  { color: theme.tealText, backgroundColor: theme.tealSoft },
                ]}
              >
                ~{value}{metric.unit}
              </Text>
            </View>
            <GrowthChart metric={metric} selected={selected} onSelect={setSelected} />
            <View style={s.legend}>
              <View style={s.legendItem}>
                <View style={[s.legendBox, { backgroundColor: theme.tealSoft }]} />
                <Text style={[s.legendText, fontStyle(12.5, { min: 11.5 }), { color: theme.muted }]}>
                  {isEn ? 'Reference band' : 'Khoảng minh họa'}
                </Text>
              </View>
              <View style={s.legendItem}>
                <View style={s.legendLine} />
                <Text style={[s.legendText, fontStyle(12.5, { min: 11.5 }), { color: theme.muted }]}>
                  {isEn ? 'Baby metrics' : 'Chỉ số của bé'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[s.card, s.explanation, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, fontStyle(16, { lineHeight: 22, min: 14.5 }), { color: theme.text }]}>
              {isEn ? 'PreCare Clinical Notes:' : 'Chuyên gia PreCare giải thích:'}
            </Text>
            <Text style={[s.explanationText, fontStyle(15, { lineHeight: 23, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? `At week ${weeks[selected]}, the illustrative ${metricLabel.toLowerCase()} is ${value} ${metric.unit}. Tap points on the chart to inspect weekly changes or choose another metric above.`
                : `Ở tuần ${weeks[selected]}, ${metricLabel.toLowerCase()} trong ví dụ là ${value} ${metric.unit}. Chạm vào các mốc trên biểu đồ để xem sự thay đổi theo từng tuần, hoặc chọn chỉ số khác ở phía trên.`}
            </Text>
            <Text style={[s.explanationText, fontStyle(15, { lineHeight: 23, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'This chart displays illustrative interface data. Confirmed checkup records and validated percentile ranges are required for clinical growth assessment.'
                : 'Đây là dữ liệu minh họa giao diện. Cần có kết quả khám và khoảng tham chiếu đã được xác thực để đánh giá tăng trưởng của bé.'}
            </Text>
          </View>
          <Text style={[s.footnote, fontStyle(12.5, { lineHeight: 18, min: 11.5 }), { color: theme.muted }]}>
            {isEn
              ? '* Disclaimer: Reference curves and figures are informational only and do not replace direct consultation with your obstetrician.'
              : '* Khuyến cáo: Các chỉ số và thông số chỉ mang tính chất tham khảo dựa trên kết quả siêu âm định kỳ, không thay thế cho tư vấn trực tiếp của bác sĩ sản khoa phụ trách.'}
          </Text>
          <View style={s.demoNote}>
            <Ionicons name="information-circle-outline" size={15} color={theme.muted} />
            <Text style={[s.demoText, fontStyle(12.5, { min: 11.5 }), { color: theme.muted }]}>
              {isEn ? 'Illustrative data · Not linked to checkup records' : 'Dữ liệu minh họa · Chưa kết nối hồ sơ khám'}
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={showInfo} animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={[s.overlay, { backgroundColor: theme.overlay }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel={isEn ? 'Close info' : 'Đóng thông tin'}
            onPress={() => setShowInfo(false)}
          />
          <View accessibilityViewIsModal style={[s.dialog, { backgroundColor: theme.surface }]}>
            <Text style={[s.cardTitle, fontStyle(16, { lineHeight: 22, min: 14.5 }), { color: theme.text }]}>
              {isEn ? 'About growth charts' : 'Về biểu đồ tăng trưởng'}
            </Text>
            <Text style={[s.explanationText, fontStyle(15, { lineHeight: 23, min: 14 }), { color: theme.muted }]}>
              {isEn
                ? 'Select a metric and tap any data point or week label to view values. Current values and bands are UI sample data, not your medical record.'
                : 'Chọn một chỉ số và chạm vào điểm đo hoặc mốc tuần để xem giá trị tương ứng. Các giá trị và vùng màu đang dùng dữ liệu minh họa, chưa phải kết quả khám của mẹ hoặc tiêu chuẩn y khoa.'}
            </Text>
            <Pressable accessibilityRole="button" style={s.closeButton} onPress={() => setShowInfo(false)}>
              <Text style={[s.closeText, fontStyle(15, { min: 14 })]}>{isEn ? 'Got it' : 'Đã hiểu'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  header: { height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderBottomWidth: 1 },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', flexShrink: 1 },
  content: { paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  selectorButton: { minHeight: 44, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  selectorText: { fontSize: 15, fontWeight: '500' },
  option: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18 },
  body: { padding: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  subtitle: { fontSize: 13.5, marginTop: 3, lineHeight: 19 },
  valueBadge: { fontSize: 14, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 5, overflow: 'hidden' },
  chart: { height: 198, borderRadius: 10, position: 'relative' },
  range: { position: 'absolute' },
  gridline: { position: 'absolute', height: 1 },
  yLabel: { position: 'absolute', left: 0, width: 42, textAlign: 'right', fontSize: 10.5 },
  segment: { position: 'absolute', height: 2, borderRadius: 1 },
  pointTarget: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 4, width: 4, backgroundColor: colors.primary, borderRadius: 2, borderWidth: 1, borderColor: colors.white },
  selectedDot: { height: 10, width: 10, borderRadius: 5, borderWidth: 3, backgroundColor: '#FB7185', borderColor: '#FFD5DD' },
  weekTarget: { position: 'absolute', top: 167, width: 40, height: 30, alignItems: 'center', justifyContent: 'center' },
  week: { fontSize: 11.5 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: { width: 10, height: 9 },
  legendLine: { width: 12, height: 2, backgroundColor: colors.primary },
  legendText: { fontSize: 12.5 },
  explanation: { marginTop: 18 },
  explanationText: { fontSize: 15, lineHeight: 23, marginTop: 9 },
  footnote: { marginTop: 18, fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  demoText: { fontSize: 12.5, flexShrink: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 18, padding: 22 },
  closeButton: { minHeight: 44, backgroundColor: colors.primary, borderRadius: 8, padding: 13, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  closeText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
