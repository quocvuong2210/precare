// web_doctor/src/components/RequestDeletionModal.tsx
import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, X, CheckCircle, Database } from 'lucide-react';
import { deletionApi } from '../services/deletion.service';
import { DeletionTargetType } from '../types/deletion.types';

interface RequestDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pregnancyProfileId: string;
  patientName: string;
  checkupId?: string | null;
  defaultTargetType?: DeletionTargetType;
  onSuccess?: () => void;
}

export const RequestDeletionModal: React.FC<RequestDeletionModalProps> = ({
  isOpen,
  onClose,
  pregnancyProfileId,
  patientName,
  checkupId = null,
  defaultTargetType = 'full_profile',
  onSuccess,
}) => {
  const [targetType, setTargetType] = useState<DeletionTargetType>(defaultTargetType);
  const [reason, setReason] = useState('');
  const [allowAnonymizedResearch, setAllowAnonymizedResearch] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setErrorMessage('Lý do xóa phải có ít nhất 10 ký tự để lưu vết bệnh án.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await deletionApi.submitRequest({
        pregnancy_profile_id: pregnancyProfileId,
        checkup_id: targetType === 'single_checkup' ? checkupId : null,
        target_type: targetType,
        reason: reason.trim(),
        allow_anonymized_research: allowAnonymizedResearch,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Gửi yêu cầu xóa hồ sơ thất bại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5 text-rose-700">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-base text-slate-800">Yêu cầu Xóa Hồ sơ Y tế (PRC-37)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h4 className="text-lg font-bold text-slate-800">Đã tiếp nhận yêu cầu thành công</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Yêu cầu đã được chuyển tới Bác sĩ phụ trách chính để thẩm định theo quy định bảo mật y tế.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm">
            {/* Cảnh báo pháp lý y tế */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed space-y-1">
                <p className="font-bold">Quy định Bảo mật Dữ liệu Y tế:</p>
                <p>
                  Theo chuẩn bảo mật hồ sơ bệnh án, việc xóa hồ sơ cần được <b>Bác sĩ phụ trách chính</b> thẩm định
                  (Two-step Approval). Dữ liệu sẽ tạm thời khóa chỉnh sửa cho đến khi có quyết định duyệt.
                </p>
              </div>
            </div>

            {/* Thông tin hồ sơ */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs text-slate-600 space-y-1">
              <div><b>Thai phụ:</b> <span className="text-slate-800">{patientName}</span></div>
              <div className="truncate"><b>Mã hồ sơ:</b> <span className="font-mono text-[11px]">{pregnancyProfileId}</span></div>
            </div>

            {/* Phạm vi xóa */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phạm vi yêu cầu xóa:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTargetType('full_profile')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    targetType === 'full_profile'
                      ? 'border-rose-500 bg-rose-50/60 text-rose-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Toàn bộ hồ sơ thai kỳ
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('single_checkup')}
                  disabled={!checkupId}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    targetType === 'single_checkup'
                      ? 'border-rose-500 bg-rose-50/60 text-rose-800 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40'
                  }`}
                >
                  Chỉ xóa lần khám này
                </button>
              </div>
            </div>

            {/* Lý do xóa */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Lý do yêu cầu xóa <span className="text-rose-500">*</span> (tối thiểu 10 ký tự):
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ví dụ: Bệnh nhân đã chuyển viện quốc tế / Thông tin nhập bị sai lệch..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4D7D74] focus:border-transparent resize-none"
              />
            </div>

            {/* Tùy chọn Ẩn danh hóa Nghiên cứu AI RACA-Net (Patient Consent) */}
            <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allowAnonymizedResearch}
                  onChange={(e) => setAllowAnonymizedResearch(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-[#4D7D74] rounded-sm focus:ring-[#4D7D74]"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Đồng ý ẩn danh hóa dữ liệu cận lâm sàng để phục vụ Nghiên cứu Khoa học (Mô hình AI RACA-Net)
                </span>
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pl-6.5">
                <Database className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <span>
                  {allowAnonymizedResearch
                    ? 'Tách bỏ hoàn toàn tên, SĐT, Email. Giữ lại số đo siêu âm phi định danh.'
                    : 'Từ chối: Dữ liệu sẽ bị cô lập và xóa sạch hoàn toàn khỏi mô hình AI.'}
                </span>
              </div>
            </div>

            {/* Lỗi */}
            {errorMessage && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || reason.trim().length < 10}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu xóa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};