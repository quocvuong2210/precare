import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/MainTabs';
import { colors } from '../theme/colors';

// Presentation fixtures only. Replace with confirmed measurements and validated
// reference ranges from the backend before showing clinical interpretations.
const weeks = [16, 20, 24, 28, 32, 36];
const metrics = [
  { id: 'weight', label: 'Cân nặng thai nhi', title: 'Biểu đồ cân nặng thai nhi', unit: 'g', max: 3500,
    ticks: [100, 1000, 2000, 3000], values: [150, 340, 670, 1100, 1800, 2600], range: [200, 2800] },
  { id: 'bpd', label: 'Đường kính lưỡng đỉnh', title: 'Biểu đồ đường kính lưỡng đỉnh', unit: 'mm', max: 100,
    ticks: [20, 40, 60, 80], values: [34, 47, 60, 72, 82, 90], range: [25, 90] },
  { id: 'hc', label: 'Chu vi vòng đầu', title: 'Biểu đồ chu vi vòng đầu', unit: 'mm', max: 360,
    ticks: [80, 160, 240, 320], values: [125, 175, 220, 260, 295, 325], range: [100, 330] },
] as const;
type Metric = (typeof metrics)[number];

function GrowthChart({ metric, selected, onSelect }: { metric: Metric; selected: number; onSelect: (index: number) => void }) {
  const [width, setWidth] = useState(0);
  const plotHeight = 144;
  const plotWidth = Math.max(0, width - 54);
  const x = (index: number) => 44 + (index / (weeks.length - 1)) * plotWidth;
  const y = (value: number) => 16 + plotHeight * (1 - value / metric.max);
  return (
    <View style={s.chart} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 54 && <>
        <View style={[s.range, { left: 40, width: width - 50, top: y(metric.range[1]), height: y(metric.range[0]) - y(metric.range[1]) }]} />
        {metric.ticks.map((tick) => (
          <React.Fragment key={tick}>
            <Text style={[s.yLabel, { top: y(tick) - 5 }]}>{tick}{metric.unit}</Text>
            <View style={[s.gridline, { top: y(tick), left: 40, width: width - 50 }]} />
          </React.Fragment>
        ))}
        {metric.values.slice(0, -1).map((value, index) => {
          const dx = x(index + 1) - x(index);
          const dy = y(metric.values[index + 1]) - y(value);
          const length = Math.hypot(dx, dy);
          return <View key={weeks[index]} pointerEvents="none" style={[s.segment, {
            left: (x(index) + x(index + 1)) / 2 - length / 2,
            top: (y(value) + y(metric.values[index + 1])) / 2 - 1,
            width: length, backgroundColor: index < selected ? colors.primary : '#FB7185',
            transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
          }]} />;
        })}
        {metric.values.map((value, index) => (
          <Pressable key={weeks[index]} accessibilityRole="button"
            accessibilityLabel={`Tuần ${weeks[index]}, ${value} ${metric.unit}`}
            accessibilityState={{ selected: index === selected }}
            onPress={() => onSelect(index)} style={[s.pointTarget, { left: x(index) - 20, top: y(value) - 20 }]}>
            <View style={[s.dot, index === selected && s.selectedDot]} />
          </Pressable>
        ))}
        {weeks.map((week, index) => (
          <Pressable key={week} accessibilityRole="button" accessibilityLabel={`Xem tuần ${week}`} onPress={() => onSelect(index)}
            style={[s.weekTarget, { left: x(index) - 20 }]}>
            <Text style={[s.week, selected === index && s.selectedWeek]}>W{week}</Text>
          </Pressable>
        ))}
      </>}
    </View>
  );
}

export default function ChartsScreen({ navigation }: BottomTabScreenProps<MainTabParamList, 'Charts'>) {
  const [metric, setMetric] = useState<Metric>(metrics[0]);
  const [selected, setSelected] = useState(3);
  const [expanded, setExpanded] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const value = metric.values[selected].toLocaleString('en-US');

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Về trang chủ" style={s.headerButton} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={20} color={colors.textMuted} />
        </Pressable>
        <Text style={s.headerTitle}>Biểu đồ tăng trưởng</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Thông tin biểu đồ" style={s.headerButton} onPress={() => setShowInfo(true)}>
          <Ionicons name="ellipsis-vertical" size={21} color={colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.selector}>
          <Pressable accessibilityRole="button" accessibilityLabel="Chọn chỉ số tăng trưởng" accessibilityState={{ expanded }} style={s.selectorButton} onPress={() => setExpanded(!expanded)}>
            <Text style={s.selectorText}>{metric.label}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.textMuted} />
          </Pressable>
          {expanded && metrics.filter((item) => item.id !== metric.id).map((item) => (
            <Pressable key={item.id} accessibilityRole="button" style={s.option} onPress={() => { setMetric(item); setExpanded(false); }}>
              <Text style={s.selectorText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.body}>
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.flex}>
                <Text style={s.cardTitle}>{metric.title}</Text>
                <Text style={s.subtitle}>So sánh với khoảng tham chiếu minh họa</Text>
              </View>
              <Text accessibilityLiveRegion="polite" style={s.valueBadge}>~{value}{metric.unit}</Text>
            </View>
            <GrowthChart metric={metric} selected={selected} onSelect={setSelected} />
            <View style={s.legend}>
              <View style={s.legendItem}><View style={s.legendBox} /><Text style={s.legendText}>Khoảng minh họa</Text></View>
              <View style={s.legendItem}><View style={s.legendLine} /><Text style={s.legendText}>Chỉ số của bé</Text></View>
            </View>
          </View>

          <View style={[s.card, s.explanation]}>
            <Text style={s.cardTitle}>Chuyên gia PreCare giải thích:</Text>
            <Text style={s.explanationText}>
              Ở tuần {weeks[selected]}, {metric.label.toLowerCase()} trong ví dụ là {value} {metric.unit}. Chạm vào các mốc trên biểu đồ để xem sự thay đổi theo từng tuần, hoặc chọn chỉ số khác ở phía trên.
            </Text>
            <Text style={s.explanationText}>Đây là dữ liệu minh họa giao diện. Cần có kết quả khám và khoảng tham chiếu đã được xác thực để đánh giá tăng trưởng của bé.</Text>
          </View>
          <Text style={s.footnote}>* Khuyến cáo: Các chỉ số và thông số chỉ mang tính chất tham khảo dựa trên kết quả siêu âm định kỳ, không thay thế cho tư vấn trực tiếp của bác sĩ sản khoa phụ trách.</Text>
          <View style={s.demoNote}><Ionicons name="information-circle-outline" size={15} color={colors.textMuted} /><Text style={s.demoText}>Dữ liệu minh họa · Chưa kết nối hồ sơ khám</Text></View>
        </View>
      </ScrollView>

      <Modal transparent visible={showInfo} animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Đóng thông tin" onPress={() => setShowInfo(false)} />
          <View accessibilityViewIsModal style={s.dialog}>
            <Text style={s.cardTitle}>Về biểu đồ tăng trưởng</Text>
            <Text style={s.explanationText}>Chọn một chỉ số và chạm vào điểm đo hoặc mốc tuần để xem giá trị tương ứng. Các giá trị và vùng màu đang dùng dữ liệu minh họa, chưa phải kết quả khám của mẹ hoặc tiêu chuẩn y khoa.</Text>
            <Pressable accessibilityRole="button" style={s.closeButton} onPress={() => setShowInfo(false)}><Text style={s.closeText}>Đã hiểu</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: '#E2EAF3' },
  headerButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F7FAFC', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.navy, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  content: { paddingBottom: 24, width: '100%', maxWidth: 600, alignSelf: 'center' },
  selector: { backgroundColor: colors.white },
  selectorButton: { minHeight: 38, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E1E9F3', borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#F7FAFC' },
  selectorText: { color: colors.navy, fontSize: 13, fontWeight: '500' },
  option: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 18 },
  body: { padding: 18 },
  card: { borderWidth: 1, borderColor: '#DFE8F4', backgroundColor: colors.white, borderRadius: 16, padding: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, lineHeight: 21 },
  subtitle: { color: '#91A4BF', fontSize: 12, marginTop: 3, lineHeight: 17 },
  valueBadge: { color: '#008B7E', fontSize: 13, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 5, backgroundColor: '#CCFBF1', overflow: 'hidden' },
  chart: { height: 198, backgroundColor: '#F7FAFC', borderRadius: 10, position: 'relative' },
  range: { position: 'absolute', backgroundColor: '#E4F8F5' },
  gridline: { position: 'absolute', height: 1, backgroundColor: '#DCEEEB' },
  yLabel: { position: 'absolute', left: 0, width: 36, textAlign: 'right', fontSize: 9, color: '#94A8C0' },
  segment: { position: 'absolute', height: 2, borderRadius: 1 },
  pointTarget: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: { height: 4, width: 4, backgroundColor: colors.primary, borderRadius: 2, borderWidth: 1, borderColor: colors.white },
  selectedDot: { height: 10, width: 10, borderRadius: 5, borderWidth: 3, backgroundColor: '#FB7185', borderColor: '#FFD5DD' },
  weekTarget: { position: 'absolute', top: 167, width: 40, height: 30, alignItems: 'center', justifyContent: 'center' },
  week: { color: '#94A8C0', fontSize: 10 },
  selectedWeek: { color: '#008579', fontWeight: '700' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, paddingTop: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendBox: { width: 10, height: 9, backgroundColor: '#CCFBF1' },
  legendLine: { width: 12, height: 2, backgroundColor: colors.primary },
  legendText: { color: colors.textMuted, fontSize: 11 },
  explanation: { marginTop: 18 },
  explanationText: { color: colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 9 },
  footnote: { marginTop: 18, color: '#52627C', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  demoNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  demoText: { color: colors.textMuted, fontSize: 11, flexShrink: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.white, borderRadius: 18, padding: 22 },
  closeButton: { backgroundColor: colors.primary, borderRadius: 8, padding: 13, alignItems: 'center', marginTop: 20 },
  closeText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
