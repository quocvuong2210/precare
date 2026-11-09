import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserRecord, UserManagementTab } from '../../types/userManagement.types';
import { MOCK_USER_RECORDS } from '../../services/userManagement.mock';

export interface UserTableProps {
  onActionNotification?: (msg: string) => void;
  initialUsers?: UserRecord[];
}

export const UserTable: React.FC<UserTableProps> = ({ onActionNotification, initialUsers }) => {
  const [users, setUsers] = useState<UserRecord[]>(
    initialUsers && initialUsers.length > 0 ? initialUsers : MOCK_USER_RECORDS
  );

  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);
  const [activeSubTab, setActiveSubTab] = useState<UserManagementTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 7;

  // State cho Modal Xem chi tiết
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Lọc dữ liệu theo Tab
  const tabFilteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (activeSubTab === 'active_doctors') {
        return user.role === 'doctor';
      }
      if (activeSubTab === 'pregnant_women') {
        return user.role === 'pregnant_woman';
      }
      return true; // 'all'
    });
  }, [users, activeSubTab]);

  // Lọc dữ liệu theo Ô tìm kiếm
  const searchedUsers = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredUsers;
    const q = searchQuery.toLowerCase().trim();
    return tabFilteredUsers.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone_number.toLowerCase().includes(q)
    );
  }, [tabFilteredUsers, searchQuery]);

  // Sắp xếp
  const sortedUsers = useMemo(() => {
    return [...searchedUsers].sort((a, b) => {
      // Giả lập sắp xếp theo ngày/giờ
      return sortOrder === 'desc'
        ? b.created_at.localeCompare(a.created_at)
        : a.created_at.localeCompare(b.created_at);
    });
  }, [searchedUsers, sortOrder]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedUsers.slice(start, start + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  const handleTabChange = (tab: UserManagementTab) => {
    setActiveSubTab(tab);
    setCurrentPage(1);
  };

  const handleToggleSort = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleToggleLock = (userId: string, name: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'locked' ? 'active' : 'locked';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus, is_active: nextStatus === 'active' } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser({ ...selectedUser, status: nextStatus, is_active: nextStatus === 'active' });
    }
    if (onActionNotification) {
      onActionNotification(
        nextStatus === 'locked'
          ? `Đã tạm khóa tài khoản của ${name}.`
          : `Đã kích hoạt lại tài khoản của ${name}.`
      );
    }
  };

  // Helper format ngày và giờ thành 2 dòng
  const formatDateTime = (dateTimeStr: string) => {
    const parts = dateTimeStr.split(' ');
    if (parts.length >= 2) {
      return { date: parts[0], time: parts[1] };
    }
    return { date: dateTimeStr, time: '' };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang Quản lý người dùng */}
      <div>
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý người dùng</h1>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            <span>{users.length} tài khoản người dùng</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi danh sách tài khoản, trạng thái hoạt động và phân quyền trong hệ thống PreCare.
        </p>
      </div>

      {/* 2. Khối Bảng dữ liệu (Card nền trắng, bo góc, viền mảnh) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Thanh Tabs 3 mục */}
        <div className="border-b border-slate-200/80 px-6 pt-3 flex gap-8 text-xs select-none overflow-x-auto">
          <button
            onClick={() => handleTabChange('all')}
            className={`pb-3 -mb-px font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'all'
                ? 'text-sky-600 font-semibold border-b-2 border-sky-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả người dùng ({users.length})
          </button>
          <button
            onClick={() => handleTabChange('active_doctors')}
            className={`pb-3 -mb-px font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'active_doctors'
                ? 'text-sky-600 font-semibold border-b-2 border-sky-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bác sĩ lâm sàng ({users.filter((u) => u.role === 'doctor').length})
          </button>
          <button
            onClick={() => handleTabChange('pregnant_women')}
            className={`pb-3 -mb-px font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeSubTab === 'pregnant_women'
                ? 'text-sky-600 font-semibold border-b-2 border-sky-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Phụ nữ mang thai ({users.filter((u) => u.role === 'pregnant_woman').length})
          </button>
        </div>

        {/* Thanh công cụ lọc (Filter bar) */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100">
          {/* Ô Input tìm kiếm */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm họ tên, email hoặc số điện thoại"
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900"
            />
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-xs text-slate-400 font-normal">Sắp xếp theo thời gian chờ duyệt</span>
            <button
              onClick={handleToggleSort}
              className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>{sortOrder === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}</span>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu (7 Cột) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[940px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-white">
                <th className="px-6 py-3.5 w-[200px] whitespace-nowrap">Họ và tên</th>
                <th className="px-6 py-3.5 w-[220px] whitespace-nowrap">Email</th>
                <th className="px-6 py-3.5 w-[160px] whitespace-nowrap">Số điện thoại</th>
                <th className="px-6 py-3.5 w-[130px] whitespace-nowrap">Ngày đăng ký</th>
                <th className="px-6 py-3.5 w-[160px] whitespace-nowrap">Vai trò</th>
                <th className="px-6 py-3.5 w-[120px] whitespace-nowrap">Trạng thái</th>
                <th className="px-6 py-3.5 w-[130px] whitespace-nowrap text-left">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                    Không tìm thấy người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const { date, time } = formatDateTime(user.created_at);
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Cột 1: Họ và tên */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-semibold text-slate-900">{user.full_name}</span>
                      </td>

                      {/* Cột 2: Email */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600">{user.email}</span>
                      </td>

                      {/* Cột 3: Số điện thoại */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600 font-mono tracking-tight">{user.phone_number}</span>
                      </td>

                      {/* Cột 4: Ngày đăng ký (2 dòng) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-slate-900 font-normal">{date}</div>
                        {time && <div className="text-[11px] text-slate-400 mt-0.5">{time}</div>}
                      </td>

                      {/* Cột 5: Vai trò */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-700">
                          {user.role === 'doctor'
                            ? 'Bác sĩ lâm sàng'
                            : user.role === 'admin'
                            ? 'Quản trị viên'
                            : 'Phụ nữ mang thai'}
                        </span>
                      </td>

                      {/* Cột 6: Trạng thái (Badge vàng nhạt, chữ cam đậm) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.status === 'pending' && (
                          <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                            Chờ duyệt
                          </span>
                        )}
                        {user.status === 'active' && (
                          <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Đã kích hoạt
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200/60">
                            Từ chối
                          </span>
                        )}
                        {user.status === 'locked' && (
                          <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                            Bị khóa
                          </span>
                        )}
                      </td>

                      {/* Cột 7: Hành động (Nút Xem chi tiết) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang ở đáy card */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            {sortedUsers.length > 0 ? (
              <span>
                Hiển thị {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, sortedUsers.length)} trên {sortedUsers.length}{' '}
                {activeSubTab === 'active_doctors'
                  ? 'bác sĩ lâm sàng'
                  : activeSubTab === 'pregnant_women'
                  ? 'phụ nữ mang thai'
                  : 'người dùng'}
              </span>
            ) : (
              <span>Không có bản ghi nào</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trước
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setCurrentPage(pageNumber)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                  currentPage === pageNumber
                    ? 'font-semibold bg-sky-50 text-sky-600 border border-sky-200'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Tiếp
            </button>
          </div>
        </div>
      </div>

      {/* Dòng ghi chú dưới cùng ngoài card */}
      <p className="text-xs text-slate-400">
        Quản trị danh sách tài khoản bác sĩ và thai phụ trong hệ thống PreCare.
      </p>

      {/* Modal Xem chi tiết Hồ sơ Bác sĩ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Chi tiết Hồ sơ Người dùng</h3>
                <p className="text-xs text-slate-400 mt-0.5">Mã hồ sơ: {selectedUser.id}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-1">Họ và tên</span>
                  <span className="font-semibold text-slate-900 text-sm">{selectedUser.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Vai trò</span>
                  <span className="font-medium text-slate-700 capitalize">
                    {selectedUser.role === 'doctor' ? 'Bác sĩ' : 'Phụ nữ mang thai'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Email liên hệ</span>
                  <span className="text-slate-800">{selectedUser.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Số điện thoại</span>
                  <span className="text-slate-800">{selectedUser.phone_number}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Ngày đăng ký</span>
                  <span className="text-slate-800">{selectedUser.created_at}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Trạng thái</span>
                  <span className="text-slate-800 font-medium">
                    {selectedUser.status === 'active' ? 'Đã kích hoạt' : selectedUser.status === 'locked' ? 'Đang bị khóa' : 'Hoạt động'}
                  </span>
                </div>
              </div>

              {selectedUser.role === 'doctor' && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-2 mt-2">
                  <div className="font-semibold text-slate-800">Thông tin chuyên môn lâm sàng:</div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">Chứng chỉ hành nghề:</span> CCHN-
                    {selectedUser.id.toUpperCase().replace('USR-DOC-', '8472/')}BYT
                  </div>
                  <div className="text-slate-600">
                    <span className="text-slate-400">Đơn vị công tác:</span> Bệnh viện Phụ sản Trung ương
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>

              <button
                onClick={() => handleToggleLock(selectedUser.id, selectedUser.full_name, selectedUser.status)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  selectedUser.status === 'locked'
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                    : 'text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                {selectedUser.status === 'locked' ? 'Mở khóa tài khoản' : 'Tạm khóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;
