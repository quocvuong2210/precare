import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  User,
  Calendar,
  Clock,
  Baby,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  Check,
} from 'lucide-react';
import { mockAppointments, Appointment } from './AppointmentTable';

export interface PatientSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patientId: string) => void;
  appointments?: Appointment[];
}

/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ dấu, chuyển chữ thường, thay đ/Đ thành d.
 * Phục vụ tìm kiếm gần đúng tiếng Việt không phân biệt có dấu / không dấu.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Kiểm tra tìm kiếm gần đúng:
 * - Không phân biệt hoa / thường
 * - Không phân biệt có dấu / không dấu
 * - Bỏ khoảng trắng thừa
 * - Khớp một phần hoặc khớp mọi từ khóa
 */
export function matchesFuzzy(text: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!text) return false;

  const cleanText = removeVietnameseTones(text).toLowerCase().trim();
  const cleanQuery = removeVietnameseTones(query).toLowerCase().trim();

  // 1. Khớp chuỗi con trực tiếp (có hoặc không dấu)
  if (cleanText.includes(cleanQuery)) return true;

  // 2. Khớp từng từ khóa riêng lẻ
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  if (tokens.length > 0 && tokens.every((token) => cleanText.includes(token))) {
    return true;
  }

  return false;
}

export const PatientSearchDialog: React.FC<PatientSearchDialogProps> = ({
  isOpen,
  onClose,
  onSelectPatient,
  appointments = mockAppointments,
}) => {
  const [keyword, setKeyword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động focus vào input khi dialog mở
  useEffect(() => {
    if (isOpen) {
      setKeyword('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lắng nghe phím Escape để đóng dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Danh sách bệnh nhân khớp với từ khóa tìm kiếm
  const searchResults = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) return [];

    return appointments.filter((apt) => {
      return (
        matchesFuzzy(apt.patientName, trimmed) ||
        matchesFuzzy(apt.patientCode, trimmed) ||
        (apt.reason ? matchesFuzzy(apt.reason, trimmed) : false) ||
        (apt.biometricSummary ? matchesFuzzy(apt.biometricSummary, trimmed) : false) ||
        (apt.roomNumber ? matchesFuzzy(apt.roomNumber, trimmed) : false)
      );
    });
  }, [keyword, appointments]);

  if (!isOpen) return null;

  const handleSelect = (patientId: string) => {
    onSelectPatient(patientId);
    onClose();
  };

  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã xác nhận
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Hourglass className="w-3 h-3 text-amber-600" />
            Chờ duyệt
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <Check className="w-3 h-3 text-teal-600" />
            Đã khám xong
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm bệnh nhân"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Click outside backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Main Dialog Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-10 max-h-[85vh]">
        {/* Header & Search Input Box */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-white sticky top-0 z-10">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100/80 flex items-center justify-center text-teal-700 shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm theo họ tên (vd: Minh Anh, nguyen thi) hoặc mã bệnh nhân (vd: PRE-8492)..."
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                aria-label="Xóa từ khóa"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Close button with ESC indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded-md">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Đóng dialog tìm kiếm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: States */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 divide-y divide-slate-100">
          {/* Trạng thái 1: Chưa nhập từ khóa -> Gợi ý & Danh sách nhanh */}
          {!keyword.trim() && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Gợi ý tìm kiếm nhanh hôm nay</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {appointments.slice(0, 4).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={() => handleSelect(apt.patientId)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/40 text-left transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                        {apt.patientName
                          .split(' ')
                          .slice(-2)
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-800">
                          {apt.patientName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span className="font-mono text-slate-600">{apt.patientCode}</span>
                          <span>•</span>
                          <span>{apt.appointmentTime}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-teal-600 shrink-0 ml-2" />
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  Hệ thống hỗ trợ tìm kiếm gần đúng không dấu (VD: gõ <strong className="text-slate-700">"minh anh"</strong> để tìm <strong className="text-slate-700">"Nguyễn Thị Minh Anh"</strong> hoặc gõ <strong className="text-slate-700">"8492"</strong> để tìm mã hồ sơ).
                </span>
              </div>
            </div>
          )}

          {/* Trạng thái 2: Đang nhập và có kết quả tìm kiếm */}
          {keyword.trim() && searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 py-1">
                Tìm thấy <strong className="text-teal-700">{searchResults.length}</strong> bệnh nhân phù hợp
              </div>

              <div className="space-y-1.5">
                {searchResults.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => handleSelect(apt.patientId)}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {apt.patientName
                          .split(' ')
                          .slice(-2)
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                            {apt.patientName}
                          </h4>
                          <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {apt.patientCode}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span className="flex items-center gap-1 text-teal-700 font-medium">
                            <Baby className="w-3.5 h-3.5" />
                            {typeof apt.gestationalAge === 'string'
                              ? apt.gestationalAge
                              : apt.gestationalAge?.formatted}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {apt.appointmentTime}
                          </span>
                          <span>•</span>
                          <span className="truncate max-w-[200px]" title={apt.reason}>
                            {apt.reason}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {renderStatusBadge(apt.status)}
                      <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4D7D74] group-hover:bg-[#3D645D] text-white shadow-xs transition-colors">
                        <span>Xem chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trạng thái 3: Không tìm thấy kết quả */}
          {keyword.trim() && searchResults.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">
                  Không tìm thấy bệnh nhân nào
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Không có hồ sơ nào khớp với từ khóa <strong className="text-slate-700">"{keyword}"</strong>.
                  Vui lòng kiểm tra lại họ tên có dấu / không dấu hoặc mã định danh bệnh nhân.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  inputRef.current?.focus();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 underline underline-offset-2"
              >
                Xóa từ khóa và tìm lại
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
              Enter
            </kbd>{' '}
            để chọn hồ sơ
          </span>
          <span>Dữ liệu: Danh sách lịch khám hôm nay ({appointments.length} hồ sơ)</span>
        </div>
      </div>
    </div>
  );
};

export default PatientSearchDialog;
