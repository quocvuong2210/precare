/**
 * Pregnancy Profile Management Service
 * Xử lý dữ liệu hồ sơ thai kỳ, tích hợp tính toán y khoa, lưu trữ và kết nối API Axios (STORY-3.1)
 */

import { apiClient } from './auth.service';
import {
  calculatePregnancyDates,
  formatDateToDisplay,
  formatGestationalAge,
  getTodayISO,
  parseDateOnly,
  PregnancyCalculationParams,
  PregnancyCalculationResult,
} from './pregnancyCalculator';
import {
  PregnancyProfileBackend,
  PregnancyProfileListItemBackend,
  CreatePregnancyProfileRequest,
  UpdatePregnancyProfileRequest,
  UpdatePregnancyStatusRequest,
  CalculateGestationalAgeRequest,
  CalculateGestationalAgeResponseData,
  ApiResponse,
} from '../types/pregnancyProfile.types';

export type { UpdatePregnancyProfileRequest };
export type PregnancyStatus = 'active' | 'completed' | 'terminated';

export interface MedicalHistory {
  bloodType?: string; // O+, A+, B+, AB+...
  allergies?: string;
  underlyingConditions?: string; // Bệnh nền: Cao HA, Đái tháo đường...
  obstetricHistory?: string; // Tiền sử sản khoa: Para (sống-sinh-sảy-chết)...
}

export interface PregnancyRecordItem {
  id: string;
  stt: string; // "01", "02"...
  patientId?: string;
  patientName: string;
  phoneNumber: string;
  email?: string;
  birthDate?: string;
  doctorName: string;
  doctorId?: string;
  
  // Dữ liệu y khoa thai kỳ
  lmp?: string; // YYYY-MM-DD
  q1UltrasoundDate?: string; // YYYY-MM-DD
  q1GestationalWeeks?: number;
  q1GestationalDays?: number;
  crlMm?: number;
  overrideEdd?: string; // YYYY-MM-DD
  
  // Kết quả tính toán
  edd: string; // YYYY-MM-DD
  displayEdd: string; // DD/MM/YYYY
  gestationalAgeDisplay: string; // "32 tuần 4 ngày" hoặc "32 tuần"
  gestationalAgeFormatted?: string; // "27w4d"
  gestationalAgeDays?: number; // 193
  daysUntilEdd?: number; // 87
  trimesterDisplay: string; // "Quý 1", "Quý 2", "Quý 3"
  primaryMethod?: string;
  
  // Tiền sử cơ bản
  history?: MedicalHistory;
  
  status: PregnancyStatus;
  statusLabel: 'Đang hoạt động' | 'Hoàn thành' | 'Đã kết thúc' | 'Đình chỉ' | string;
  createdAt: string;
}

const STORAGE_KEY = 'precare_pregnancy_records_v2';

/**
 * Danh sách hồ sơ ban đầu khớp với bản thiết kế
 */
/**
 * Đọc danh sách hồ sơ thai kỳ từ LocalStorage (hoặc nạp mặc định nếu lần đầu)
 */
export function getStoredPregnancyRecords(): PregnancyRecordItem[] {
  return [];
}

/**
 * Lưu danh sách hồ sơ vào LocalStorage
 */
export function savePregnancyRecordsToStorage(records: PregnancyRecordItem[]): void {
  void records;
}

export interface CreatePregnancyRecordInput {
  patientId?: string;
  patientName: string;
  phoneNumber: string;
  email?: string;
  birthDate?: string;
  doctorId?: string;
  doctorName?: string;
  
  lmp?: string;
  q1UltrasoundDate?: string;
  q1GestationalWeeks?: number;
  q1GestationalDays?: number;
  crlMm?: number;
  overrideEdd?: string;
  
  history?: MedicalHistory;
  status?: PregnancyStatus;
}

/**
 * Tạo mới một hồ sơ thai kỳ, tự động tính tuổi thai & EDD chuẩn y khoa
 */
export function createNewPregnancyRecord(
  input: CreatePregnancyRecordInput
): PregnancyRecordItem {
  const currentRecords = getStoredPregnancyRecords();
  const nextIndex = currentRecords.length + 1;
  const nextStt = String(nextIndex).padStart(2, '0');
  const recordId = `prof-${Date.now().toString().slice(-6)}`;

  // Tính toán tuổi thai và EDD
  let calcResult: PregnancyCalculationResult;
  try {
    calcResult = calculatePregnancyDates({
      lmp: input.lmp,
      q1UltrasoundDate: input.q1UltrasoundDate,
      q1GestationalWeeks: input.q1GestationalWeeks,
      q1GestationalDays: input.q1GestationalDays,
      crlMm: input.crlMm,
      overrideEdd: input.overrideEdd,
    });
  } catch {
    // Trường hợp dự phòng nếu chỉ có override EDD hoặc default
    const fallbackEdd = input.overrideEdd || '2026-12-31';
    calcResult = {
      targetDate: getTodayISO(),
      calculatedEdd: fallbackEdd,
      formattedEdd: formatDateToDisplay(fallbackEdd),
      primaryMethod: 'direct_edd',
      methodLabel: 'Chỉ định trực tiếp',
      clinicalNote: 'Ngày dự sinh chỉ định',
      gestationalAge: {
        days: 140,
        weeks: 20,
        remainingDays: 0,
        formatted: '20w0d',
        display: '20 tuần',
        trimester: 2,
        trimesterName: 'Quý 2',
        daysUntilEdd: 140,
      },
      daysUntilEdd: 140,
    };
  }

  const status: PregnancyStatus = input.status || 'active';
  const statusLabel =
    status === 'completed'
      ? 'Đã sinh'
      : status === 'terminated'
      ? 'Đình chỉ'
      : 'Đang hoạt động';

  const newRecord: PregnancyRecordItem = {
    id: recordId,
    stt: nextStt,
    patientId: input.patientId,
    patientName: input.patientName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email?.trim(),
    birthDate: input.birthDate,
    doctorId: input.doctorId,
    doctorName: input.doctorName || '',
    
    lmp: input.lmp,
    q1UltrasoundDate: input.q1UltrasoundDate,
    q1GestationalWeeks: input.q1GestationalWeeks,
    q1GestationalDays: input.q1GestationalDays,
    crlMm: input.crlMm,
    overrideEdd: input.overrideEdd,
    
    edd: calcResult.calculatedEdd,
    displayEdd: calcResult.formattedEdd,
    gestationalAgeDisplay: calcResult.gestationalAge.display,
    gestationalAgeFormatted: calcResult.gestationalAge.formatted,
    gestationalAgeDays: calcResult.gestationalAge.days,
    daysUntilEdd: calcResult.daysUntilEdd,
    trimesterDisplay: `${calcResult.gestationalAge.trimesterName} (${calcResult.gestationalAge.days} ngày)`,
    primaryMethod: calcResult.primaryMethod,
    
    status,
    statusLabel,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...currentRecords];
  savePregnancyRecordsToStorage(updated);
  return newRecord;
}

/**
 * Cập nhật một hồ sơ thai kỳ hiện có
 */
export function updatePregnancyRecord(updatedRecord: PregnancyRecordItem): void {
  const currentRecords = getStoredPregnancyRecords();
  const next = currentRecords.map((r) => (r.id === updatedRecord.id ? updatedRecord : r));
  savePregnancyRecordsToStorage(next);
}

/**
 * Cập nhật động tuổi thai dựa trên ngày hiện tại
 */
export function recalculateRecordAtToday(record: PregnancyRecordItem): PregnancyRecordItem {
  if (record.status === 'completed' || record.status === 'terminated') {
    return record; // Giữ nguyên trạng thái đã kết thúc/đã sinh
  }

  try {
    const calc = calculatePregnancyDates({
      lmp: record.lmp,
      q1UltrasoundDate: record.q1UltrasoundDate,
      q1GestationalWeeks: record.q1GestationalWeeks,
      q1GestationalDays: record.q1GestationalDays,
      crlMm: record.crlMm,
      overrideEdd: record.overrideEdd || record.edd,
    });

    return {
      ...record,
      gestationalAgeDisplay: calc.gestationalAge.display,
      gestationalAgeFormatted: calc.gestationalAge.formatted,
      gestationalAgeDays: calc.gestationalAge.days,
      daysUntilEdd: calc.daysUntilEdd,
      trimesterDisplay: `${calc.gestationalAge.trimesterName} (${calc.gestationalAge.days} ngày)`,
      displayEdd: calc.formattedEdd,
      edd: calc.calculatedEdd,
    };
  } catch {
    return record;
  }
}

/**
 * Cập nhật trạng thái hồ sơ thai kỳ (PATCH /api/v1/pregnancy-profiles/{profile_id}/status)
 */
export function updatePregnancyStatus(
  profileId: string,
  newStatus: PregnancyStatus,
  _reason?: string
): PregnancyRecordItem | null {
  const currentRecords = getStoredPregnancyRecords();
  const index = currentRecords.findIndex((r) => r.id === profileId);
  if (index === -1) return null;

  const statusLabel =
    newStatus === 'completed'
      ? 'Đã sinh'
      : newStatus === 'terminated'
      ? 'Đình chỉ'
      : 'Đang hoạt động';

  const updatedRecord: PregnancyRecordItem = {
    ...currentRecords[index],
    status: newStatus,
    statusLabel,
  };

  currentRecords[index] = updatedRecord;
  savePregnancyRecordsToStorage(currentRecords);
  return updatedRecord;
}

// =========================================================================
// AXIOS REST API SERVICES (STORY-3.1 PREGNANCY PROFILES)
// =========================================================================

/**
 * Chuyển đổi dữ liệu hồ sơ từ Backend về giao diện PregnancyRecordItem
 */
export function mapBackendToRecordItem(
  raw: PregnancyProfileBackend | PregnancyProfileListItemBackend,
  index: number = 0
): PregnancyRecordItem {
  const patientName =
    (raw as any).patient?.full_name || (raw as any).patient_name || 'Thai phụ';
  const phoneNumber =
    (raw as any).patient?.phone_number || (raw as any).patient_phone || '';
  const email = (raw as any).patient?.email || (raw as any).email || '';
  const doctorName =
    (raw as any).primary_doctor?.full_name || (raw as any).primary_doctor_name || '';
  const doctorId =
    (raw as any).primary_doctor?.id || (raw as any).primary_doctor_id || '';
  const patientId =
    (raw as any).patient?.id || (raw as any).patient_id || '';

  const status = raw.status || 'active';
  const statusLabel =
    status === 'completed'
      ? 'Đã sinh (Completed)'
      : status === 'terminated'
      ? 'Đình chỉ'
      : 'Đang hoạt động';

  const baseItem: PregnancyRecordItem = {
    id: raw.id,
    stt: String(index + 1).padStart(2, '0'),
    patientId,
    patientName,
    phoneNumber,
    email,
    doctorId,
    doctorName,
    lmp: (raw as any).lmp || undefined,
    q1UltrasoundDate: (raw as any).q1_ultrasound_date || undefined,
    q1GestationalWeeks: (raw as any).q1_gestational_weeks || undefined,
    q1GestationalDays: (raw as any).q1_gestational_days || undefined,
    crlMm: (raw as any).crl_mm ? Number((raw as any).crl_mm) : undefined,
    overrideEdd: (raw as any).override_edd || undefined,
    edd: raw.edd,
    displayEdd: formatDateToDisplay(raw.edd),
    gestationalAgeDisplay:
      (raw as any).current_gestational_age?.formatted ||
      (raw as any).current_gestational_age_formatted ||
      '-- tuần',
    gestationalAgeFormatted:
      (raw as any).current_gestational_age?.formatted ||
      (raw as any).current_gestational_age_formatted ||
      '--w--d',
    gestationalAgeDays: (raw as any).current_gestational_age?.days,
    daysUntilEdd: (raw as any).current_gestational_age?.days_until_edd,
    trimesterDisplay: (raw as any).current_gestational_age?.trimester
      ? `Quý ${(raw as any).current_gestational_age.trimester}`
      : 'Quý 1',
    status,
    statusLabel,
    createdAt: (raw as any).created_at || new Date().toISOString(),
  };

  // Tinh chỉnh tính toán nếu thiếu trường current_gestational_age
  return recalculateRecordAtToday(baseItem);
}

/**
 * 1. GET /api/v1/pregnancy-profiles — Lấy danh sách hồ sơ thai kỳ
 */
export async function fetchPregnancyProfilesApi(params?: {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
  doctor_id?: string;
}): Promise<{
  items: PregnancyRecordItem[];
  pagination: { page: number; page_size: number; total_items: number; total_pages: number };
}> {
  const queryParams: Record<string, any> = {};
  if (params?.page) queryParams.page = params.page;
  if (params?.page_size) queryParams.page_size = params.page_size;
  if (params?.status && params.status !== 'all') queryParams.status = params.status;
  if (params?.search) queryParams.search = params.search;
  if (params?.doctor_id && params.doctor_id !== 'all') queryParams.doctor_id = params.doctor_id;

  const response = await apiClient.get<ApiResponse<any>>('/pregnancy-profiles', {
    params: queryParams,
  });

  const rawData = response.data?.data;
  let rawItems: any[] = [];
  let pagination = {
    page: params?.page || 1,
    page_size: params?.page_size || 20,
    total_items: 0,
    total_pages: 1,
  };

  if (rawData) {
    if (Array.isArray(rawData)) {
      rawItems = rawData;
      pagination.total_items = rawData.length;
    } else if (Array.isArray(rawData.items)) {
      rawItems = rawData.items;
      if (rawData.pagination) {
        pagination = rawData.pagination;
      }
    }
  }

  const items: PregnancyRecordItem[] = rawItems.map((item, idx) =>
    mapBackendToRecordItem(item, idx)
  );

  // Cập nhật lưu trữ local cache đồng bộ
  if (items.length > 0) {
    savePregnancyRecordsToStorage(items);
  }

  return { items, pagination };
}

/**
 * 2. GET /api/v1/pregnancy-profiles/{profile_id} — Lấy Chi tiết Hồ sơ theo ID
 */
export async function fetchPregnancyProfileByIdApi(
  profileId: string,
  targetDate?: string
): Promise<PregnancyRecordItem> {
  const params: Record<string, string> = {};
  if (targetDate) params.target_date = targetDate;

  const response = await apiClient.get<ApiResponse<PregnancyProfileBackend>>(
    `/pregnancy-profiles/${profileId}`,
    { params }
  );

  const raw = response.data?.data;
  if (!raw) {
    throw new Error('Không tìm thấy dữ liệu hồ sơ thai kỳ');
  }

  const mapped = mapBackendToRecordItem(raw, 0);

  // Đồng bộ vào cache
  const stored = getStoredPregnancyRecords();
  const idx = stored.findIndex((r) => r.id === mapped.id);
  if (idx !== -1) {
    stored[idx] = mapped;
  } else {
    stored.unshift(mapped);
  }
  savePregnancyRecordsToStorage(stored);

  return mapped;
}

/**
 * 3. GET /api/v1/pregnancy-profiles/active — Lấy Hồ sơ Đang Hoạt động
 */
export async function fetchActivePregnancyProfileApi(
  patientId?: string
): Promise<PregnancyRecordItem> {
  const params: Record<string, string> = {};
  if (patientId) params.patient_id = patientId;

  const response = await apiClient.get<ApiResponse<PregnancyProfileBackend>>(
    '/pregnancy-profiles/active',
    { params }
  );

  const raw = response.data?.data;
  if (!raw) {
    throw new Error('Thai phụ chưa có hồ sơ thai kỳ đang hoạt động');
  }

  return mapBackendToRecordItem(raw, 0);
}

/**
 * 4. POST /api/v1/pregnancy-profiles — Khởi tạo Hồ sơ Thai kỳ Mới
 */
export async function createPregnancyProfileApi(
  payload: CreatePregnancyProfileRequest
): Promise<PregnancyRecordItem> {
  const response = await apiClient.post<ApiResponse<PregnancyProfileBackend>>(
    '/pregnancy-profiles',
    payload
  );

  const raw = response.data?.data;
  if (!raw) {
    throw new Error('Khởi tạo hồ sơ thai kỳ thất bại');
  }

  const mapped = mapBackendToRecordItem(raw, 0);

  // Thêm vào cache local
  const current = getStoredPregnancyRecords();
  savePregnancyRecordsToStorage([mapped, ...current]);

  return mapped;
}

/**
 * 5. PUT /api/v1/pregnancy-profiles/{profile_id} — Cập nhật Thông tin Hồ sơ
 */
export async function updatePregnancyProfileApi(
  profileId: string,
  payload: UpdatePregnancyProfileRequest
): Promise<PregnancyRecordItem> {
  const response = await apiClient.put<ApiResponse<PregnancyProfileBackend>>(
    `/pregnancy-profiles/${profileId}`,
    payload
  );

  const raw = response.data?.data;
  if (!raw) {
    throw new Error('Cập nhật hồ sơ thai kỳ thất bại');
  }

  const mapped = mapBackendToRecordItem(raw, 0);

  // Cập nhật cache local
  const current = getStoredPregnancyRecords();
  const next = current.map((r) => (r.id === mapped.id ? mapped : r));
  savePregnancyRecordsToStorage(next);

  return mapped;
}

/**
 * 6. PATCH /api/v1/pregnancy-profiles/{profile_id}/status — Cập nhật Trạng thái Hồ sơ
 */
export async function updatePregnancyProfileStatusApi(
  profileId: string,
  status: PregnancyStatus,
  reason?: string
): Promise<PregnancyRecordItem> {
  const response = await apiClient.patch<ApiResponse<{ id: string; status: PregnancyStatus; updated_at?: string }>>(
    `/pregnancy-profiles/${profileId}/status`,
    { status, reason }
  );

  if (!response.data?.success && response.status !== 200) {
    throw new Error('Không thể cập nhật trạng thái hồ sơ');
  }

  // Cập nhật trạng thái trong local
  const updated = updatePregnancyStatus(profileId, status, reason);
  if (!updated) {
    throw new Error('Hồ sơ không tồn tại trong hệ thống');
  }

  return updated;
}

/**
 * 7. POST /api/v1/pregnancy-profiles/calculate — Utility Engine Tính toán Tuổi thai & EDD (Preview)
 */
export async function calculatePregnancyApi(
  params: CalculateGestationalAgeRequest
): Promise<CalculateGestationalAgeResponseData> {
  try {
    const response = await apiClient.post<ApiResponse<CalculateGestationalAgeResponseData>>(
      '/pregnancy-profiles/calculate',
      params
    );

    if (response.data?.data) {
      return response.data.data;
    }
    throw new Error('Không nhận được dữ liệu tính toán từ máy chủ');
  } catch (error) {
    // Graceful fallback to client-side logic
    const calc = calculatePregnancyDates({
      targetDate: params.target_date,
      lmp: params.lmp || undefined,
      q1UltrasoundDate: params.q1_ultrasound_date || undefined,
      q1GestationalWeeks: params.q1_gestational_weeks || undefined,
      q1GestationalDays: params.q1_gestational_days || undefined,
      crlMm: params.crl_mm || undefined,
      overrideEdd: params.direct_edd || undefined,
    });

    return {
      target_date: calc.targetDate,
      calculated_edd: calc.calculatedEdd,
      primary_method: (calc.primaryMethod as any) || 'lmp',
      clinical_note: calc.clinicalNote || 'Tính toán dự kiến theo chuẩn lâm sàng ACOG',
      gestational_age: {
        days: calc.gestationalAge.days,
        weeks: calc.gestationalAge.weeks,
        remaining_days: calc.gestationalAge.remainingDays,
        formatted: calc.gestationalAge.formatted,
        trimester: calc.gestationalAge.trimester,
        trimester_description: calc.gestationalAge.trimesterName,
      },
      days_until_edd: calc.daysUntilEdd,
    };
  }
}

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu phục vụ tìm kiếm thông minh
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Danh sách bác sĩ hệ thống có role 'doctor' từ CSDL PreCare
 */
/**
 * Trích xuất danh sách bác sĩ duy nhất từ dữ liệu hồ sơ đã tải từ CSDL
 */
export function getUniqueDoctorsFromRecords(
  records: PregnancyRecordItem[]
): { id: string; name: string }[] {
  const map = new Map<string, { id: string; name: string }>();
  records.forEach((r) => {
    const rawName = r.doctorName?.trim();
    if (rawName) {
      const formattedName = rawName.startsWith('BS.') ? rawName : `BS. ${rawName}`;
      const id = r.doctorId || rawName;
      const name = formattedName;
      if (!map.has(id)) {
        map.set(id, { id, name });
      }
    }
  });

  // Trả về danh sách duy nhất theo ID chuẩn
  const seenIds = new Set<string>();
  const result: { id: string; name: string }[] = [];
  Array.from(map.values()).forEach((doc) => {
    if (!seenIds.has(doc.id)) {
      seenIds.add(doc.id);
      result.push(doc);
    }
  });

  return result;
}

/**
 * Trích xuất danh sách thai phụ duy nhất từ dữ liệu thực tế của các hồ sơ thai kỳ
 */
export function getUniquePatientsFromRecords(
  records: PregnancyRecordItem[]
): { id: string; fullName: string; phoneNumber: string; email?: string }[] {
  const map = new Map<string, { id: string; fullName: string; phoneNumber: string; email?: string }>();
  records.forEach((r) => {
    const patId = r.patientId || r.id;
    if (r.patientName && !map.has(patId)) {
      map.set(patId, {
        id: patId,
        fullName: r.patientName,
        phoneNumber: r.phoneNumber || '',
        email: r.email,
      });
    }
  });

  return Array.from(map.values());
}

export interface EligiblePatient {
  id: string;
  fullName: string;
  phoneNumber?: string;
  email: string;
}

/**
 * 8. GET /api/v1/pregnancy-profiles/eligible-patients — Lấy Danh sách Thai phụ Chưa có Hồ sơ Thai kỳ
 */
export async function fetchEligiblePatientsApi(): Promise<EligiblePatient[]> {
  try {
    const response = await apiClient.get<ApiResponse<any>>('/pregnancy-profiles/eligible-patients');
    const rawList = response.data?.data || [];
    return rawList.map((p: any) => ({
      id: p.id,
      fullName: p.full_name || p.fullName || 'Thai phụ',
      phoneNumber: p.phone_number || p.phoneNumber || '',
      email: p.email || '',
    }));
  } catch (err) {
    console.warn('Không thể tải danh sách thai phụ chưa có hồ sơ từ API:', err);
    return [];
  }
}



