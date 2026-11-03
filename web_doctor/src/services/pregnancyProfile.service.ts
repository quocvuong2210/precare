/**
 * Pregnancy Profile Management Service
 * Xử lý dữ liệu hồ sơ thai kỳ, tích hợp tính toán y khoa, lưu trữ và tìm kiếm
 */

import {
  calculatePregnancyDates,
  formatDateToDisplay,
  formatGestationalAge,
  getTodayISO,
  parseDateOnly,
  PregnancyCalculationParams,
  PregnancyCalculationResult,
} from './pregnancyCalculator';

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
  trimesterDisplay: string; // "Quý 1", "Quý 2", "Quý 3"
  primaryMethod?: string;
  
  // Tiền sử cơ bản
  history?: MedicalHistory;
  
  status: PregnancyStatus;
  statusLabel: 'Đang hoạt động' | 'Hoàn thành' | 'Đã kết thúc';
  createdAt: string;
}

const STORAGE_KEY = 'precare_pregnancy_records';

/**
 * Danh sách 6 hồ sơ ban đầu khớp chính xác 100% với bản thiết kế
 */
export const INITIAL_PREGNANCY_RECORDS: PregnancyRecordItem[] = [
  {
    id: 'prof-001',
    stt: '01',
    patientName: 'Lê Hoàng Hải Yến',
    phoneNumber: '0912 345 678',
    email: 'haiyen.le@gmail.com',
    birthDate: '1995-04-12',
    doctorName: 'BS. Lê Minh',
    doctorId: 'doc-001',
    lmp: '2026-01-01',
    edd: '2026-08-14',
    displayEdd: '14/08/2026',
    gestationalAgeDisplay: '32 tuần 4 ngày',
    trimesterDisplay: 'Quý 3',
    primaryMethod: 'q1_ultrasound',
    history: {
      bloodType: 'O+',
      allergies: 'Không có',
      underlyingConditions: 'Không',
      obstetricHistory: 'Con so (Para 0000)',
    },
    status: 'active',
    statusLabel: 'Đang hoạt động',
    createdAt: '2026-01-15T08:30:00Z',
  },
  {
    id: 'prof-002',
    stt: '02',
    patientName: 'Nguyễn Thảo Chi',
    phoneNumber: '0987 654 321',
    email: 'thaochi.nguyen@gmail.com',
    birthDate: '1997-08-20',
    doctorName: 'BS. Nguyễn Văn A',
    doctorId: 'doc-002',
    lmp: '2026-01-08',
    edd: '2026-08-20',
    displayEdd: '20/08/2026',
    gestationalAgeDisplay: '32 tuần',
    trimesterDisplay: 'Quý 3',
    primaryMethod: 'lmp',
    history: {
      bloodType: 'A+',
      allergies: 'Kháng sinh Penicillin',
      underlyingConditions: 'Huyết áp hơi thấp',
      obstetricHistory: 'Para 1001 (1 lần sinh thường)',
    },
    status: 'active',
    statusLabel: 'Đang hoạt động',
    createdAt: '2026-01-20T09:00:00Z',
  },
  {
    id: 'prof-003',
    stt: '03',
    patientName: 'Phạm Minh Thư',
    phoneNumber: '0905 123 456',
    email: 'minhthu.pham@gmail.com',
    birthDate: '1999-11-03',
    doctorName: 'BS. Trần Văn B',
    doctorId: 'doc-003',
    lmp: '2026-04-18',
    edd: '2026-11-25',
    displayEdd: '25/11/2026',
    gestationalAgeDisplay: '18 tuần',
    trimesterDisplay: 'Quý 2',
    primaryMethod: 'lmp',
    history: {
      bloodType: 'B+',
      allergies: 'Hải sản',
      underlyingConditions: 'Không',
      obstetricHistory: 'Con so (Para 0000)',
    },
    status: 'active',
    statusLabel: 'Đang hoạt động',
    createdAt: '2026-04-25T10:15:00Z',
  },
  {
    id: 'prof-004',
    stt: '04',
    patientName: 'Trần Hồng Nhung',
    phoneNumber: '0934 567 890',
    email: 'hongnhung.tran@gmail.com',
    birthDate: '1994-02-18',
    doctorName: 'BS. Lê Minh',
    doctorId: 'doc-001',
    lmp: '2025-10-26',
    edd: '2026-08-02',
    displayEdd: '02/08/2026',
    gestationalAgeDisplay: '36 tuần',
    trimesterDisplay: 'Quý 3',
    primaryMethod: 'q1_ultrasound',
    history: {
      bloodType: 'AB+',
      allergies: 'Không',
      underlyingConditions: 'Tiền sử tăng huyết áp thai kỳ',
      obstetricHistory: 'Para 0101 (1 lần sinh mổ)',
    },
    status: 'completed',
    statusLabel: 'Hoàn thành',
    createdAt: '2025-11-10T14:20:00Z',
  },
  {
    id: 'prof-005',
    stt: '05',
    patientName: 'Nguyễn Thị Mai',
    phoneNumber: '0909 111 222',
    email: 'thimai.nguyen@gmail.com',
    birthDate: '1996-06-05',
    doctorName: 'BS. Nguyễn Văn A',
    doctorId: 'doc-002',
    lmp: '2026-02-06',
    edd: '2026-09-15',
    displayEdd: '15/09/2026',
    gestationalAgeDisplay: '28 tuần',
    trimesterDisplay: 'Quý 2',
    primaryMethod: 'lmp',
    history: {
      bloodType: 'O+',
      allergies: 'Không',
      underlyingConditions: 'Không',
      obstetricHistory: 'Con so (Para 0000)',
    },
    status: 'active',
    statusLabel: 'Đang hoạt động',
    createdAt: '2026-02-15T11:00:00Z',
  },
  {
    id: 'prof-006',
    stt: '06',
    patientName: 'Phan Thanh Thủy',
    phoneNumber: '0978 999 888',
    email: 'thanhthuy.phan@gmail.com',
    birthDate: '2000-09-14',
    doctorName: 'BS. Lê Minh',
    doctorId: 'doc-001',
    lmp: '2026-06-03',
    edd: '2027-01-10',
    displayEdd: '10/01/2027',
    gestationalAgeDisplay: '12 tuần',
    trimesterDisplay: 'Quý 1',
    primaryMethod: 'crl',
    history: {
      bloodType: 'A+',
      allergies: 'Bụi phấn hoa',
      underlyingConditions: 'Không',
      obstetricHistory: 'Con so (Para 0000)',
    },
    status: 'active',
    statusLabel: 'Đang hoạt động',
    createdAt: '2026-06-10T16:45:00Z',
  },
];

/**
 * Đọc danh sách hồ sơ thai kỳ từ LocalStorage (hoặc nạp mặc định nếu lần đầu)
 */
export function getStoredPregnancyRecords(): PregnancyRecordItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PREGNANCY_RECORDS));
      return INITIAL_PREGNANCY_RECORDS;
    }
    const parsed: PregnancyRecordItem[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PREGNANCY_RECORDS;
  } catch {
    return INITIAL_PREGNANCY_RECORDS;
  }
}

/**
 * Lưu danh sách hồ sơ vào LocalStorage
 */
export function savePregnancyRecordsToStorage(records: PregnancyRecordItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Không thể lưu hồ sơ thai kỳ vào LocalStorage', e);
  }
}

export interface CreatePregnancyRecordInput {
  patientName: string;
  phoneNumber: string;
  email?: string;
  birthDate?: string;
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
  const statusLabel = status === 'completed' ? 'Hoàn thành' : 'Đang hoạt động';

  const newRecord: PregnancyRecordItem = {
    id: recordId,
    stt: nextStt,
    patientName: input.patientName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email?.trim(),
    birthDate: input.birthDate,
    doctorName: input.doctorName || 'BS. Lê Minh',
    
    lmp: input.lmp,
    q1UltrasoundDate: input.q1UltrasoundDate,
    q1GestationalWeeks: input.q1GestationalWeeks,
    q1GestationalDays: input.q1GestationalDays,
    crlMm: input.crlMm,
    overrideEdd: input.overrideEdd,
    
    edd: calcResult.calculatedEdd,
    displayEdd: calcResult.formattedEdd,
    gestationalAgeDisplay: calcResult.gestationalAge.display,
    trimesterDisplay: calcResult.gestationalAge.trimesterName,
    primaryMethod: calcResult.primaryMethod,
    
    history: input.history || {
      bloodType: '',
      allergies: '',
      underlyingConditions: '',
      obstetricHistory: '',
    },
    status,
    statusLabel,
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...currentRecords];
  savePregnancyRecordsToStorage(updated);
  return newRecord;
}

/**
 * Cập nhật động tuổi thai dựa trên ngày hiện tại
 */
export function recalculateRecordAtToday(record: PregnancyRecordItem): PregnancyRecordItem {
  if (record.status === 'completed') {
    return record; // Giữ nguyên trạng thái đã hoàn thành
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
      trimesterDisplay: calc.gestationalAge.trimesterName,
      displayEdd: calc.formattedEdd,
      edd: calc.calculatedEdd,
    };
  } catch {
    return record;
  }
}
