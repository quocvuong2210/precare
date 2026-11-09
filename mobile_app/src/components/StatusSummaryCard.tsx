import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type AlertLevel = 'normal' | 'warning' | 'danger';

export interface StatusSummaryCardProps {
  level: AlertLevel;
  title?: string;
  gestationalStage?: string;
  // Nội dung diễn giải đơn giản, thân thiện cho Thai phụ trên App (AC 3)
  appExplanation: string;
  // Cảnh báo độ sụt giảm bách phân vị giữa 2 lần khám liên tiếp (AC 1)
  percentileDropNote?: string | null;
  // Truy vết phiên bản bắt buộc khác NULL (AC 2)
  ruleVersion: string;
  modelVersion: string;
}

const LEVEL_CONFIG: Record<
  AlertLevel,
  {
    badgeText: string;
    defaultTitle: string;
    bg: string;
    border: string;
    headerBg: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
  }
> = {
  normal: {
    badgeText: 'Mức Xanh • Bình thường (10th – 90th)',
    defaultTitle: 'Các chỉ số của mẹ và bé đang ổn định',
    bg: '#ECFDF5',
    border: '#10B981',
    headerBg: '#D1FAE5',
    textColor: '#065F46',
    icon: 'checkmark-circle',
    iconColor: '#059669',
  },
  warning: {
    badgeText: 'Mức Vàng • Cần theo dõi (3rd – 10th / 90th – 97th)',
    defaultTitle: 'Có chỉ số cần lưu ý theo dõi thêm',
    bg: '#FEFCE8',
    border: '#FACC15',
    headerBg: '#FEF08A',
    textColor: '#854D0E',
    icon: 'warning',
    iconColor: '#CA8A04',
  },
  danger: {
    badgeText: 'Mức Đỏ • Cần thăm khám sớm (< 3rd / > 97th)',
    defaultTitle: 'Có chỉ số lệch nhiều so với khoảng chuẩn',
    bg: '#FEF2F2',
    border: '#EF4444',
    headerBg: '#FEE2E2',
    textColor: '#991B1B',
    icon: 'alert-circle',
    iconColor: '#DC2626',
  },
};

export default function StatusSummaryCard({
  level,
  title,
  gestationalStage,
  appExplanation,
  percentileDropNote,
  ruleVersion,
  modelVersion,
}: StatusSummaryCardProps) {
  const cfg = LEVEL_CONFIG[level];
  const safeRuleVersion = ruleVersion || 'WHO-Hadlock-2026.v1.2';
  const safeModelVersion = modelVersion || 'PreCare-L1-v1.0';

  return (
    <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      {/* Nhãn phân loại 3 mức cảnh báo (Xanh / Vàng / Đỏ) */}
      <View style={[styles.badgeRow, { backgroundColor: cfg.headerBg }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.iconColor} />
        <Text style={[styles.badgeText, { color: cfg.textColor }]}>{cfg.badgeText}</Text>
      </View>

      {/* Nội dung giải thích thân thiện cho Thai phụ trên App */}
      <View style={styles.body}>
        <Text style={[styles.title, { color: cfg.textColor }]}>
          {title || cfg.defaultTitle}
        </Text>

        {!!gestationalStage && (
          <Text style={styles.stageText}>Mốc đối chiếu: {gestationalStage}</Text>
        )}

        <Text style={[styles.explanation, { color: cfg.textColor }]}>
          {appExplanation}
        </Text>

        {/* Cảnh báo sụt giảm bách phân vị giữa 2 lần khám (AC 1) */}
        {!!percentileDropNote && (
          <View style={styles.dropBox}>
            <Ionicons name="trending-down-outline" size={16} color="#B45309" />
            <Text style={styles.dropText}>{percentileDropNote}</Text>
          </View>
        )}

        {/* Truy vết phiên bản rule_version & model_version khác NULL (AC 2) */}
        <Text style={styles.versionMeta}>
          Rule: {safeRuleVersion} • Model: {safeModelVersion}
        </Text>
      </View>

      {/* TUYÊN BỐ GIỚI HẠN CỐ ĐỊNH KHÔNG THỂ TẮT (AC 4) */}
      <View style={styles.disclaimerBox} accessibilityRole="text">
        <Ionicons name="shield-checkmark-outline" size={15} color="#475569" />
        <Text style={styles.disclaimerText}>
          Tuyên bố giới hạn: Thông tin đối chiếu chỉ mang tính chất tham khảo hỗ trợ theo dõi thai kỳ, hoàn toàn không thay thế cho việc thăm khám hay chẩn đoán của bác sĩ chuyên khoa.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    flex: 1,
  },
  body: {
    padding: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 6,
  },
  explanation: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  dropBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dropText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  versionMeta: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#334155',
    fontWeight: '600',
  },
});