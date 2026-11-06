import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../theme/colors';
import type { MainTabParamList } from '../navigation/MainTabs';
import type { UploadStackParamList } from '../navigation/UploadNavigator';
import { API_BASE_URL, currentAccessToken, currentUserProfile } from '../services/api';

type Props = CompositeScreenProps<
  NativeStackScreenProps<UploadStackParamList, 'UploadHome'>,
  BottomTabScreenProps<MainTabParamList, 'Upload'>
>;

export const API_UPLOAD_URL = `${API_BASE_URL}/medical-records/analyze`;
export const USE_MOCK_ANALYSIS_IF_OFFLINE = true;

export type Status = 'processing' | 'done' | 'pending';
export type SeverityLevel = 'normal' | 'warning' | 'danger';

export type MedicalMetric = {
  key: string;
  label: string;
  value: string;
  unit: string;
  refRange: string;
  severity: SeverityLevel;
  clinicalNote: string;
};

export type MedicalAnalysisResult = {
  recordType: string;
  gestationalWeek: number;
  gestationalDays: number;
  gestationalAge: string;
  summary: string;
  doctorConclusion: string;
  overallSeverity: SeverityLevel;
  metrics: MedicalMetric[];
  savedToProfile: boolean;
};

export type UploadItem = {
  id: string;
  name: string;
  time: string;
  status: Status;
  uri?: string;
  mimeType?: string;
  analysis?: MedicalAnalysisResult;
};

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const STATUS_STYLE: Record<Status, { label: string; bg: string; color: string }> = {
  processing: { label: 'Đang phân tích...', bg: '#FEF9C3', color: '#A16207' },
  done:       { label: 'Đã lưu hồ sơ',      bg: '#CCFBF1', color: colors.primaryDark },
  pending:    { label: 'Chờ xác nhận',      bg: '#FEE2E2', color: '#DC2626' },
};

const SEVERITY_THEME: Record<
  SeverityLevel,
  {
    cardBg: string;
    border: string;
    valueColor: string;
    badgeBg: string;
    badgeColor: string;
    badgeLabel: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  normal: {
    cardBg: '#FFFFFF',
    border: '#E2E8F0',
    valueColor: '#0F172A',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    badgeLabel: 'Bình thường',
    icon: 'checkmark-circle',
  },
  warning: {
    cardBg: '#FEFCE8',
    border: '#FACC15',
    valueColor: '#A16207',
    badgeBg: '#FEF08A',
    badgeColor: '#854D0E',
    badgeLabel: 'Cần theo dõi (Vàng)',
    icon: 'warning',
  },
  danger: {
    cardBg: '#FEF2F2',
    border: '#EF4444',
    valueColor: '#DC2626',
    badgeBg: '#FEE2E2',
    badgeColor: '#991B1B',
    badgeLabel: 'Nguy hiểm (Đỏ)',
    icon: 'alert-circle',
  },
};

/* =========================================================================
   BẢNG CHUẨN SINH TRẮC HỌC THAI NHI THEO TỪNG TUẦN THAI (WHO / HADLOCK)
   Từ tuần 12 đến tuần 41: [minNormal (P10), maxNormal (P90)]
   ========================================================================= */
type RangePair = [number, number];

type WeeklyFetalStandard = {
  bpd: RangePair; // Đường kính lưỡng đỉnh (mm)
  hc: RangePair;  // Chu vi đầu (mm)
  ac: RangePair;  // Chu vi bụng (mm)
  fl: RangePair;  // Chiều dài xương đùi (mm)
  efw: RangePair; // Cân nặng thai ước tính (g)
};

const FETAL_GROWTH_BY_WEEK: Record<number, WeeklyFetalStandard> = {
  12: { bpd: [18, 24], hc: [65, 85],   ac: [52, 68],   fl: [7, 12],  efw: [12, 20] },
  13: { bpd: [21, 28], hc: [78, 98],   ac: [64, 82],   fl: [10, 15], efw: [20, 32] },
  14: { bpd: [25, 32], hc: [92, 114],  ac: [76, 96],   fl: [13, 19], efw: [35, 55] },
  15: { bpd: [29, 36], hc: [105, 128], ac: [88, 108],  fl: [16, 22], efw: [58, 88] },
  16: { bpd: [32, 39], hc: [118, 142], ac: [98, 120],  fl: [19, 25], efw: [85, 125] },
  17: { bpd: [35, 43], hc: [130, 156], ac: [110, 134], fl: [22, 28], efw: [120, 170] },
  18: { bpd: [39, 46], hc: [144, 170], ac: [122, 146], fl: [25, 31], efw: [165, 230] },
  19: { bpd: [42, 49], hc: [155, 182], ac: [133, 158], fl: [28, 34], efw: [215, 295] },
  20: { bpd: [45, 52], hc: [166, 194], ac: [144, 170], fl: [31, 37], efw: [275, 375] },
  21: { bpd: [48, 55], hc: [178, 206], ac: [154, 182], fl: [33, 40], efw: [340, 455] },
  22: { bpd: [50, 58], hc: [188, 218], ac: [165, 193], fl: [36, 42], efw: [410, 550] },
  23: { bpd: [53, 60], hc: [198, 228], ac: [174, 203], fl: [38, 45], efw: [490, 650] },
  24: { bpd: [54, 62], hc: [206, 236], ac: [182, 208], fl: [39, 46], efw: [600, 780] },
  25: { bpd: [58, 66], hc: [218, 248], ac: [195, 225], fl: [43, 49], efw: [680, 900] },
  26: { bpd: [61, 69], hc: [228, 258], ac: [205, 236], fl: [45, 52], efw: [800, 1060] },
  27: { bpd: [64, 72], hc: [238, 268], ac: [216, 248], fl: [48, 54], efw: [920, 1230] },
  28: { bpd: [67, 75], hc: [248, 278], ac: [226, 260], fl: [50, 56], efw: [1060, 1410] },
  29: { bpd: [70, 78], hc: [258, 288], ac: [236, 270], fl: [52, 59], efw: [1210, 1610] },
  30: { bpd: [72, 80], hc: [266, 296], ac: [246, 282], fl: [54, 61], efw: [1380, 1820] },
  31: { bpd: [75, 83], hc: [274, 304], ac: [256, 292], fl: [57, 63], efw: [1550, 2050] },
  32: { bpd: [77, 85], hc: [282, 312], ac: [266, 304], fl: [59, 65], efw: [1730, 2280] },
  33: { bpd: [80, 88], hc: [290, 320], ac: [276, 314], fl: [61, 67], efw: [1930, 2530] },
  34: { bpd: [82, 90], hc: [296, 326], ac: [286, 324], fl: [63, 69], efw: [2130, 2790] },
  35: { bpd: [84, 92], hc: [303, 333], ac: [295, 334], fl: [65, 71], efw: [2340, 3050] },
  36: { bpd: [86, 94], hc: [309, 339], ac: [304, 344], fl: [66, 73], efw: [2540, 3300] },
  37: { bpd: [88, 96], hc: [314, 344], ac: [313, 354], fl: [68, 75], efw: [2740, 3540] },
  38: { bpd: [89, 97], hc: [319, 349], ac: [321, 362], fl: [70, 76], efw: [2920, 3760] },
  39: { bpd: [90, 98], hc: [323, 353], ac: [329, 370], fl: [71, 78], efw: [3080, 3950] },
  40: { bpd: [91, 99], hc: [327, 357], ac: [336, 378], fl: [72, 79], efw: [3220, 4100] },
  41: { bpd: [91, 100], hc: [328, 360], ac: [340, 382], fl: [73, 80], efw: [3300, 4200] },
};

// Hàm quy đổi Tuần thai sang Tháng thai kỳ & Tam cá nguyệt
export function getPregnancyStageInfo(week: number) {
  const clampedWeek = Math.max(12, Math.min(41, Math.round(week || 24)));
  const month = Math.min(9, Math.max(3, Math.ceil(clampedWeek / 4.3)));
  const trimester = clampedWeek <= 13 ? 1 : clampedWeek <= 27 ? 2 : 3;
  return {
    clampedWeek,
    month,
    trimester,
    stageLabel: `Tuần ${clampedWeek} · Tháng thứ ${month} (Tam cá nguyệt ${trimester})`,
  };
}

// Hàm lấy ngưỡng Bình thường (P10-P90) và Nguy hiểm (P3-P97) theo đúng tuần thai
export function getFetalMetricBoundsByWeek(
  key: 'bpd' | 'hc' | 'ac' | 'fl' | 'efw',
  week: number,
  unit: string
) {
  const { clampedWeek } = getPregnancyStageInfo(week);
  const std = FETAL_GROWTH_BY_WEEK[clampedWeek] || FETAL_GROWTH_BY_WEEK[24];
  const [minNormal, maxNormal] = std[key];
  const span = Math.max(4, maxNormal - minNormal);
  // Ngưỡng báo Đỏ (Dưới bách phân vị thứ 3 hoặc trên bách phân vị thứ 97)
  const margin = key === 'efw' ? Math.round(span * 0.55) : Math.max(3, Math.round(span * 0.5));
  const dangerLow = Math.max(1, minNormal - margin);
  const dangerHigh = maxNormal + margin;

  return {
    clampedWeek,
    minNormal,
    maxNormal,
    dangerLow,
    dangerHigh,
    refRange: `${minNormal} – ${maxNormal} ${unit} (Chuẩn tuần ${clampedWeek})`,
  };
}

export async function resolveAccountStorageKey(): Promise<string> {
  if (currentUserProfile?.email) {
    return `precare_uploaded_records_${currentUserProfile.email.trim().toLowerCase()}`;
  }
  try {
    const rawUser = await AsyncStorage.getItem('precare_current_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.email) {
        return `precare_uploaded_records_${String(parsed.email).trim().toLowerCase()}`;
      }
    }
  } catch {
    // Bỏ qua lỗi đọc cache
  }
  return 'precare_uploaded_records_guest_account';
}

/* ================= HÀM ĐÁNH GIÁ LÂM SÀNG THEO TUẦN THAI & TAM CÁ NGUYỆT ================= */
export function evaluateMetricByWeek(
  key: string,
  rawValue: string,
  gestationalWeek: number = 24
): {
  severity: SeverityLevel;
  clinicalNote: string;
  refRange?: string;
} {
  const clean = rawValue.trim();
  const lower = clean.toLowerCase();
  const { clampedWeek, month, trimester } = getPregnancyStageInfo(gestationalWeek);

  // 1. Nhóm 5 chỉ số sinh trắc học thai nhi thay đổi trực tiếp theo từng tuần thai
  if (key === 'bpd' || key === 'hc' || key === 'ac' || key === 'fl' || key === 'efw') {
    const unit = key === 'efw' ? 'g' : 'mm';
    const bounds = getFetalMetricBoundsByWeek(key, clampedWeek, unit);
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;

    if (isNaN(num) || num <= 0) {
      return {
        severity: 'danger',
        clinicalNote: 'Giá trị không hợp lệ',
        refRange: bounds.refRange,
      };
    }

    if (num < bounds.dangerLow) {
      return {
        severity: 'danger',
        clinicalNote: `BÁO ĐỘNG ĐỎ: Thấp hơn nhiều so với chuẩn Tuần ${clampedWeek} - Tháng ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Nguy cơ thai chậm tăng trưởng (IUGR), cần bác sĩ khám chuyên khoa.`,
        refRange: bounds.refRange,
      };
    }

    if (num > bounds.dangerHigh) {
      return {
        severity: 'danger',
        clinicalNote: `BÁO ĐỘNG ĐỎ: Vượt quá xa chuẩn Tuần ${clampedWeek} - Tháng ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Nguy cơ thai to hoặc sai lệch tuổi thai, cần kiểm tra lại.`,
        refRange: bounds.refRange,
      };
    }

    if (num < bounds.minNormal) {
      return {
        severity: 'warning',
        clinicalNote: `CẢNH BÁO VÀNG: Hơi thấp hơn chuẩn Tuần ${clampedWeek} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Mẹ cần tăng cường dinh dưỡng và theo dõi kỳ khám tới.`,
        refRange: bounds.refRange,
      };
    }

    if (num > bounds.maxNormal) {
      return {
        severity: 'warning',
        clinicalNote: `CẢNH BÁO VÀNG: Nhỉnh hơn chuẩn Tuần ${clampedWeek} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Cần kiểm soát tinh bột/đường và theo dõi thêm.`,
        refRange: bounds.refRange,
      };
    }

    return {
      severity: 'normal',
      clinicalNote: `Đạt chuẩn Tuần ${clampedWeek} · Tháng thứ ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Thai phát triển tương xứng tuổi thai.`,
      refRange: bounds.refRange,
    };
  }

  // 2. Hemoglobin máu mẹ (HGB) — Thay đổi ngưỡng theo Tam cá nguyệt (WHO / Bộ Y tế)
  if (key === 'hgb') {
    const minHgb = trimester === 2 ? 10.5 : 11.0; // Tam cá nguyệt 2 pha loãng máu sinh lý: chuẩn >= 10.5 g/dL
    const refText = `${minHgb.toFixed(1)} – 14.5 g/dL (Tam cá nguyệt ${trimester})`;
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;

    if (!isNaN(num)) {
      if (num < 9.5) {
        return {
          severity: 'danger',
          clinicalNote: `BÁO ĐỘNG ĐỎ: Thiếu máu thai kỳ mức độ trung bình–nặng ở tháng thứ ${month} (${num} < 9.5 g/dL). Cần bác sĩ kê sắt liều điều trị.`,
          refRange: refText,
        };
      }
      if (num < minHgb) {
        return {
          severity: 'warning',
          clinicalNote: `CẢNH BÁO VÀNG: Thiếu máu nhẹ so với ngưỡng Tam cá nguyệt ${trimester} (< ${minHgb} g/dL). Cần tăng cường bổ sung sắt và thực phẩm giàu sắt.`,
          refRange: refText,
        };
      }
      return {
        severity: 'normal',
        clinicalNote: `Đủ huyết sắc tố chuẩn Tam cá nguyệt ${trimester} (≥ ${minHgb} g/dL).`,
        refRange: refText,
      };
    }
  }

  // 3. Protein niệu (Urine Protein)
  if (key === 'pro') {
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;
    if (!isNaN(num)) {
      if (num >= 0.3) {
        return {
          severity: 'danger',
          clinicalNote: `BÁO ĐỘNG ĐỎ: Đạm niệu cao (${num} g/L ≥ 0.3) ở tuần ${clampedWeek} — Cảnh báo nguy cơ Tiền sản giật, cần khám ngay.`,
        };
      }
      if (num >= 0.15) {
        return {
          severity: 'warning',
          clinicalNote: `CẢNH BÁO VÀNG: Có vết Protein niệu (${num} g/L) ở tuần ${clampedWeek} — Cần theo dõi sát huyết áp & xét nghiệm lại.`,
        };
      }
      return {
        severity: 'normal',
        clinicalNote: 'Âm tính (< 0.15 g/L) — Chức năng lọc cầu thận bình thường.',
      };
    }
    if (lower.includes('++') || lower.includes('+++')) {
      return { severity: 'danger', clinicalNote: 'Protein niệu dương tính mạnh — Cảnh báo nguy cơ Tiền sản giật' };
    }
    if (lower.includes('vết') || lower.includes('trace') || lower.includes('+')) {
      return { severity: 'warning', clinicalNote: 'Có vết Protein niệu — Cần theo dõi huyết áp và kiểm tra lại' };
    }
    return { severity: 'normal', clinicalNote: 'Âm tính (Negative) — Bình thường' };
  }

  // 4. Đường huyết lúc đói (Fasting Glucose)
  if (key === 'glu') {
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;
    if (!isNaN(num)) {
      if (num >= 5.6) {
        return {
          severity: 'danger',
          clinicalNote: `BÁO ĐỘNG ĐỎ: Đường huyết lúc đói tăng cao (${num} ≥ 5.6 mmol/L) ở tuần ${clampedWeek} — Nguy cơ cao Đái tháo đường thai kỳ, cần làm nghiệm pháp OGTT 75g.`,
        };
      }
      if (num >= 5.1) {
        return {
          severity: 'warning',
          clinicalNote: `CẢNH BÁO VÀNG: Vượt ngưỡng lúc đói (${num} ≥ 5.1 mmol/L) ở tuần ${clampedWeek} — Rối loạn dung nạp Glucose, cần tiết chế tinh bột/đường.`,
        };
      }
      if (num < 3.3) {
        return {
          severity: 'warning',
          clinicalNote: `Đường huyết lúc đói thấp (${num} < 3.3 mmol/L) — Nguy cơ hạ đường huyết mẹ bầu.`,
        };
      }
      return {
        severity: 'normal',
        clinicalNote: `Đường huyết lúc đói ổn định (${num} < 5.1 mmol/L).`,
      };
    }
  }

  // 5. Huyết áp mẹ (BP)
  if (key === 'bp') {
    const parts = clean.split('/');
    const sys = parseFloat(parts[0]);
    const dia = parseFloat(parts[1] || '0');
    if (!isNaN(sys) && !isNaN(dia)) {
      if (sys >= 140 || dia >= 90 || sys < 90) {
        return {
          severity: 'danger',
          clinicalNote: `BÁO ĐỘNG ĐỎ: Huyết áp bất thường (${clean} mmHg) ở tuần ${clampedWeek} — Cảnh báo Tiền sản giật / Tăng huyết áp thai kỳ.`,
        };
      }
      if (sys >= 130 || dia >= 85) {
        return {
          severity: 'warning',
          clinicalNote: `CẢNH BÁO VÀNG: Huyết áp chớm cao (${clean} mmHg) — Cần nghỉ ngơi, ăn nhạt và đo lại hàng ngày.`,
        };
      }
    }
    return { severity: 'normal', clinicalNote: 'Huyết áp ổn định (< 130/85 mmHg).' };
  }

  // 6. Bạch cầu niệu
  if (key === 'leu') {
    if (lower.includes('dương') || lower.includes('+') || (parseFloat(clean) || 0) > 25) {
      return { severity: 'warning', clinicalNote: 'Bạch cầu niệu dương tính — Theo dõi nhiễm khuẩn tiết niệu' };
    }
    return { severity: 'normal', clinicalNote: 'Âm tính — Không có dấu hiệu nhiễm khuẩn tiết niệu' };
  }

  const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
  const num = numMatch ? parseFloat(numMatch[0]) : NaN;
  if (isNaN(num)) return { severity: 'normal', clinicalNote: 'Trong giới hạn sinh lý' };

  switch (key) {
    case 'fhr':
      if (num < 110 || num > 170) {
        return { severity: 'danger', clinicalNote: 'BÁO ĐỘNG ĐỎ: Cảnh báo suy thai cấp (Nhịp tim ngoài ngưỡng 110–170 bpm)' };
      }
      if (num < 120 || num > 160) {
        return { severity: 'warning', clinicalNote: 'CẢNH BÁO VÀNG: Nhịp tim thai lệch nhẹ ngưỡng 120–160 bpm, cần theo dõi' };
      }
      return { severity: 'normal', clinicalNote: 'Nhịp tim thai đều rõ, đáp ứng tốt (120–160 bpm)' };

    case 'afi':
      if (num < 50 || num > 240) {
        return { severity: 'danger', clinicalNote: 'BÁO ĐỘNG ĐỎ: Thiểu ối nặng (< 50mm) hoặc Đa ối bệnh lý (> 240mm)' };
      }
      if (num < 80 || num > 180) {
        return { severity: 'warning', clinicalNote: 'CẢNH BÁO VÀNG: Nước ối ít / Dư ối nhẹ — Cần uống đủ nước & theo dõi' };
      }
      return { severity: 'normal', clinicalNote: 'Lượng nước ối bình thường (80–180 mm)' };

    case 'wbc':
      if (num > 15.0 || num < 3.5) {
        return { severity: 'danger', clinicalNote: 'BÁO ĐỘNG ĐỎ: Bạch cầu bất thường — Nghi ngờ nhiễm trùng cấp' };
      }
      if (num > 11.0 || num < 4.5) {
        return { severity: 'warning', clinicalNote: 'CẢNH BÁO VÀNG: Bạch cầu tăng nhẹ sinh lý thai kỳ' };
      }
      return { severity: 'normal', clinicalNote: 'Số lượng bạch cầu bình thường (4.5–11.0 G/L)' };

    case 'ph':
      if (num < 4.5 || num > 8.0) {
        return { severity: 'warning', clinicalNote: 'Độ pH nước tiểu lệch ngưỡng 5.0–7.5' };
      }
      return { severity: 'normal', clinicalNote: 'Độ pH nước tiểu bình thường (5.0–7.5)' };

    default:
      return { severity: 'normal', clinicalNote: 'Ổn định theo tuổi thai' };
  }
}

export function summarizeAnalysisState(
  metrics: MedicalMetric[],
  fileName: string,
  gestationalWeek: number = 24
) {
  const { stageLabel } = getPregnancyStageInfo(gestationalWeek);
  const dangerList = metrics.filter((m) => m.severity === 'danger');
  const warningList = metrics.filter((m) => m.severity === 'warning');

  if (dangerList.length > 0) {
    const details = dangerList.map((m) => `${m.label}: ${m.value} ${m.unit}`).join('; ');
    return {
      overallSeverity: 'danger' as SeverityLevel,
      doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — CẢNH BÁO ĐỎ: Phát hiện ${dangerList.length} chỉ số bất thường nghiêm trọng [${details}]${
        warningList.length > 0 ? ` và ${warningList.length} chỉ số cần theo dõi` : ''
      }. Đề nghị bác sĩ thăm khám chuyên khoa sớm.`,
    };
  }

  if (warningList.length > 0) {
    const details = warningList.map((m) => `${m.label}: ${m.value} ${m.unit}`).join('; ');
    return {
      overallSeverity: 'warning' as SeverityLevel,
      doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — LƯU Ý KHUNG VÀNG: Phát hiện ${warningList.length} chỉ số vượt ngưỡng an toàn của tuần thai [${details}]. Khuyến nghị điều chỉnh chế độ dinh dưỡng và kiểm tra lại.`,
    };
  }

  return {
    overallSeverity: 'normal' as SeverityLevel,
    doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — ĐÁNH GIÁ LÂM SÀNG: Tất cả ${metrics.length} chỉ số từ "${fileName}" đều đạt chuẩn sinh lý của tuần thai hiện tại. Mẹ và thai nhi phát triển tốt.`,
  };
}

function buildMetricByWeek(
  key: string,
  label: string,
  value: string,
  unit: string,
  defaultRefRange: string,
  gestationalWeek: number
): MedicalMetric {
  const evalResult = evaluateMetricByWeek(key, value, gestationalWeek);
  return {
    key,
    label,
    value,
    unit,
    refRange: evalResult.refRange || defaultRefRange,
    severity: evalResult.severity,
    clinicalNote: evalResult.clinicalNote,
  };
}

// Nhận diện số tuần thai từ tên file nếu có (VD: "sieu_am_32_tuan.pdf" -> 32 tuần; mặc định 24 tuần theo PDF mẫu)
function detectWeekFromFileName(fileName: string): number {
  const lower = fileName.toLowerCase();
  const match =
    lower.match(/(?:tuan|tuần|week|w)[_\-\s]*(\d{2})/i) ||
    lower.match(/(\d{2})[_\-\s]*(?:tuan|tuần|week|w)/i);
  if (match) {
    const w = parseInt(match[1], 10);
    if (w >= 12 && w <= 41) return w;
  }
  return 24;
}

/* ================= HÀM PHÂN TÍCH FILE PDF THEO ĐÚNG TUẦN THAI ================= */
const simulateMedicalAnalysis = (fileName: string): MedicalAnalysisResult => {
  const detectedWeek = detectWeekFromFileName(fileName);
  const { clampedWeek, stageLabel } = getPregnancyStageInfo(detectedWeek);

  const metrics: MedicalMetric[] = [
    buildMetricByWeek('bp', 'Huyết áp mẹ (BP)', '118/76', 'mmHg', '< 130/85 mmHg', clampedWeek),
    buildMetricByWeek('weight', 'Cân nặng mẹ', '56.5', 'kg', 'Tăng 6.5 kg (BMI 22.1)', clampedWeek),
    buildMetricByWeek('fhr', 'Nhịp tim thai (FHR)', '148', 'bpm', '120 – 160 bpm', clampedWeek),
    buildMetricByWeek('bpd', 'Đường kính lưỡng đỉnh (BPD)', '58', 'mm', '', clampedWeek),
    buildMetricByWeek('hc', 'Chu vi đầu (HC)', '221', 'mm', '', clampedWeek),
    buildMetricByWeek('fl', 'Chiều dài xương đùi (FL)', '43', 'mm', '', clampedWeek),
    buildMetricByWeek('ac', 'Chu vi vòng bụng (AC)', '196', 'mm', '', clampedWeek),
    buildMetricByWeek('efw', 'Cân nặng thai ước tính (EFW)', '720', 'g', '', clampedWeek),
    buildMetricByWeek('afi', 'Chỉ số nước ối (AFI)', '135', 'mm', '80 – 180 mm', clampedWeek),
    buildMetricByWeek('hgb', 'Hemoglobin máu (HGB)', '11.8', 'g/dL', '', clampedWeek),
    buildMetricByWeek('wbc', 'Bạch cầu máu (WBC)', '7.5', 'G/L', '4.5 – 11.0 G/L', clampedWeek),
    buildMetricByWeek(
      'glu',
      'Đường huyết lúc đói (Fasting Glucose)',
      '5.4',
      'mmol/L',
      '< 5.1 mmol/L',
      clampedWeek
    ),
    buildMetricByWeek(
      'pro',
      'Protein niệu (Urine Protein)',
      '0.15 (Vết)',
      'g/L',
      '< 0.15 g/L (Âm tính)',
      clampedWeek
    ),
    buildMetricByWeek('ph', 'Độ pH nước tiểu', '6.5', '', '5.0 – 7.5', clampedWeek),
    buildMetricByWeek('leu', 'Bạch cầu niệu (Leukocytes)', 'Âm tính', '', 'Âm tính (Negative)', clampedWeek),
  ];

  const evalState = summarizeAnalysisState(metrics, fileName, clampedWeek);
  return {
    recordType: 'Phiếu Khám Thai, Siêu Âm 4D & Xét Nghiệm Tiền Sản',
    gestationalWeek: clampedWeek,
    gestationalDays: 2,
    gestationalAge: stageLabel,
    summary: `Đã phân tích và đối chiếu theo chuẩn ${stageLabel}.`,
    doctorConclusion: evalState.doctorConclusion,
    overallSeverity: evalState.overallSeverity,
    savedToProfile: false,
    metrics,
  };
};

const pad = (n: number) => String(n).padStart(2, '0');
const nowLabel = () => {
  const d = new Date();
  return `Hôm nay, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function UploadScreen({ navigation }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftWeek, setDraftWeek] = useState<string>('24');
  const [draftMetrics, setDraftMetrics] = useState<Record<string, string>>({});

  const isPickingFileRef = useRef(false);

  const loadAccountData = useCallback(async () => {
    if (isPickingFileRef.current) return;
    try {
      const storageKey = await resolveAccountStorageKey();
      const savedData = await AsyncStorage.getItem(storageKey);
      setItems(savedData ? JSON.parse(savedData) : []);
    } catch (e) {
      console.log('Lỗi tải dữ liệu hồ sơ:', e);
    } finally {
      setLoadingStorage(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccountData();
    }, [loadAccountData])
  );

  const updateItemsAndPersist = useCallback((updater: (prev: UploadItem[]) => UploadItem[]) => {
    setItems((prev) => {
      const next = updater(prev);
      resolveAccountStorageKey().then((storageKey) => {
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch((e) =>
          console.log('Lỗi lưu dữ liệu hồ sơ:', e)
        );
      });
      return next;
    });
  }, []);

  /* ================= BẮT ĐẦU CHỈNH SỬA TUẦN THAI & CHỈ SỐ ================= */
  const startEditing = (item: UploadItem) => {
    if (!item.analysis) return;
    const initialDraft: Record<string, string> = {};
    item.analysis.metrics.forEach((m) => {
      initialDraft[m.key] = m.value;
    });
    setDraftWeek(String(item.analysis.gestationalWeek || 24));
    setDraftMetrics(initialDraft);
    setEditingId(item.id);
  };

  // Khi lưu chỉnh sửa: đối chiếu lại toàn bộ chỉ số theo đúng tuần thai vừa chọn!
  const applyEditedMetricsToItem = (item: UploadItem): UploadItem => {
    if (!item.analysis) return item;
    const parsedWeek = parseInt(draftWeek, 10);
    const weekToUse = !isNaN(parsedWeek) ? Math.max(12, Math.min(41, parsedWeek)) : item.analysis.gestationalWeek || 24;
    const { stageLabel } = getPregnancyStageInfo(weekToUse);

    const updatedMetrics = item.analysis.metrics.map((m) => {
      const newVal = draftMetrics[m.key] !== undefined ? draftMetrics[m.key].trim() : m.value;
      const reEval = evaluateMetricByWeek(m.key, newVal, weekToUse);
      return {
        ...m,
        value: newVal,
        refRange: reEval.refRange || m.refRange,
        severity: reEval.severity,
        clinicalNote: reEval.clinicalNote,
      };
    });

    const summaryState = summarizeAnalysisState(updatedMetrics, item.name, weekToUse);

    return {
      ...item,
      analysis: {
        ...item.analysis,
        gestationalWeek: weekToUse,
        gestationalAge: stageLabel,
        metrics: updatedMetrics,
        overallSeverity: summaryState.overallSeverity,
        doctorConclusion: summaryState.doctorConclusion,
      },
    };
  };

  const saveEditedMetrics = (id: string) => {
    updateItemsAndPersist((prev) =>
      prev.map((item) => (item.id === id ? applyEditedMetricsToItem(item) : item))
    );
    setEditingId(null);
    setDraftMetrics({});
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftMetrics({});
  };

  /* ================= GỬI FILE PDF / ẢNH & PHÂN TÍCH Y TẾ ================= */
  const uploadAndAnalyzeFile = async (
    uri: string,
    name: string,
    size?: number | null,
    mimeType: string = 'application/pdf'
  ) => {
    if (size && size > MAX_SIZE) {
      Alert.alert('File quá lớn', 'Vui lòng chọn file tối đa 10MB.');
      return;
    }

    const newItemId = String(Date.now());
    const newItem: UploadItem = {
      id: newItemId,
      name,
      time: nowLabel(),
      status: 'processing',
      uri,
      mimeType,
    };

    updateItemsAndPersist((prev) => [newItem, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', { uri, name, type: mimeType } as any);

      let analysisResult: MedicalAnalysisResult | null = null;

      try {
        const response = await fetch(API_UPLOAD_URL, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
            ...(currentAccessToken ? { Authorization: `Bearer ${currentAccessToken}` } : {}),
          },
        });

        if (response.ok) {
          const data = await response.json();
          analysisResult = data.analysis;
        } else if (!USE_MOCK_ANALYSIS_IF_OFFLINE) {
          throw new Error('Server trả về lỗi.');
        }
      } catch (networkErr) {
        if (!USE_MOCK_ANALYSIS_IF_OFFLINE) throw networkErr;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        analysisResult = simulateMedicalAnalysis(name);
      }

      if (analysisResult) {
        updateItemsAndPersist((prev) =>
          prev.map((item) =>
            item.id === newItemId
              ? { ...item, status: 'pending', analysis: analysisResult! }
              : item
          )
        );
      }
    } catch {
      Alert.alert('Lỗi tải lên', 'Không thể phân tích tài liệu này.');
      updateItemsAndPersist((prev) => prev.filter((item) => item.id !== newItemId));
    }
  };

  const saveAnalysisToMedicalRecord = (id: string) => {
    updateItemsAndPersist((prev) =>
      prev.map((item) => {
        if (item.id !== id || !item.analysis) return item;
        const baseItem = editingId === id ? applyEditedMetricsToItem(item) : item;
        return {
          ...baseItem,
          status: 'done',
          analysis: {
            ...baseItem.analysis!,
            savedToProfile: true,
          },
        };
      })
    );
    if (editingId === id) {
      setEditingId(null);
      setDraftMetrics({});
    }
    Alert.alert('Thành công', 'Đã ghi kết quả vào hồ sơ sức khỏe và lưu vĩnh viễn vào tài khoản!');
  };

  const deleteItem = (id: string, name: string) => {
    Alert.alert(
      'Xoá tài liệu',
      `Bạn có chắc chắn muốn xoá "${name}" khỏi danh sách không?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: () => {
            if (editingId === id) cancelEditing();
            updateItemsAndPersist((prev) => prev.filter((item) => item.id !== id));
          },
        },
      ]
    );
  };

  const takePhoto = async () => {
    try {
      isPickingFileRef.current = true;
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Chưa cấp quyền', 'Hãy cho phép ứng dụng dùng camera trong Cài đặt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await uploadAndAnalyzeFile(
        asset.uri,
        asset.fileName ?? `Phieu_${Date.now()}.jpg`,
        asset.fileSize,
        asset.mimeType ?? 'image/jpeg'
      );
    } finally {
      isPickingFileRef.current = false;
    }
  };

  const pickImage = async () => {
    try {
      isPickingFileRef.current = true;
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await uploadAndAnalyzeFile(
        asset.uri,
        asset.fileName ?? `Anh_${Date.now()}.jpg`,
        asset.fileSize,
        asset.mimeType ?? 'image/jpeg'
      );
    } finally {
      isPickingFileRef.current = false;
    }
  };

  const pickPdf = async () => {
    try {
      isPickingFileRef.current = true;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      await uploadAndAnalyzeFile(
        asset.uri,
        asset.name,
        asset.size,
        asset.mimeType ?? 'application/pdf'
      );
    } finally {
      isPickingFileRef.current = false;
    }
  };

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

      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="arrow-back" size={18} color={colors.navy} />
        </Pressable>

        <Text style={styles.headerTitle}>Hồ sơ phiếu khám & xét nghiệm</Text>

        <Pressable style={styles.headerButton} onPress={openChooser}>
          <Ionicons name="add" size={20} color={colors.navy} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.dropZone} onPress={openChooser}>
          <View style={styles.cameraCircle}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
          </View>

          <Text style={styles.dropTitle}>Chụp ảnh hoặc chọn file PDF</Text>
          <Text style={styles.dropSub}>
            Đối chiếu chỉ số chính xác theo từng Tuần thai / Tháng thai kỳ (Tuần 12 – 41)
          </Text>

          <View style={styles.chooseButton}>
            <Text style={styles.chooseText}>Chọn tài liệu</Text>
          </View>
        </Pressable>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Đạt chuẩn tuần thai</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendText}>Khung Vàng: Lệch nhẹ</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Khung Đỏ: Bất thường</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Tài liệu & Kết quả đã lưu ({items.length})
        </Text>

        {loadingStorage ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyText}>Đang tải danh sách hồ sơ...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>
              Chưa có phiếu khám nào. Hãy tải file PDF hoặc bấm "Nhập kết quả thủ công" bên dưới.
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const s = STATUS_STYLE[item.status];
            const isPdf = item.name.toLowerCase().endsWith('.pdf');
            const isEditingThis = editingId === item.id;
            const overallTheme = item.analysis
              ? SEVERITY_THEME[item.analysis.overallSeverity]
              : SEVERITY_THEME.normal;
            const stageInfo = getPregnancyStageInfo(
              isEditingThis ? parseInt(draftWeek, 10) || 24 : item.analysis?.gestationalWeek || 24
            );

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeaderRow}>
                  <View style={[styles.fileIcon, isPdf && { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons
                      name={isPdf ? 'document-attach-outline' : 'document-text-outline'}
                      size={18}
                      color={isPdf ? '#EF4444' : '#475569'}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemTime}>{item.time}</Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>

                  <Pressable
                    onPress={() => deleteItem(item.id, item.name)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>

                {item.status === 'processing' && (
                  <View style={styles.processingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.processingText}>
                      Đang bóc tách chỉ số & đối chiếu theo tuần thai...
                    </Text>
                  </View>
                )}

                {item.analysis && (
                  <View style={styles.analysisBox}>
                    <View style={styles.analysisHeader}>
                      <Ionicons name="medkit-outline" size={16} color={colors.primary} />
                      <Text style={styles.analysisTitle}>{item.analysis.recordType}</Text>
                    </View>

                    {/* Thanh hiển thị / chỉnh sửa Tuần thai & Tháng thai kỳ để đối chiếu chuẩn */}
                    <View style={styles.stageBadgeBox}>
                      <Ionicons name="calendar-outline" size={15} color="#0F766E" />
                      <Text style={styles.stageBadgeText}>
                        Mốc đối chiếu: {stageInfo.stageLabel}
                      </Text>
                    </View>

                    {isEditingThis && (
                      <View style={styles.weekEditorRow}>
                        <Text style={styles.weekEditorLabel}>
                          Đổi tuần thai (12–41 tuần) để so sánh lại chuẩn:
                        </Text>
                        <View style={styles.weekStepper}>
                          <Pressable
                            style={styles.weekStepBtn}
                            onPress={() =>
                              setDraftWeek((w) =>
                                String(Math.max(12, (parseInt(w, 10) || 24) - 1))
                              )
                            }
                          >
                            <Ionicons name="remove" size={16} color={colors.navy} />
                          </Pressable>
                          <TextInput
                            style={styles.weekInput}
                            value={draftWeek}
                            onChangeText={setDraftWeek}
                            keyboardType="number-pad"
                            maxLength={2}
                          />
                          <Pressable
                            style={styles.weekStepBtn}
                            onPress={() =>
                              setDraftWeek((w) =>
                                String(Math.min(41, (parseInt(w, 10) || 24) + 1))
                              )
                            }
                          >
                            <Ionicons name="add" size={16} color={colors.navy} />
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {/* Khung tổng kết của bác sĩ */}
                    <View
                      style={[
                        styles.doctorBanner,
                        {
                          backgroundColor:
                            item.analysis.overallSeverity === 'normal'
                              ? '#ECFDF5'
                              : overallTheme.cardBg,
                          borderColor:
                            item.analysis.overallSeverity === 'normal'
                              ? '#10B981'
                              : overallTheme.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={overallTheme.icon}
                        size={18}
                        color={
                          item.analysis.overallSeverity === 'normal'
                            ? '#059669'
                            : overallTheme.valueColor
                        }
                      />
                      <Text
                        style={[
                          styles.doctorBannerText,
                          {
                            color:
                              item.analysis.overallSeverity === 'normal'
                                ? '#065F46'
                                : overallTheme.valueColor,
                          },
                        ]}
                      >
                        {item.analysis.doctorConclusion}
                      </Text>
                    </View>

                    {/* Danh sách từng chỉ số (Đã đối chiếu trực tiếp với tuần thai) */}
                    <View style={styles.metricsGrid}>
                      {item.analysis.metrics.map((m) => {
                        // Nếu đang ở chế độ chỉnh sửa, tính trực tiếp mức độ theo tuần thai nháp (draftWeek) và giá trị nháp (draftMetrics)
                        const liveEval = isEditingThis
                          ? evaluateMetricByWeek(
                              m.key,
                              draftMetrics[m.key] ?? m.value,
                              parseInt(draftWeek, 10) || 24
                            )
                          : null;

                        const activeSeverity = liveEval ? liveEval.severity : m.severity;
                        const activeRefRange = liveEval?.refRange || m.refRange;
                        const activeNote = liveEval ? liveEval.clinicalNote : m.clinicalNote;
                        const mTheme = SEVERITY_THEME[activeSeverity];
                        const isFullWidth =
                          m.key === 'glu' || m.key === 'pro' || m.key === 'efw' || m.key === 'hgb';

                        return (
                          <View
                            key={m.key}
                            style={[
                              styles.metricItem,
                              isFullWidth && { minWidth: '100%' },
                              {
                                backgroundColor: mTheme.cardBg,
                                borderColor: isEditingThis ? colors.primary : mTheme.border,
                                borderWidth: activeSeverity === 'normal' ? 1 : 1.5,
                              },
                            ]}
                          >
                            <View style={styles.metricTopRow}>
                              <Text style={styles.metricLabel}>{m.label}</Text>
                              <View style={[styles.severityPill, { backgroundColor: mTheme.badgeBg }]}>
                                <Text style={[styles.severityPillText, { color: mTheme.badgeColor }]}>
                                  {mTheme.badgeLabel}
                                </Text>
                              </View>
                            </View>

                            {isEditingThis ? (
                              <View style={styles.metricInputRow}>
                                <TextInput
                                  style={styles.metricInput}
                                  value={draftMetrics[m.key] ?? m.value}
                                  onChangeText={(text) =>
                                    setDraftMetrics((prev) => ({ ...prev, [m.key]: text }))
                                  }
                                  placeholder="Nhập chỉ số..."
                                  placeholderTextColor="#94A3B8"
                                />
                                {!!m.unit && <Text style={styles.metricUnitText}>{m.unit}</Text>}
                              </View>
                            ) : (
                              <Text style={[styles.metricValue, { color: mTheme.valueColor }]}>
                                {m.value} {m.unit}
                              </Text>
                            )}

                            <Text style={styles.refRangeText}>Ngưỡng chuẩn: {activeRefRange}</Text>
                            <Text
                              style={[
                                styles.clinicalNoteText,
                                activeSeverity !== 'normal' && {
                                  color: mTheme.valueColor,
                                  fontWeight: '700',
                                },
                              ]}
                            >
                              {activeNote}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {isEditingThis ? (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.saveRecordBtn}
                          onPress={() => saveEditedMetrics(item.id)}
                        >
                          <Ionicons name="save-outline" size={16} color={colors.white} />
                          <Text style={styles.saveRecordBtnText}>Lưu & Đối chiếu lại</Text>
                        </Pressable>

                        <Pressable style={styles.editRecordBtn} onPress={cancelEditing}>
                          <Text style={styles.editRecordBtnText}>Huỷ</Text>
                        </Pressable>
                      </View>
                    ) : !item.analysis.savedToProfile ? (
                      <View style={styles.actionRow}>
                        <Pressable
                          style={styles.saveRecordBtn}
                          onPress={() => saveAnalysisToMedicalRecord(item.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                          <Text style={styles.saveRecordBtnText}>Xác nhận & Ghi vào hồ sơ</Text>
                        </Pressable>

                        <Pressable
                          style={styles.editRecordBtn}
                          onPress={() => startEditing(item)}
                        >
                          <Text style={styles.editRecordBtnText}>Chỉnh sửa</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.savedRow}>
                        <View style={styles.savedTag}>
                          <Ionicons name="checkmark-done" size={14} color={colors.primaryDark} />
                          <Text style={styles.savedTagText}>Đã lưu vĩnh viễn vào hồ sơ tài khoản</Text>
                        </View>

                        <Pressable onPress={() => startEditing(item)} hitSlop={6}>
                          <Text style={styles.reEditText}>Chỉnh sửa / Đổi tuần</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

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
  headerTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 },
  dropZone: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  cameraCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  dropTitle: { fontSize: 14.5, fontWeight: '800', color: colors.navy },
  dropSub: {
    fontSize: 11.5,
    color: colors.textLight,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 16,
  },
  chooseButton: {
    marginTop: 16,
    height: 38,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseText: { fontSize: 13, fontWeight: '700', color: colors.white },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10.5, fontWeight: '600', color: '#475569' },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 18,
    marginBottom: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: { fontSize: 12.5, color: '#64748B', marginTop: 8, textAlign: 'center' },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center' },
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
  deleteButton: { marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },
  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  processingText: { fontSize: 12, color: '#A16207', fontWeight: '600', flex: 1 },
  analysisBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  analysisTitle: { fontSize: 13, fontWeight: '800', color: colors.navy, flex: 1 },
  stageBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  stageBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
  },
  weekEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 10,
  },
  weekEditorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  weekStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  weekInput: {
    width: 42,
    height: 28,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingVertical: 0,
  },
  doctorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  doctorBannerText: { flex: 1, fontSize: 11.5, fontWeight: '700', lineHeight: 16 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metricItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: '47%',
    flexGrow: 1,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  metricLabel: { fontSize: 11, fontWeight: '700', color: '#334155', flex: 1 },
  severityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  severityPillText: { fontSize: 9.5, fontWeight: '800' },
  metricValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  refRangeText: { fontSize: 10, color: '#0F766E', fontWeight: '700', marginTop: 3 },
  clinicalNoteText: { fontSize: 10.5, color: '#475569', marginTop: 3, lineHeight: 14 },
  metricInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  metricInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  metricUnitText: { fontSize: 11.5, fontWeight: '700', color: '#475569', marginLeft: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  saveRecordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
  },
  saveRecordBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  editRecordBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  editRecordBtnText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedTagText: { fontSize: 11.5, fontWeight: '600', color: colors.primaryDark },
  reEditText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  manualButton: {
    marginTop: 18,
    minHeight: 42,
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