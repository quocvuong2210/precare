import React, { useState, useMemo } from 'react';
import {
  Calendar,
  ExternalLink,
  Baby,
  X,
  CheckCircle2,
  Hourglass,
  AlertTriangle,
  AlertCircle,
  FileCheck2,
  RefreshCw,
} from 'lucide-react';
import { StatusFilterDropdown, StatusCounts, FilterStatus } from './StatusFilterDropdown';
import { ClinicalPregnancyRecord, WarningLevel } from '../types';

export { StatusFilterDropdown };
export type { StatusCounts, FilterStatus };

// Re-export type Appointment as alias of ClinicalPregnancyRecord for backward compatibility
export type Appointment = ClinicalPregnancyRecord;

export interface AppointmentTableProps {
  records?: ClinicalPregnancyRecord[];
  // Alias for backward compatibility
  appointments?: ClinicalPregnancyRecord[];
  searchQuery?: string;
  clearSearch?: () => void;
  onOpenRecord?: (record: ClinicalPregnancyRecord) => void;
  onReviewOcr?: (record: ClinicalPregnancyRecord) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function getPatientAvatarStyle(patientCode: string): string {
  switch (patientCode) {
    case 'PRE-8492': return 'bg-teal-50 text-teal-800 border-teal-200';
    case 'PRE-8493': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'PRE-8494': return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'PRE-8495': return 'bg-rose-50 text-rose-800 border-rose-200';
    case 'PRE-8496': return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'PRE-8497': return 'bg-blue-50 text-blue-800 border-blue-200';
    default: return 'bg-teal-50 text-teal-800 border-teal-200';
  }
}

/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ toàn bộ dấu (accent/diacritics), chuyển thành chữ thường
 * và xử lý các ký tự đặc biệt (đ/Đ -> d) phục vụ tìm kiếm không dấu / có dấu chuẩn xác.
 */
export function normalizeVietnamese(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  records,
  appointments,
  searchQuery = '',
  clearSearch,
  onOpenRecord,
  onReviewOcr,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  // Chỉ nhận dữ liệu từ props (từ API backend), không dùng fallback mock data
  const activeRecords = records || appointments || [];
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');

  // Thống kê số lượng theo trạng thái đối soát
  const statusCounts = useMemo<StatusCounts>(() => {
    return {
      all: activeRecords.length,
      pending_ocr: activeRecords.filter(
        (r) => r.ocrStatus === 'extracted' || r.biometricStatus === 'pending_verification'
      ).length,
      verified: activeRecords.filter(
        (r) => r.ocrStatus === 'verified' || r.biometricStatus === 'verified'
      ).length,
      red_warning: activeRecords.filter((r) => r.warningLevel === 'red').length,
      // Hỗ trợ backwards compatibility
      confirmed: activeRecords.filter((r) => r.biometricStatus === 'verified').length,
      pending: activeRecords.filter((r) => r.biometricStatus === 'pending_verification').length,
    };
  }, [activeRecords]);

  const hasActiveSearch = Boolean(searchQuery && searchQuery.trim() !== '');
  const isCustomFilterActive = selectedStatus !== 'all';

  // Lọc dữ liệu thời gian thực theo trạng thái đối soát, mức cảnh báo và từ khóa tìm kiếm
  const filteredRecords = useMemo(() => {
    return activeRecords.filter((rec) => {
      // 1. Lọc theo trạng thái dropdown
      if (selectedStatus === 'pending_ocr' || selectedStatus === 'pending') {
        if (rec.ocrStatus !== 'extracted' && rec.biometricStatus !== 'pending_verification') {
          return false;
        }
      } else if (selectedStatus === 'verified' || selectedStatus === 'confirmed') {
        if (rec.biometricStatus !== 'verified') {
          return false;
        }
      } else if (selectedStatus === 'red_warning') {
        if (rec.warningLevel !== 'red') {
          return false;
        }
      }

      // 2. Lọc theo từ khóa tìm kiếm (họ tên hoặc mã hồ sơ) - Chuẩn hóa không dấu tiếng Việt
      if (searchQuery.trim()) {
        const query = normalizeVietnamese(searchQuery);
        const matchesName = normalizeVietnamese(rec.patientName || '').includes(query);
        const matchesCode = normalizeVietnamese(rec.patientCode || '').includes(query);
        if (!matchesName && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [activeRecords, selectedStatus, searchQuery]);

  // Xóa bộ lọc trạng thái và tìm kiếm
  const handleClearAllFilters = () => {
    setSelectedStatus('all');
    if (clearSearch) clearSearch();
  };

  // Render Badge Mức Cảnh Báo Lâm Sàng
  const renderWarningLevelBadge = (level: WarningLevel) => {
    switch (level) {
      case 'red':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap bg-rose-100 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 stroke-[2.2]" />
            <span>Nguy cơ cao (Cờ đỏ)</span>
          </span>
        );
      case 'yellow':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[2.2]" />
            <span>Cần theo dõi</span>
          </span>
        );
      case 'green':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.2]" />
            <span>Bình thường</span>
          </span>
        );
    }
  };

  // Render Badge Trạng Thái Đối Soát OCR
  const renderOcrStatusBadge = (rec: ClinicalPregnancyRecord) => {
    const isPending = rec.ocrStatus === 'extracted' || rec.biometricStatus === 'pending_verification';
    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200">
          <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Chờ duyệt OCR</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap bg-teal-50 text-teal-800 border border-teal-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
        <span>Đã xác nhận</span>
      </span>
    );
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col relative">
      {/* Thanh trạng thái tìm kiếm */}
      {hasActiveSearch && (
        <div className="bg-teal-50 text-teal-900 p-2.5 px-5 rounded-t-2xl border-b border-teal-100 flex items-center justify-between text-xs animate-in fade-in-0 duration-150">
          <div className="flex items-center gap-1.5">
            <span className="text-teal-800 font-medium">Đang tìm kiếm theo từ khóa:</span>
            <strong className="font-bold text-teal-950">"{searchQuery}"</strong>
          </div>
          {clearSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex items-center gap-1 font-semibold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Hủy tìm kiếm</span>
            </button>
          )}
        </div>
      )}

      {/* 1. Header Bảng: Tiêu đề & Bộ lọc trạng thái */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 relative z-30">
        {/* Left: Tiêu đề chuẩn lâm sàng + Badge đếm số lượng */}
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Hồ sơ thai kỳ & Đối soát cận lâm sàng
          </h3>
          <span className="bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-teal-100">
            {error
              ? 'Lỗi máy chủ'
              : hasActiveSearch || isCustomFilterActive
              ? `${filteredRecords.length} kết quả`
              : `${filteredRecords.length} hồ sơ`}
          </span>
        </div>

        {/* Right: Bộ lọc trạng thái & Nút Xóa lọc */}
        <div className="flex items-center gap-2">
          <StatusFilterDropdown
            value={selectedStatus}
            onChange={(status) => setSelectedStatus(status)}
            counts={statusCounts}
          />

          {(isCustomFilterActive || hasActiveSearch) && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              title="Xóa bộ lọc và xem toàn bộ hồ sơ"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Bảng Dữ Liệu Lâm Sàng */}
      <div className="w-full overflow-x-auto rounded-b-2xl">
        <table className="w-full min-w-[1080px] text-left border-collapse">
          {/* Colgroup giữ cố định tỷ lệ các cột */}
          <colgroup>
            <col style={{ width: '23%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-5 text-left min-w-[220px] whitespace-nowrap">
                THAI PHỤ / HỒ SƠ
              </th>
              <th className="py-3.5 px-4 text-left min-w-[130px] whitespace-nowrap">
                TUỔI THAI
              </th>
              <th className="py-3.5 px-4 text-left min-w-[110px] whitespace-nowrap">
                NGÀY KHÁM
              </th>
              <th className="py-3.5 px-4 text-left min-w-[210px] whitespace-nowrap">
                ĐÁNH GIÁ SINH TRẮC HỌC
              </th>
              <th className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">
                MỨC CẢNH BÁO
              </th>
              <th className="py-3.5 px-4 text-center min-w-[140px] whitespace-nowrap">
                TRẠNG THÁI ĐỐI SOÁT
              </th>
              <th className="py-3.5 px-5 text-right min-w-[120px] whitespace-nowrap">
                HÀNH ĐỘNG
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {error ? (
              /* Khối Error State thân thiện khi API trả về lỗi 404 hoặc mất kết nối */
              <tr>
                <td colSpan={7} className="py-16 px-6 text-center">
                  <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shadow-2xs">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 tracking-tight">
                      Không thể tải danh sách hồ sơ thai kỳ
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                      Dịch vụ quản lý hồ sơ trên máy chủ hiện chưa sẵn sàng hoặc đang bảo trì. Vui lòng thử lại sau hoặc sử dụng chức năng Nhập tay / Tính tuổi thai lâm sàng.
                    </p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Thử lại</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center gap-2.5">
                    <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-slate-500">Đang tải danh sách hồ sơ thai kỳ từ máy chủ...</p>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-slate-700">
                      {hasActiveSearch || isCustomFilterActive
                        ? 'Không tìm thấy hồ sơ nào phù hợp'
                        : 'Chưa có hồ sơ thai kỳ nào trong ngày hôm nay'}
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {hasActiveSearch
                        ? `Không có hồ sơ nào khớp với từ khóa "${searchQuery}". Thử nhập lại tên hoặc mã bệnh nhân.`
                        : isCustomFilterActive
                        ? 'Không có hồ sơ nào khớp với tiêu chí lọc hiện tại. Thử chọn lại trạng thái khác.'
                        : 'Danh sách hồ sơ lâm sàng được đồng bộ trực tiếp từ cơ sở dữ liệu bệnh án PreCare.'}
                    </p>
                    {(hasActiveSearch || isCustomFilterActive) && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0D8A7C] text-white hover:bg-[#0A7367] transition-colors cursor-pointer shadow-xs"
                      >
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isOcrPending =
                  rec.ocrStatus === 'extracted' || rec.biometricStatus === 'pending_verification';

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      if (onOpenRecord) onOpenRecord(rec);
                    }}
                  >
                    {/* Cột 1: THAI PHỤ / HỒ SƠ */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${getPatientAvatarStyle(
                            rec.patientCode
                          )}`}
                        >
                          {rec.patientName
                            .split(' ')
                            .slice(-2)
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                            {rec.patientName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-600">{rec.patientCode}</span>
                            <span className="text-slate-300">·</span>
                            <span>EDD: {rec.eddFormatted}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: TUỔI THAI */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-semibold whitespace-nowrap">
                        {rec.gestationalAgeFormatted ||
                          (typeof rec.gestationalAge === 'string'
                            ? rec.gestationalAge
                            : rec.gestationalAge?.formatted || '--')}
                      </div>
                      <div className="text-[11px] text-teal-700 font-medium">
                        {rec.trimesterName}
                      </div>
                    </td>

                    {/* Cột 3: NGÀY KHÁM */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium whitespace-nowrap">
                        {rec.checkupDate || rec.appointmentTime || '--'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {rec.reason || 'Khám thai định kỳ'}
                      </div>
                    </td>

                    {/* Cột 4: ĐÁNH GIÁ SINH TRẮC HỌC */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 font-medium leading-relaxed max-w-xs">
                        {rec.biometricSummary || 'Chưa ghi nhận bất thường'}
                      </div>
                    </td>

                    {/* Cột 5: MỨC CẢNH BÁO */}
                    <td className="py-3.5 px-4 text-center">
                      {renderWarningLevelBadge(rec.warningLevel)}
                    </td>

                    {/* Cột 6: TRẠNG THÁI ĐỐI SOÁT */}
                    <td className="py-3.5 px-4 text-center">
                      {renderOcrStatusBadge(rec)}
                    </td>

                    {/* Cột 7: HÀNH ĐỘNG */}
                    <td
                      className="py-3.5 px-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {isOcrPending && onReviewOcr ? (
                          <button
                            type="button"
                            onClick={() => onReviewOcr(rec)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0D8A7C] text-white hover:bg-[#0A7367] transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>Duyệt OCR</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenRecord) onOpenRecord(rec);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <span>Xem hồ sơ</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">
          Hiển thị {filteredRecords.length > 0 ? `1–${filteredRecords.length}` : '0'} trên tổng số{' '}
          <strong className="text-slate-800 font-bold">{activeRecords.length}</strong> hồ sơ trong ngày
        </span>
        <span className="text-[11px] text-slate-500 font-medium">
          PreCare Digital Obstetrics • Tiêu chuẩn Luật lâm sàng Hadlock (ACOG)
        </span>
      </div>
    </div>
  );
};

export default AppointmentTable;
