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
    phoneNumber: '0933445566',
    email: 'hongnhung.tran@gmail.com',
    avatarInitials: 'HN',
    avatarBgColor: '#FCE7F3',
    avatarTextColor: '#DB2777',
    pregnancyStatusType: 'delivered',
    pregnancyStatusLabel: 'Lần sinh trước: 14/11/2026',
    deliveredDate: '14/11/2026',
    pregnancyRecordId: 'prof-001',
  },
  {
    id: 'pat-mai',
    stt: '05',
    fullName: 'Lê Hoàng Mai',
    phoneNumber: '0977889900',
    email: 'hoangmai.le@example.com',
    avatarInitials: 'HM',
    avatarBgColor: '#FEE2E2',
    avatarTextColor: '#991B1B',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Đình chỉ thai kỳ',
    pregnancyRecordId: 'prof-002',
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
  {
    id: '55555555-0001-4000-8000-000000000001',
    stt: '11',
    fullName: 'Phạm Thị Mai Anh',
    phoneNumber: '0912345001',
    email: 'maianh.pham@gmail.com',
    avatarInitials: 'MA',
    avatarBgColor: '#E0F2FE',
    avatarTextColor: '#0369A1',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ thai kỳ',
  },
  {
    id: '55555555-0002-4000-8000-000000000002',
    stt: '12',
    fullName: 'Vũ Thị Ngọc Ánh',
    phoneNumber: '0912345002',
    email: 'ngocanh.vu@gmail.com',
    avatarInitials: 'NA',
    avatarBgColor: '#FDF4FF',
    avatarTextColor: '#A21CAF',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ thai kỳ',
  },
  {
    id: '55555555-0003-4000-8000-000000000003',
    stt: '13',
    fullName: 'Hoàng Bích Phương',
    phoneNumber: '0912345003',
    email: 'bichphuong.hoang@gmail.com',
    avatarInitials: 'BP',
    avatarBgColor: '#ECFDF5',
    avatarTextColor: '#047857',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ thai kỳ',
  },
  {
    id: '55555555-0004-4000-8000-000000000004',
    stt: '14',
    fullName: 'Đặng Thùy Dung',
    phoneNumber: '0912345004',
    email: 'thuydung.dang@gmail.com',
    avatarInitials: 'TD',
    avatarBgColor: '#FFFBEB',
    avatarTextColor: '#B45309',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ thai kỳ',
  },
  {
    id: '55555555-0005-4000-8000-000000000005',
    stt: '15',
    fullName: 'Dương Khánh Linh',
    phoneNumber: '0912345005',
    email: 'khanhlinh.duong@gmail.com',
    avatarInitials: 'KL',
    avatarBgColor: '#F5F3FF',
    avatarTextColor: '#6D28D9',
    pregnancyStatusType: 'none',
    pregnancyStatusLabel: 'Chưa có hồ sơ thai kỳ',
  },
];

export const ALL_PREGNANT_WOMEN_USERS: {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
}[] = [
  {
    id: '33333333-3333-3333-3333-333333333333',
    fullName: 'Lê Hoàng Hải Yến',
    phoneNumber: '0901234567',
    email: 'haiyen.le@gmail.com',
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    fullName: 'Nguyễn Thảo Chi',
    phoneNumber: '0909999999',
    email: 'thaochi.nguyen@gmail.com',
  },
  {
    id: '6f117495-21fa-47e1-ab97-108f494bd03e',
    fullName: 'Bùi Kim Ngân',
    phoneNumber: '0945888999',
    email: 'kimngan.bui@gmail.com',
  },
  {
    id: 'd5829d9a-3634-4e58-8085-e7dcc6a0645c',
    fullName: 'Lê Hoàng Mai',
    phoneNumber: '0977889900',
    email: 'hoangmai.le@gmail.com',
  },
  {
    id: '195c0e1c-9412-4a63-aee6-eabca8deb249',
    fullName: 'Trần Hồng Nhung',
    phoneNumber: '0933445566',
    email: 'hongnhung.tran@gmail.com',
  },
  {
    id: 'df32128b-45e2-4fdd-b045-d25b4f8870aa',
    fullName: 'Đỗ Thùy Trang',
    phoneNumber: '0988123456',
    email: 'thuytrang.do@gmail.com',
  },
  {
    id: '55555555-0001-4000-8000-000000000001',
    fullName: 'Phạm Thị Mai Anh',
    phoneNumber: '0912345001',
    email: 'maianh.pham@gmail.com',
  },
  {
    id: '55555555-0002-4000-8000-000000000002',
    fullName: 'Vũ Thị Ngọc Ánh',
    phoneNumber: '0912345002',
    email: 'ngocanh.vu@gmail.com',
  },
  {
    id: '55555555-0003-4000-8000-000000000003',
    fullName: 'Hoàng Bích Phương',
    phoneNumber: '0912345003',
    email: 'bichphuong.hoang@gmail.com',
  },
  {
    id: '55555555-0004-4000-8000-000000000004',
    fullName: 'Đặng Thùy Dung',
    phoneNumber: '0912345004',
    email: 'thuydung.dang@gmail.com',
  },
  {
    id: '55555555-0005-4000-8000-000000000005',
    fullName: 'Dương Khánh Linh',
    phoneNumber: '0912345005',
    email: 'khanhlinh.duong@gmail.com',
  },
];

export const UNREGISTERED_PREGNANT_WOMEN: {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
}[] = [
  {
    id: '55555555-0001-4000-8000-000000000001',
    fullName: 'Phạm Thị Mai Anh',
    phoneNumber: '0912345001',
    email: 'maianh.pham@gmail.com',
  },
  {
    id: '55555555-0002-4000-8000-000000000002',
    fullName: 'Vũ Thị Ngọc Ánh',
    phoneNumber: '0912345002',
    email: 'ngocanh.vu@gmail.com',
  },
  {
    id: '55555555-0003-4000-8000-000000000003',
    fullName: 'Hoàng Bích Phương',
    phoneNumber: '0912345003',
    email: 'bichphuong.hoang@gmail.com',
  },
  {
    id: '55555555-0004-4000-8000-000000000004',
    fullName: 'Đặng Thùy Dung',
    phoneNumber: '0912345004',
    email: 'thuydung.dang@gmail.com',
  },
  {
    id: '55555555-0005-4000-8000-000000000005',
    fullName: 'Dương Khánh Linh',
    phoneNumber: '0912345005',
    email: 'khanhlinh.duong@gmail.com',
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
 * Bảng màu avatar hài hòa
 */
export const AVATAR_PALETTE = [
  { bg: '#CCFBF1', text: '#0F766E' }, // Teal
  { bg: '#EDE9FE', text: '#7C3AED' }, // Purple
  { bg: '#FEF3C7', text: '#D97706' }, // Amber
  { bg: '#FCE7F3', text: '#DB2777' }, // Pink
  { bg: '#E0E7FF', text: '#4338CA' }, // Indigo
  { bg: '#DCFCE7', text: '#15803D' }, // Green
  { bg: '#FFEDD5', text: '#C2410C' }, // Orange
  { bg: '#F3E8FF', text: '#6B21A8' }, // Violet
  { bg: '#CFFAFE', text: '#0E7490' }, // Cyan
  { bg: '#FEE2E2', text: '#B91C1C' }, // Rose
  { bg: '#E0F2FE', text: '#0369A1' }, // Sky
];

export function getAvatarColors(index: number): { bg: string; text: string } {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
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

