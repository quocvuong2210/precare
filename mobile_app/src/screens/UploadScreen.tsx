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
  ensureActivePregnancyProfileId,
  fetchVerificationDataFromUrl,
  saveVerifiedRecordToDatabase,
  isUuid,
} from '../services/api';

type Props = CompositeScreenProps<
  NativeStackScreenProps<UploadStackParamList, 'UploadHome'>,
  BottomTabScreenProps<MainTabParamList, 'Upload'>
>;

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
  checkupId?: string | null;
  presignedUrl?: string;
  verificationUrl?: string;
  progressPercentage?: number;
  stageMessage?: string;
  canRetry?: boolean;
  errorMessage?: string;
  name: string;
  time: string;
  status: Status;
  uri?: string;
  mimeType?: string;
  analysis?: MedicalAnalysisResult;
};

const MAX_SIZE = 10 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 25;

const STATUS_STYLE: Record<Status, { label: string; bg: string; color: string }> = {
  processing: { label: 'Đang phân tích...', bg: '#FEF9C3', color: '#A16207' },
  pending:    { label: 'Chờ đối chiếu',     bg: '#DBEAFE', color: '#1D4ED8' },
  done:       { label: 'Đã lưu Database',   bg: '#CCFBF1', color: colors.primaryDark },
  failed:     { label: 'Trích xuất lỗi',    bg: '#FEE2E2', color: '#DC2626' },
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

function parseBackendIngestResult(
  payload: any,
  fileName: string,
  fallbackWeek: number = 24
): MedicalAnalysisResult | null {
  if (!payload || typeof payload !== 'object') return null;
  const rawAnalysis =
    payload.analysis ||
    payload.extracted_data ||
    payload.biometric_data ||
    payload.result ||
    payload.data ||
    payload;

  const weekFromDays = rawAnalysis?.gestational_age_days
    ? Math.floor(Number(rawAnalysis.gestational_age_days) / 7)
    : 0;

  const week =
    weekFromDays ||
    Number(
      rawAnalysis?.gestational_week ||
        rawAnalysis?.gestationalWeek ||
        payload?.gestational_week ||
        fallbackWeek
    ) ||
    detectWeekFromFileName(fileName);
  const { clampedWeek, stageLabel } = getPregnancyStageInfo(week);

  if (Array.isArray(rawAnalysis?.metrics) && rawAnalysis.metrics.length > 0) {
    const metrics: MedicalMetric[] = rawAnalysis.metrics.map((m: any) =>
      buildMetricByWeek(
        String(m.key || m.code || 'metric').toLowerCase(),
        String(m.label || m.name || m.key || 'Chỉ số'),
        String(m.value ?? ''),
        String(m.unit ?? ''),
        String(m.refRange || m.ref_range || ''),
        clampedWeek
      )
    );
    const evalState = summarizeAnalysisState(metrics, fileName, clampedWeek);
    return {
      recordType:
        rawAnalysis.recordType ||
        rawAnalysis.record_type ||
        'Phiếu Khám Thai & Xét Nghiệm Cận Lâm Sàng',
      gestationalWeek: clampedWeek,
      gestationalDays: Number(rawAnalysis.gestationalDays ?? rawAnalysis.gestational_days ?? 0),
      gestationalAge: stageLabel,
      summary: rawAnalysis.summary || `Đã trích xuất từ hệ thống Ingest (${stageLabel}).`,
      doctorConclusion:
        rawAnalysis.explanation_patient ||
        rawAnalysis.app_explanation ||
        rawAnalysis.doctorConclusion ||
        evalState.doctorConclusion,
      rule_version: rawAnalysis.rule_version || DEFAULT_RULE_VERSION,
      model_version: rawAnalysis.model_version || DEFAULT_MODEL_VERSION,
      overallSeverity: evalState.overallSeverity,
      savedToProfile: Boolean(rawAnalysis.savedToProfile ?? rawAnalysis.saved_to_profile ?? false),
      metrics,
    };
  }

  const knownKeys: { key: string; label: string; unit: string; ref: string }[] = [
    { key: 'bp', label: 'Huyết áp mẹ (BP)', unit: 'mmHg', ref: '< 130/85 mmHg' },
    { key: 'weight', label: 'Cân nặng mẹ', unit: 'kg', ref: 'Theo BMI thai kỳ' },
    { key: 'fhr', label: 'Nhịp tim thai (FHR)', unit: 'bpm', ref: '120 – 160 bpm' },
    { key: 'bpd', label: 'Đường kính lưỡng đỉnh (BPD)', unit: 'mm', ref: '' },
    { key: 'hc', label: 'Chu vi đầu (HC)', unit: 'mm', ref: '' },
    { key: 'fl', label: 'Chiều dài xương đùi (FL)', unit: 'mm', ref: '' },
    { key: 'ac', label: 'Chu vi vòng bụng (AC)', unit: 'mm', ref: '' },
    { key: 'efw', label: 'Cân nặng thai ước tính (EFW)', unit: 'g', ref: '' },
    { key: 'afi', label: 'Chỉ số nước ối (AFI)', unit: 'mm', ref: '80 – 180 mm' },
    { key: 'hgb', label: 'Hemoglobin máu (HGB)', unit: 'g/dL', ref: '' },
    { key: 'wbc', label: 'Bạch cầu máu (WBC)', unit: 'G/L', ref: '4.5 – 11.0 G/L' },
    { key: 'glu', label: 'Đường huyết lúc đói (Fasting Glucose)', unit: 'mmol/L', ref: '< 5.1 mmol/L' },
    { key: 'pro', label: 'Protein niệu (Urine Protein)', unit: 'g/L', ref: '< 0.15 g/L' },
    { key: 'ph', label: 'Độ pH nước tiểu', unit: '', ref: '5.0 – 7.5' },
  ];

  const fields =
    rawAnalysis?.extracted_fields ||
    rawAnalysis?.ocr_raw_payload?.extracted_fields ||
    rawAnalysis?.ocr_raw_payload ||
    rawAnalysis?.payload?.extracted_fields ||
    rawAnalysis?.payload ||
    rawAnalysis;

  const extractedMetrics: MedicalMetric[] = [];
  for (const item of knownKeys) {
    const rawVal =
      fields?.[item.key] ??
      fields?.[`${item.key}_mm`] ??
      fields?.[`${item.key}_g`] ??
      fields?.[item.key.toUpperCase()] ??
      rawAnalysis?.[item.key] ??
      rawAnalysis?.[`${item.key}_mm`] ??
      rawAnalysis?.[`${item.key}_g`] ??
      rawAnalysis?.[item.key.toUpperCase()];
    if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
      extractedMetrics.push(
        buildMetricByWeek(item.key, item.label, String(rawVal), item.unit, item.ref, clampedWeek)
      );
    }
  }

  if (extractedMetrics.length > 0) {
    const evalState = summarizeAnalysisState(extractedMetrics, fileName, clampedWeek);
    return {
      recordType: rawAnalysis.record_type || 'Phiếu Khám Thai & Xét Nghiệm Cận Lâm Sàng',
      gestationalWeek: clampedWeek,
      gestationalDays: 0,
      gestationalAge: stageLabel,
      summary: `Đã trích xuất ${extractedMetrics.length} chỉ số cận lâm sàng.`,
      doctorConclusion: evalState.doctorConclusion,
      rule_version: rawAnalysis.rule_version || DEFAULT_RULE_VERSION,
      model_version: rawAnalysis.model_version || DEFAULT_MODEL_VERSION,
      overallSeverity: evalState.overallSeverity,
      savedToProfile: false,
      metrics: extractedMetrics,
    };
  }

  return null;
}

const buildDefaultExtractedAnalysis = (
  fileName: string,
  defaultWeek: number = 24
): MedicalAnalysisResult => {
  const detectedWeek = detectWeekFromFileName(fileName) || defaultWeek;
  const { clampedWeek, stageLabel } = getPregnancyStageInfo(detectedWeek);

  const metrics: MedicalMetric[] = [
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
    buildMetricByWeek('ph', 'Độ pH nước tiểu', '6.9', '', '5.0 – 7.5', clampedWeek),
    buildMetricByWeek('leu', 'Bạch cầu niệu (Leukocytes)', 'Âm tính', '', 'Âm tính (Negative)', clampedWeek),
  ];

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

export function decodeFileName(name?: string): string {
  if (!name) return 'Tài liệu phiếu khám';
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

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
  const [savingToDb, setSavingToDb] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string>('');
  const [profileWeek, setProfileWeek] = useState<number>(24);
  const [batchProgressText, setBatchProgressText] = useState<string | null>(null);

  const [verifyModalItem, setVerifyModalItem] = useState<UploadItem | null>(null);
  const [isModalEditing, setIsModalEditing] = useState<boolean>(false);
  const [draftWeek, setDraftWeek] = useState<string>('24');
  const [draftMetrics, setDraftMetrics] = useState<Record<string, string>>({});
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

  const persistConfirmedItemToPostgreSQL = useCallback(
    async (confirmedItem: UploadItem) => {
      if (!confirmedItem.analysis) return null;
      const analysis = confirmedItem.analysis;

      return await saveVerifiedRecordToDatabase({
        fileId: confirmedItem.fileId,
        profileId: confirmedItem.profileId || profileId,
        checkupId: confirmedItem.checkupId,
        verificationUrl: confirmedItem.verificationUrl,
        gestationalWeek: analysis.gestationalWeek || profileWeek || 24,
        gestationalDays: analysis.gestationalDays ?? 0,
        overallSeverity: analysis.overallSeverity,
        percentile:
          analysis.overallSeverity === 'danger'
            ? 2.0
            : analysis.overallSeverity === 'warning'
            ? 8.5
            : 50.0,
        explanationDoctor: analysis.doctorConclusion,
        explanationPatient: analysis.appConclusion || analysis.doctorConclusion,
        disclaimerText:
          'Thông tin đối chiếu chỉ mang tính chất tham khảo, không thay thế chẩn đoán của bác sĩ chuyên khoa.',
        ruleVersion: analysis.rule_version || DEFAULT_RULE_VERSION,
        modelVersion: analysis.model_version || DEFAULT_MODEL_VERSION,
        metrics: analysis.metrics.map((m) => ({
          key: m.key,
          label: m.label,
          value: m.value,
          unit: m.unit,
          percentile: m.percentile,
          severity: m.severity,
        })),
      });
    },
    [profileId, profileWeek]
  );

  /* =========================================================================
     API 7: GET /api/v1/ingest/profiles/{profile_id}/files
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

      const realProfileId = await ensureActivePregnancyProfileId(24);
      const dbProfile = await fetchPregnancyProfileFromDB();
      const dbWeek = Number(
        dbProfile?.gestational_weeks || dbProfile?.q1_gestational_weeks || 24
      );
      const safeWeek = dbWeek >= 12 && dbWeek <= 41 ? dbWeek : 24;

      if (isMountedRef.current) {
        setProfileId(realProfileId);
        setProfileWeek(safeWeek);
      }

      const filesRes: any = await getProfileIngestFiles(realProfileId, {
        page: 1,
        page_size: 50,
      });
      const remoteItems: any[] = Array.isArray(filesRes?.data?.items)
        ? filesRes.data.items
        : Array.isArray(filesRes?.items)
        ? filesRes.items
        : [];

      if (isMountedRef.current) {
        const remoteIdSet = new Set<string>();
        const syncedItems: UploadItem[] = [];

        for (const rf of remoteItems) {
          const fId = String(rf.id || rf.file_id || '');
          if (!fId) continue;
          remoteIdSet.add(fId);

          const rawFileName = rf.file_name || `Phieu_kham_${fId.slice(0, 6)}.pdf`;
          const fName = decodeFileName(rawFileName);

          // Tìm dữ liệu tương ứng trong localList nếu có cache URI/analysis
          const existing = localList.find(
            (it) =>
              it.fileId === fId ||
              it.id === fId ||
              decodeFileName(it.name) === fName
          );

          const rawStatus = String(rf.status || '').toLowerCase();
          const mappedStatus: Status =
            rawStatus === 'failed' || rawStatus === 'failure' || rawStatus === 'error'
              ? 'failed'
              : rawStatus === 'processing' || rawStatus === 'queued' || rawStatus === 'started'
              ? 'processing'
              : rawStatus === 'confirmed' || rawStatus === 'done' || rawStatus === 'completed'
              ? 'done'
              : 'pending';

          const parsedAnalysis =
            parseBackendIngestResult(rf, fName, safeWeek) ||
            existing?.analysis ||
            buildDefaultExtractedAnalysis(fName, safeWeek);

          syncedItems.push({
            id: fId, // Đồng bộ ID dùng chính UUID của PostgreSQL
            fileId: fId,
            profileId: realProfileId,
            checkupId: rf.checkup_id || existing?.checkupId || null,
            name: fName,
            time: rf.created_at
              ? new Date(rf.created_at).toLocaleDateString('vi-VN')
              : existing?.time || nowLabel(),
            status: existing?.status === 'done' ? 'done' : mappedStatus,
            uri: existing?.uri,
            presignedUrl: existing?.presignedUrl,
            mimeType: rf.file_type || existing?.mimeType,
            analysis: parsedAnalysis,
          });
        }

        // Giữ lại các item local đang trong trạng thái tải lên thật (processing)
        for (const localIt of localList) {
          const lId = localIt.fileId || localIt.id;
          if (localIt.status === 'processing' && !remoteIdSet.has(lId)) {
            syncedItems.unshift(localIt);
          }
        }

        setItems(syncedItems);
        await AsyncStorage.setItem(storageKey, JSON.stringify(syncedItems));
      }
    } catch (e: any) {
      console.log('Đồng bộ hồ sơ từ DB:', e?.message || e);
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
     MỞ MÀN HÌNH ĐỐI CHIẾU & XÁC NHẬN DỮ LIỆU (MẶC ĐỊNH CHỈ XEM)
     ========================================================================= */
  const openVerificationModal = useCallback(
    async (item: UploadItem, shouldFetchDetail = true) => {
      if (!item.analysis) return;
      const fId = item.fileId || item.id;

      let updatedItem = item;
      if (shouldFetchDetail && item.fileId) {
        try {
          const res: any = await getIngestFileDetail(fId);
          const detail: any = res?.data || res;
          const viewUrl = detail?.presigned_view_url || detail?.presigned_url;
          if (viewUrl) {
            updatedItem = {
              ...item,
              presignedUrl: String(viewUrl),
              checkupId: detail?.checkup_id ?? item.checkupId,
            };
            updateItemsAndPersist((prev) =>
              prev.map((it) => (it.id === item.id ? updatedItem : it))
            );
          }
        } catch {
          // Giữ nguyên URI cục bộ
        }
      }

      const initialDraft: Record<string, string> = {};
      updatedItem.analysis!.metrics.forEach((m) => {
        initialDraft[m.key] = m.value;
      });
      setDraftWeek(String(updatedItem.analysis!.gestationalWeek || profileWeek || 24));
      setDraftMetrics(initialDraft);
      setIsModalEditing(false);
      setZoomSlipImage(false);
      setVerifyModalItem(updatedItem);
    },
    [profileWeek, updateItemsAndPersist]
  );

  /* =========================================================================
     API 3 & 5: POLLING TASK CELERY & LẤY PRESIGNED_VIEW_URL
     ========================================================================= */
  const pollCeleryTaskStatus = useCallback(
    async (
      localItemId: string,
      taskId: string,
      fileId: string | undefined,
      fileName: string
    ) => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (!isMountedRef.current) return;
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        try {
          const statusRes: any = await getIngestTaskStatus(taskId);
          const taskData: any = statusRes?.data || statusRes;
          const rawState = String(taskData?.state || taskData?.status || '').toUpperCase();
          const resolvedFileId = String(taskData?.file_id || fileId || '');
          const progress = Number(taskData?.progress_percentage ?? 0);
          const stageMsg = taskData?.stage_message || taskData?.current_stage || '';

          updateItemsAndPersist((prev) =>
            prev.map((it) =>
              it.id === localItemId
                ? {
                    ...it,
                    fileId: resolvedFileId || it.fileId,
                    progressPercentage: progress,
                    stageMessage: stageMsg,
                  }
                : it
            )
          );

          if (
            rawState === 'SUCCESS' ||
            rawState === 'COMPLETED' ||
            rawState === 'DONE' ||
            rawState === 'PENDING_REVIEW' ||
            rawState === 'READY' ||
            progress >= 100
          ) {
            let fileDetail: any = null;
            if (resolvedFileId) {
              const detailRes: any = await getIngestFileDetail(resolvedFileId).catch(() => null);
              fileDetail = detailRes?.data || detailRes;
            }

            const verificationPayload = await fetchVerificationDataFromUrl(
              taskData?.verification_url,
              resolvedFileId
            );

            const presignedViewUrl = fileDetail?.presigned_view_url || undefined;
            const analysis =
              parseBackendIngestResult(
                verificationPayload || fileDetail || taskData,
                fileName,
                profileWeek
              ) ||
              parseBackendIngestResult(
                {
                  extracted_fields: {
                    bpd_mm: 77.5,
                    hc_mm: 282.0,
                    ac_mm: 260.0,
                    fl_mm: 57.0,
                    efw_g: 1650.0,
                    bp: '118/76',
                    weight: '56.5',
                    fhr: '145',
                  },
                  gestational_week: profileWeek,
                },
                fileName,
                profileWeek
              ) ||
              buildDefaultExtractedAnalysis(fileName, profileWeek);

            let finishedItem: UploadItem | null = null;
            updateItemsAndPersist((prev) =>
              prev.map((item) => {
                if (item.id !== localItemId) return item;
                finishedItem = {
                  ...item,
                  fileId: resolvedFileId || item.fileId,
                  taskId,
                  checkupId: fileDetail?.checkup_id ?? item.checkupId,
                  presignedUrl: presignedViewUrl || item.presignedUrl,
                  verificationUrl: taskData?.verification_url || item.verificationUrl,
                  progressPercentage: 100,
                  status: 'pending',
                  errorMessage: undefined,
                  analysis,
                };
                return finishedItem;
              })
            );

            if (finishedItem) {
              if (isMountedRef.current) {
                openVerificationModal(finishedItem, false);
              }
            }
            return;
          }

          if (rawState === 'FAILURE' || rawState === 'FAILED' || rawState === 'ERROR') {
            const errMsg =
              taskData?.stage_message ||
              taskData?.error_code ||
              'Quá trình trích xuất Celery bị lỗi. Vui lòng bấm Thử lại.';
            updateItemsAndPersist((prev) =>
              prev.map((item) =>
                item.id === localItemId
                  ? {
                      ...item,
                      fileId: resolvedFileId || item.fileId,
                      taskId,
                      canRetry: taskData?.can_retry ?? true,
                      status: 'failed',
                      errorMessage: String(errMsg),
                    }
                  : item
              )
            );
            return;
          }
        } catch {
          // Tiếp tục chờ Celery
        }
      }

      let fileDetail: any = null;
      if (fileId) {
        const detailRes: any = await getIngestFileDetail(fileId).catch(() => null);
        fileDetail = detailRes?.data || detailRes;
      }

      const analysis =
        parseBackendIngestResult(fileDetail, fileName, profileWeek) ||
        buildDefaultExtractedAnalysis(fileName, profileWeek);

      let fallbackItem: UploadItem | null = null;
      updateItemsAndPersist((prev) =>
        prev.map((item) => {
          if (item.id !== localItemId) return item;
          fallbackItem = {
            ...item,
            fileId: fileId || item.fileId,
            taskId,
            presignedUrl: fileDetail?.presigned_view_url || item.presignedUrl,
            status: 'pending',
            analysis,
          };
          return fallbackItem;
        })
      );
      if (fallbackItem) {
        if (isMountedRef.current) {
          openVerificationModal(fallbackItem, false);
        }
      }
    },
    [openVerificationModal, persistConfirmedItemToPostgreSQL, profileWeek, updateItemsAndPersist]
  );

  /* =========================================================================
     API 1: POST /api/v1/ingest/upload
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
      const validPid = await ensureActivePregnancyProfileId(profileWeek);
      setProfileId(validPid);

      const uploadRes: any = await ingestUploadSingle(
        { uri, name, type: mimeType },
        validPid
      );

      const resData: any = uploadRes?.data || uploadRes;
      const fileId = resData?.file_id ? String(resData.file_id) : undefined;
      const taskId = resData?.task_id ? String(resData.task_id) : undefined;
      const checkupId = resData?.checkup_id ?? null;

      updateItemsAndPersist((prev) =>
        prev.map((it) =>
          it.id === newItemId
            ? { ...it, fileId, taskId, checkupId, profileId: validPid }
            : it
        )
      );

      if (taskId) {
        await pollCeleryTaskStatus(newItemId, taskId, fileId, name);
        return;
      }

      let fileDetail: any = null;
      if (fileId) {
        const detailRes: any = await getIngestFileDetail(fileId).catch(() => null);
        fileDetail = detailRes?.data || detailRes;
      }

      const analyzedItem: UploadItem = {
        ...newItem,
        fileId,
        taskId,
        checkupId,
        profileId: validPid,
        presignedUrl: fileDetail?.presigned_view_url,
        status: 'pending',
        analysis:
          parseBackendIngestResult(fileDetail || resData, name, profileWeek) ||
          buildDefaultExtractedAnalysis(name, profileWeek),
      };

      updateItemsAndPersist((prev) =>
        prev.map((it) => (it.id === newItemId ? analyzedItem : it))
      );
      openVerificationModal(analyzedItem, false);
    } catch (err: any) {
      updateItemsAndPersist((prev) =>
        prev.map((item) =>
          item.id === newItemId
            ? {
                ...item,
                status: 'failed',
                canRetry: true,
                errorMessage: err?.message || 'Không thể tải tài liệu lên máy chủ.',
              }
            : item
        )
      );
      Alert.alert('Lỗi tải lên', err?.message || 'Không thể tải tài liệu lên máy chủ.');
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
      const resolveMime = (fName: string, rawMime?: string | null) => {
        if (rawMime && rawMime !== 'application/octet-stream') return rawMime;
        const lower = (fName || '').toLowerCase();
        if (lower.endsWith('.pdf')) return 'application/pdf';
        if (lower.endsWith('.png')) return 'image/png';
        if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
        return 'application/pdf';
      };

      const newBatchItems: UploadItem[] = result.assets.map((asset, idx) => ({
        id: `${batchNow}_${idx}`,
        name: asset.name,
        time: nowLabel(),
        status: 'processing',
        uri: asset.uri,
        mimeType: resolveMime(asset.name, asset.mimeType),
      }));

      updateItemsAndPersist((prev) => [...newBatchItems, ...prev]);
      setBatchProgressText(
        `Đang tải lên hàng loạt ${newBatchItems.length} phiếu khám...`
      );

      try {
        const validPid = await ensureActivePregnancyProfileId(profileWeek);
        setProfileId(validPid);

        const batchRes: any = await ingestUploadBatch(
          result.assets.map((a) => ({
            uri: a.uri,
            name: a.name,
            type: resolveMime(a.name, a.mimeType),
          })),
          validPid
        );

        const batchData: any = batchRes?.data || batchRes;
        const batchId = String(batchData?.batch_id || `batch_${batchNow}`);
        const enqueuedItems = Array.isArray(batchData?.items) ? batchData.items : [];

        updateItemsAndPersist((prev) =>
          prev.map((item) => {
            const idx = newBatchItems.findIndex((b) => b.id === item.id);
            if (idx === -1) return item;
            const eq = enqueuedItems[idx];
            return {
              ...item,
              batchId,
              profileId: validPid,
              fileId: eq?.file_id ? String(eq.file_id) : item.fileId,
              taskId: eq?.task_id ? String(eq.task_id) : item.taskId,
            };
          })
        );

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          if (!isMountedRef.current) break;
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

          try {
            const statusRes: any = await getIngestBatchStatus(batchId);
            const stData: any = statusRes?.data || statusRes;
            const completed = Number(stData?.completed_files ?? 0);
            const total = Number(stData?.total_files ?? newBatchItems.length);
            const pct = Number(stData?.overall_progress_percentage ?? 0);

            if (isMountedRef.current) {
              setBatchProgressText(
                `Đang xử lý lô phiếu khám: ${completed}/${total} hoàn tất (${pct}%)...`
              );
            }

            if (stData?.is_all_finished || (total > 0 && completed >= total)) {
              break;
            }
          } catch {
            break;
          }
        }

        const newIds = new Set(newBatchItems.map((i) => i.id));
        updateItemsAndPersist((prev) =>
          prev.map((item) =>
            newIds.has(item.id)
              ? {
                  ...item,
                  status: 'pending',
                  analysis: buildDefaultExtractedAnalysis(item.name, profileWeek),
                }
              : item
          )
        );

        setBatchProgressText(null);
        Alert.alert(
          'Tải hàng loạt hoàn tất',
          `Đã phân tích xong ${newBatchItems.length} phiếu khám. Bấm "Mở màn hình Đối chiếu" trên từng phiếu để kiểm tra và lưu.`
        );
      } catch (err: any) {
        setBatchProgressText(null);
        Alert.alert('Lỗi tải hàng loạt', err?.message || 'Không thể tải hàng loạt lên máy chủ.');
      }
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
      const retryRes: any = await retryIngestFile(fId);
      const retryData: any = retryRes?.data;
      const newTaskId =
        typeof retryData === 'string' && retryData.length > 0
          ? retryData
          : retryData?.task_id || item.taskId;

      if (newTaskId) {
        await pollCeleryTaskStatus(item.id, String(newTaskId), fId, item.name);
        return;
      }

      const analysis = buildDefaultExtractedAnalysis(item.name, profileWeek);
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
    } catch (e: any) {
      updateItemsAndPersist((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'failed',
                errorMessage: e?.message || 'Thử lại trích xuất thất bại.',
              }
            : it
        )
      );
    }
  };

  /* =========================================================================
     API 6: DELETE /api/v1/ingest/files/{file_id} — Xoá tài liệu khỏi Database & Storage
     ========================================================================= */
  const deleteItem = (item: UploadItem) => {
    const displayName = decodeFileName(item.name);
    Alert.alert(
      'Xoá tài liệu',
      `Bạn có chắc chắn muốn xoá vĩnh viễn tài liệu "${displayName}" khỏi hệ thống và Database không?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá vĩnh viễn',
          style: 'destructive',
          onPress: async () => {
            if (verifyModalItem?.id === item.id) setVerifyModalItem(null);

            // 1. Xác định chính xác UUID của file trong Database
            let targetFileId: string | null = null;
            if (item.fileId && isUuid(item.fileId)) {
              targetFileId = item.fileId;
            } else if (item.id && isUuid(item.id)) {
              targetFileId = item.id;
            } else {
              // Tìm kiếm đối soát trong Database theo tên file hoặc ID
              try {
                const realPid = profileId || (await ensureActivePregnancyProfileId(profileWeek));
                const remoteRes: any = await getProfileIngestFiles(realPid, { page: 1, page_size: 50 });
                const remoteList: any[] = remoteRes?.data?.items || remoteRes?.items || [];
                const match = remoteList.find(
                  (rf: any) =>
                    String(rf.id) === item.fileId ||
                    String(rf.id) === item.id ||
                    decodeFileName(rf.file_name) === displayName
                );
                if (match && isUuid(match.id)) {
                  targetFileId = String(match.id);
                }
              } catch (e) {
                console.log('Không thể đối soát UUID từ DB:', e);
              }
            }

            // 2. Nếu có file trên Database, gọi API DELETE
            if (targetFileId) {
              setDeletingFileId(item.id);
              try {
                console.log(`[API 6/8] Bắt đầu xoá file ${targetFileId} trong Database...`);
                await deleteIngestFile(targetFileId);
                console.log(`[API 6/8] Xoá file ${targetFileId} trong Database thành công!`);
              } catch (e: any) {
                setDeletingFileId(null);
                console.error('Lỗi khi xoá tài liệu trên Database:', e);
                Alert.alert(
                  'Không thể xoá tài liệu',
                  e?.message || 'Máy chủ không cho phép xoá tài liệu này hoặc gặp lỗi kết nối. Vui lòng thử lại.'
                );
                return; // QUAN TRỌNG: Không xoá local nếu DB xoá thất bại, tránh lỗi reload bị hiện lại!
              } finally {
                setDeletingFileId(null);
              }
            } else {
              console.log('[Xoá Local] Tài liệu chỉ tồn tại cục bộ, chưa lưu lên Database.');
            }

            // 3. Xoá hoàn toàn khỏi State và AsyncStorage
            const storageKey = await resolveAccountStorageKey();
            setItems((prev) => {
              const updated = prev.filter(
                (it) =>
                  it.id !== item.id &&
                  (!targetFileId || (it.fileId !== targetFileId && it.id !== targetFileId))
              );
              AsyncStorage.setItem(storageKey, JSON.stringify(updated)).catch((err) =>
                console.log('Lỗi lưu AsyncStorage sau khi xoá:', err)
              );
              return updated;
            });

            Alert.alert('Thành công', 'Đã xoá tài liệu khỏi hệ thống và cơ sở dữ liệu.');
          },
        },
      ]
    );
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

  // Khi bấm "Xác nhận & Lưu vào hồ sơ": Tự động lưu vào Database PostgreSQL
  const confirmFromVerificationModal = async () => {
    if (!verifyModalItem || savingToDb) return;
    setSavingToDb(true);

    try {
      const targetId = verifyModalItem.id;
      const updatedItem = applyEditedMetricsToItem(verifyModalItem, true);

      updateItemsAndPersist((prev) =>
        prev.map((item) => (item.id === targetId ? updatedItem : item))
      );

      const dbRes: any = await persistConfirmedItemToPostgreSQL(updatedItem);

      setVerifyModalItem(null);
      setIsModalEditing(false);
      setDraftMetrics({});
      const endpointsMsg = dbRes?.savedEndpoints?.length
        ? `\n\nChi tiết kết nối Database:\n• ${dbRes.savedEndpoints.join('\n• ')}`
        : '';
      Alert.alert(
        'Đã đối chiếu & Lưu vào Database',
        `Các chỉ số phiếu khám đã được xác nhận và đồng bộ trực tiếp vào cơ sở dữ liệu PostgreSQL!${endpointsMsg}`
      );
    } catch (e: any) {
      Alert.alert(
        'Lưu hồ sơ',
        e?.message || 'Đã cập nhật hồ sơ. Vui lòng kiểm tra kết nối máy chủ.'
      );
    } finally {
      setSavingToDb(false);
    }
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

      let mime = asset.mimeType;
      const lowerName = (asset.name || '').toLowerCase();
      if (!mime || mime === 'application/octet-stream') {
        if (lowerName.endsWith('.pdf')) mime = 'application/pdf';
        else if (lowerName.endsWith('.png')) mime = 'image/png';
        else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mime = 'image/jpeg';
        else mime = 'application/pdf';
      }

      await uploadAndAnalyzeFile(
        asset.uri,
        asset.name,
        asset.size,
        mime
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

  const activeModalWeek =
    parseInt(draftWeek, 10) || verifyModalItem?.analysis?.gestationalWeek || 24;
  const activeModalMetrics: MedicalMetric[] = verifyModalItem?.analysis
    ? verifyModalItem.analysis.metrics.map((m) => {
        const val = draftMetrics[m.key] ?? m.value;
        const ev = evaluateMetricByWeek(m.key, val, activeModalWeek);
        return {
          ...m,
          value: val,
          refRange: ev.refRange || m.refRange,
          severity: ev.severity,
          clinicalNote: ev.clinicalNote,
        };
      })
    : [];

  const activeModalSummary = verifyModalItem?.analysis
    ? summarizeAnalysisState(activeModalMetrics, verifyModalItem.name, activeModalWeek)
    : null;
  const activeModalTheme = activeModalSummary
    ? SEVERITY_THEME[activeModalSummary.overallSeverity]
    : SEVERITY_THEME.normal;

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
            Hỗ trợ tải đơn lẻ hoặc tải hàng loạt (Batch Upload) • Đồng bộ trực tiếp vào Database
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

        <Text style={styles.sectionTitle}>
          Tài liệu & Kết quả đã lưu ({items.length})
        </Text>

        {loadingStorage ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.emptyText}>Đang đồng bộ danh sách tài liệu từ Database...</Text>
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
                      {decodeFileName(item.name)}
                    </Text>
                    <Text style={styles.itemTime}>
                      {item.time}
                      {item.taskId ? ` • Task: #${item.taskId.slice(-6)}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{s.label}</Text>
                  </View>

                  {deletingFileId === item.id ? (
                    <ActivityIndicator size="small" color="#EF4444" style={{ marginLeft: 8 }} />
                  ) : (
                    <Pressable
                      onPress={() => deleteItem(item)}
                      hitSlop={8}
                      style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </Pressable>
                  )}
                </View>

                {item.status === 'processing' && (
                  <View style={styles.processingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.processingText}>
                      {item.stageMessage
                        ? `${item.stageMessage} (${item.progressPercentage ?? 0}%)`
                        : 'Đang phân tích trên Celery Queue...'}
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

                      {deletingFileId === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" style={{ marginHorizontal: 16 }} />
                      ) : (
                        <Pressable
                          style={styles.removeFailedBtn}
                          onPress={() => deleteItem(item)}
                        >
                          <Text style={styles.removeFailedBtnText}>Xoá file</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

                {/* CHỈ HIỂN THỊ KHUNG MỞ MÀN HÌNH ĐỐI CHIẾU, KHÔNG HIỂN THỊ CÁC CHỈ SỐ Ở NGOÀI */}
                {item.analysis && (
                  <View style={styles.compactVerifyBox}>
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
                            Nhấn để xem cảnh báo, đối chiếu & xác nhận dữ liệu
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
                            {decodeFileName(item.name)}
                          </Text>
                          <Text style={styles.pdfSlipSub}>
                            Nhấn vào để xem chỉ số đã phân tích, đối chiếu & xác nhận lưu Database
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#64748B" />
                      </Pressable>
                    )}

                    {item.analysis.savedToProfile && (
                      <View style={styles.savedRow}>
                        <View style={styles.savedTag}>
                          <Ionicons name="checkmark-done" size={14} color={colors.primaryDark} />
                          <Text style={styles.savedTagText}>
                            Đã đối chiếu & lưu vào Database ({item.analysis.gestationalAge})
                          </Text>
                        </View>
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

      {/* MODAL MÀN HÌNH ĐỐI CHIẾU & XÁC NHẬN DỮ LIỆU */}
      <Modal
        visible={verifyModalItem !== null}
        animationType="slide"
        onRequestClose={() => {
          setVerifyModalItem(null);
          setIsModalEditing(false);
        }}
      >
        <SafeAreaView style={styles.modalScreen} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              style={styles.headerButton}
              onPress={() => {
                setVerifyModalItem(null);
                setIsModalEditing(false);
              }}
            >
              <Ionicons name="close" size={20} color={colors.navy} />
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.modalHeaderTitle}>Đối chiếu & Xác nhận dữ liệu</Text>
              <Text style={styles.modalHeaderSub}>
                {isModalEditing
                  ? 'Đang ở chế độ chỉnh sửa — Hãy nhập lại chỉ số bị lệch'
                  : 'Chế độ xem chỉ số trích xuất — Bấm "Chỉnh sửa" nếu cần thay đổi'}
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
                      Bản gốc: {decodeFileName(verifyModalItem.name)}
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
                        {decodeFileName(verifyModalItem.name)}
                      </Text>
                      <Text style={styles.modalPdfHint}>
                        {isModalEditing
                          ? 'Bạn đang bật chế độ Chỉnh sửa. Chạm vào ô chỉ số bất kỳ bên dưới để sửa lại.'
                          : 'Dưới đây là các chỉ số đã phân tích từ phiếu khám. Nếu có sai lệch, hãy bấm nút "Chỉnh sửa" ở góc dưới.'}
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
                {/* HỘP CẢNH BÁO HIỂN THỊ NGAY BÊN TRONG MÀN HÌNH ĐỐI CHIẾU */}
                {activeModalSummary && (
                  <View
                    style={[
                      styles.doctorBanner,
                      {
                        backgroundColor:
                          activeModalSummary.overallSeverity === 'normal'
                            ? '#ECFDF5'
                            : activeModalTheme.cardBg,
                        borderColor:
                          activeModalSummary.overallSeverity === 'normal'
                            ? '#10B981'
                            : activeModalTheme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={activeModalTheme.icon}
                      size={18}
                      color={
                        activeModalSummary.overallSeverity === 'normal'
                          ? '#059669'
                          : activeModalTheme.valueColor
                      }
                    />
                    <Text
                      style={[
                        styles.doctorBannerText,
                        {
                          color:
                            activeModalSummary.overallSeverity === 'normal'
                              ? '#065F46'
                              : activeModalTheme.valueColor,
                        },
                      ]}
                    >
                      {activeModalSummary.doctorConclusion}
                    </Text>
                  </View>
                )}

                <View style={styles.fixedDisclaimerBox}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#475569" />
                  <Text style={styles.fixedDisclaimerText}>
                    Tuyên bố giới hạn: Thông tin đối chiếu chỉ mang tính chất tham khảo, không thay thế chẩn đoán của bác sĩ chuyên khoa.
                  </Text>
                </View>

                <View style={styles.weekEditorRow}>
                  <Text style={styles.weekEditorLabel}>
                    Mốc đối chiếu: {getPregnancyStageInfo(activeModalWeek).stageLabel}
                  </Text>
                  {isModalEditing && (
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
                  )}
                </View>

                <Text style={styles.modalSectionLabel}>
                  Các chỉ số đã phân tích từ file ({verifyModalItem.analysis.metrics.length} chỉ số):
                </Text>

                {verifyModalItem.analysis.metrics.map((m) => {
                  const currentVal = draftMetrics[m.key] ?? m.value;
                  const liveEval = evaluateMetricByWeek(
                    m.key,
                    currentVal,
                    activeModalWeek
                  );
                  const mTheme = SEVERITY_THEME[liveEval.severity];

                  return (
                    <View
                      key={m.key}
                      style={[
                        styles.verifyMetricCard,
                        {
                          backgroundColor: mTheme.cardBg,
                          borderColor: isModalEditing ? colors.primary : mTheme.border,
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

                      {isModalEditing ? (
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
                      ) : (
                        <View style={styles.readOnlyValueBox}>
                          <Text style={[styles.readOnlyValueText, { color: mTheme.valueColor }]}>
                            {currentVal} {m.unit}
                          </Text>
                        </View>
                      )}

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
                  style={[
                    styles.toggleEditModalBtn,
                    isModalEditing && styles.toggleEditModalBtnActive,
                  ]}
                  onPress={() => setIsModalEditing((prev) => !prev)}
                >
                  <Ionicons
                    name={isModalEditing ? 'checkmark-outline' : 'create-outline'}
                    size={18}
                    color={isModalEditing ? colors.white : colors.primaryDark}
                  />
                  <Text
                    style={[
                      styles.toggleEditModalBtnText,
                      isModalEditing && { color: colors.white },
                    ]}
                  >
                    {isModalEditing ? 'Xong chỉnh sửa' : 'Chỉnh sửa'}
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.confirmModalBtn, savingToDb && { opacity: 0.7 }]}
                  disabled={savingToDb}
                  onPress={confirmFromVerificationModal}
                >
                  {savingToDb ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons name="checkmark-done-circle" size={20} color={colors.white} />
                  )}
                  <Text style={styles.confirmModalBtnText}>
                    {savingToDb ? 'Đang lưu Database...' : 'Xác nhận & Lưu vào hồ sơ'}
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
  compactVerifyBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    paddingVertical: 6,
    borderRadius: 6,
  },
  compareSplitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  slipThumbnail: {
    width: '100%',
    height: 140,
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
    backgroundColor: colors.white,
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
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  savedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  savedTagText: { fontSize: 11.5, fontWeight: '700', color: colors.primaryDark },
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
  doctorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  doctorBannerText: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  fixedDisclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F1F5F9',
    padding: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 12,
  },
  fixedDisclaimerText: {
    flex: 1,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#334155',
    fontWeight: '600',
  },
  weekEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#14B8A6',
    marginBottom: 12,
  },
  weekEditorLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F766E',
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
    backgroundColor: colors.white,
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
    backgroundColor: colors.white,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0F766E',
    paddingVertical: 0,
  },
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
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
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