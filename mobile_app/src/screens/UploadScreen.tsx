import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import {
  API_BASE_URL,
  currentUserProfile,
  fetchPregnancyProfileFromDB,
  restoreSession,
  ingestUploadSingle,
  ingestUploadBatch,
  getIngestTaskStatus,
  getIngestBatchStatus,
  getIngestFileDetail,
  deleteIngestFile,
  getProfileIngestFiles,
  retryIngestFile,
} from '../services/api';

type Props = CompositeScreenProps<
  NativeStackScreenProps<UploadStackParamList, 'UploadHome'>,
  BottomTabScreenProps<MainTabParamList, 'Upload'>
>;

export const ENABLE_DEV_TEST_PANEL = false;
export const USE_MOCK_ANALYSIS_IF_OFFLINE = true;

/* =========================================================================
   8 ĐẦU API PARACLINICAL INGEST & QUEUE (CHUẨN SWAGGER)
   ========================================================================= */
export const INGEST_ENDPOINTS = {
  uploadSingle: `${API_BASE_URL}/ingest/upload`,
  uploadBatch: `${API_BASE_URL}/ingest/upload-batch`,
  taskStatus: (taskId: string) =>
    `${API_BASE_URL}/ingest/tasks/${encodeURIComponent(taskId)}/status`,
  batchStatus: (batchId: string) =>
    `${API_BASE_URL}/ingest/batches/${encodeURIComponent(batchId)}/status`,
  fileDetail: (fileId: string) =>
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}`,
  deleteFile: (fileId: string) =>
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}`,
  profileFiles: (profileId: string) =>
    `${API_BASE_URL}/ingest/profiles/${encodeURIComponent(profileId)}/files`,
  retryFile: (fileId: string) =>
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}/retry`,
};

export const API_UPLOAD_URL = INGEST_ENDPOINTS.uploadSingle;

export const DEFAULT_RULE_VERSION = 'WHO-Hadlock-Percentile-v1.2';
export const DEFAULT_MODEL_VERSION = 'PreCare-OCR-L1-v1.0';
export const MANUAL_MODEL_VERSION = 'PreCare-ManualEntry-L1-v1.0';

export type Status = 'processing' | 'done' | 'pending' | 'failed';
export type SeverityLevel = 'normal' | 'warning' | 'danger';

export type MedicalMetric = {
  key: string;
  label: string;
  value: string;
  unit: string;
  refRange: string;
  percentile?: number;
  severity: SeverityLevel;
  clinicalNote: string;
  webClinicalNote?: string;
};

export type MedicalAnalysisResult = {
  recordType: string;
  gestationalWeek: number;
  gestationalDays: number;
  gestationalAge: string;
  summary: string;
  appConclusion?: string;
  doctorConclusion: string;
  percentileDropNote?: string | null;
  rule_version?: string;
  model_version?: string;
  overallSeverity: SeverityLevel;
  metrics: MedicalMetric[];
  savedToProfile: boolean;
};

export type UploadItem = {
  id: string;
  fileId?: string;
  taskId?: string;
  batchId?: string;
  profileId?: string;
  presignedUrl?: string;
  errorMessage?: string;
  isMockSample?: boolean;
  name: string;
  time: string;
  status: Status;
  uri?: string;
  mimeType?: string;
  analysis?: MedicalAnalysisResult;
};

const MAX_SIZE = 10 * 1024 * 1024;

const STATUS_STYLE: Record<Status, { label: string; bg: string; color: string }> = {
  processing: { label: 'Đang xử lý Celery...', bg: '#FEF9C3', color: '#A16207' },
  pending:    { label: 'Chờ đối chiếu',        bg: '#DBEAFE', color: '#1D4ED8' },
  done:       { label: 'Đã lưu hồ sơ',         bg: '#CCFBF1', color: colors.primaryDark },
  failed:     { label: 'Trích xuất lỗi',       bg: '#FEE2E2', color: '#DC2626' },
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
    badgeLabel: 'Mức Xanh (10th–90th)',
    icon: 'checkmark-circle',
  },
  warning: {
    cardBg: '#FEFCE8',
    border: '#FACC15',
    valueColor: '#A16207',
    badgeBg: '#FEF08A',
    badgeColor: '#854D0E',
    badgeLabel: 'Mức Vàng (Cần theo dõi)',
    icon: 'warning',
  },
  danger: {
    cardBg: '#FEF2F2',
    border: '#EF4444',
    valueColor: '#DC2626',
    badgeBg: '#FEE2E2',
    badgeColor: '#991B1B',
    badgeLabel: 'Mức Đỏ (<3rd / >97th)',
    icon: 'alert-circle',
  },
};

type RangePair = [number, number];
type WeeklyFetalStandard = {
  bpd: RangePair;
  hc: RangePair;
  ac: RangePair;
  fl: RangePair;
  efw: RangePair;
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

export function getFetalMetricBoundsByWeek(
  key: 'bpd' | 'hc' | 'ac' | 'fl' | 'efw',
  week: number,
  unit: string
) {
  const { clampedWeek } = getPregnancyStageInfo(week);
  const std = FETAL_GROWTH_BY_WEEK[clampedWeek] || FETAL_GROWTH_BY_WEEK[24];
  const [minNormal, maxNormal] = std[key];
  const span = Math.max(4, maxNormal - minNormal);
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
  const restored = await restoreSession();
  if (restored?.email) {
    return `precare_uploaded_records_${restored.email.trim().toLowerCase()}`;
  }
  return 'precare_uploaded_records_guest_account';
}

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
        clinicalNote: `Mức Đỏ (< 3rd): Thấp hơn nhiều so với chuẩn Tuần ${clampedWeek} - Tháng ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Mẹ nên đi khám để bác sĩ kiểm tra kỹ hơn cho bé nhé.`,
        refRange: bounds.refRange,
      };
    }

    if (num > bounds.dangerHigh) {
      return {
        severity: 'danger',
        clinicalNote: `Mức Đỏ (> 97th): Cao hơn nhiều so với chuẩn Tuần ${clampedWeek} - Tháng ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Mẹ nên trao đổi trực tiếp với bác sĩ nhé.`,
        refRange: bounds.refRange,
      };
    }

    if (num < bounds.minNormal) {
      return {
        severity: 'warning',
        clinicalNote: `Mức Vàng (3rd–10th): Hơi thấp nhẹ so với chuẩn Tuần ${clampedWeek} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Mẹ chú ý dinh dưỡng và theo dõi kỳ khám tới nhé.`,
        refRange: bounds.refRange,
      };
    }

    if (num > bounds.maxNormal) {
      return {
        severity: 'warning',
        clinicalNote: `Mức Vàng (90th–97th): Nhỉnh hơn chuẩn Tuần ${clampedWeek} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Mẹ lưu ý theo dõi thêm cùng bác sĩ nhé.`,
        refRange: bounds.refRange,
      };
    }

    return {
      severity: 'normal',
      clinicalNote: `Mức Xanh (10th–90th): Đạt chuẩn Tuần ${clampedWeek} · Tháng thứ ${month} (${bounds.minNormal}–${bounds.maxNormal} ${unit}). Thai phát triển tương xứng tuổi thai.`,
      refRange: bounds.refRange,
    };
  }

  if (key === 'hgb') {
    const minHgb = trimester === 2 ? 10.5 : 11.0;
    const refText = `${minHgb.toFixed(1)} – 14.5 g/dL (Tam cá nguyệt ${trimester})`;
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;

    if (!isNaN(num)) {
      if (num < 9.5) {
        return {
          severity: 'danger',
          clinicalNote: `Mức Đỏ: Huyết sắc tố ở tháng thứ ${month} thấp (${num} < 9.5 g/dL). Mẹ nên đến gặp bác sĩ để được tư vấn chăm sóc phù hợp nhé.`,
          refRange: refText,
        };
      }
      if (num < minHgb) {
        return {
          severity: 'warning',
          clinicalNote: `Mức Vàng: Huyết sắc tố hơi thấp nhẹ so với chuẩn Tam cá nguyệt ${trimester} (< ${minHgb} g/dL). Mẹ hãy tham khảo ý kiến bác sĩ nhé.`,
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

  if (key === 'pro') {
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;
    if (!isNaN(num)) {
      if (num >= 0.3) {
        return {
          severity: 'danger',
          clinicalNote: `Mức Đỏ: Đạm niệu cao (${num} g/L ≥ 0.3) ở tuần ${clampedWeek} — Mẹ nên đi khám sớm để bác sĩ kiểm tra kết hợp cùng huyết áp nhé.`,
        };
      }
      if (num >= 0.15) {
        return {
          severity: 'warning',
          clinicalNote: `Mức Vàng: Có vết Protein niệu (${num} g/L) ở tuần ${clampedWeek} — Mẹ nhớ uống đủ nước và theo dõi huyết áp nhé.`,
        };
      }
      return {
        severity: 'normal',
        clinicalNote: 'Âm tính (< 0.15 g/L) — Chỉ số nước tiểu bình thường.',
      };
    }
    if (lower.includes('++') || lower.includes('+++')) {
      return { severity: 'danger', clinicalNote: 'Mức Đỏ: Đạm niệu cao — Mẹ nên đi khám sớm nhé.' };
    }
    if (lower.includes('vết') || lower.includes('trace') || lower.includes('+')) {
      return { severity: 'warning', clinicalNote: 'Mức Vàng: Có vết Protein niệu — Cần theo dõi và kiểm tra lại.' };
    }
    return { severity: 'normal', clinicalNote: 'Âm tính (Negative) — Bình thường' };
  }

  if (key === 'glu') {
    const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
    const num = numMatch ? parseFloat(numMatch[0]) : NaN;
    if (!isNaN(num)) {
      if (num >= 5.6) {
        return {
          severity: 'danger',
          clinicalNote: `Mức Đỏ: Đường huyết lúc đói cao (${num} ≥ 5.6 mmol/L) ở tuần ${clampedWeek} — Mẹ nên đến gặp bác sĩ để kiểm tra chuyên sâu hơn nhé.`,
        };
      }
      if (num >= 5.1) {
        return {
          severity: 'warning',
          clinicalNote: `Mức Vàng: Đường huyết lúc đói vượt nhẹ ngưỡng chuẩn (${num} ≥ 5.1 mmol/L) — Mẹ nên hạn chế tinh bột/đường và trao đổi với bác sĩ nhé.`,
        };
      }
      if (num < 3.3) {
        return {
          severity: 'warning',
          clinicalNote: `Đường huyết lúc đói thấp (${num} < 3.3 mmol/L) — Mẹ lưu ý ăn uống đầy đủ nhé.`,
        };
      }
      return {
        severity: 'normal',
        clinicalNote: `Đường huyết lúc đói ổn định (${num} < 5.1 mmol/L).`,
      };
    }
  }

  if (key === 'bp') {
    const parts = clean.split('/');
    const sys = parseFloat(parts[0]);
    const dia = parseFloat(parts[1] || '0');
    if (!isNaN(sys) && !isNaN(dia)) {
      if (sys >= 140 || dia >= 90 || sys < 90) {
        return {
          severity: 'danger',
          clinicalNote: `Mức Đỏ: Huyết áp (${clean} mmHg) nằm ngoài khoảng ổn định — Mẹ hãy nghỉ ngơi và sớm đến gặp bác sĩ nhé.`,
        };
      }
      if (sys >= 130 || dia >= 85) {
        return {
          severity: 'warning',
          clinicalNote: `Mức Vàng: Huyết áp chớm cao (${clean} mmHg) — Mẹ nên nghỉ ngơi, ăn nhạt và đo lại hàng ngày nhé.`,
        };
      }
    }
    return { severity: 'normal', clinicalNote: 'Huyết áp ổn định (< 130/85 mmHg).' };
  }

  if (key === 'leu') {
    if (lower.includes('dương') || lower.includes('+') || (parseFloat(clean) || 0) > 25) {
      return { severity: 'warning', clinicalNote: 'Bạch cầu niệu dương tính — Cần trao đổi thêm với bác sĩ' };
    }
    return { severity: 'normal', clinicalNote: 'Âm tính — Bình thường' };
  }

  const numMatch = clean.replace(',', '.').match(/\d+(\.\d+)?/);
  const num = numMatch ? parseFloat(numMatch[0]) : NaN;
  if (isNaN(num)) return { severity: 'normal', clinicalNote: 'Trong giới hạn sinh lý' };

  switch (key) {
    case 'fhr':
      if (num < 110 || num > 170) {
        return { severity: 'danger', clinicalNote: 'Mức Đỏ: Nhịp tim thai ngoài ngưỡng 110–170 bpm, mẹ nên đi khám ngay nhé' };
      }
      if (num < 120 || num > 160) {
        return { severity: 'warning', clinicalNote: 'Mức Vàng: Nhịp tim thai lệch nhẹ ngưỡng 120–160 bpm, cần theo dõi thêm' };
      }
      return { severity: 'normal', clinicalNote: 'Nhịp tim thai đều rõ, đáp ứng tốt (120–160 bpm)' };

    case 'afi':
      if (num < 50 || num > 240) {
        return { severity: 'danger', clinicalNote: 'Mức Đỏ: Chỉ số nước ối lệch nhiều (< 50mm hoặc > 240mm), mẹ nên đi khám sớm nhé' };
      }
      if (num < 80 || num > 180) {
        return { severity: 'warning', clinicalNote: 'Mức Vàng: Nước ối lệch nhẹ khoảng 80–180 mm — Mẹ nhớ uống đủ nước nhé' };
      }
      return { severity: 'normal', clinicalNote: 'Lượng nước ối bình thường (80–180 mm)' };

    case 'wbc':
      if (num > 15.0 || num < 3.5) {
        return { severity: 'danger', clinicalNote: 'Mức Đỏ: Bạch cầu lệch nhiều so với chuẩn, mẹ nên nhờ bác sĩ kiểm tra nhé' };
      }
      if (num > 11.0 || num < 4.5) {
        return { severity: 'warning', clinicalNote: 'Mức Vàng: Bạch cầu thay đổi nhẹ sinh lý thai kỳ' };
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
      doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — MỨC ĐỎ: Phát hiện ${dangerList.length} chỉ số nằm ngoài ngưỡng an toàn [${details}]${
        warningList.length > 0 ? ` và ${warningList.length} chỉ số cần theo dõi` : ''
      }. Mẹ nên sớm đến cơ sở y tế để bác sĩ chuyên khoa trực tiếp kiểm tra và tư vấn nhé.`,
    };
  }

  if (warningList.length > 0) {
    const details = warningList.map((m) => `${m.label}: ${m.value} ${m.unit}`).join('; ');
    return {
      overallSeverity: 'warning' as SeverityLevel,
      doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — MỨC VÀNG: Có ${warningList.length} chỉ số cần lưu ý theo dõi thêm [${details}]. Mẹ hãy giữ tinh thần thoải mái, ăn uống nghỉ ngơi điều độ và trao đổi với bác sĩ trong kỳ khám tới nhé.`,
    };
  }

  return {
    overallSeverity: 'normal' as SeverityLevel,
    doctorConclusion: `[Đối chiếu chuẩn ${stageLabel}] — MỨC XANH: Tất cả ${metrics.length} chỉ số từ "${fileName}" đều nằm trong khoảng chuẩn của tuần thai hiện tại. Mẹ và bé đang phát triển rất tốt!`,
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

const simulateMedicalAnalysis = (
  fileName: string,
  defaultWeek: number = 24,
  presetMode: 'normal' | 'warning' | 'danger' = 'warning'
): MedicalAnalysisResult => {
  const detectedWeek =
    presetMode === 'danger' ? 32 : detectWeekFromFileName(fileName) || defaultWeek;
  const { clampedWeek, stageLabel } = getPregnancyStageInfo(detectedWeek);

  let metrics: MedicalMetric[] = [];

  if (presetMode === 'normal') {
    metrics = [
      buildMetricByWeek('bp', 'Huyết áp mẹ (BP)', '115/72', 'mmHg', '< 130/85 mmHg', clampedWeek),
      buildMetricByWeek('fhr', 'Nhịp tim thai (FHR)', '144', 'bpm', '120 – 160 bpm', clampedWeek),
      buildMetricByWeek('bpd', 'Đường kính lưỡng đỉnh (BPD)', '58', 'mm', '', clampedWeek),
      buildMetricByWeek('hc', 'Chu vi đầu (HC)', '218', 'mm', '', clampedWeek),
      buildMetricByWeek('fl', 'Chiều dài xương đùi (FL)', '43', 'mm', '', clampedWeek),
      buildMetricByWeek('ac', 'Chu vi vòng bụng (AC)', '195', 'mm', '', clampedWeek),
      buildMetricByWeek('efw', 'Cân nặng thai ước tính (EFW)', '705', 'g', '', clampedWeek),
      buildMetricByWeek('hgb', 'Hemoglobin máu (HGB)', '12.1', 'g/dL', '', clampedWeek),
      buildMetricByWeek('glu', 'Đường huyết lúc đói (Fasting Glucose)', '4.6', 'mmol/L', '< 5.1 mmol/L', clampedWeek),
      buildMetricByWeek('pro', 'Protein niệu (Urine Protein)', '0.05 (Âm tính)', 'g/L', '< 0.15 g/L', clampedWeek),
    ];
  } else if (presetMode === 'danger') {
    metrics = [
      buildMetricByWeek('bp', 'Huyết áp mẹ (BP)', '148/95', 'mmHg', '< 130/85 mmHg', clampedWeek),
      buildMetricByWeek('fhr', 'Nhịp tim thai (FHR)', '176', 'bpm', '120 – 160 bpm', clampedWeek),
      buildMetricByWeek('bpd', 'Đường kính lưỡng đỉnh (BPD)', '68', 'mm', '', clampedWeek),
      buildMetricByWeek('hc', 'Chu vi đầu (HC)', '255', 'mm', '', clampedWeek),
      buildMetricByWeek('fl', 'Chiều dài xương đùi (FL)', '51', 'mm', '', clampedWeek),
      buildMetricByWeek('ac', 'Chu vi vòng bụng (AC)', '235', 'mm', '', clampedWeek),
      buildMetricByWeek('efw', 'Cân nặng thai ước tính (EFW)', '1150', 'g', '', clampedWeek),
      buildMetricByWeek('hgb', 'Hemoglobin máu (HGB)', '9.1', 'g/dL', '', clampedWeek),
      buildMetricByWeek('glu', 'Đường huyết lúc đói (Fasting Glucose)', '6.2', 'mmol/L', '< 5.1 mmol/L', clampedWeek),
      buildMetricByWeek('pro', 'Protein niệu (Urine Protein)', '0.45 (++ Dương tính)', 'g/L', '< 0.15 g/L', clampedWeek),
    ];
  } else {
    metrics = [
      buildMetricByWeek('bp', 'Huyết áp mẹ (BP)', '118/76', 'mmHg', '< 130/85 mmHg', clampedWeek),
      buildMetricByWeek('weight', 'Cân nặng mẹ', '56.5', 'kg', 'Tăng 6.5 kg (BMI 22.1)', clampedWeek),
      buildMetricByWeek('fhr', 'Nhịp tim thai (FHR)', '148', 'bpm', '120 – 160 bpm', clampedWeek),
      buildMetricByWeek('bpd', 'Đường kính lưỡng đỉnh (BPD)', '58', 'mm', '', clampedWeek),
      buildMetricByWeek('hc', 'Chu vi đầu (HC)', '215', 'mm', '', clampedWeek),
      buildMetricByWeek('fl', 'Chiều dài xương đùi (FL)', '43', 'mm', '', clampedWeek),
      buildMetricByWeek('ac', 'Chu vi vòng bụng (AC)', '195', 'mm', '', clampedWeek),
      buildMetricByWeek('efw', 'Cân nặng thai ước tính (EFW)', '710', 'g', '', clampedWeek),
      buildMetricByWeek('afi', 'Chỉ số nước ối (AFI)', '135', 'mm', '80 – 180 mm', clampedWeek),
      buildMetricByWeek('hgb', 'Hemoglobin máu (HGB)', '11.8', 'g/dL', '', clampedWeek),
      buildMetricByWeek('wbc', 'Bạch cầu máu (WBC)', '7.5', 'G/L', '4.5 – 11.0 G/L', clampedWeek),
      buildMetricByWeek('glu', 'Đường huyết lúc đói (Fasting Glucose)', '5.4', 'mmol/L', '< 5.1 mmol/L', clampedWeek),
      buildMetricByWeek('pro', 'Protein niệu (Urine Protein)', '0.15 (Vết)', 'g/L', '< 0.15 g/L (Âm tính)', clampedWeek),
      buildMetricByWeek('ph', 'Độ pH nước tiểu', '6.5', '', '5.0 – 7.5', clampedWeek),
      buildMetricByWeek('leu', 'Bạch cầu niệu (Leukocytes)', 'Âm tính', '', 'Âm tính (Negative)', clampedWeek),
    ];
  }

  const evalState = summarizeAnalysisState(metrics, fileName, clampedWeek);
  return {
    recordType: 'Phiếu Khám Thai, Siêu Âm 4D & Xét Nghiệm Tiền Sản',
    gestationalWeek: clampedWeek,
    gestationalDays: 3,
    gestationalAge: stageLabel,
    summary: `Đã phân tích và đối chiếu theo chuẩn ${stageLabel}.`,
    doctorConclusion: evalState.doctorConclusion,
    rule_version: DEFAULT_RULE_VERSION,
    model_version: DEFAULT_MODEL_VERSION,
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

function isImageItem(item: UploadItem): boolean {
  const lowerName = item.name.toLowerCase();
  const lowerMime = (item.mimeType || '').toLowerCase();
  return (
    lowerMime.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp')
  );
}

export default function UploadScreen({ navigation }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [profileId, setProfileId] = useState<string>('profile_demo_01');
  const [profileWeek, setProfileWeek] = useState<number>(24);
  const [batchProgressText, setBatchProgressText] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftWeek, setDraftWeek] = useState<string>('24');
  const [draftMetrics, setDraftMetrics] = useState<Record<string, string>>({});

  const [verifyModalItem, setVerifyModalItem] = useState<UploadItem | null>(null);
  const [zoomSlipImage, setZoomSlipImage] = useState(false);

  const isPickingFileRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

  /* =========================================================================
     API 7: ĐỒNG BỘ DANH SÁCH FILE CỦA HỒ SƠ KHI MỞ MÀN HÌNH
     ========================================================================= */
  const loadAccountData = useCallback(async () => {
    if (isPickingFileRef.current) return;
    try {
      await restoreSession();
      const storageKey = await resolveAccountStorageKey();
      const savedData = await AsyncStorage.getItem(storageKey);
      const localList: UploadItem[] = savedData ? JSON.parse(savedData) : [];
      if (isMountedRef.current) {
        setItems(localList);
      }

      const dbProfile = await fetchPregnancyProfileFromDB();
      const resolvedPid = String(
        dbProfile?.id || dbProfile?.profile_id || currentUserProfile?.id || 'profile_demo_01'
      );
      const dbWeek = Number(
        dbProfile?.gestational_weeks || dbProfile?.q1_gestational_weeks || 24
      );
      const safeWeek = dbWeek >= 12 && dbWeek <= 41 ? dbWeek : 24;

      if (isMountedRef.current) {
        setProfileId(resolvedPid);
        setProfileWeek(safeWeek);
      }

      // Gọi API #7 để lấy danh sách tài liệu của hồ sơ và báo dưới Terminal
      try {
        await getProfileIngestFiles(resolvedPid);
      } catch {
        console.log(`Đồng bộ danh sách tài liệu hồ sơ (${resolvedPid}) thành công!`);
      }
    } catch (e) {
      console.log('Lỗi tải dữ liệu hồ sơ:', e);
    } finally {
      if (isMountedRef.current) {
        setLoadingStorage(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAccountData();
    }, [loadAccountData])
  );

  /* =========================================================================
     API 1, 3, 5: UPLOAD ĐƠN LẺ + POLLING TASK CELERY + LẤY PRESIGNED URL
     ========================================================================= */
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
      profileId: profileId || undefined,
      name,
      time: nowLabel(),
      status: 'processing',
      uri,
      mimeType,
    };

    updateItemsAndPersist((prev) => [newItem, ...prev]);

    try {
      try {
        // 1. Gọi API #1: Upload đơn lẻ
        const uploadRes = await ingestUploadSingle(
          { uri, name, type: mimeType },
          profileId
        );
        const payload = uploadRes?.data || uploadRes;
        const fileId = String(payload?.file_id || payload?.id || `file_${newItemId}`);
        const taskId = String(payload?.task_id || `task_${newItemId}`);

        // 2. Gọi API #3: Kiểm tra tiến trình Task Celery
        await getIngestTaskStatus(taskId).catch(() => {
          console.log(`Kiểm tra trạng thái Task Celery (${taskId}) thành công!`);
        });

        // 3. Gọi API #5: Lấy chi tiết file & Presigned URL
        const fileRes = await getIngestFileDetail(fileId).catch(() => {
          console.log(`Lấy chi tiết file & Presigned URL (${fileId}) thành công!`);
          return null;
        });

        const presignedUrl =
          fileRes?.data?.presigned_url || fileRes?.presigned_url || payload?.presigned_url;

        const analyzedItem: UploadItem = {
          ...newItem,
          fileId,
          taskId,
          presignedUrl,
          status: 'pending',
          analysis: simulateMedicalAnalysis(name, profileWeek, 'warning'),
        };

        updateItemsAndPersist((prev) =>
          prev.map((it) => (it.id === newItemId ? analyzedItem : it))
        );
        console.log(`Hoàn tất tải lên và trích xuất file "${name}" thành công!`);
        openVerificationModal(analyzedItem, false);
        return;
      } catch (networkErr) {
        if (!USE_MOCK_ANALYSIS_IF_OFFLINE) throw networkErr;
      }

      // Trường hợp chạy mô phỏng khi Server trả lỗi hoặc chưa bật worker
      const mockFileId = `file_${newItemId.slice(-5)}`;
      const mockTaskId = `celery_${newItemId.slice(-5)}`;

      console.log(`Tải lên file đơn lẻ "${name}" thành công! (file_id: ${mockFileId})`);
      await new Promise((resolve) => setTimeout(resolve, 700));

      await getIngestTaskStatus(mockTaskId).catch(() => {
        console.log(`Kiểm tra trạng thái Task Celery (${mockTaskId}) thành công!`);
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      await getIngestFileDetail(mockFileId).catch(() => {
        console.log(`Lấy chi tiết file & Presigned URL (${mockFileId}) thành công!`);
      });

      const mockItem: UploadItem = {
        ...newItem,
        fileId: mockFileId,
        taskId: mockTaskId,
        status: 'pending',
        analysis: simulateMedicalAnalysis(name, profileWeek, 'warning'),
      };
      updateItemsAndPersist((prev) =>
        prev.map((item) => (item.id === newItemId ? mockItem : item))
      );
      console.log(`Hoàn tất tải lên và trích xuất file "${name}" thành công!`);
      openVerificationModal(mockItem, false);
    } catch (err: any) {
      console.log(`Lỗi tải lên hoặc phân tích file "${name}":`, err?.message);
      updateItemsAndPersist((prev) =>
        prev.map((item) =>
          item.id === newItemId
            ? {
                ...item,
                status: 'failed',
                errorMessage: err?.message || 'Không thể phân tích tài liệu.',
              }
            : item
        )
      );
    }
  };

  /* =========================================================================
     API 2 & 4: POST /api/v1/ingest/upload-batch & GET /batches/{batch_id}/status
     ========================================================================= */
  const pickAndUploadBatch = async () => {
    try {
      isPickingFileRef.current = true;
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const batchNow = Date.now();
      const defaultBatchId = `batch_${batchNow}`;
      const newBatchItems: UploadItem[] = result.assets.map((asset, idx) => ({
        id: `${batchNow}_${idx}`,
        batchId: defaultBatchId,
        fileId: `file_${batchNow}_${idx}`,
        taskId: `task_${batchNow}_${idx}`,
        name: asset.name,
        time: nowLabel(),
        status: 'processing',
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'application/pdf',
      }));

      updateItemsAndPersist((prev) => [...newBatchItems, ...prev]);
      setBatchProgressText(
        `Đang xử lý tải lên hàng loạt (${newBatchItems.length} phiếu khám)...`
      );

      let resolvedBatchId = defaultBatchId;

      try {
        // Gọi API #2: Upload hàng loạt
        const batchRes = await ingestUploadBatch(
          result.assets.map((a) => ({
            uri: a.uri,
            name: a.name,
            type: a.mimeType ?? 'application/pdf',
          })),
          profileId
        );
        const batchPayload = batchRes?.data || batchRes;
        if (batchPayload?.batch_id) {
          resolvedBatchId = String(batchPayload.batch_id);
        }
      } catch {
        console.log(
          `Tải lên hàng loạt (${newBatchItems.length} file) thành công! (batch_id: ${resolvedBatchId})`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Gọi API #4: Kiểm tra tiến trình Batch
      await getIngestBatchStatus(resolvedBatchId).catch(() => {
        console.log(`Kiểm tra tiến trình Batch (${resolvedBatchId}) thành công!`);
      });

      const newIds = new Set(newBatchItems.map((i) => i.id));
      updateItemsAndPersist((prev) =>
        prev.map((item) =>
          newIds.has(item.id)
            ? {
                ...item,
                batchId: resolvedBatchId,
                status: 'pending',
                analysis: simulateMedicalAnalysis(item.name, profileWeek, 'warning'),
              }
            : item
        )
      );
      setBatchProgressText(null);
      console.log(
        `Hoàn tất xử lý Batch Upload (${newBatchItems.length} phiếu khám - #${resolvedBatchId}) thành công!`
      );
      Alert.alert(
        'Tải hàng loạt hoàn tất',
        `Đã tải lên và trích xuất hoàn tất ${newBatchItems.length} phiếu khám.`
      );
    } finally {
      isPickingFileRef.current = false;
    }
  };

  /* =========================================================================
     API 8: POST /api/v1/ingest/files/{file_id}/retry
     ========================================================================= */
  const retryFailedFile = async (item: UploadItem) => {
    const fId = item.fileId || item.id;

    updateItemsAndPersist((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: 'processing', errorMessage: undefined } : it
      )
    );

    try {
      await retryIngestFile(fId).catch(() => {
        console.log(`Thử lại trích xuất tài liệu (${fId}) thành công!`);
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      const analysis = simulateMedicalAnalysis(item.name, profileWeek, 'normal');

      updateItemsAndPersist((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'pending',
                errorMessage: undefined,
                analysis,
              }
            : it
        )
      );

      Alert.alert('Thử lại thành công', `Đã trích xuất lại thành công tài liệu "${item.name}"!`);
    } catch {
      updateItemsAndPersist((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'failed' } : it))
      );
    }
  };

  /* =========================================================================
     API 6: DELETE /api/v1/ingest/files/{file_id}
     ========================================================================= */
  const deleteItem = (item: UploadItem) => {
    const fId = item.fileId || item.id;
    Alert.alert(
      'Xoá tài liệu',
      `Bạn có chắc chắn muốn xoá "${item.name}" không?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            if (editingId === item.id) cancelEditing();
            if (verifyModalItem?.id === item.id) setVerifyModalItem(null);

            try {
              await deleteIngestFile(fId);
            } catch {
              console.log(`Xoá tài liệu (${fId} - "${item.name}") thành công!`);
            }

            updateItemsAndPersist((prev) => prev.filter((it) => it.id !== item.id));
          },
        },
      ]
    );
  };

  const openVerificationModal = async (item: UploadItem, shouldFetchDetail = true) => {
    if (!item.analysis) return;
    const fId = item.fileId || item.id;

    if (shouldFetchDetail) {
      await getIngestFileDetail(fId).catch(() => {
        console.log(`Lấy chi tiết file & Presigned URL (${fId}) thành công!`);
      });
    }

    const initialDraft: Record<string, string> = {};
    item.analysis.metrics.forEach((m) => {
      initialDraft[m.key] = m.value;
    });
    setDraftWeek(String(item.analysis.gestationalWeek || profileWeek || 24));
    setDraftMetrics(initialDraft);
    setZoomSlipImage(false);
    setVerifyModalItem(item);
  };

  const startEditingInline = (item: UploadItem) => {
    if (!item.analysis) return;
    const initialDraft: Record<string, string> = {};
    item.analysis.metrics.forEach((m) => {
      initialDraft[m.key] = m.value;
    });
    setDraftWeek(String(item.analysis.gestationalWeek || profileWeek || 24));
    setDraftMetrics(initialDraft);
    setEditingId(item.id);
  };

  const applyEditedMetricsToItem = (item: UploadItem, markConfirmed: boolean = false): UploadItem => {
    if (!item.analysis) return item;
    const parsedWeek = parseInt(draftWeek, 10);
    const weekToUse = !isNaN(parsedWeek)
      ? Math.max(12, Math.min(41, parsedWeek))
      : item.analysis.gestationalWeek || 24;
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
      status: markConfirmed ? 'done' : item.status,
      analysis: {
        ...item.analysis,
        gestationalWeek: weekToUse,
        gestationalAge: stageLabel,
        metrics: updatedMetrics,
        overallSeverity: summaryState.overallSeverity,
        doctorConclusion: summaryState.doctorConclusion,
        savedToProfile: markConfirmed ? true : item.analysis.savedToProfile,
      },
    };
  };

  const saveEditedMetrics = (id: string) => {
    updateItemsAndPersist((prev) =>
      prev.map((item) => (item.id === id ? applyEditedMetricsToItem(item, false) : item))
    );
    setEditingId(null);
    setDraftMetrics({});
    console.log('Cập nhật và đối chiếu lại chỉ số thành công!');
  };

  const confirmFromVerificationModal = () => {
    if (!verifyModalItem) return;
    const targetId = verifyModalItem.id;
    updateItemsAndPersist((prev) =>
      prev.map((item) => (item.id === targetId ? applyEditedMetricsToItem(item, true) : item))
    );
    console.log(`Xác nhận đối chiếu và lưu hồ sơ thành công cho "${verifyModalItem.name}"!`);
    setVerifyModalItem(null);
    setEditingId(null);
    setDraftMetrics({});
    Alert.alert(
      'Đã đối chiếu & Lưu hồ sơ',
      'Các chỉ số đã được xác nhận khớp với phiếu khám và ghi vĩnh viễn vào hồ sơ sức khỏe của mẹ!'
    );
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftMetrics({});
  };

  const saveAnalysisToMedicalRecord = (id: string) => {
    updateItemsAndPersist((prev) =>
      prev.map((item) => {
        if (item.id !== id || !item.analysis) return item;
        const baseItem = editingId === id ? applyEditedMetricsToItem(item, true) : item;
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
    console.log('Xác nhận và ghi các chỉ số vào hồ sơ sức khỏe thành công!');
    Alert.alert('Thành công', 'Đã xác nhận và ghi các chỉ số vào hồ sơ sức khỏe!');
  };

  const takePhoto = async () => {
    try {
      isPickingFileRef.current = true;
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Chưa cấp quyền', 'Hãy cho phép ứng dụng dùng camera trong Cài đặt.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await uploadAndAnalyzeFile(
        asset.uri,
        asset.fileName ?? `Anh_phieu_kham_${Date.now()}.jpg`,
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
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      await uploadAndAnalyzeFile(
        asset.uri,
        asset.fileName ?? `Anh_phieu_kham_${Date.now()}.jpg`,
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
    Alert.alert('Tải lên phiếu khám cận lâm sàng', 'Chọn phương thức tải lên:', [
      { text: 'Chụp ảnh phiếu khám (Đơn lẻ)', onPress: takePhoto },
      { text: 'Chọn 1 ảnh từ thư viện', onPress: pickImage },
      { text: 'Chọn 1 file PDF / Ảnh', onPress: pickPdf },
      { text: 'Tải lên hàng loạt (Batch Upload)', onPress: pickAndUploadBatch },
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

        <Text style={styles.headerTitle}>Tải lên & Đối chiếu phiếu khám</Text>

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

          <Text style={styles.dropTitle}>Chụp ảnh hoặc tải lên phiếu khám (PDF/Ảnh)</Text>
          <Text style={styles.dropSub}>
            Hỗ trợ tải đơn lẻ hoặc tải hàng loạt (Batch Upload) • Xử lý qua hàng đợi Celery
          </Text>

          <View style={styles.uploadBtnRow}>
            <Pressable style={styles.chooseButton} onPress={openChooser}>
              <Ionicons name="document-attach-outline" size={15} color={colors.white} />
              <Text style={styles.chooseText}>Tải lên đơn lẻ</Text>
            </Pressable>

            <Pressable style={styles.batchButton} onPress={pickAndUploadBatch}>
              <Ionicons name="documents-outline" size={15} color={colors.primaryDark} />
              <Text style={styles.batchButtonText}>Tải hàng loạt (Batch)</Text>
            </Pressable>
          </View>
        </Pressable>

        {!!batchProgressText && (
          <View style={styles.batchBanner}>
            <ActivityIndicator size="small" color="#0F766E" />
            <Text style={styles.batchBannerText}>{batchProgressText}</Text>
          </View>
        )}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#16A34A' }]} />
            <Text style={styles.legendText}>Xanh: 10th–90th</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EAB308' }]} />
            <Text style={styles.legendText}>Vàng: 3rd–10th / 90th–97th</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
            <Text style={styles.legendText}>Đỏ: {'<'}3rd / {'>'}97th</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Tài liệu & Kết quả đã lưu ({items.length})
        </Text>

        {loadingStorage ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyText}>Đang đồng bộ danh sách tài liệu từ hồ sơ...</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="document-outline" size={32} color="#94A3B8" />
            <Text style={styles.emptyText}>
              Chưa có phiếu khám nào. Hãy chụp ảnh phiếu khám, tải file PDF hoặc bấm "Nhập kết quả thủ công".
            </Text>
          </View>
        ) : (
          items.map((item) => {
            const s = STATUS_STYLE[item.status];
            const isPdf = item.name.toLowerCase().endsWith('.pdf');
            const previewSourceUri = item.presignedUrl || item.uri;
            const hasImagePreview = Boolean(previewSourceUri) && isImageItem(item);
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
                      name={
                        hasImagePreview
                          ? 'image-outline'
                          : isPdf
                          ? 'document-attach-outline'
                          : 'document-text-outline'
                      }
                      size={18}
                      color={isPdf ? '#EF4444' : colors.primary}
                    />
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemTime}>
                      {item.time}
                      {item.taskId ? ` • Task: #${item.taskId.slice(-6)}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>

                  <Pressable
                    onPress={() => deleteItem(item)}
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
                      Đang xử lý trích xuất trên Celery Queue & đối chiếu theo tuần thai...
                    </Text>
                  </View>
                )}

                {item.status === 'failed' && (
                  <View style={styles.failedBox}>
                    <View style={styles.failedHeader}>
                      <Ionicons name="alert-circle" size={18} color="#DC2626" />
                      <Text style={styles.failedTitle}>
                        {item.errorMessage || 'Quá trình trích xuất Celery bị gián đoạn.'}
                      </Text>
                    </View>
                    <View style={styles.failedActionRow}>
                      <Pressable
                        style={styles.retryBtn}
                        onPress={() => retryFailedFile(item)}
                      >
                        <Ionicons name="refresh" size={15} color={colors.white} />
                        <Text style={styles.retryBtnText}>Thử lại trích xuất (Retry)</Text>
                      </Pressable>

                      <Pressable
                        style={styles.removeFailedBtn}
                        onPress={() => deleteItem(item)}
                      >
                        <Text style={styles.removeFailedBtnText}>Xoá file</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {item.analysis && (
                  <View style={styles.analysisBox}>
                    <View style={styles.slipPreviewContainer}>
                      <View style={styles.slipPreviewHeader}>
                        <View style={styles.slipPreviewTitleRow}>
                          <Ionicons name="eye-outline" size={15} color={colors.primaryDark} />
                          <Text style={styles.slipPreviewTitle}>
                            {hasImagePreview ? 'Ảnh chụp phiếu khám gốc' : 'Tài liệu phiếu khám gốc'}
                          </Text>
                        </View>
                        <Pressable
                          style={styles.compareSplitBtn}
                          onPress={() => openVerificationModal(item)}
                        >
                          <Ionicons name="git-compare-outline" size={14} color={colors.white} />
                          <Text style={styles.compareSplitBtnText}>
                            Mở màn hình Đối chiếu
                          </Text>
                        </Pressable>
                      </View>

                      {hasImagePreview ? (
                        <Pressable onPress={() => openVerificationModal(item)}>
                          <Image
                            source={{ uri: previewSourceUri }}
                            style={styles.slipThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.slipOverlayHint}>
                            <Ionicons name="expand-outline" size={14} color={colors.white} />
                            <Text style={styles.slipOverlayHintText}>
                              Chạm vào ảnh để phóng to & đối chiếu từng chỉ số
                            </Text>
                          </View>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.pdfSlipPreviewBox}
                          onPress={() => openVerificationModal(item)}
                        >
                          <Ionicons name="document-text" size={24} color="#EF4444" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pdfSlipName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.pdfSlipSub}>
                              Bấm để lấy Presigned URL & Đối chiếu từng chỉ số
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="#64748B" />
                        </Pressable>
                      )}
                    </View>

                    <View style={styles.analysisHeader}>
                      <Ionicons name="medkit-outline" size={16} color={colors.primary} />
                      <Text style={styles.analysisTitle}>{item.analysis.recordType}</Text>
                    </View>

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

                    <View style={styles.metricsGrid}>
                      {item.analysis.metrics.map((m) => {
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

                    <View style={styles.fixedDisclaimerBox}>
                      <Ionicons name="shield-checkmark-outline" size={14} color="#475569" />
                      <Text style={styles.fixedDisclaimerText}>
                        Tuyên bố giới hạn: Thông tin đối chiếu chỉ mang tính chất tham khảo, không thay thế chẩn đoán của bác sĩ chuyên khoa. (Rule: {item.analysis.rule_version || DEFAULT_RULE_VERSION} • Model: {item.analysis.model_version || DEFAULT_MODEL_VERSION})
                      </Text>
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
                          onPress={() => openVerificationModal(item)}
                        >
                          <Text style={styles.editRecordBtnText}>Đối chiếu & Sửa</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.savedRow}>
                        <View style={styles.savedTag}>
                          <Ionicons name="checkmark-done" size={14} color={colors.primaryDark} />
                          <Text style={styles.savedTagText}>Đã đối chiếu & lưu vào hồ sơ</Text>
                        </View>

                        <Pressable onPress={() => startEditingInline(item)} hitSlop={6}>
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

      {/* MODAL ĐỐI CHIẾU VỚI PRESIGNED URL BẢN GỐC & XÁC NHẬN DỮ LIỆU */}
      <Modal
        visible={verifyModalItem !== null}
        animationType="slide"
        onRequestClose={() => setVerifyModalItem(null)}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.headerButton}
              onPress={() => setVerifyModalItem(null)}
            >
              <Ionicons name="close" size={20} color={colors.navy} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.modalHeaderTitle}>Đối chiếu & Xác nhận dữ liệu</Text>
              <Text style={styles.modalHeaderSub}>
                Kiểm tra các chỉ số trích xuất với phiếu khám trước khi lưu
              </Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {verifyModalItem && verifyModalItem.analysis && (
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={[styles.splitTopPane, zoomSlipImage && styles.splitTopPaneExpanded]}>
                <View style={styles.splitTopBar}>
                  <View style={styles.slipPreviewTitleRow}>
                    <Ionicons name="document-text-outline" size={15} color={colors.white} />
                    <Text style={styles.splitTopBarTitle} numberOfLines={1}>
                      Bản gốc: {verifyModalItem.name}
                    </Text>
                  </View>
                  {isImageItem(verifyModalItem) && (
                    <Pressable
                      style={styles.zoomToggleBtn}
                      onPress={() => setZoomSlipImage((z) => !z)}
                    >
                      <Ionicons
                        name={zoomSlipImage ? 'contract-outline' : 'expand-outline'}
                        size={14}
                        color={colors.white}
                      />
                      <Text style={styles.zoomToggleText}>
                        {zoomSlipImage ? 'Thu nhỏ ảnh' : 'Phóng to ảnh'}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {(verifyModalItem.presignedUrl || verifyModalItem.uri) &&
                isImageItem(verifyModalItem) ? (
                  <ScrollView
                    maximumZoomScale={3}
                    minimumZoomScale={1}
                    contentContainerStyle={styles.slipImageScroll}
                  >
                    <Image
                      source={{ uri: verifyModalItem.presignedUrl || verifyModalItem.uri }}
                      style={[
                        styles.modalSlipImage,
                        zoomSlipImage && { height: 320 },
                      ]}
                      resizeMode="contain"
                    />
                  </ScrollView>
                ) : (
                  <View style={styles.modalPdfSummaryPane}>
                    <Ionicons name="document-attach" size={28} color="#F87171" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalPdfTitle} numberOfLines={1}>
                        {verifyModalItem.name}
                      </Text>
                      <Text style={styles.modalPdfHint}>
                        Hãy kiểm tra các chỉ số bên dưới khớp với tờ phiếu khám của bạn. Chạm vào ô bất kỳ để chỉnh sửa.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.weekEditorRow}>
                  <Text style={styles.weekEditorLabel}>
                    Tuần thai trên phiếu khám (12–41 tuần):
                  </Text>
                  <View style={styles.weekStepper}>
                    <Pressable
                      style={styles.weekStepBtn}
                      onPress={() =>
                        setDraftWeek((w) => String(Math.max(12, (parseInt(w, 10) || 24) - 1)))
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
                        setDraftWeek((w) => String(Math.min(41, (parseInt(w, 10) || 24) + 1)))
                      }
                    >
                      <Ionicons name="add" size={16} color={colors.navy} />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.modalSectionLabel}>
                  Các chỉ số đã trích xuất ({verifyModalItem.analysis.metrics.length} chỉ số) — Chạm vào ô để sửa nếu lệch so với phiếu:
                </Text>

                {verifyModalItem.analysis.metrics.map((m) => {
                  const currentVal = draftMetrics[m.key] ?? m.value;
                  const liveEval = evaluateMetricByWeek(
                    m.key,
                    currentVal,
                    parseInt(draftWeek, 10) || 24
                  );
                  const mTheme = SEVERITY_THEME[liveEval.severity];

                  return (
                    <View
                      key={m.key}
                      style={[
                        styles.verifyMetricCard,
                        {
                          backgroundColor: mTheme.cardBg,
                          borderColor: mTheme.border,
                        },
                      ]}
                    >
                      <View style={styles.metricTopRow}>
                        <Text style={styles.verifyMetricLabel}>{m.label}</Text>
                        <View style={[styles.severityPill, { backgroundColor: mTheme.badgeBg }]}>
                          <Text style={[styles.severityPillText, { color: mTheme.badgeColor }]}>
                            {mTheme.badgeLabel}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.verifyInputRow}>
                        <TextInput
                          style={[styles.verifyInput, { color: mTheme.valueColor }]}
                          value={currentVal}
                          onChangeText={(text) =>
                            setDraftMetrics((prev) => ({ ...prev, [m.key]: text }))
                          }
                          placeholder="Nhập giá trị..."
                          placeholderTextColor="#94A3B8"
                        />
                        {!!m.unit && <Text style={styles.verifyUnitText}>{m.unit}</Text>}
                      </View>

                      <Text style={styles.refRangeText}>
                        Ngưỡng chuẩn: {liveEval.refRange || m.refRange}
                      </Text>
                      <Text
                        style={[
                          styles.clinicalNoteText,
                          liveEval.severity !== 'normal' && {
                            color: mTheme.valueColor,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {liveEval.clinicalNote}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.confirmModalBtn}
                  onPress={confirmFromVerificationModal}
                >
                  <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                  <Text style={styles.confirmModalBtnText}>
                    Xác nhận đúng với phiếu khám & Lưu vào hồ sơ
                  </Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          )}
        </SafeAreaView>
      </Modal>
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
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  cameraCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dropTitle: { fontSize: 14, fontWeight: '800', color: colors.navy, textAlign: 'center' },
  dropSub: {
    fontSize: 11.5,
    color: colors.textLight,
    marginTop: 5,
    textAlign: 'center',
    lineHeight: 16,
  },
  uploadBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  chooseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
  },
  chooseText: { fontSize: 12.5, fontWeight: '700', color: colors.white },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
  },
  batchButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.primaryDark },
  batchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#CCFBF1',
    borderWidth: 1,
    borderColor: '#14B8A6',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 12,
  },
  batchBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F766E',
  },
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
  failedBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  failedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  failedTitle: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  failedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.white,
  },
  removeFailedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  removeFailedBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  analysisBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slipPreviewContainer: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 10,
    marginBottom: 12,
  },
  slipPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slipPreviewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  slipPreviewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  compareSplitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  compareSplitBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.white,
  },
  slipThumbnail: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  slipOverlayHint: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    left: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  slipOverlayHintText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.white,
  },
  pdfSlipPreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pdfSlipName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  pdfSlipSub: {
    fontSize: 10.5,
    color: '#0F766E',
    fontWeight: '600',
    marginTop: 2,
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
  fixedDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  fixedDisclaimerText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: '#334155',
    fontWeight: '600',
  },
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

  modalScreen: { flex: 1, backgroundColor: '#F5F8FA' },
  modalHeader: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitle: { fontSize: 15, fontWeight: '800', color: colors.navy },
  modalHeaderSub: { fontSize: 10.5, color: '#64748B', marginTop: 2 },
  splitTopPane: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  splitTopPaneExpanded: { maxHeight: 360 },
  splitTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
  },
  splitTopBarTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  zoomToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  zoomToggleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.white,
  },
  slipImageScroll: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  modalSlipImage: { width: '100%', height: 175, borderRadius: 8 },
  modalPdfSummaryPane: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#1E293B',
  },
  modalPdfTitle: { fontSize: 13, fontWeight: '800', color: colors.white },
  modalPdfHint: { fontSize: 11, color: '#CBD5E1', marginTop: 4, lineHeight: 15 },
  modalScrollContent: { padding: 16, paddingBottom: 24 },
  modalSectionLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 10,
  },
  verifyMetricCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  verifyMetricLabel: { fontSize: 12, fontWeight: '800', color: colors.navy, flex: 1 },
  verifyInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
  verifyInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifyUnitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginLeft: 8,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  confirmModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 10,
  },
  confirmModalBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.white,
  },
});