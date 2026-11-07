import React, { useState, useEffect } from 'react';
import {
  Filter,
  X,
  Check,
  RotateCcw,
  Clock,
  User,
  CheckCircle2,
  Hourglass,
  Calendar,
} from 'lucide-react';
import { FilterStatus } from './AppointmentTable';

export type TimeSlotFilter = 'all' | 'morning' | 'afternoon';

export interface FilterCriteria {
  status: FilterStatus;
  patientKeyword: string;
  timeSlot: TimeSlotFilter;
}

export const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  status: 'all',
  patientKeyword: '',
  timeSlot: 'all',
};

export interface AppointmentFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterCriteria;
  onApply: (filters: FilterCriteria) => void;
  statusCounts?: {
    all: number;
    confirmed: number;
    pending: number;
    completed: number;
  };
}

export const AppointmentFilterDialog: React.FC<AppointmentFilterDialogProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApply,
  statusCounts = { all: 6, confirmed: 2, pending: 2, completed: 2 },
}) => {
  // Bản nháp lưu thay đổi tạm thời trước khi bấm "Áp dụng"
  const [draftFilters, setDraftFilters] = useState<FilterCriteria>(currentFilters);

  // Đồng bộ draft khi mở dialog
  useEffect(() => {
    if (isOpen) {
      setDraftFilters(currentFilters);
    }
  }, [isOpen, currentFilters]);

  // Lắng nghe phím ESC để đóng
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Tính số lượng tiêu chí lọc đang được chỉnh khác mặc định
  const countActiveDraftFilters = () => {
    let count = 0;
    if (draftFilters.status !== 'all') count++;
    if (draftFilters.patientKeyword.trim() !== '') count++;
    if (draftFilters.timeSlot !== 'all') count++;
    return count;
  };

  const handleApply = () => {
    onApply(draftFilters);
    onClose();
  };

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTER_CRITERIA);
    onApply(DEFAULT_FILTER_CRITERIA);
    onClose();
  };

  const statusOptions: Array<{
    id: FilterStatus;
    label: string;
    description: string;
    badgeClass: string;
    count: number;
  }> = [
    {
      id: 'all',
      label: 'Tất cả trạng thái',
      description: 'Hiển thị mọi lịch khám trong ngày',
      badgeClass: 'bg-slate-100 text-slate-700',
      count: statusCounts.all,
    },
    {
      id: 'confirmed',
      label: 'Đã xác nhận',
      description: 'Lịch khám đã được xác nhận sẵn sàng',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      count: statusCounts.confirmed,
    },
    {
      id: 'pending',
      label: 'Chờ duyệt',
      description: 'Hồ sơ hoặc kết quả xét nghiệm chờ bác sĩ xem xét',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      count: statusCounts.pending,
    },
    {
      id: 'completed',
      label: 'Đã khám xong',
      description: 'Ca khám đã hoàn thành trong ca làm việc',
      badgeClass: 'bg-teal-50 text-teal-700 border border-teal-200',
      count: statusCounts.completed,
    },
  ];

  const timeOptions: Array<{
    id: TimeSlotFilter;
    label: string;
    subtext: string;
  }> = [
    { id: 'all', label: 'Tất cả khung giờ', subtext: 'Cả ngày' },
    { id: 'morning', label: 'Buổi sáng', subtext: 'Trước 10:00 AM' },
    { id: 'afternoon', label: 'Buổi trưa / chiều', subtext: 'Từ 10:00 AM trở đi' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bộ lọc lịch khám"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Click outside to close without applying */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100/80">
              <Filter className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bộ lọc lịch khám</h3>
              <p className="text-xs text-slate-500">Tùy biến hiển thị danh sách khám hôm nay</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng dialog bộ lọc"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* 1. Lọc theo tên hoặc mã bệnh nhân */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>Tên hoặc mã bệnh nhân</span>
            </label>
            <input
              type="text"
              value={draftFilters.patientKeyword}
              onChange={(e) =>
                setDraftFilters({ ...draftFilters, patientKeyword: e.target.value })
              }
              placeholder="VD: Minh Anh, PRE-8492..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
            />
          </div>

          {/* 2. Lọc theo trạng thái lịch khám */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Trạng thái lịch khám</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Chọn 1 trạng thái</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {statusOptions.map((opt) => {
                const isSelected = draftFilters.status === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, status: opt.id })}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-600'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{opt.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{opt.description}</div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                        isSelected
                          ? 'bg-teal-700 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Lọc theo khung giờ khám */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Khung giờ khám</span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {timeOptions.map((t) => {
                const isSelected = draftFilters.timeSlot === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDraftFilters({ ...draftFilters, timeSlot: t.id })}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold ring-1 ring-teal-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.subtext}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions: Áp dụng, Đặt lại, Hủy */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#4D7D74] hover:bg-[#3D645D] shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                Áp dụng {countActiveDraftFilters() > 0 ? `(${countActiveDraftFilters()})` : ''}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentFilterDialog;

