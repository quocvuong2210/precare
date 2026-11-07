export type AuditRole = 'Tất cả vai trò' | 'Bác sĩ' | 'Quản trị viên';
export type AuditAction = 'Tất cả' | 'Chạy dự đoán' | 'Chỉnh sửa OCR' | 'Xem hồ sơ';
export type AuditResult = 'Tất cả' | 'Thành công' | 'Chưa có kết quả';

export interface AuditLogItem {
  id: string;
  date: string;
  time: string;
  actor_name: string;
  actor_initials: string;
  role: 'Bác sĩ' | 'Quản trị viên';
  action: 'Chạy dự đoán' | 'Chỉnh sửa OCR' | 'Xem hồ sơ';
  target_id: string;
  result: string;
  model_version?: string;
  rules_version?: string;
  alert_level?: string;
  has_result_data?: boolean;
}

