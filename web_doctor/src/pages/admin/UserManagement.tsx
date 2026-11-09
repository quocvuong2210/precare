import React, { useState, useEffect } from 'react';
import { UserTable } from '../../components/admin/UserTable';
import { adminMockService, AdminUserRecord } from '../../mocks/adminMockData';
import { UserRecord, UserStatus } from '../../types/userManagement.types';

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    adminMockService.getUsersByTab('all').then((records: AdminUserRecord[]) => {
      const mapped: UserRecord[] = records.map((u) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone_number: u.phone_number,
        created_at: u.created_at,
        wait_time: u.wait_time || '',
        status: (u.is_active ? 'active' : 'locked') as UserStatus,
        role: u.role,
        is_active: u.is_active,
      }));
      setUsers(mapped);
    });
  }, []);

  return (
    <div>
      {notification && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}
      <UserTable
        initialUsers={users.length > 0 ? users : undefined}
        onActionNotification={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 3000);
        }}
      />
    </div>
  );
};

export default UserManagement;

