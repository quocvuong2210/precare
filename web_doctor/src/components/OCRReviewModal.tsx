import React, { useState, useEffect } from 'react';
import {
  X,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Baby,
  Activity,
  FileText,
  User,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Appointment } from './AppointmentTable';

export interface OCRReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onConfirmSuccess?: (appointmentId: string) => void;
}

export const OCRReviewModal: React.FC<OCRReviewModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onConfirmSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Khởi tạo các trường số đo sinh trắc học (không hardcode giá trị giả)
  const [bpd, setBpd] = useState('');
  const [hc, setHc] = useState('');
  const [ac, setAc] = useState('');
  const [fl, setFl] = useState('');
  const [efw, setEfw] = useState('');

  useEffect(() => {
    if (appointment) {
      // Đặt lại các trường khi mở modal
      setBpd('');
      setHc('');
      setAc('');
      setFl('');
      setEfw('');
    }
  }, [appointment]);

  if (!isOpen || !appointment) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsConfirmed(true);
      if (onConfirmSuccess) {
        onConfirmSuccess(appointment.id);
      }
      setTimeout(() => {
        setIsConfirmed(false);
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Duyệt & Nhập số đo siêu âm</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Đối soát lâm sàng
                </span>
              </div>
              <p className="text-xs text-slate-500">Đối chiếu và xác nhận số đo siêu âm trước khi đồng bộ bệnh án</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Patient summary badge */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-teal-100/70 text-teal-800 font-bold flex items-center justify-center text-xs">
                {appointment.patientName
                  .split(' ')
                  .slice(-2)
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div>
                <div className="font-bold text-slate-800">{appointment.patientName}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <span>{appointment.patientCode}</span>
                  <span>•</span>
                  <span>
                    {typeof appointment.gestationalAge === 'string'
                      ? appointment.gestationalAge
                      : appointment.gestationalAge?.formatted || ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">Ngày khám</div>
              <div className="font-semibold text-slate-700">
                {appointment.checkupDate || appointment.appointmentTime || '--'}
              </div>
            </div>
          </div>

          {/* Banner hướng dẫn bác sĩ nhập tay / đối soát */}
          <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 flex items-start gap-2.5 text-xs text-teal-950">
            <Sparkles className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold text-teal-950">Đối soát số đo lâm sàng:</strong> Bác sĩ vui lòng kiểm tra hoặc nhập trực tiếp các chỉ số siêu âm từ phiếu kết quả để đối chiếu theo chuẩn luật lâm sàng Hadlock (ACOG).
            </div>
          </div>

          {/* Biometric Fields Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Chỉ số sinh trắc học thai nhi (Hadlock 4 thông số)
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">BPD - ĐK Lưỡng đỉnh (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Nhập số đo BPD (mm)"
                  value={bpd}
                  onChange={(e) => setBpd(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">HC - Chu vi đầu (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Nhập số đo HC (mm)"
                  value={hc}
                  onChange={(e) => setHc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">AC - Chu vi bụng (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Nhập số đo AC (mm)"
                  value={ac}
                  onChange={(e) => setAc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">FL - Dài xương đùi (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Nhập số đo FL (mm)"
                  value={fl}
                  onChange={(e) => setFl(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-1 block">EFW - Cân nặng ước tính (gram)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="Nhập cân nặng ước tính EFW (gram)"
                  value={efw}
                  onChange={(e) => setEfw(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={isSubmitting || isConfirmed}
            onClick={handleConfirm}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all cursor-pointer ${
              isConfirmed
                ? 'bg-emerald-600'
                : 'bg-[#0D8A7C] hover:bg-[#0A7367]'
            }`}
          >
            {isConfirmed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Đã ghi nhận thành công!</span>
              </>
            ) : isSubmitting ? (
              <span>Đang lưu...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận & Ghi nhận bệnh án</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OCRReviewModal;
