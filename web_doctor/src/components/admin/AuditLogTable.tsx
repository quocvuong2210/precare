import React, { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  Download,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  AuditLogItem,
  AuditRole,
  AuditAction,
} from '../../types/auditLog.types';
import { MOCK_AUDIT_LOG_ITEMS } from '../../services/auditLog.mock';
import { AuditLogDetailDrawer } from './AuditLogDetailDrawer';

export interface AuditLogTableProps {
  onActionNotification?: (msg: string) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ onActionNotification }) => {
  const [logs] = useState<AuditLogItem[]>(MOCK_AUDIT_LOG_ITEMS);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AuditRole>('Tất cả vai trò');
  const [selectedAction, setSelectedAction] = useState<AuditAction>('Tất cả');
  const [selectedResult, setSelectedResult] = useState<string>('Tất cả');
  const [selectedDate, setSelectedDate] = useState<string>('2026-11-01');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const pageSize = 8;
  const totalEventsInDatabase = 248; // Khớp chỉ số trong thiết kế

  // Lọc dữ liệu theo bộ lọc
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Tìm kiếm theo tên hoặc đối tượng tác động
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesActor = log.actor_name.toLowerCase().includes(q);
        const matchesTarget = log.target_id.toLowerCase().includes(q);
        if (!matchesActor && !matchesTarget) return false;
      }

      // 2. Lọc vai trò
      if (selectedRole !== 'Tất cả vai trò' && log.role !== selectedRole) {
        return false;
      }

      // 3. Lọc loại hành động
      if (selectedAction !== 'Tất cả' && log.action !== selectedAction) {
        return false;
      }

      // 4. Lọc ngày (selectedDate: YYYY-MM-DD -> DD/MM/YYYY)
      if (selectedDate) {
        const parts = selectedDate.split('-');
        if (parts.length === 3) {
          const formatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
          if (log.date !== formatted) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, selectedRole, selectedAction, selectedDate]);

  // Phân trang
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRole('Tất cả vai trò');
    setSelectedAction('Tất cả');
    setSelectedResult('Tất cả');
    setSelectedDate('');
    setCurrentPage(1);
    if (onActionNotification) {
      onActionNotification('Đã làm mới các bộ lọc nhật ký.');
    }
  };

  const handleExportCsv = () => {
    const headers = ['Thời gian', 'Người thực hiện', 'Vai trò', 'Hành động', 'Đối tượng tác động', 'Kết quả'];
    const rows = filteredLogs.map((log) => [
      `"${log.date} ${log.time}"`,
      `"${log.actor_name}"`,
      `"${log.role}"`,
      `"${log.action}"`,
      `"${log.target_id}"`,
      `"${log.result}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `precare_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onActionNotification) {
      onActionNotification('Đã xuất tệp CSV nhật ký lâm sàng thành công.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Trang Nhật ký */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Nhật ký Kiểm tra & Theo dõi Lâm sàng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi truy cập lâm sàng, chỉnh sửa OCR và kết quả dự đoán cùng lịch sử phiên bản.
          </p>
        </div>

        {/* Nút Xuất CSV bên phải */}
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-slate-600" />
          <span>Xuất CSV</span>
        </button>
      </div>

      {/* 2. Khối Bảng dữ liệu & Bộ lọc (Card nền trắng, bo góc) */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Hàng bộ lọc (Filter bar) trên cùng gồm 6 phần tử */}
        <div className="p-4 px-6 flex flex-wrap items-center gap-3">
          {/* 1. Ô tìm kiếm */}
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm người dùng hoặc đối tượng tác động"
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900"
            />
          </div>

          {/* 2. Bộ lọc Ngày (DatePicker) */}
          <div className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 flex items-center gap-2 whitespace-nowrap shadow-2xs focus-within:ring-1 focus-within:ring-sky-500">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label htmlFor="audit-log-date-picker" className="text-slate-500 text-xs shrink-0 cursor-pointer">
              Ngày:
            </label>
            <input
              id="audit-log-date-picker"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* 3. Dropdown Vai trò */}
          <div className="relative">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value as AuditRole);
                setCurrentPage(1);
              }}
              className="h-9 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
            >
              <option value="Tất cả vai trò">Vai trò: Tất cả vai trò</option>
              <option value="Bác sĩ">Vai trò: Bác sĩ</option>
              <option value="Quản trị viên">Vai trò: Quản trị viên</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 4. Nút Xóa bộ lọc */}
          <button
            onClick={handleResetFilters}
            className="h-9 px-3.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
          >
            Xóa bộ lọc
          </button>

          {/* 5. Dropdown Loại hành động */}
          <div className="relative">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value as AuditAction);
                setCurrentPage(1);
              }}
              className="h-9 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
            >
              <option value="Tất cả">Loại hành động: Tất cả</option>
              <option value="Chạy dự đoán">Loại hành động: Chạy dự đoán</option>
              <option value="Chỉnh sửa OCR">Loại hành động: Chỉnh sửa OCR</option>
              <option value="Xem hồ sơ">Loại hành động: Xem hồ sơ</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 6. Dropdown Kết quả */}
          <div className="relative">
            <select
              value={selectedResult}
              onChange={(e) => setSelectedResult(e.target.value)}
              className="h-9 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 appearance-none focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs"
            >
              <option value="Tất cả">Kết quả: Tất cả</option>
              <option value="Chưa có kết quả">Kết quả: Chưa có kết quả</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Thanh thông tin phụ ngay dưới bộ lọc */}
        <div className="px-6 py-3 border-t border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-slate-400 font-normal">
            Tìm thấy {totalEventsInDatabase} sự kiện · Sắp xếp mới nhất trước
          </span>
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Nhật ký sự kiện không thể thay đổi · Tất cả thời gian theo UTC</span>
          </div>
        </div>

        {/* Bảng dữ liệu (7 Cột) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[940px]">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-white">
                <th className="px-6 py-3.5 w-[140px] whitespace-nowrap">Thời gian</th>
                <th className="px-6 py-3.5 w-[180px] whitespace-nowrap">Người thực hiện</th>
                <th className="px-6 py-3.5 w-[130px] whitespace-nowrap">Vai trò</th>
                <th className="px-6 py-3.5 w-[150px] whitespace-nowrap">Hành động</th>
                <th className="px-6 py-3.5 w-[160px] whitespace-nowrap">Đối tượng tác động</th>
                <th className="px-6 py-3.5 w-[100px] whitespace-nowrap">Kết quả</th>
                <th className="px-6 py-3.5 w-[130px] whitespace-nowrap text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-xs text-slate-400">
                    Không tìm thấy sự kiện nhật ký phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      {/* Cột 1: Thời gian */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-bold text-slate-900">{log.date}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{log.time}</div>
                      </td>

                      {/* Cột 2: Người thực hiện */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-900">{log.actor_name}</span>
                      </td>

                      {/* Cột 3: Vai trò */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-500">{log.role}</span>
                      </td>

                      {/* Cột 4: Hành động */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-900">{log.action}</span>
                      </td>

                      {/* Cột 5: Đối tượng tác động */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-500 font-mono">{log.target_id}</span>
                      </td>

                      {/* Cột 6: Kết quả */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-slate-400 font-normal">{log.result}</span>
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-sky-600 text-white border border-sky-600'
                              : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
                          }`}
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
            <span>Hiển thị 1–8 trong {totalEventsInDatabase} sự kiện</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trang trước
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200 rounded-lg">
              1
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={paginatedLogs.length < pageSize}
              className="px-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Trang tiếp
            </button>
          </div>
        </div>
      </div>

      {/* Ghi chú dưới cùng trang */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p>
          Phiên bản mô hình và quy tắc thể hiện kết quả dự đoán mới nhất cho từng lần kiểm tra. Mức
          cảnh báo được giữ nguyên tại thời điểm sự kiện.
        </p>
      </div>

      {/* Slide-over Drawer Chi tiết sự kiện */}
      <AuditLogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
};

export default AuditLogTable;
