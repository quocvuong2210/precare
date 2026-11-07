import React from 'react';
import { AuditLog, AuditActionType } from '../../types/admin.types';
import {
  X,
  Terminal,
  Shield,
  Clock,
  User,
  Target,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Lock,
  Unlock,
  Eye,
  FileCheck2,
  Trash2,
  LogIn,
  XCircle,
} from 'lucide-react';

export interface AuditLogDetailModalProps {
  log: AuditLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !log) return null;
  const aLog = log as any;

  const renderActionIcon = (actionType: any) => {
    switch (actionType) {
      case 'LOGIN':
        return <LogIn className="w-4 h-4 text-blue-600" />;
      case 'APPROVE_DOCTOR':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'REJECT_DOCTOR':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'LOCK_ACCOUNT':
        return <Lock className="w-4 h-4 text-rose-600" />;
      case 'UNLOCK_ACCOUNT':
        return <Unlock className="w-4 h-4 text-slate-700" />;
      case 'MAP_OCR_DATA':
        return <Layers className="w-4 h-4 text-[#117366]" />;
      case 'VIEW_PATIENT_RECORD':
        return <Eye className="w-4 h-4 text-indigo-600" />;
      case 'VERIFY_BIOMETRICS':
        return <FileCheck2 className="w-4 h-4 text-purple-600" />;
      case 'DELETE_REQUEST':
        return <Trash2 className="w-4 h-4 text-amber-600" />;
      default:
        return <Terminal className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {renderActionIcon(log.action_type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết Bản ghi Nhật ký</h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {aLog.status || 'SUCCESS'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Mã bản ghi: {log.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs">
          {/* Timestamp and IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Thời gian chính xác</span>
              </span>
              <span className="font-medium text-slate-800 font-mono text-xs block">
                {log.timestamp}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3 h-3" />
                <span>Địa chỉ IP Client</span>
              </span>
              <span className="font-medium text-slate-800 font-mono text-xs block">
                {log.ip_address}
              </span>
            </div>
          </div>

          {/* Actor */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Người thực hiện</span>
            </span>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 text-xs block">{log.actor_name}</span>
                <span className="text-slate-500 font-mono text-[11px]">{log.actor_email}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 capitalize">
                {log.actor_role}
              </span>
            </div>
          </div>

          {/* Action & Target */}
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2.5">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Loại hành động
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-[#117366] border border-teal-200">
                  {log.action}
                </span>
                <span className="text-slate-400 font-mono text-[11px]">[{log.action_type}]</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3 h-3 text-slate-400" />
                <span>Bản ghi tác động</span>
              </span>
              <div className="font-mono text-slate-800 text-xs mt-0.5 bg-slate-50 p-2 rounded border border-slate-200">
                {log.target_id}
              </div>
            </div>

            {log.details && (
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Nội dung chi tiết
                </span>
                <div className="text-slate-700 mt-0.5 leading-relaxed bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  {log.details}
                </div>
              </div>
            )}

            {aLog.reason && (
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 space-y-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span>Lý do ghi nhận</span>
                </span>
                <p className="font-medium text-xs leading-relaxed">{aLog.reason}</p>
              </div>
            )}
          </div>

          {/* User Agent */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
            <span className="font-medium text-slate-700">Môi trường: </span>
            <span className="font-mono">{aLog.user_agent || 'Chrome (Admin Desktop)'}</span>
          </div>

          <div className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-200/60 text-[11px] text-teal-900 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-[#117366] shrink-0" />
            <span>
              Bản ghi nhật ký này có tính toàn vẹn bất biến. Hệ thống không cho phép sửa hoặc xóa dữ liệu kiểm toán.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailModal;
