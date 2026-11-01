import React, { useState } from 'react';
import { AuditLog, AuditActionType } from '../../types/admin.types';
import {
  Terminal,
  ChevronLeft,
  ChevronRight,
  Shield,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  Eye,
  Layers,
  Trash2,
  FileCheck2,
} from 'lucide-react';

export interface AuditLogTableProps {
  logs: AuditLog[];
  totalLogs: number;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  totalLogs,
  currentPage,
  pageSize,
  isLoading,
  onPageChange,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc local nếu cần
  const filteredLogs = logs.filter((log) => {
    if (filterAction !== 'all' && log.action_type !== filterAction) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      log.actor_email.toLowerCase().includes(q) ||
      log.actor_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.target_id.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(totalLogs / pageSize) || 1;

  const renderActionBadge = (actionType: AuditActionType, actionLabel: string) => {
    switch (actionType) {
      case 'APPROVE_DOCTOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {actionLabel}
          </span>
        );
      case 'LOCK_ACCOUNT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Lock className="w-3 h-3 text-rose-600" />
            {actionLabel}
          </span>
        );
      case 'UNLOCK_ACCOUNT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Unlock className="w-3 h-3 text-slate-600" />
            {actionLabel}
          </span>
        );
      case 'MAP_OCR_DATA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            <Layers className="w-3 h-3 text-teal-600" />
            {actionLabel}
          </span>
        );
      case 'VIEW_PATIENT_RECORD':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <Eye className="w-3 h-3 text-blue-600" />
            {actionLabel}
          </span>
        );
      case 'VERIFY_BIOMETRICS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <FileCheck2 className="w-3 h-3 text-indigo-600" />
            {actionLabel}
          </span>
        );
      case 'DELETE_REQUEST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Trash2 className="w-3 h-3 text-amber-600" />
            {actionLabel}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            {actionLabel}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header Bar */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#345C59]" />
            <h2 className="text-sm font-bold text-slate-900">
              Nhật ký Truy cập & Thao tác Hệ thống (Access Audit Logs)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Ghi nhận kiểm toán bất biến theo tiêu chuẩn an toàn dữ liệu y tế (HIPAA & Bộ Y Tế).
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo email, target..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
            />
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-[11px]">Audit Mode: Active</span>
          </div>
        </div>
      </div>

      {/* Read-only Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3.5 px-6">Thời gian (Timestamp)</th>
              <th className="py-3.5 px-4">Người thực hiện (User Email)</th>
              <th className="py-3.5 px-4">Hành động (Action)</th>
              <th className="py-3.5 px-4">Bản ghi tác động (Target ID)</th>
              <th className="py-3.5 px-6 text-right">Địa chỉ IP Client</th>
            </tr>
          </thead>

          {isLoading ? (
            <tbody className="divide-y divide-slate-100 text-xs">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6"><div className="h-3.5 w-32 bg-slate-200 rounded"></div></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-44 bg-slate-200 rounded"></div></td>
                  <td className="py-4 px-4"><div className="h-5 w-28 bg-slate-200 rounded-full"></div></td>
                  <td className="py-4 px-4"><div className="h-3.5 w-40 bg-slate-200 rounded"></div></td>
                  <td className="py-4 px-6 text-right"><div className="h-3.5 w-24 bg-slate-200 rounded ml-auto"></div></td>
                </tr>
              ))}
            </tbody>
          ) : (
            <tbody className="divide-y divide-slate-100 text-xs font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-sans">
                    Không có nhật ký nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3.5 px-6 text-slate-500 text-[11px]">
                      {log.timestamp}
                    </td>

                    {/* User Email & Name */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-slate-900">{log.actor_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{log.actor_email}</div>
                    </td>

                    {/* Action Badge */}
                    <td className="py-3.5 px-4 font-sans">
                      {renderActionBadge(log.action_type, log.action)}
                    </td>

                    {/* Target ID */}
                    <td className="py-3.5 px-4 font-sans text-slate-800 font-medium">
                      <div className="truncate max-w-xs" title={log.target_id}>
                        {log.target_id}
                      </div>
                      {log.details && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{log.details}</div>
                      )}
                    </td>

                    {/* IP Client */}
                    <td className="py-3.5 px-6 text-right text-slate-500 text-[11px]">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
        <div>
          Hiển thị <strong>{filteredLogs.length}</strong> nhật ký (Trang {currentPage} / {totalPages})
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1 || isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-semibold text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Trước</span>
          </button>

          <span className="px-3 py-1.5 font-bold text-slate-800 bg-white border border-slate-200 rounded-xl">
            {currentPage}
          </span>

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage >= totalPages || isLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-semibold text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Sau</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
export default AuditLogTable;

