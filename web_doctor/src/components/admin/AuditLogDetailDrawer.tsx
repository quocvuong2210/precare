import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { AuditLogItem } from '../../types/auditLog.types';

export interface AuditLogDetailDrawerProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export const AuditLogDetailDrawer: React.FC<AuditLogDetailDrawerProps> = ({ log, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop mờ phía sau */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative ml-auto w-full max-w-[390px] bg-white border-l border-slate-200/80 shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
        <div>
          {/* Header Drawer */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Chi tiết sự kiện</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhật ký chỉ đọc - Không thể chỉnh sửa hoặc xóa
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Khối 1: Thông tin sự kiện */}
          <div className="mt-5 bg-white rounded-xl border border-slate-200/80 p-4 space-y-3.5 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Thông tin sự kiện
            </span>

            {/* Thông tin người thực hiện */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                {log.actor_initials}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900">{log.actor_name}</span>
                <span className="text-xs text-slate-400 mt-0.5">{log.role}</span>
              </div>
            </div>

            {/* Lưới thông tin 2 cột */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="font-bold text-slate-900 block">{log.date}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{log.time}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block">{log.action}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Đối tượng tác động: {log.target_id}
                </span>
              </div>
            </div>

            {/* Dòng kết quả ở đáy khối 1 */}
            <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between text-slate-400">
              <span>Kết quả</span>
              <span className="font-medium text-slate-700">{log.result}</span>
            </div>
          </div>

          {/* Khối 2: Chi tiết phân tích */}
          <div className="mt-4 bg-white rounded-xl border border-slate-200/80 p-4 space-y-3 shadow-2xs">
            <span className="text-xs font-semibold text-slate-700 block">Chi tiết phân tích</span>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phiên bản mô hình</span>
                <span className="font-semibold text-slate-800 font-mono text-right truncate max-w-[180px]">
                  {log.model_version || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phiên bản luật</span>
                <span className="font-semibold text-slate-800 font-mono text-right">
                  {log.rules_version || '—'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Mức cảnh báo</span>
                <span className="font-semibold text-slate-800 text-right">
                  {log.alert_level || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Dòng trạng thái dưới cùng khối 2 */}
          <p className="text-xs text-slate-400 text-center mt-5">
            — Chưa có dữ liệu kết quả.
          </p>
        </div>

        {/* Nút đóng ở chân Drawer */}
        <div className="pt-4 border-t border-slate-100 mt-6">
          <button
            onClick={onClose}
            className="w-full py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailDrawer;

