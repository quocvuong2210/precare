/**
 * Admin Domain Types - PreCare Clinical Platform
 * STORY: Quản trị hệ thống, Duyệt bác sĩ, Ánh xạ nhãn OCR và Audit Log
 */

export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';
export type UserStatus = 'active' | 'pending' | 'locked';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  phone_number?: string;
  is_active?: boolean; // Tương thích ngược với hệ thống
  created_at: string;
  hospital?: string;
  license_number?: string;
}

export type StandardBiomarkerMetric = 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';

export interface MappingItem {
  id: string;
  raw_label: string;
  sample_value: string;
  file_name: string;
  file_url?: string;
  detected_at: string;
  frequency: number;
  suggested_metric?: StandardBiomarkerMetric;
  mapped_to?: StandardBiomarkerMetric;
  status: 'pending' | 'mapped';
}

export type AuditActionType =
  | 'VIEW_PATIENT_RECORD'
  | 'APPROVE_DOCTOR'
  | 'LOCK_ACCOUNT'
  | 'UNLOCK_ACCOUNT'
  | 'MAP_OCR_DATA'
  | 'VERIFY_BIOMETRICS'
  | 'DELETE_REQUEST';

export interface AuditLog {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  action_type: AuditActionType;
  target_id: string;
  ip_address: string;
  details?: string;
}

export interface AdminDashboardKPI {
  pendingDoctorsCount: number;
  totalUsersCount: number;
  pendingMappingsCount: number;
  systemHealthStatus: string;
}

