/**
 * Admin Service Module - PreCare
 * Chứa Mock Data và các API Mock Functions trả về Promise phục vụ UI hoạt động độc lập
 */

import {
  AdminUser,
  MappingItem,
  AuditLog,
  StandardBiomarkerMetric,
  UserRole,
  UserStatus,
} from '../types/admin.types';

// =========================================================================
// MOCK DATA STORE
// =========================================================================

let MOCK_USERS: AdminUser[] = [
  {
    id: 'usr-001',
    email: 'nguyentngoctram31@dtu.edu.vn',
    full_name: 'BS. CKI Nguyễn Thị Ngọc Trâm',
    role: 'doctor',
    status: 'pending', // Chờ Admin duyệt
    is_active: false,
    phone_number: '0905 123 456',
    created_at: '31/10/2026 09:30',
    hospital: 'Bệnh viện Phụ Sản - Nhi Đà Nẵng',
    license_number: 'CCHN-019842/BYT',
  },
  {
    id: 'usr-002',
    email: 'bacsi.tuantran@phusantw.org',
    full_name: 'BS. Trần Quốc Tuấn',
    role: 'doctor',
    status: 'active',
    is_active: true,
    phone_number: '0912 345 678',
    created_at: '15/09/2026 08:00',
    hospital: 'Bệnh viện Phụ Sản Trung Ương',
    license_number: 'CCHN-008124/BYT',
  },
  {
    id: 'usr-003',
    email: 'nguyenminhhoang@precare.vn',
    full_name: 'ThS. BS. Nguyễn Minh Hoàng',
    role: 'doctor',
    status: 'pending', // Bác sĩ thứ 2 chờ duyệt
    is_active: false,
    phone_number: '0988 776 655',
    created_at: '30/10/2026 14:15',
    hospital: 'Bệnh viện Từ Dũ',
    license_number: 'CCHN-032155/BYT',
  },
  {
    id: 'usr-004',
    email: 'bacsi.hoangmai@gmail.com',
    full_name: 'BS. Hoàng Thị Mai',
    role: 'doctor',
    status: 'locked', // Tài khoản bị khóa
    is_active: false,
    phone_number: '0977 112 233',
    created_at: '05/08/2026 10:20',
    hospital: 'Phòng khám Đa khoa Quốc tế',
    license_number: 'CCHN-004512/BYT',
  },
  {
    id: 'usr-005',
    email: 'minhanh.nguyen@gmail.com',
    full_name: 'Nguyễn Thị Minh Anh',
    role: 'pregnant_woman',
    status: 'active',
    is_active: true,
    phone_number: '0901 239 876',
    created_at: '20/10/2026 10:00',
  },
  {
    id: 'usr-006',
    email: 'thanhthao.pham@gmail.com',
    full_name: 'Phạm Thanh Thảo',
    role: 'pregnant_woman',
    status: 'active',
    is_active: true,
    phone_number: '0933 445 566',
    created_at: '22/10/2026 11:30',
  },
  {
    id: 'usr-007',
    email: 'hoanganh.le@gmail.com',
    full_name: 'Lê Hoàng Anh',
    role: 'pregnant_woman',
    status: 'active',
    is_active: true,
    phone_number: '0944 556 677',
    created_at: '25/10/2026 16:45',
  },
  {
    id: 'usr-008',
    email: 'admin@precare.vn',
    full_name: 'Quản trị viên Hệ thống',
    role: 'admin',
    status: 'active',
    is_active: true,
    phone_number: '0989 000 111',
    created_at: '01/01/2026 00:00',
  },
];

let MOCK_MAPPING_QUEUE: MappingItem[] = [
  {
    id: 'map-001',
    raw_label: 'ĐKLĐ',
    sample_value: '78.5 mm',
    file_name: 'Phieu_Sieu_Am_Q3_BVPSTW.pdf',
    detected_at: '31/10/2026 14:15',
    frequency: 14,
    suggested_metric: 'bpd',
    status: 'pending',
  },
  {
    id: 'map-002',
    raw_label: 'B.P.D',
    sample_value: '82.0 mm',
    file_name: 'Ket_Qua_Doppler_TuDu.pdf',
    detected_at: '31/10/2026 15:20',
    frequency: 9,
    suggested_metric: 'bpd',
    status: 'pending',
  },
  {
    id: 'map-003',
    raw_label: 'Vòng bụng',
    sample_value: '265.0 mm',
    file_name: 'Sieu_Am_Thai_30T_PKQT.pdf',
    detected_at: '31/10/2026 16:05',
    frequency: 22,
    suggested_metric: 'ac',
    status: 'pending',
  },
  {
    id: 'map-004',
    raw_label: 'CDXĐ',
    sample_value: '58.2 mm',
    file_name: 'Phieu_Do_Sinh_Trac_TamAnh.pdf',
    detected_at: '31/10/2026 16:40',
    frequency: 18,
    suggested_metric: 'fl',
    status: 'pending',
  },
  {
    id: 'map-005',
    raw_label: 'ĐK Lưỡng Đỉnh (BPD-Hadlock)',
    sample_value: '79.1 mm',
    file_name: 'Sieu_Am_4D_Vinmec.pdf',
    detected_at: '31/10/2026 17:10',
    frequency: 6,
    suggested_metric: 'bpd',
    status: 'pending',
  },
  {
    id: 'map-006',
    raw_label: 'Trọng lượng thai ước tính (EFW-AC/FL)',
    sample_value: '1650 g',
    file_name: 'Kham_Thai_Dinh_Ky_092.pdf',
    detected_at: '31/10/2026 17:35',
    frequency: 12,
    suggested_metric: 'efw',
    status: 'pending',
  },
];

let MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-001',
    timestamp: '31/10/2026 18:15:22',
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: 'Approved Doctor Account',
    action_type: 'APPROVE_DOCTOR',
    target_id: 'usr-002 (BS. Trần Quốc Tuấn)',
    ip_address: '113.190.23.44',
    details: 'Đã xác thực giấy phép hành nghề CCHN-008124/BYT',
  },
  {
    id: 'log-002',
    timestamp: '31/10/2026 17:45:10',
    actor_email: 'bacsi.tuantran@phusantw.org',
    actor_name: 'BS. Trần Quốc Tuấn',
    actor_role: 'doctor',
    action: 'Viewed Patient Record',
    action_type: 'VIEW_PATIENT_RECORD',
    target_id: 'PRE-8492 (Nguyễn Thị Minh Anh)',
    ip_address: '14.161.42.18',
    details: 'Xem hồ sơ theo dõi tăng trưởng thai nhi tuần 30',
  },
  {
    id: 'log-003',
    timestamp: '31/10/2026 17:12:05',
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: 'Mapped OCR Data',
    action_type: 'MAP_OCR_DATA',
    target_id: 'OCR-Label "CV.VÒNG ĐẦU" -> HC',
    ip_address: '113.190.23.44',
    details: 'Thiết lập quy tắc ánh xạ chuẩn hoá toàn cục cho máy GE Voluson E10',
  },
  {
    id: 'log-004',
    timestamp: '31/10/2026 16:30:18',
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: 'Locked Account',
    action_type: 'LOCK_ACCOUNT',
    target_id: 'usr-004 (BS. Hoàng Thị Mai)',
    ip_address: '113.190.23.44',
    details: 'Tạm dừng hoạt động theo yêu cầu kiểm tra chứng chỉ',
  },
  {
    id: 'log-005',
    timestamp: '31/10/2026 15:50:44',
    actor_email: 'bacsi.tuantran@phusantw.org',
    actor_name: 'BS. Trần Quốc Tuấn',
    actor_role: 'doctor',
    action: 'Verified Biometrics',
    action_type: 'VERIFY_BIOMETRICS',
    target_id: 'Record #302 (AC, FL, EFW)',
    ip_address: '14.161.42.18',
    details: 'Xác nhận thông số sinh trắc học bách phân vị Hadlock',
  },
  {
    id: 'log-006',
    timestamp: '31/10/2026 14:22:30',
    actor_email: 'minhanh.nguyen@gmail.com',
    actor_name: 'Nguyễn Thị Minh Anh',
    actor_role: 'pregnant_woman',
    action: 'Viewed Patient Record',
    action_type: 'VIEW_PATIENT_RECORD',
    target_id: 'PRE-8492 (Sổ theo dõi cá nhân)',
    ip_address: '27.72.105.90',
    details: 'Sản phụ xem biểu đồ tăng trưởng thai nhi',
  },
  {
    id: 'log-007',
    timestamp: '31/10/2026 11:15:00',
    actor_email: 'bacsi.tuantran@phusantw.org',
    actor_name: 'BS. Trần Quốc Tuấn',
    actor_role: 'doctor',
    action: 'Delete Request',
    action_type: 'DELETE_REQUEST',
    target_id: 'OCR Image #092 (Ảnh mờ)',
    ip_address: '14.161.42.18',
    details: 'Yêu cầu hủy tài liệu tải lên do lỗi quét độ phân giải thấp',
  },
];

// Helper delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// =========================================================================
// MOCK API FUNCTIONS
// =========================================================================

/**
 * 1. fetchUsers: Lấy danh sách người dùng có hỗ trợ lọc Role, Status và Search
 */
export async function fetchUsers(params?: {
  role?: string;
  status?: string;
  search?: string;
}): Promise<AdminUser[]> {
  await delay(350);

  let result = [...MOCK_USERS];

  if (params?.role && params.role !== 'all') {
    result = result.filter((u) => u.role === params.role);
  }

  if (params?.status && params.status !== 'all') {
    result = result.filter((u) => u.status === params.status);
  }

  if (params?.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    result = result.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone_number && u.phone_number.includes(q))
    );
  }

  return result;
}

/**
 * 2. approveDoctor: Phê duyệt bác sĩ từ pending -> active
 */
export async function approveDoctor(userId: string): Promise<AdminUser> {
  await delay(450);

  const userIndex = MOCK_USERS.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản người dùng');
  }

  const updatedUser: AdminUser = {
    ...MOCK_USERS[userIndex],
    status: 'active',
    is_active: true,
  };

  MOCK_USERS[userIndex] = updatedUser;

  // Tự động ghi vào Audit Log
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('vi-VN'),
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: 'Approved Doctor',
    action_type: 'APPROVE_DOCTOR',
    target_id: `${updatedUser.id} (${updatedUser.full_name})`,
    ip_address: '113.190.23.44',
    details: `Phê duyệt tài khoản bác sĩ thành công`,
  };

  MOCK_AUDIT_LOGS = [newLog, ...MOCK_AUDIT_LOGS];

  return updatedUser;
}

/**
 * 3. toggleUserLock: Khóa hoặc Mở khóa tài khoản (active <-> locked)
 */
export async function toggleUserLock(userId: string): Promise<AdminUser> {
  await delay(400);

  const userIndex = MOCK_USERS.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    throw new Error('Không tìm thấy tài khoản người dùng');
  }

  const current = MOCK_USERS[userIndex];
  const nextStatus: UserStatus = current.status === 'locked' ? 'active' : 'locked';

  const updatedUser: AdminUser = {
    ...current,
    status: nextStatus,
    is_active: nextStatus === 'active',
  };

  MOCK_USERS[userIndex] = updatedUser;

  // Ghi Audit Log
  const actionName = nextStatus === 'locked' ? 'Locked Account' : 'Unlocked Account';
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('vi-VN'),
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: actionName,
    action_type: nextStatus === 'locked' ? 'LOCK_ACCOUNT' : 'UNLOCK_ACCOUNT',
    target_id: `${updatedUser.id} (${updatedUser.full_name})`,
    ip_address: '113.190.23.44',
    details: `Trạng thái mới: ${nextStatus.toUpperCase()}`,
  };

  MOCK_AUDIT_LOGS = [newLog, ...MOCK_AUDIT_LOGS];

  return updatedUser;
}

/**
 * 4. fetchMappingQueue: Lấy hàng đợi các nhãn siêu âm lạ chưa được ánh xạ
 */
export async function fetchMappingQueue(): Promise<MappingItem[]> {
  await delay(300);
  return [...MOCK_MAPPING_QUEUE];
}

/**
 * 5. confirmMapping: Xác nhận ánh xạ nhãn lạ sang 1 trong 5 chỉ số chuẩn và xóa khỏi hàng đợi
 */
export async function confirmMapping(
  itemId: string,
  targetMetric: StandardBiomarkerMetric
): Promise<void> {
  await delay(450);

  const item = MOCK_MAPPING_QUEUE.find((m) => m.id === itemId);
  if (!item) {
    throw new Error('Nhãn cần ánh xạ không tồn tại');
  }

  // Xóa khỏi hàng đợi sau khi đã map thành công
  MOCK_MAPPING_QUEUE = MOCK_MAPPING_QUEUE.filter((m) => m.id !== itemId);

  // Ghi Audit Log
  const newLog: AuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toLocaleString('vi-VN'),
    actor_email: 'admin@precare.vn',
    actor_name: 'Quản trị viên Hệ thống',
    actor_role: 'admin',
    action: 'Mapped OCR Data',
    action_type: 'MAP_OCR_DATA',
    target_id: `"${item.raw_label}" -> ${targetMetric.toUpperCase()}`,
    ip_address: '113.190.23.44',
    details: `Tập tin nguồn: ${item.file_name}`,
  };

  MOCK_AUDIT_LOGS = [newLog, ...MOCK_AUDIT_LOGS];
}

/**
 * 6. fetchAuditLogs: Lấy danh sách nhật ký hệ thống kèm phân trang
 */
export async function fetchAuditLogs(
  page: number = 1,
  pageSize: number = 5
): Promise<{ data: AuditLog[]; total: number; page: number; pageSize: number }> {
  await delay(300);

  const total = MOCK_AUDIT_LOGS.length;
  const startIndex = (page - 1) * pageSize;
  const paginatedData = MOCK_AUDIT_LOGS.slice(startIndex, startIndex + pageSize);

  return {
    data: paginatedData,
    total,
    page,
    pageSize,
  };
}

/**
 * 7. fetchSystemHealth: Trạng thái microservices & Hadlock/RACA-Net
 */
export async function fetchSystemHealth(): Promise<{
  gatewayStatus: 'healthy' | 'degraded' | 'offline';
  analysisStatus: 'healthy' | 'degraded' | 'offline';
  ruleVersion: string;
  modelVersion: string;
  activeServices: number;
  totalServices: number;
  lastChecked: string;
}> {
  await delay(250);
  return {
    gatewayStatus: 'healthy',
    analysisStatus: 'healthy',
    ruleVersion: 'Hadlock-ACOG-v1.0',
    modelVersion: 'RACA-Net-ResNet50-v1.2',
    activeServices: 2,
    totalServices: 2,
    lastChecked: new Date().toLocaleTimeString('vi-VN'),
  };
}

// Re-export type definitions for convenience
export * from '../types/admin.types';
