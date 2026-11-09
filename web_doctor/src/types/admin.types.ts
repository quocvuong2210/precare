/**
 * Admin Domain Types - PreCare Clinical Platform
 * STORY: Quản trị hệ thống, Duyệt bác sĩ, Ánh xạ nhãn OCR và Audit Log
 */

export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';
export type UserStatus = 'active' | 'pending' | 'locked';
export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export interface DoctorProcessingLog {
  timestamp: string;
  action: string;
  actor: string;
  note?: string;
}

export interface DoctorProfile {
  license_number: string;
  hospital: string;
  department?: string;
  issue_date?: string;
  issue_place?: string;
  certificate_image_url?: string;
  email_verified: boolean;
  profile_status: ProfileStatus;
  rejection_reason?: string;
  approved_at?: string;
  approved_by?: string;
  processing_history?: DoctorProcessingLog[];
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: UserStatus;
  profile_status?: ProfileStatus; // 'pending' | 'approved' | 'rejected' (dành cho bác sĩ)
  phone_number?: string;
  is_active?: boolean; // Tương thích ngược với hệ thống
  created_at: string;
  email_verified: boolean; // Trạng thái xác minh email
  hospital?: string;
  license_number?: string;
  doctor_profile?: DoctorProfile;
  lock_reason?: string;
}

export type StandardBiomarkerMetric = 'bpd' | 'hc' | 'ac' | 'fl' | 'efw';

export interface MappingItem {
  id: string;
  raw_label: string;
  sample_value: string;
  unit?: string;
  file_name: string;
  file_url?: string;
  sample_image_url?: string;
  detected_at: string;
  frequency: number;
  suggested_metric?: StandardBiomarkerMetric;
  mapped_to?: StandardBiomarkerMetric;
  status: 'pending' | 'mapped';
  confidence?: number;
  machine_model?: string;
  patient_code?: string;
}

export type AuditActionType =
  | 'LOGIN'
  | 'VIEW_PATIENT_RECORD'
  | 'APPROVE_DOCTOR'
  | 'REJECT_DOCTOR'
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
  status?: 'SUCCESS' | 'FAILED';
  details?: string;
  reason?: string;
  user_agent?: string;
}

export interface AdminSummaryKPI {
  pendingDoctorsCount: number;
  totalUsersCount: number;
  lockedUsersCount: number;
  doctorCount: number;
  pregnantCount: number;
  pendingMappingsCount: number;
  confirmedMappingsTodayCount: number;
  highReviewMappingsCount: number;
  systemHealthStatus: string;
}
