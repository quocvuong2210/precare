import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  UserCheck,
  XCircle,
  Lock,
  Unlock,
  Loader2,
  X,
  ShieldAlert,
} from 'lucide-react';

export type ConfirmActionType = 'approve' | 'reject' | 'lock' | 'unlock';

export interface ConfirmActionDialogProps {
  isOpen: boolean;
  type: ConfirmActionType;
  targetName: string;
  targetDetail?: string;
  onConfirm: (reason?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  isOpen,
  type,
  targetName,
  targetDetail,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isReasonRequired = type === 'reject' || type === 'lock';

  const handleConfirm = async () => {
    if (isReasonRequired && !reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do để ghi nhận vào nhật ký kiểm toán hệ thống.');
      return;
    }
    setErrorMsg('');
    await onConfirm(reason.trim() || undefined);
  };

  const getDialogConfig = () => {
    switch (type) {
      case 'approve':
        return {
          title: 'Phê duyệt Hồ sơ Bác sĩ',
          description: `Bạn có chắc chắn muốn phê duyệt tài khoản và chứng chỉ hành nghề của`,
          subtext: 'Bác sĩ sẽ được cấp toàn quyền truy cập xem bệnh án thai kỳ và phân tích siêu âm trên PreCare.',
          confirmText: 'Xác nhận Duyệt',
          confirmBg: 'bg-[#117366] hover:bg-[#0e5c52]',
          iconBg: 'bg-teal-50 text-[#117366] border-teal-200',
          icon: UserCheck,
        };
      case 'reject':
        return {
          title: 'Từ chối Hồ sơ Bác sĩ',
          description: `Vui lòng xác nhận từ chối xét duyệt hồ sơ chuyên môn của`,
          subtext: 'Bác sĩ sẽ nhận được thông báo từ chối kèm lý do để tiến hành bổ sung/chụp lại chứng chỉ.',
          confirmText: 'Xác nhận Từ chối',
          confirmBg: 'bg-rose-600 hover:bg-rose-700',
          iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
          icon: XCircle,
        };
      case 'lock':
        return {
          title: 'Khóa Tài khoản Người dùng',
          description: `Bạn sắp tạm dừng quyền truy cập vào hệ thống của`,
          subtext: 'Người dùng sẽ bị thu hồi phiên đăng nhập và không thể truy cập bất kỳ hồ sơ y tế nào.',
          confirmText: 'Xác nhận Khóa',
          confirmBg: 'bg-rose-600 hover:bg-rose-700',
          iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
          icon: Lock,
        };
      case 'unlock':
        return {
          title: 'Mở khóa Quyền truy cập',
          description: `Khôi phục quyền truy cập và hoạt động bình thường cho tài khoản của`,
          subtext: 'Người dùng có thể đăng nhập lại ngay lập tức.',
          confirmText: 'Xác nhận Mở khóa',
          confirmBg: 'bg-[#117366] hover:bg-[#0e5c52]',
          iconBg: 'bg-teal-50 text-[#117366] border-teal-200',
          icon: Unlock,
        };
    }
  };

  const config = getDialogConfig();
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
          <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${config.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{config.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {config.description} <strong className="text-slate-800 font-semibold">{targetName}</strong>.
            </p>
            {targetDetail && (
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">{targetDetail}</div>
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{config.subtext}</p>
          </div>

          {isReasonRequired ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Lý do thực hiện <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={3}
                placeholder={
                  type === 'reject'
                    ? 'Ví dụ: Ảnh CCHN bị mờ, không trùng khớp tên với chứng minh thư, số hiệu chưa hợp lệ...'
                    : 'Ví dụ: Tạm dừng hoạt động theo văn bản yêu cầu kiểm tra chứng chỉ hành nghề...'
                }
                className={`w-full p-2.5 bg-slate-50 border rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 ${
                  errorMsg
                    ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-[#117366] focus:border-[#117366]'
                }`}
              />
              {errorMsg ? (
                <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>{errorMsg}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Lý do này sẽ được ghi lại trong Audit Log để phục vụ thanh kiểm tra y tế.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Ghi chú nội bộ (Tùy chọn)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Đã đối chiếu CCHN trên cổng tra cứu của Bộ Y Tế"
                className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#117366] focus:border-[#117366]"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="h-8 px-3.5 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || (isReasonRequired && !reason.trim())}
            className={`h-8 px-4 rounded-lg text-xs font-medium text-white transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmBg}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <span>{config.confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionDialog;
