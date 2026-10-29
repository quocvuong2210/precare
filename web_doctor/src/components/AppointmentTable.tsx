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
}

/**
 * Danh sách hồ sơ thai kỳ & cận lâm sàng chuẩn theo Database PreCare (:8000 & :8001)
 * Không chứa phòng khám hay giờ hẹn khám (theo đúng Rule Out-of-Scope PreCare)
 */
export const mockClinicalRecords: ClinicalPregnancyRecord[] = [
  {
    id: 'rec-001',
    patientId: 'pat-101',
    patientName: 'Nguyễn Thị Minh Anh',
    patientCode: 'PRE-8492',
    edd: '2026-12-30',
    eddFormatted: '30/12/2026',
    trimester: 3,
    trimesterName: 'Tam cá nguyệt 3',
    gestationalAgeDays: 214,
    gestationalAgeFormatted: '30 tuần 4 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'AC < 5th pct (1.58%) • Nghi ngờ FGR',
    warningLevel: 'red',
    ocrStatus: 'extracted',
    biometricStatus: 'pending_verification',
    hasOcrAttachment: true,
    uploadedFileId: 'up-001',
    appointmentTime: '29/10/2026',
    reason: 'Theo dõi HA cao • Cờ đỏ FGR',
    status: 'pending',
    gestationalAge: '30 tuần 4 ngày',
  },
  {
    id: 'rec-002',
    patientId: 'pat-102',
    patientName: 'Phạm Thanh Thảo',
    patientCode: 'PRE-8493',
    edd: '2027-02-14',
    eddFormatted: '14/02/2027',
    trimester: 2,
    trimesterName: 'Tam cá nguyệt 2',
    gestationalAgeDays: 169,
    gestationalAgeFormatted: '24 tuần 1 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'Sinh trắc học đồng bộ (35th pct)',
    warningLevel: 'yellow',
    ocrStatus: 'extracted',
    biometricStatus: 'pending_verification',
    hasOcrAttachment: true,
    uploadedFileId: 'up-002',
    appointmentTime: '29/10/2026',
    reason: 'Xét nghiệm sinh hóa • OGTT 2h',
    status: 'pending',
    gestationalAge: '24 tuần 1 ngày',
  },
  {
    id: 'rec-003',
    patientId: 'pat-103',
    patientName: 'Trần Mỹ Duyên',
    patientCode: 'PRE-8494',
    edd: '2027-03-30',
    eddFormatted: '30/03/2027',
    trimester: 2,
    trimesterName: 'Tam cá nguyệt 2',
    gestationalAgeDays: 126,
    gestationalAgeFormatted: '18 tuần 0 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'Hình thái học Q2 bình thường (48th pct)',
    warningLevel: 'green',
    ocrStatus: 'extracted',
    biometricStatus: 'pending_verification',
    hasOcrAttachment: true,
    uploadedFileId: 'up-003',
    appointmentTime: '29/10/2026',
    reason: 'Khám định kỳ + Siêu âm hình thái',
    status: 'pending',
    gestationalAge: '18 tuần 0 ngày',
  },
  {
    id: 'rec-004',
    patientId: 'pat-104',
    patientName: 'Lê Thị Ngọc Bích',
    patientCode: 'PRE-8495',
    edd: '2026-12-08',
    eddFormatted: '08/12/2026',
    trimester: 3,
    trimesterName: 'Tam cá nguyệt 3',
    gestationalAgeDays: 240,
    gestationalAgeFormatted: '34 tuần 2 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'AC < 3rd pct (1.2%) • Severe FGR',
    warningLevel: 'red',
    ocrStatus: 'verified',
    biometricStatus: 'verified',
    hasOcrAttachment: false,
    uploadedFileId: 'up-004',
    appointmentTime: '29/10/2026',
    reason: 'Đo tim thai NST • Đánh giá FGR',
    status: 'confirmed',
    gestationalAge: '34 tuần 2 ngày',
  },
  {
    id: 'rec-005',
    patientId: 'pat-105',
    patientName: 'Vũ Hoàng Thục Trinh',
    patientCode: 'PRE-8496',
    edd: '2027-01-18',
    eddFormatted: '18/01/2027',
    trimester: 3,
    trimesterName: 'Tam cá nguyệt 3',
    gestationalAgeDays: 201,
    gestationalAgeFormatted: '28 tuần 5 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'Chỉ số phát triển đạt chuẩn (52th pct)',
    warningLevel: 'green',
    ocrStatus: 'verified',
    biometricStatus: 'verified',
    hasOcrAttachment: false,
    uploadedFileId: 'up-005',
    appointmentTime: '29/10/2026',
    reason: 'Doppler ĐM tử cung bình thường',
    status: 'confirmed',
    gestationalAge: '28 tuần 5 ngày',
  },
  {
    id: 'rec-006',
    patientId: 'pat-106',
    patientName: 'Đặng Kim Ngân',
    patientCode: 'PRE-8497',
    edd: '2026-11-12',
    eddFormatted: '12/11/2026',
    trimester: 3,
    trimesterName: 'Tam cá nguyệt 3',
    gestationalAgeDays: 267,
    gestationalAgeFormatted: '38 tuần 1 ngày',
    checkupDate: '29/10/2026',
    biometricSummary: 'Thai đủ tháng, nước ối & tim thai tốt',
    warningLevel: 'green',
    ocrStatus: 'verified',
    biometricStatus: 'verified',
    hasOcrAttachment: false,
    uploadedFileId: 'up-006',
    appointmentTime: '29/10/2026',
    reason: 'Khám tiền sản đủ tháng',
    status: 'confirmed',
    gestationalAge: '38 tuần 1 ngày',
  },
];

// Alias for backwards compatibility
export const mockAppointments = mockClinicalRecords;

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

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  records,
  appointments,
  searchQuery = '',
  clearSearch,
  onOpenRecord,
  onReviewOcr,
}) => {
  // Ưu tiên sử dụng prop `records`, fallback sang `appointments` hoặc `mockClinicalRecords`
  const activeRecords = records || appointments || mockClinicalRecords;
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all');

  // Thống kê số lượng động từ tập dữ liệu thực tế (Task 5 & 8)
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

      // 2. Lọc theo từ khóa tìm kiếm (họ tên hoặc mã hồ sơ)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = rec.patientName.toLowerCase().includes(query);
        const matchesCode = rec.patientCode.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) {
          return false;
        }
      }

      return true;
    });
  }, [activeRecords, selectedStatus, searchQuery]);

  // Nút Xóa lọc đưa giao diện về trạng thái không lọc ban đầu (Task 7)
  const handleClearAllFilters = () => {
    setSelectedStatus('all');
    if (clearSearch) clearSearch();
  };

  // Render Badge Mức Cảnh Báo Lâm Sàng (kết hợp Icon + Màu + Nhãn theo Task 10)
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

  // Render Badge Trạng Thái Đối Soát OCR (Confirmation Barrier Pipeline)
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
      {/* ========================================================
          Thanh trạng thái tìm kiếm (Live Search Banner)
         ======================================================== */}
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

      {/* ========================================================
          1. Table Header: Tiêu đề + Dropdown Filter + Nút Xóa lọc trung tính
          Lưu ý: Không dùng overflow-hidden ở header để dropdown không bị cắt
         ======================================================== */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 relative z-30">
        {/* Left: Tiêu đề chuẩn lâm sàng + Badge đếm số lượng */}
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Hồ sơ thai kỳ & Đối soát cận lâm sàng
          </h3>
          <span className="bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-teal-100">
            {hasActiveSearch || isCustomFilterActive
              ? `${filteredRecords.length} kết quả`
              : `${filteredRecords.length} hồ sơ`}
          </span>
        </div>

        {/* Right: Dropdown bộ lọc trạng thái & Nút Xóa lọc màu trung tính (Task 7) */}
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

      {/* ========================================================
          2. Table Content: 7 Cột Chuẩn DB Backend
          Ổn định chiều rộng cột bằng colgroup và min-w cố định (Task 6)
         ======================================================== */}
      <div className="w-full overflow-x-auto rounded-b-2xl">
        <table className="w-full min-w-[1080px] text-left border-collapse">
          {/* Colgroup giữ cố định tỷ lệ các cột bất kể số dòng thay đổi */}
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
              {/* Cột 1: THAI PHỤ / HỒ SƠ */}
              <th className="py-3.5 px-5 text-left min-w-[220px] whitespace-nowrap">
                THAI PHỤ / HỒ SƠ
              </th>
              {/* Cột 2: TUỔI THAI */}
              <th className="py-3.5 px-4 text-left min-w-[130px] whitespace-nowrap">
                TUỔI THAI
              </th>
              {/* Cột 3: NGÀY KHÁM */}
              <th className="py-3.5 px-4 text-left min-w-[110px] whitespace-nowrap">
                NGÀY KHÁM
              </th>
              {/* Cột 4: ĐÁNH GIÁ SINH TRẮC HỌC */}
              <th className="py-3.5 px-4 text-left min-w-[210px] whitespace-nowrap">
                ĐÁNH GIÁ SINH TRẮC HỌC
              </th>
              {/* Cột 5: MỨC CẢNH BÁO */}
              <th className="py-3.5 px-4 text-center min-w-[150px] whitespace-nowrap">
                MỨC CẢNH BÁO
              </th>
              {/* Cột 6: TRẠNG THÁI ĐỐI SOÁT */}
              <th className="py-3.5 px-4 text-center min-w-[140px] whitespace-nowrap">
                TRẠNG THÁI ĐỐI SOÁT
              </th>
              {/* Cột 7: HÀNH ĐỘNG */}
              <th className="py-3.5 px-5 text-right min-w-[120px] whitespace-nowrap">
                HÀNH ĐỘNG
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-semibold text-slate-700">
                      Không tìm thấy hồ sơ nào phù hợp
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {hasActiveSearch
                        ? `Không có hồ sơ nào khớp với từ khóa "${searchQuery}". Thử nhập lại tên hoặc mã bệnh nhân.`
                        : 'Không có hồ sơ nào khớp với tiêu chí lọc hiện tại. Thử chọn lại trạng thái khác.'}
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAllFilters}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#0D8A7C] text-white hover:bg-[#0A7367] transition-colors cursor-pointer shadow-xs"
                    >
                      <span>Đặt lại bộ lọc</span>
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const avatarStyle = getPatientAvatarStyle(rec.patientCode);
                const initials = rec.patientName
                  .split(' ')
                  .slice(-2)
                  .map((n) => n[0])
                  .join('');

                const isPendingOcr =
                  rec.ocrStatus === 'extracted' || rec.biometricStatus === 'pending_verification';

                return (
                  <tr
                    key={rec.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Cột 1: THAI PHỤ / HỒ SƠ - Không chứa phòng khám */}
                    <td className="py-4 px-5 text-left whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${avatarStyle}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 max-w-[220px]">
                          <div
                            className="font-semibold text-slate-900 group-hover:text-teal-800 transition-colors truncate"
                            title={rec.patientName}
                          >
                            {rec.patientName}
                          </div>
                          {/* Mã hồ sơ + Ngày dự sinh EDD - Text tương phản đạt WCAG 2.2 AA */}
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-medium truncate">
                            <span className="font-mono text-slate-600 font-semibold">
                              {rec.patientCode}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 font-medium">
                              EDD: {rec.eddFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 2: TUỔI THAI */}
                    <td className="py-4 px-4 text-left whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-semibold border border-teal-100">
                        <Baby className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{rec.gestationalAgeFormatted}</span>
                      </div>
                    </td>

                    {/* Cột 3: NGÀY KHÁM (checkups.checkup_date) */}
                    <td className="py-4 px-4 text-left whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{rec.checkupDate}</span>
                      </div>
                    </td>

                    {/* Cột 4: ĐÁNH GIÁ SINH TRẮC HỌC (analysis_results) */}
                    <td className="py-4 px-4 text-left whitespace-nowrap">
                      <span
                        className="text-xs text-slate-800 font-medium whitespace-nowrap block truncate max-w-[240px]"
                        title={rec.biometricSummary}
                      >
                        {rec.biometricSummary}
                      </span>
                    </td>

                    {/* Cột 5: MỨC CẢNH BÁO */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {renderWarningLevelBadge(rec.warningLevel)}
                    </td>

                    {/* Cột 6: TRẠNG THÁI ĐỐI SOÁT */}
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {renderOcrStatusBadge(rec)}
                    </td>

                    {/* Cột 7: HÀNH ĐỘNG - Đối soát OCR nổi bật cho hồ sơ pending, Mở hồ sơ cho đã verified */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      {isPendingOcr ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onReviewOcr) onReviewOcr(rec);
                            else if (onOpenRecord) onOpenRecord(rec);
                          }}
                          className="bg-[#0D8A7C] hover:bg-[#0A7367] text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs active:scale-98 whitespace-nowrap"
                        >
                          <FileCheck2 className="w-4 h-4 stroke-[2.2]" />
                          <span>Đối soát OCR</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenRecord && onOpenRecord(rec)}
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs hover:border-slate-300 active:scale-98 whitespace-nowrap"
                        >
                          <span>Mở hồ sơ</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Hiển thị phân trang / số đếm rõ ràng & độ tương phản cao */}
      <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
        <span className="font-medium">
          Hiển thị {filteredRecords.length > 0 ? `1–${filteredRecords.length}` : '0'} trên tổng số{' '}
          <strong className="text-slate-800 font-bold">{activeRecords.length}</strong> hồ sơ trong ngày
        </span>
        <span className="text-[11px] text-slate-500 font-medium">
          PreCare Digital Obstetrics • Tiêu chuẩn Hadlock & RACA-Net Safety
        </span>
      </div>
    </div>
  );
};

export default AppointmentTable;
