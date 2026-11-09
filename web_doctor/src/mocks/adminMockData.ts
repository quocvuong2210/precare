export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';
export type WarningLevel = 'green' | 'yellow' | 'red';
export type ApprovalStatus = 'pending' | 'active' | 'rejected';
export type AuditActionType =
  | 'RUN_PREDICTION'
  | 'OCR_EDIT'
  | 'VIEW_RECORD'
  | 'APPROVE_DOCTOR'
  | 'REJECT_DOCTOR'
  | 'REGISTER_USER'
  | 'LOGIN'
  | 'LOCK_ACCOUNT';

export interface AdminUserRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
  approval_status: ApprovalStatus;
  created_at: string;
  wait_time?: string;
  hospital?: string;
  license_number?: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  actor_name: string;
  actor_initials: string;
  role: string;
  action: string;
  action_type: AuditActionType;
  target_id: string;
  result: string;
  model_version?: string;
  rules_version?: string;
  alert_level?: string;
}

export interface SystemKpiSummary {
  totalPregnantWomen: number;
  totalFacilities: number;
  totalDoctors: number;
  activeDoctors: number;
  totalUsers: number;
  pendingOcrFiles: number;
  readyToMapOcrFiles: number;
  pendingDoctors?: number;
  pendingDoctorsOver24h?: number;
}

export interface WarningDistributionItem {
  level: WarningLevel;
  label: string;
  description: string;
  count: number;
  percentage: number;
  colorHex: string;
}

export interface WarningDistributionSummary {
  totalAnalyzed: number;
  breakdown: WarningDistributionItem[];
}

export interface PendingActionTask {
  id: string;
  type: 'doctor_approval' | 'ocr_fix' | 'ocr_failed' | 'ocr_ready' | 'audit_check';
  title: string;
  subtitle: string;
  actionText: string;
  targetTab: string;
}

export interface DashboardOverviewResponse {
  kpis: SystemKpiSummary;
  warningDistribution: WarningDistributionSummary;
  pendingTasks: PendingActionTask[];
  lastUpdated: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone_number: string;
  password?: string;
  role: UserRole;
  hospital?: string;
  license_number?: string;
}

export interface MockPregnantWoman {
  id: string;
  fullName: string;
  facilityId: string;
  facilityName: string;
  gestationalAgeWeeks: number;
  createdAt: string;
}

export interface MockUploadedFile {
  id: string;
  fileName: string;
  patientId: string;
  status: 'pending' | 'ready_to_map' | 'mapped' | 'failed' | 'processed';
  uploadedAt: string;
}

export interface MockAnalysisResult {
  id: string;
  patientId: string;
  warningLevel: 'green' | 'yellow' | 'red';
  analyzedAt: string;
  modelVersion: string;
}

export const MOCK_FACILITIES = [
  { id: 'fac-1', name: 'Bệnh viện Phụ sản Trung ương' },
  { id: 'fac-2', name: 'Bệnh viện Từ Dũ' },
  { id: 'fac-3', name: 'Bệnh viện Phụ sản Hà Nội' },
  { id: 'fac-4', name: 'Bệnh viện Hùng Vương' },
  { id: 'fac-5', name: 'Bệnh viện Đại học Y Dược' },
  { id: 'fac-6', name: 'Bệnh viện Bạch Mai - Khoa Sản' },
  { id: 'fac-7', name: 'Bệnh viện Chợ Rẫy' },
  { id: 'fac-8', name: 'Bệnh viện Đa khoa Quốc tế Vinmec' },
  { id: 'fac-9', name: 'Bệnh viện Phụ sản Nhi Đà Nẵng' },
  { id: 'fac-10', name: 'Bệnh viện Phụ sản Cần Thơ' },
  { id: 'fac-11', name: 'Bệnh viện Đa khoa Trung ương Huế' },
  { id: 'fac-12', name: 'Bệnh viện Sản Nhi Nghệ An' },
];

/**
 * 1. Bảng giả lập Thai phụ (pregnancy_profiles / users role pregnant_woman)
 * Số lượng thai phụ được tính từ mockPregnantWomen.length
 */
export const mockPregnantWomen: MockPregnantWoman[] = Array.from({ length: 1248 }, (_, i) => {
  const fac = MOCK_FACILITIES[i % MOCK_FACILITIES.length];
  return {
    id: `pw-${1000 + i}`,
    fullName: `Thai phụ ${i + 1}`,
    facilityId: fac.id,
    facilityName: fac.name,
    gestationalAgeWeeks: 12 + (i % 28),
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
  };
});

/**
 * 2. Bảng giả lập Tệp tải lên (uploaded_files)
 * Chứa các tệp ở trạng thái 'pending' (chờ xử lý), 'ready_to_map', 'failed', 'processed'
 */
export const mockUploadedFiles: MockUploadedFile[] = [
  ...Array.from({ length: 28 }, (_, i) => ({
    id: `file-pending-${i + 1}`,
    fileName: `ultrasound_scan_${i + 1}.pdf`,
    patientId: `pw-${1000 + i}`,
    status: 'pending' as const,
    uploadedAt: '31/10/2026 14:00',
  })),
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `file-ready-${i + 1}`,
    fileName: `ocr_report_ready_${i + 1}.png`,
    patientId: `pw-${1030 + i}`,
    status: 'ready_to_map' as const,
    uploadedAt: '31/10/2026 15:30',
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `file-failed-${i + 1}`,
    fileName: `ocr_error_scan_${i + 1}.pdf`,
    patientId: `pw-${1040 + i}`,
    status: 'failed' as const,
    uploadedAt: '30/10/2026 09:15',
  })),
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `file-done-${i + 1}`,
    fileName: `completed_doc_${i + 1}.pdf`,
    patientId: `pw-${1050 + i}`,
    status: 'processed' as const,
    uploadedAt: '29/10/2026 10:00',
  })),
];

/**
 * 3. Bảng giả lập Kết quả phân tích (analysis_results)
 * Phân bổ mức cảnh báo lâm sàng được tính toán trực tiếp từ mảng này
 */
export const mockAnalysisResults: MockAnalysisResult[] = [
  ...Array.from({ length: 936 }, (_, i) => ({
    id: `res-green-${i + 1}`,
    patientId: `pw-${1000 + i}`,
    warningLevel: 'green' as const,
    analyzedAt: '01/11/2026',
    modelVersion: 'RACA-Net-ResNet50-v1.2',
  })),
  ...Array.from({ length: 250 }, (_, i) => ({
    id: `res-yellow-${i + 1}`,
    patientId: `pw-${1936 + i}`,
    warningLevel: 'yellow' as const,
    analyzedAt: '01/11/2026',
    modelVersion: 'RACA-Net-ResNet50-v1.2',
  })),
  ...Array.from({ length: 62 }, (_, i) => ({
    id: `res-red-${i + 1}`,
    patientId: `pw-${2186 + i}`,
    warningLevel: 'red' as const,
    analyzedAt: '01/11/2026',
    modelVersion: 'RACA-Net-ResNet50-v1.2',
  })),
];

export const INITIAL_ADMIN_USERS: AdminUserRecord[] = [
  // 12 Bác sĩ chờ duyệt (7 Bác sĩ đầu tiên khớp 100% ảnh thiết kế)
  {
    id: 'doc-001',
    full_name: 'BS. Maya Patel',
    email: 'maya.patel@example.org',
    phone_number: '+1 (415) 555-0124',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '31/10/2026 16:42',
    wait_time: 'Khoảng 1 ngày',
    hospital: 'Bệnh viện Đa khoa Quốc tế',
    license_number: 'CCHN-09412/BYT',
  },
  {
    id: 'doc-002',
    full_name: 'BS. James Chen',
    email: 'james.chen@example.org',
    phone_number: '+1 (415) 555-0186',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '31/10/2026 14:28',
    wait_time: 'Khoảng 1 ngày',
    hospital: 'Bệnh viện Phụ sản - Nhi',
    license_number: 'CCHN-09413/BYT',
  },
  {
    id: 'doc-003',
    full_name: 'BS. Sofia Martinez',
    email: 'sofia.m@example.org',
    phone_number: '+1 (628) 555-0147',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '31/10/2026 11:16',
    wait_time: 'Khoảng 1 ngày',
    hospital: 'Bệnh viện Đại học Y Dược',
    license_number: 'CCHN-09414/BYT',
  },
  {
    id: 'doc-004',
    full_name: 'BS. Noah Williams',
    email: 'noah.w@example.org',
    phone_number: '+1 (628) 555-0193',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '30/10/2026 17:54',
    wait_time: 'Khoảng 2 ngày',
    hospital: 'Trung tâm Chăm sóc Sức khỏe Bà mẹ',
    license_number: 'CCHN-09415/BYT',
  },
  {
    id: 'doc-005',
    full_name: 'BS. Aisha Hassan',
    email: 'aisha.h@example.org',
    phone_number: '+1 (415) 555-0162',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '30/10/2026 13:05',
    wait_time: 'Khoảng 2 ngày',
    hospital: 'Phòng khám Sản Phụ khoa An Sinh',
    license_number: 'CCHN-09416/BYT',
  },
  {
    id: 'doc-006',
    full_name: 'BS. Oliver Reed',
    email: 'oliver.reed@example.org',
    phone_number: '+1 (850) 555-0178',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '30/10/2026 10:31',
    wait_time: 'Khoảng 2 ngày',
    hospital: 'Bệnh viện Phụ sản Trung ương',
    license_number: 'CCHN-09417/BYT',
  },
  {
    id: 'doc-007',
    full_name: 'BS. Emily Park',
    email: 'emily.park@example.org',
    phone_number: '+1 (650) 555-0119',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '29/10/2026 15:47',
    wait_time: 'Khoảng 3 ngày',
    hospital: 'Bệnh viện Đa khoa Hoàn Mỹ',
    license_number: 'CCHN-09418/BYT',
  },
  {
    id: 'doc-008',
    full_name: 'BS. Lucas Vance',
    email: 'lucas.vance@example.org',
    phone_number: '+1 (415) 555-0199',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '29/10/2026 11:20',
    wait_time: 'Khoảng 3 ngày',
    hospital: 'Bệnh viện Quốc tế Hạnh Phúc',
    license_number: 'CCHN-09419/BYT',
  },
  {
    id: 'doc-009',
    full_name: 'BS. Hannah Lee',
    email: 'hannah.lee@example.org',
    phone_number: '+1 (628) 555-0133',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '28/10/2026 14:10',
    wait_time: 'Khoảng 4 ngày',
    hospital: 'Bệnh viện Từ Dũ',
    license_number: 'CCHN-09420/BYT',
  },
  {
    id: 'doc-010',
    full_name: 'BS. David Miller',
    email: 'david.m@example.org',
    phone_number: '+1 (850) 555-0144',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '28/10/2026 09:15',
    wait_time: 'Khoảng 4 ngày',
    hospital: 'Bệnh viện Hùng Vương',
    license_number: 'CCHN-09421/BYT',
  },
  {
    id: 'doc-011',
    full_name: 'BS. Chloe Dubois',
    email: 'chloe.d@example.org',
    phone_number: '+1 (650) 555-0188',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '27/10/2026 16:30',
    wait_time: 'Khoảng 5 ngày',
    hospital: 'Bệnh viện Đa khoa Tâm Anh',
    license_number: 'CCHN-09422/BYT',
  },
  {
    id: 'doc-012',
    full_name: 'BS. Benjamin Scott',
    email: 'ben.scott@example.org',
    phone_number: '+1 (415) 555-0177',
    role: 'doctor',
    is_active: false,
    approval_status: 'pending',
    created_at: '27/10/2026 10:05',
    wait_time: 'Khoảng 5 ngày',
    hospital: 'Bệnh viện Bạch Mai',
    license_number: 'CCHN-09423/BYT',
  },

  // Bác sĩ đã kích hoạt
  {
    id: 'doc-101',
    full_name: 'BS. Lena Ortiz',
    email: 'lena.ortiz@precare.health',
    phone_number: '+1 (415) 555-0211',
    role: 'doctor',
    is_active: true,
    approval_status: 'active',
    created_at: '15/08/2026 08:30',
    wait_time: 'Đã duyệt',
    hospital: 'Bệnh viện Phụ sản - Nhi',
    license_number: 'CCHN-08112/BYT',
  },
  {
    id: 'doc-102',
    full_name: 'BS. Daniel Kim',
    email: 'daniel.kim@precare.health',
    phone_number: '+1 (415) 555-0212',
    role: 'doctor',
    is_active: true,
    approval_status: 'active',
    created_at: '20/08/2026 09:15',
    wait_time: 'Đã duyệt',
    hospital: 'Bệnh viện Đa khoa Quốc tế',
    license_number: 'CCHN-08113/BYT',
  },
  {
    id: 'doc-103',
    full_name: 'BS. Priya Shah',
    email: 'priya.shah@precare.health',
    phone_number: '+1 (415) 555-0213',
    role: 'doctor',
    is_active: true,
    approval_status: 'active',
    created_at: '25/08/2026 10:45',
    wait_time: 'Đã duyệt',
    hospital: 'Bệnh viện Đại học Y Dược',
    license_number: 'CCHN-08114/BYT',
  },

  // Phụ nữ mang thai
  {
    id: 'preg-001',
    full_name: 'Nguyễn Thị Thu Hà',
    email: 'thuha.nguyen@gmail.com',
    phone_number: '+84 (098) 765-4321',
    role: 'pregnant_woman',
    is_active: true,
    approval_status: 'active',
    created_at: '10/10/2026 14:00',
    wait_time: 'Không yêu cầu',
  },
  {
    id: 'preg-002',
    full_name: 'Phạm Thị Lan',
    email: 'lan.pham@gmail.com',
    phone_number: '+84 (097) 112-2334',
    role: 'pregnant_woman',
    is_active: true,
    approval_status: 'active',
    created_at: '18/10/2026 11:20',
    wait_time: 'Không yêu cầu',
  },
  {
    id: 'preg-003',
    full_name: 'Trần Mỹ Duyên',
    email: 'myduyen.tran@gmail.com',
    phone_number: '+84 (090) 887-6543',
    role: 'pregnant_woman',
    is_active: true,
    approval_status: 'active',
    created_at: '22/10/2026 15:40',
    wait_time: 'Không yêu cầu',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'log-248',
    timestamp: '2026-11-01T09:41:52Z',
    date: '01/11/2026',
    time: '09:41:52 UTC',
    actor_name: 'BS. Lena Ortiz',
    actor_initials: 'LO',
    role: 'Bác sĩ',
    action: 'Chạy dự đoán',
    action_type: 'RUN_PREDICTION',
    target_id: 'CHK-260184',
    result: '—',
    model_version: 'RACA-Net-ResNet50-v1.2',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
  {
    id: 'log-247',
    timestamp: '2026-11-01T09:39:08Z',
    date: '01/11/2026',
    time: '09:39:08 UTC',
    actor_name: 'Alex Morgan',
    actor_initials: 'AM',
    role: 'Quản trị viên',
    action: 'Chỉnh sửa OCR',
    action_type: 'OCR_EDIT',
    target_id: 'CHK-260183',
    result: '—',
    model_version: 'OCR-Vietnamese-v2.1',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
  {
    id: 'log-246',
    timestamp: '2026-11-01T09:36:44Z',
    date: '01/11/2026',
    time: '09:36:44 UTC',
    actor_name: 'BS. Daniel Kim',
    actor_initials: 'DK',
    role: 'Bác sĩ',
    action: 'Xem hồ sơ',
    action_type: 'VIEW_RECORD',
    target_id: 'CHK-260182',
    result: '—',
    model_version: '—',
    rules_version: '—',
    alert_level: '—',
  },
  {
    id: 'log-245',
    timestamp: '2026-11-01T09:34:17Z',
    date: '01/11/2026',
    time: '09:34:17 UTC',
    actor_name: 'BS. Lena Ortiz',
    actor_initials: 'LO',
    role: 'Bác sĩ',
    action: 'Chạy dự đoán',
    action_type: 'RUN_PREDICTION',
    target_id: 'CHK-260181',
    result: '—',
    model_version: 'RACA-Net-ResNet50-v1.2',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
  {
    id: 'log-244',
    timestamp: '2026-11-01T09:31:55Z',
    date: '01/11/2026',
    time: '09:31:55 UTC',
    actor_name: 'Alex Morgan',
    actor_initials: 'AM',
    role: 'Quản trị viên',
    action: 'Chỉnh sửa OCR',
    action_type: 'OCR_EDIT',
    target_id: 'CHK-260180',
    result: '—',
    model_version: 'OCR-Vietnamese-v2.1',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
  {
    id: 'log-243',
    timestamp: '2026-11-01T09:28:31Z',
    date: '01/11/2026',
    time: '09:28:31 UTC',
    actor_name: 'BS. Priya Shah',
    actor_initials: 'PS',
    role: 'Bác sĩ',
    action: 'Chạy dự đoán',
    action_type: 'RUN_PREDICTION',
    target_id: 'CHK-260179',
    result: '—',
    model_version: 'RACA-Net-ResNet50-v1.2',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
  {
    id: 'log-242',
    timestamp: '2026-11-01T09:25:02Z',
    date: '01/11/2026',
    time: '09:25:02 UTC',
    actor_name: 'BS. Daniel Kim',
    actor_initials: 'DK',
    role: 'Bác sĩ',
    action: 'Xem hồ sơ',
    action_type: 'VIEW_RECORD',
    target_id: 'CHK-260178',
    result: '—',
    model_version: '—',
    rules_version: '—',
    alert_level: '—',
  },
  {
    id: 'log-241',
    timestamp: '2026-11-01T09:21:46Z',
    date: '01/11/2026',
    time: '09:21:46 UTC',
    actor_name: 'BS. Priya Shah',
    actor_initials: 'PS',
    role: 'Bác sĩ',
    action: 'Chạy dự đoán',
    action_type: 'RUN_PREDICTION',
    target_id: 'CHK-260177',
    result: '—',
    model_version: 'RACA-Net-ResNet50-v1.2',
    rules_version: 'Hadlock-ACOG-v1.0',
    alert_level: '—',
  },
];

let inMemoryUsers: AdminUserRecord[] = [...INITIAL_ADMIN_USERS];
let inMemoryLogs: AuditLogRecord[] = [...INITIAL_AUDIT_LOGS];

/**
 * Hàm tính toán tổng quan Dashboard từ các mảng dữ liệu (No Hardcoding)
 */
export const calculateDashboardOverview = (): DashboardOverviewResponse => {
  // 1. Tổng số thai phụ lấy từ mockPregnantWomen.length
  const totalPregnantWomen = mockPregnantWomen.length;
  // Số cơ sở y tế lấy từ số lượng facilityId duy nhất trong danh sách thai phụ
  const totalFacilities = new Set(mockPregnantWomen.map((p) => p.facilityId)).size;

  // 2. Thống kê Bác sĩ & Người dùng từ mockUsers (inMemoryUsers)
  const totalDoctors = inMemoryUsers.filter((u) => u.role === 'doctor').length;
  const activeDoctors = inMemoryUsers.filter((u) => u.role === 'doctor' && u.is_active).length;
  const totalUsers = inMemoryUsers.length;
  const pendingDoctors = inMemoryUsers.filter(
    (u) => u.role === 'doctor' && (u.approval_status === 'pending' || (u as any).status === 'pending')
  ).length;
  const pendingDoctorsOver24h = inMemoryUsers.filter(
    (u) =>
      u.role === 'doctor' &&
      (u.approval_status === 'pending' || (u as any).status === 'pending') &&
      (u.wait_time?.includes('ngày') || u.wait_time?.includes('24'))
  ).length;

  // 3. Số Tệp OCR chờ xử lý tính từ mockUploadedFiles
  const pendingOcrFiles = mockUploadedFiles.filter((f) => f.status === 'pending').length;
  const readyToMapOcrFiles = mockUploadedFiles.filter((f) => f.status === 'ready_to_map').length;
  const failedOcrFiles = mockUploadedFiles.filter((f) => f.status === 'failed').length;

  // 4. Phân bổ mức cảnh báo tính toán phần trăm từ mockAnalysisResults
  const totalAnalyzed = mockAnalysisResults.length;
  const greenCount = mockAnalysisResults.filter((r) => r.warningLevel === 'green').length;
  const yellowCount = mockAnalysisResults.filter((r) => r.warningLevel === 'yellow').length;
  const redCount = mockAnalysisResults.filter((r) => r.warningLevel === 'red').length;

  const greenPercentage = totalAnalyzed > 0 ? Math.round((greenCount / totalAnalyzed) * 100) : 0;
  const yellowPercentage = totalAnalyzed > 0 ? Math.round((yellowCount / totalAnalyzed) * 100) : 0;
  const redPercentage =
    totalAnalyzed > 0 ? Math.max(0, 100 - greenPercentage - yellowPercentage) : 0;

  return {
    kpis: {
      totalPregnantWomen,
      totalFacilities,
      totalDoctors,
      activeDoctors,
      totalUsers,
      pendingDoctors,
      pendingDoctorsOver24h,
      pendingOcrFiles,
      readyToMapOcrFiles,
    },
    warningDistribution: {
      totalAnalyzed,
      breakdown: [
        {
          level: 'green',
          label: 'Xanh',
          description: 'Theo dõi thường xuyên',
          count: greenCount,
          percentage: greenPercentage,
          colorHex: '#10B981',
        },
        {
          level: 'yellow',
          label: 'Vàng',
          description: 'Đề xuất theo dõi thêm',
          count: yellowCount,
          percentage: yellowPercentage,
          colorHex: '#F59E0B',
        },
        {
          level: 'red',
          label: 'Đỏ',
          description: 'Cần xem xét lâm sàng',
          count: redCount,
          percentage: redPercentage,
          colorHex: '#EF4444',
        },
      ],
    },
    pendingTasks: [
      {
        id: 'task-01',
        type: 'ocr_fix',
        title: 'Sửa lỗi trích xuất OCR',
        subtitle: `${failedOcrFiles} tệp trích xuất cần kiểm tra lại`,
        actionText: 'Mở hàng đợi ánh xạ →',
        targetTab: 'ocr',
      },
      {
        id: 'task-02',
        type: 'ocr_ready',
        title: 'Ánh xạ nhãn sinh trắc học',
        subtitle: `${readyToMapOcrFiles} tệp sẵn sàng ánh xạ chuẩn hóa`,
        actionText: 'Xem danh sách ánh xạ →',
        targetTab: 'ocr',
      },
      {
        id: 'task-03',
        type: 'audit_check',
        title: 'Giám sát an toàn hệ thống',
        subtitle: 'Kiểm tra nhật ký thao tác và truy cập gần nhất',
        actionText: 'Xem nhật ký kiểm toán →',
        targetTab: 'logs',
      },
    ],
    lastUpdated: '01/11/2026 - UTC',
  };
};

export const INITIAL_SYSTEM_KPIS: SystemKpiSummary = {
  get totalPregnantWomen() { return mockPregnantWomen.length; },
  get totalFacilities() { return new Set(mockPregnantWomen.map((p) => p.facilityId)).size; },
  get totalDoctors() { return inMemoryUsers.filter((u) => u.role === 'doctor').length; },
  get activeDoctors() { return inMemoryUsers.filter((u) => u.role === 'doctor' && u.is_active).length; },
  get totalUsers() { return inMemoryUsers.length; },
  get pendingOcrFiles() { return mockUploadedFiles.filter((f) => f.status === 'pending').length; },
  get readyToMapOcrFiles() { return mockUploadedFiles.filter((f) => f.status === 'ready_to_map').length; },
};

export const INITIAL_WARNING_DISTRIBUTION: WarningDistributionSummary = {
  get totalAnalyzed() { return mockAnalysisResults.length; },
  get breakdown() {
    return calculateDashboardOverview().warningDistribution.breakdown;
  },
};

export const INITIAL_PENDING_TASKS: PendingActionTask[] = [
  {
    id: 'task-01',
    type: 'ocr_fix',
    title: 'Sửa lỗi OCR',
    subtitle: 'Tệp trích xuất thất bại cần kiểm tra lại',
    actionText: 'Mở hàng đợi ánh xạ →',
    targetTab: 'ocr',
  },
  {
    id: 'task-02',
    type: 'ocr_ready',
    title: 'Ánh xạ nhãn sinh trắc học',
    subtitle: 'Tệp sẵn sàng ánh xạ chuẩn hóa',
    actionText: 'Xem danh sách ánh xạ →',
    targetTab: 'ocr',
  },
  {
    id: 'task-03',
    type: 'audit_check',
    title: 'Giám sát an toàn hệ thống',
    subtitle: 'Kiểm tra nhật ký thao tác gần nhất',
    actionText: 'Xem nhật ký kiểm toán →',
    targetTab: 'logs',
  },
];


const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const adminMockService = {
  async getDashboardOverview(): Promise<DashboardOverviewResponse> {
    await delay(350);
    return calculateDashboardOverview();
  },

  async getUsersByTab(
    tab: 'all' | 'pending_doctors' | 'active_doctors' | 'pregnant_women'
  ): Promise<AdminUserRecord[]> {
    await delay(400);
    switch (tab) {
      case 'pending_doctors':
        return inMemoryUsers.filter(
          (user) => user.role === 'doctor' && user.approval_status === 'pending'
        );
      case 'active_doctors':
        return inMemoryUsers.filter(
          (user) => user.role === 'doctor' && user.approval_status === 'active'
        );
      case 'pregnant_women':
        return inMemoryUsers.filter((user) => user.role === 'pregnant_woman');
      case 'all':
      default:
        return [...inMemoryUsers];
    }
  },

  async getAuditLogs(params?: {
    search?: string;
    role?: string;
    action?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: AuditLogRecord[]; total: number }> {
    await delay(450);
    let filtered = [...inMemoryLogs];

    if (params?.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (log) =>
          log.actor_name.toLowerCase().includes(q) ||
          log.target_id.toLowerCase().includes(q)
      );
    }

    if (params?.role && params.role !== 'Tất cả vai trò') {
      filtered = filtered.filter((log) => log.role === params.role);
    }

    if (params?.action && params.action !== 'Tất cả') {
      filtered = filtered.filter((log) => log.action === params.action);
    }

    const page = params?.page || 1;
    const pageSize = params?.pageSize || 8;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
      data,
      total: 248, // Số lượng sự kiện tổng thể chuẩn trong hệ thống
    };
  },

  async registerUser(payload: RegisterPayload): Promise<AdminUserRecord> {
    await delay(500);

    const isDuplicate = inMemoryUsers.some(
      (user) => user.email.toLowerCase() === payload.email.toLowerCase()
    );

    if (isDuplicate) {
      throw new Error(`Email "${payload.email}" đã được đăng ký trong hệ thống.`);
    }

    const newId = `usr-${Date.now().toString(36)}`;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(
      2,
      '0'
    )}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newUser: AdminUserRecord = {
      id: newId,
      full_name: payload.full_name,
      email: payload.email,
      phone_number: payload.phone_number,
      role: payload.role,
      is_active: payload.role === 'pregnant_woman',
      approval_status: payload.role === 'doctor' ? 'pending' : 'active',
      created_at: formattedDate,
      wait_time: payload.role === 'doctor' ? 'Vừa tạo' : 'Không yêu cầu',
      hospital: payload.hospital,
      license_number: payload.license_number,
    };

    inMemoryUsers = [newUser, ...inMemoryUsers];

    const newLog: AuditLogRecord = {
      id: `log-${Date.now().toString(36)}`,
      timestamp: now.toISOString(),
      date: `${String(now.getDate()).padStart(2, '0')}/${String(
        now.getMonth() + 1
      ).padStart(2, '0')}/${now.getFullYear()}`,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} UTC`,
      actor_name: payload.full_name,
      actor_initials: payload.full_name
        .split(' ')
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase(),
      role: payload.role === 'doctor' ? 'Bác sĩ' : 'Người dùng',
      action: 'Đăng ký tài khoản',
      action_type: 'REGISTER_USER',
      target_id: newId,
      result: 'Thành công',
    };

    inMemoryLogs = [newLog, ...inMemoryLogs];

    return newUser;
  },
};

