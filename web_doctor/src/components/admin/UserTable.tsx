import React, { useState } from 'react';
import {
  AdminUser,
  UserRole,
  UserStatus,
} from '../../types/admin.types';
import { StatusBadge } from './StatusBadge';
import {
  Search,
  Lock,
  Unlock,
  UserCheck,
  Stethoscope,
  Baby,
  ShieldCheck,
  X,
  Filter,
  Loader2,
  AlertOctagon,
} from 'lucide-react';

export interface UserTableProps {
  users: AdminUser[];
  isLoading: boolean;
  onApproveDoctor: (userId: string, userName: string) => Promise<void>;
  onToggleLock: (userId: string, userName: string, currentStatus: UserStatus) => Promise<void>;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  isLoading,
  onApproveDoctor,
  onToggleLock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | UserRole>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | UserStatus>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Lọc dữ liệu theo Search, Role, và Status
  const filteredUsers = users.filter((u) => {
    if (selectedRole !== 'all' && u.role !== selectedRole) return false;
    if (selectedStatus !== 'all' && u.status !== selectedStatus) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone_number && u.phone_number.includes(q))
    );
  });

  const handleApprove = async (user: AdminUser) => {
    setProcessingId(user.id);
    try {
      await onApproveDoctor(user.id, user.full_name);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleLock = async (user: AdminUser) => {
    setProcessingId(user.id);
    try {
      await onToggleLock(user.id, user.full_name, user.status);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingDoctorsCount = users.filter(
    (u) => u.role === 'doctor' && (u.status === 'pending' || u.is_active === false)
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header Bar: Search & Filters */}
      <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, email, số điện thoại..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#345C59]/20 focus:border-[#345C59] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Lọc theo Vai trò (Role) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">Vai trò:</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">Tất cả ({users.length})</option>
              <option value="doctor">Bác sĩ ({users.filter((u) => u.role === 'doctor').length})</option>
              <option value="pregnant_woman">
                Thai phụ ({users.filter((u) => u.role === 'pregnant_woman').length})
              </option>
              <option value="admin">Quản trị viên ({users.filter((u) => u.role === 'admin').length})</option>
            </select>
          </div>

          {/* Lọc theo Trạng thái (Status) */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Trạng thái:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer py-1"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động ({users.filter((u) => u.status === 'active').length})</option>
              <option value="pending">
                Chờ duyệt ({users.filter((u) => u.status === 'pending').length})
              </option>
              <option value="locked">Đã khóa ({users.filter((u) => u.status === 'locked').length})</option>
            </select>
          </div>

          {/* Quick Pending Filter Pill: WCAG High Contrast */}
          {pendingDoctorsCount > 0 && selectedStatus !== 'pending' && (
            <button
              onClick={() => {
                setSelectedRole('doctor');
                setSelectedStatus('pending');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-100 text-amber-950 border border-amber-300 hover:bg-amber-200 transition-colors cursor-pointer shadow-2xs"
            >
              <AlertOctagon className="w-3.5 h-3.5 fill-amber-500 text-white animate-pulse" />
              <span>Duyệt nhanh ({pendingDoctorsCount} BS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Họ tên & Đơn vị</th>
              <th className="py-3.5 px-4">Email & SĐT</th>
              <th className="py-3.5 px-4">Vai trò (Role)</th>
              <th className="py-3.5 px-4">Trạng thái (Status)</th>
              <th className="py-3.5 px-4">Ngày đăng ký</th>
              <th className="py-3.5 px-6 text-right w-36 whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>

          {isLoading ? (
            <tbody className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-36 bg-slate-200 rounded"></div>
                        <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4"><div className="h-3.5 w-36 bg-slate-200 rounded"></div></td>
                  <td className="py-4 px-4"><div className="h-5 w-20 bg-slate-200 rounded-full"></div></td>
                  <td className="py-4 px-4"><div className="h-5 w-24 bg-slate-200 rounded-full"></div></td>
                  <td className="py-4 px-4"><div className="h-3 w-20 bg-slate-200 rounded"></div></td>
                  <td className="py-4 px-6 text-right"><div className="h-8 w-28 bg-slate-200 rounded-xl ml-auto"></div></td>
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Không tìm thấy tài khoản nào khớp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isDoctor = user.role === 'doctor';
                  const isPendingDoctor = isDoctor && (user.status === 'pending' || user.is_active === false);
                  const isProcessing = processingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        isPendingDoctor ? 'bg-amber-50/30' : user.status === 'locked' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Họ Tên & Đơn vị */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                              isDoctor
                                ? 'bg-teal-600 text-white'
                                : user.role === 'admin'
                                ? 'bg-slate-800 text-white'
                                : 'bg-purple-600 text-white'
                            }`}
                          >
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.full_name}</span>
                              {user.role === 'admin' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                                  Root
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {user.hospital || (user.role === 'pregnant_woman' ? 'Bệnh nhân' : 'Hệ thống PreCare')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email & Số điện thoại */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{user.email}</div>
                        <div className="text-[11px] font-mono text-slate-500">{user.phone_number || '--'}</div>
                      </td>

                      {/* Vai trò (Role) - Solid Icons */}
                      <td className="py-3.5 px-4">
                        {user.role === 'doctor' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
                            <Stethoscope className="w-3 h-3 text-teal-700 stroke-[2.2]" />
                            Bác sĩ
                          </span>
                        )}
                        {user.role === 'pregnant_woman' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                            <Baby className="w-3 h-3 text-purple-700 stroke-[2.2]" />
                            Thai phụ
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            <ShieldCheck className="w-3 h-3 fill-slate-700 text-white" />
                            Quản trị
                          </span>
                        )}
                      </td>

                      {/* Trạng thái (Status) - Reusable StatusBadge with WCAG AAA Contrast */}
                      <td className="py-3.5 px-4">
                        <StatusBadge status={user.status} />
                      </td>

                      {/* Ngày đăng ký */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                        {user.created_at}
                      </td>

                      {/* Cột Thao tác (Actions) - Cố định kích thước w-28 h-8 cho toàn bộ nút để thẳng hàng */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          {user.role === 'admin' ? (
                            <div className="w-28 h-8 inline-flex items-center justify-center text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200/80 rounded-xl select-none">
                              Hệ thống
                            </div>
                          ) : isPendingDoctor ? (
                            /* Nút "Duyệt" - Cố định width w-28, có spinner và disabled khi loading */
                            <button
                              type="button"
                              onClick={() => handleApprove(user)}
                              disabled={isProcessing}
                              className="w-28 h-8 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white bg-[#345C59] hover:bg-[#2A4B48] active:scale-95 transition-all shadow-xs cursor-pointer hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                              title="Xét duyệt hồ sơ bác sĩ"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  <span>Đang duyệt</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5 text-white" />
                                  <span>Duyệt</span>
                                </>
                              )}
                            </button>
                          ) : user.status === 'active' ? (
                            /* Nút "Khóa" - Cố định width w-28, có spinner và disabled khi loading */
                            <button
                              type="button"
                              onClick={() => handleToggleLock(user)}
                              disabled={isProcessing}
                              className="w-28 h-8 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 hover:bg-rose-100 active:scale-95 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-2xs"
                              title="Khóa tài khoản này"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                  <span>Đang khóa</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 fill-rose-600 text-white" />
                                  <span>Khóa</span>
                                </>
                              )}
                            </button>
                          ) : user.status === 'locked' ? (
                            /* Nút "Mở khóa" - Cố định width w-28, có spinner và disabled khi loading */
                            <button
                              type="button"
                              onClick={() => handleToggleLock(user)}
                              disabled={isProcessing}
                              className="w-28 h-8 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200 active:scale-95 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-2xs"
                              title="Mở khóa tài khoản"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                                  <span>Đang mở</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5 fill-slate-700 text-white" />
                                  <span>Mở khóa</span>
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Hiển thị <strong>{filteredUsers.length}</strong> / {users.length} tài khoản người dùng
        </span>
        <span className="hidden sm:inline">
          Ràng buộc y tế: Bác sĩ mới đăng ký cần xét duyệt chứng chỉ trước khi xem bệnh án
        </span>
      </div>
    </div>
  );
};

export default UserTable;
