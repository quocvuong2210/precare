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

const PATIENTS_STORAGE_KEY = 'precare_patients_list';

export function getStoredPatients(): PatientItem[] {
  return [];
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

