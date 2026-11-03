export type UserRole = 'doctor' | 'pregnant_woman' | 'admin';
export type UserStatus = 'pending' | 'active' | 'locked' | 'rejected';
export type UserManagementTab = 'all' | 'pending_doctors' | 'active_doctors' | 'pregnant_women';

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: string;
  wait_time: string;
  status: UserStatus;
  role: UserRole;
  is_active: boolean;
}

