/**
 * Patient Service for Doctor Portal
 * Quản lý danh sách bệnh nhân (User có role 'pregnant_woman')
 * Đồng bộ với dữ liệu hồ sơ thai kỳ từ pregnancyProfile.service
 */

import { getStoredPregnancyRecords, PregnancyRecordItem } from './pregnancyProfile.service';

export type PatientPregnancyStatusType = 'active' | 'none' | 'delivered';

export interface PatientItem {
  id: string;
  stt: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  avatarInitials: string;
  avatarBgColor: string;
  avatarTextColor: string;
  pregnancyStatusType: PatientPregnancyStatusType;
  pregnancyStatusLabel: string;
  pregnancyRecordId?: string;
  deliveredDate?: string;
}

const INITIAL_PATIENTS: PatientItem[] = [
  {
    id: 'pat-001',
    stt: '01',
    fullName: 'Lê Hoàng Hải Yến',
    phoneNumber: '0912 345 678',
    email: 'haiyen.le@gmail.com',
    avatarInitials: 'HY',
    avatarBgColor: '#CCFBF1',
    avatarTextColor: '#0F766E',
    pregnancyStatusType: 'active',
    pregnancyStatusLabel: 'Đang mang thai (32w)',
    pregnancyRecordId: 'prof-001',
  },
  {
    id: 'pat-002',
    stt: '02',
    fullName: 'Nguyễn Thảo Chi',
    phoneNumber: '0987 654 321',
    email: 'thaochi.nguyen@gmail.com',
    avatarInitials: 'TC',
    avatarBgColor: '#EDE9FE',
    avatarTextColor: '#7C3AED',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ hoạt động',
  },
  {
    id: 'pat-003',
    stt: '03',
    fullName: 'Phạm Minh Thư',
    phoneNumber: '0905 123 456',
    email: 'minhthu.pham@gmail.com',
    avatarInitials: 'MT',
    avatarBgColor: '#FEF3C7',
    avatarTextColor: '#D97706',
    pregnancyStatusType: 'active',
    pregnancyStatusLabel: 'Đang mang thai (18w)',
    pregnancyRecordId: 'prof-003',
  },
  {
    id: 'pat-004',
    stt: '04',
    fullName: 'Trần Hồng Nhung',
    phoneNumber: '0934 567 890',
    email: 'hongnhung.tran@gmail.com',
    avatarInitials: 'HN',
    avatarBgColor: '#FCE7F3',
    avatarTextColor: '#DB2777',
    pregnancyStatusType: 'delivered',
    pregnancyStatusLabel: 'Lần sinh trước: 02/08/2026',
    deliveredDate: '02/08/2026',
    pregnancyRecordId: 'prof-004',
  },
  {
    id: 'pat-005',
    stt: '05',
    fullName: 'Nguyễn Thị Mai',
    phoneNumber: '0909 111 222',
    email: 'thimai.nguyen@gmail.com',
    avatarInitials: 'TM',
    avatarBgColor: '#E0E7FF',
    avatarTextColor: '#4338CA',
    pregnancyStatusType: 'active',
    pregnancyStatusLabel: 'Đang mang thai (28w)',
    pregnancyRecordId: 'prof-005',
  },
  {
    id: 'pat-006',
    stt: '06',
    fullName: 'Phan Thanh Thủy',
    phoneNumber: '0978 999 888',
    email: 'thanhthuy.phan@gmail.com',
    avatarInitials: 'TT',
    avatarBgColor: '#DCFCE7',
    avatarTextColor: '#15803D',
    pregnancyStatusType: 'active',
    pregnancyStatusLabel: 'Đang mang thai (12w)',
    pregnancyRecordId: 'prof-006',
  },
  {
    id: 'pat-007',
    stt: '07',
    fullName: 'Đỗ Thùy Trang',
    phoneNumber: '0988 123 456',
    email: 'thuytrang.do@gmail.com',
    avatarInitials: 'TT',
    avatarBgColor: '#FFEDD5',
    avatarTextColor: '#C2410C',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ hoạt động',
  },
  {
    id: 'pat-008',
    stt: '08',
    fullName: 'Vũ Ngọc Hân',
    phoneNumber: '0932 456 789',
    email: 'ngochan.vu@gmail.com',
    avatarInitials: 'NH',
    avatarBgColor: '#F3E8FF',
    avatarTextColor: '#6B21A8',
    pregnancyStatusType: 'delivered',
    pregnancyStatusLabel: 'Lần sinh trước: 15/05/2026',
    deliveredDate: '15/05/2026',
  },
  {
    id: 'pat-009',
    stt: '09',
    fullName: 'Hoàng Bích Phương',
    phoneNumber: '0918 777 666',
    email: 'bichphuong.hoang@gmail.com',
    avatarInitials: 'BP',
    avatarBgColor: '#CFFAFE',
    avatarTextColor: '#0E7490',
    pregnancyStatusType: 'active',
    pregnancyStatusLabel: 'Đang mang thai (24w)',
  },
  {
    id: 'pat-010',
    stt: '10',
    fullName: 'Bùi Kim Ngân',
    phoneNumber: '0945 888 999',
    email: 'kimngan.bui@gmail.com',
    avatarInitials: 'KN',
    avatarBgColor: '#FEE2E2',
    avatarTextColor: '#B91C1C',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ hoạt động',
  },
];

const PATIENTS_STORAGE_KEY = 'precare_patients_list';

export function getStoredPatients(): PatientItem[] {
  try {
    const raw = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
      return INITIAL_PATIENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PATIENTS;
  } catch {
    return INITIAL_PATIENTS;
  }
}

export function saveStoredPatients(patients: PatientItem[]): void {
  try {
    localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
  } catch (e) {
    console.error('Không thể lưu danh sách bệnh nhân', e);
  }
}

/**
 * Trợ giúp tạo viết tắt (initials) từ họ tên tiếng Việt
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
