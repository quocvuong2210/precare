import React, { useState, useEffect } from 'react';
import { UserTable } from '../../components/admin/UserTable';
import { adminMockService, AdminUserRecord } from '../../mocks/adminMockData';
import { UserRecord, UserStatus } from '../../types/userManagement.types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);

  useEffect(() => {
    adminMockService.getUsersByTab('all').then((records: AdminUserRecord[]) => {
      const mapped: UserRecord[] = records.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone_number: u.phone_number,
        created_at: u.created_at,
        wait_time: u.wait_time || '',
        status: (u.approval_status === 'pending'
          ? 'pending'
          : u.approval_status === 'active'
          ? 'active'
          : 'rejected') as UserStatus,
        role: u.role,
        is_active: u.is_active,
      }));
      setUsers(mapped);
    });
  }, []);

  return (
    <UserTable
      users={users as any}
      isLoading={false}
      onApproveDoctor={async () => {}}
      onToggleLock={async () => {}}
    />
  );
};

export default UserManagement;

