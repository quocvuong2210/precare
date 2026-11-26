import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  currentAccessToken,
  ensureActivePregnancyProfileId,
} from './api';

export interface ManualBiometricsInput {
  bpd?: number | null;
  hc?: number | null;
  ac?: number | null;
  fl?: number | null;
  efw?: number | null;
}

export interface CreateManualCheckupPayload {
  pregnancy_profile_id: string;
  checkup_date: string; // Định dạng ISO: YYYY-MM-DD
  weight_kg?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  notes?: string | null;
  biometrics?: ManualBiometricsInput;
}

export interface ManualCheckupResponseData {
  id: string;
  pregnancy_profile_id: string;
  doctor?: { id: string; full_name: string };
  checkup_date: string;
  gestational_age: {
    days: number;
    weeks: number;
    remaining_days: number;
    formatted: string;
    trimester: number;
  };
  vitals?: {
    weight_kg?: number | null;
    blood_pressure_systolic?: number | null;
    blood_pressure_diastolic?: number | null;
    blood_pressure_status?: string;
  };
  notes?: string | null;
  biometric_data?: {
    id: string;
    bpd?: number | null;
    hc?: number | null;
    ac?: number | null;
    fl?: number | null;
    efw?: number | null;
    status: 'pending_verification' | 'verified';
  } | null;
  created_at: string;
}

export interface ManualCheckupResponse {
  success: boolean;
  message: string;
  data: ManualCheckupResponseData;
}

export interface ManualFormValues {
  // Các chỉ số có cột riêng trong biometric_data
  bpd: string;
  hc: string;
  ac: string;
  fl: string;
  efw: string;
  // Các sinh hiệu có cột riêng trong checkups
  weight?: string;
  systolicBp?: string;
  diastolicBp?: string;
  notes?: string;
}

export interface ManualFormSubmissionData {
  examDate: string; // Định dạng hiển thị "DD/MM/YYYY"
  values: ManualFormValues;
  gestationalAge?: {
    weeks: string;
    days: string;
  };
}

export type ManualNumericFieldKey = Exclude<keyof ManualFormValues, 'notes'>;

export interface ManualFieldBound {
  min: number;
  max: number;
  label: string;
  unit: string;
  required: boolean;
}

export const MANUAL_FIELD_BOUNDS: Record<ManualNumericFieldKey, ManualFieldBound> = {
  bpd: { min: 10, max: 120, label: 'BPD · Đường kính lưỡng đỉnh', unit: 'mm', required: true },
  hc: { min: 50, max: 400, label: 'HC · Chu vi đầu', unit: 'mm', required: true },
  ac: { min: 50, max: 450, label: 'AC · Chu vi vòng bụng', unit: 'mm', required: true },
  fl: { min: 5, max: 95, label: 'FL · Chiều dài xương đùi', unit: 'mm', required: true },
  efw: { min: 50, max: 6000, label: 'EFW · Cân nặng thai ước tính', unit: 'g', required: true },
  weight: { min: 30, max: 200, label: 'Cân nặng mẹ', unit: 'kg', required: false },
  systolicBp: { min: 60, max: 250, label: 'Huyết áp tâm thu', unit: 'mmHg', required: false },
  diastolicBp: { min: 40, max: 150, label: 'Huyết áp tâm trương', unit: 'mmHg', required: false },
};

const REQUIRED_BIOMETRIC_KEYS = ['bpd', 'hc', 'ac', 'fl', 'efw'] as const;

/**
 * Tiện ích chuyển đổi chuỗi ngày DD/MM/YYYY sang chuẩn ISO YYYY-MM-DD (có kiểm tra lịch hợp lệ)
 */
export function formatDmyToIso(dateStr: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error('Định dạng ngày khám không hợp lệ (yêu cầu DD/MM/YYYY).');
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2100 ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Ngày khám không hợp lệ. Hãy kiểm tra lại ngày/tháng/năm.');
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Tiện ích chuyển đổi chuỗi nhập liệu (có thể chứa dấu phẩy hoặc chấm) sang kiểu number hợp lệ
 */
export function parseMetricNumber(rawVal: string, allowZero: boolean = false): number | undefined {
  if (!rawVal || typeof rawVal !== 'string') return undefined;
  const clean = rawVal.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(clean)) return undefined;
  const num = Number(clean);
  if (!Number.isFinite(num)) return undefined;
  return allowZero ? (num >= 0 ? num : undefined) : num > 0 ? num : undefined;
}

function validateNumericField(
  key: ManualNumericFieldKey,
  rawValue: string | undefined
): number | null {
  const trimmed = (rawValue ?? '').trim();
  const spec = MANUAL_FIELD_BOUNDS[key];
  if (!trimmed) {
    if (spec.required) {
      throw new Error(`Vui lòng nhập ${spec.label} (bắt buộc).`);
    }
    return null;
  }
  const num = parseMetricNumber(trimmed);
  if (num === undefined || num < spec.min || num > spec.max) {
    const unitSuffix = spec.unit ? ` ${spec.unit}` : '';
    throw new Error(
      `${spec.label} phải nằm trong khoảng ${spec.min}–${spec.max}${unitSuffix}.`
    );
  }
  return num;
}

/**
 * Gửi trực tiếp payload đã chuẩn hóa lên API checkups
 */
export async function submitManualCheckup(
  payload: CreateManualCheckupPayload
): Promise<ManualCheckupResponse> {
  const token = currentAccessToken || (await AsyncStorage.getItem('precare_access_token'));
  if (!token) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  const response = await fetch(`${API_BASE_URL}/checkups`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  let data: any = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    throw new Error(`Lỗi máy chủ (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const detail = data?.detail;
    const msg = Array.isArray(detail)
      ? detail.map((d: any) => d.msg || d.message).join('; ')
      : typeof detail === 'string'
      ? detail
      : data?.message || `Yêu cầu thất bại (HTTP ${response.status})`;
    throw new Error(msg);
  }

  return data;
}

/**
 * Xây dựng và kiểm tra hợp lệ toàn bộ payload từ Form nhập tay:
 * - Bắt buộc ngày khám (không vượt quá hiện tại) và 5 chỉ số vàng siêu âm (BPD, HC, AC, FL, EFW)
 * - Chỉ đưa vào payload các trường có cột riêng trong database
 */
export function buildManualFormPayload(
  formData: ManualFormSubmissionData,
  profileId: string,
  todayIso?: string
): CreateManualCheckupPayload {
  const isoDate = formatDmyToIso(formData.examDate);
  const now = new Date();
  const localTodayIso =
    todayIso ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  if (isoDate > localTodayIso) {
    throw new Error('Ngày khám không được lớn hơn ngày hiện tại.');
  }

  const biometrics: ManualBiometricsInput = {};
  for (const key of REQUIRED_BIOMETRIC_KEYS) {
    biometrics[key] = validateNumericField(key, formData.values[key]);
  }

  const weightKg = validateNumericField('weight', formData.values.weight);
  const systolicBp = validateNumericField('systolicBp', formData.values.systolicBp);
  const diastolicBp = validateNumericField('diastolicBp', formData.values.diastolicBp);

  if ((systolicBp !== null && diastolicBp === null) || (systolicBp === null && diastolicBp !== null)) {
    throw new Error('Cần nhập đồng thời cả huyết áp tâm thu và tâm trương (hoặc để trống cả hai).');
  }
  if (systolicBp !== null && diastolicBp !== null && systolicBp <= diastolicBp) {
    throw new Error('Chỉ số huyết áp không hợp lệ (Tâm thu phải lớn hơn Tâm trương).');
  }

  const ageStr = formData.gestationalAge?.weeks
    ? ` (${formData.gestationalAge.weeks} tuần ${formData.gestationalAge.days || '0'} ngày)`
    : '';

  const noteLines = [`Thai phụ tự nhập kết quả phiếu khám${ageStr}`];
  const userNotes = (formData.values.notes ?? '').trim();
  if (userNotes) {
    noteLines.push(`Ghi chú thêm: ${userNotes}`);
  }

  return {
    pregnancy_profile_id: profileId,
    checkup_date: isoDate,
    weight_kg: weightKg,
    blood_pressure_systolic: systolicBp !== null ? Math.round(systolicBp) : null,
    blood_pressure_diastolic: diastolicBp !== null ? Math.round(diastolicBp) : null,
    notes: noteLines.join('\n').slice(0, 4000),
    biometrics,
  };
}

/**
 * Hàm điều phối nghiệp vụ lưu Form nhập tay (Dành riêng cho màn hình ManualResultEntryScreen)
 */
export async function submitManualFormResult(
  formData: ManualFormSubmissionData
): Promise<ManualCheckupResponse> {
  const profileId = await ensureActivePregnancyProfileId();
  const payload = buildManualFormPayload(formData, profileId);
  return await submitManualCheckup(payload);
}
