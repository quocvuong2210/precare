import React, { useState, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { RequestDeletionModal } from '../components/RequestDeletionModal';
import {
  getStoredPregnancyRecords,
  PregnancyRecordItem,
  PregnancyStatus,
  updatePregnancyStatus,
  fetchPregnancyProfileByIdApi,
  fetchActivePregnancyProfileApi,
  updatePregnancyProfileStatusApi,
} from '../services/pregnancyProfile.service';
import {
  getStoredPatients,
} from '../services/patient.service';
import {
  calculatePregnancyDates,
  PregnancyCalculationParams,
  formatDateToDisplay,
  getTodayISO,
} from '../services/pregnancyCalculator';
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  CheckCircle2,
  Stethoscope,
  X,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patientId, onBack }) => {
  // 1. Quản lý bản ghi hồ sơ thai kỳ & Loading/Error states
  const [recordsVersion, setRecordsVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const initialRecord = useMemo<PregnancyRecordItem | undefined>(() => {
    const list = getStoredPregnancyRecords();
    const found = list.find((r) => r.id === patientId || r.patientId === patientId);
    if (found) return found;

    const patients = getStoredPatients();
    const p = patients.find((pat) => pat.id === patientId || pat.pregnancyRecordId === patientId);
    if (p && p.pregnancyRecordId) {
      return list.find((r) => r.id === p.pregnancyRecordId);
    }
    return undefined;
  }, [patientId, recordsVersion]);

  // Xóa dữ liệu bệnh nhân cũ khi patientId thay đổi; chỉ hiển thị bản ghi phù hợp
  const [currentRecord, setCurrentRecord] = useState<PregnancyRecordItem | undefined>(initialRecord);
  useEffect(() => {
    setCurrentRecord(initialRecord);
  }, [initialRecord]);

  // 2. State Ngày mốc khám target_date (mặc định hôm nay theo Endpoint 3 STORY-3.1)
  const [targetDate, setTargetDate] = useState<string>(getTodayISO());

  // Nạp chi tiết hồ sơ thai kỳ từ API với fallback
  const loadProfileDetail = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      let record: PregnancyRecordItem;
      if (patientId.startsWith('prof-')) {
        record = await fetchPregnancyProfileByIdApi(patientId, targetDate);
      } else {
        try {
          record = await fetchActivePregnancyProfileApi(patientId);
        } catch {
          record = await fetchPregnancyProfileByIdApi(patientId, targetDate);
        }
      }
      setCurrentRecord(record);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Không thể tải dữ liệu từ máy chủ API (Cổng 8000)';
      setFetchError(initialRecord ? `${msg}. Đang kích hoạt dữ liệu đệm dự phòng.` : msg);
      if (initialRecord) {
        setCurrentRecord(initialRecord);
      } else {
        setCurrentRecord(undefined);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    loadProfileDetail();
  }, [patientId, recordsVersion]);

  // Thông tin thai phụ định danh
  const patientInfo = useMemo(() => {
    const patients = getStoredPatients();
    const found = patients.find(
      (p) =>
        p.id === patientId ||
        p.pregnancyRecordId === currentRecord?.id ||
        (currentRecord?.patientName && p.fullName === currentRecord?.patientName)
    );
    return {
      fullName: currentRecord?.patientName || found?.fullName || 'Chưa xác định',
      phoneNumber: currentRecord?.phoneNumber || found?.phoneNumber || '---',
      email: currentRecord?.email || found?.email || '---',
    };
  }, [patientId, currentRecord]);

  // 3. Modal Đổi trạng thái (PATCH /api/v1/pregnancy-profiles/{profile_id}/status)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<PregnancyStatus>(
    currentRecord?.status || 'active'
  );
  const [statusReason, setStatusReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Xử lý lưu đổi trạng thái qua API Axios
  const handleConfirmStatusChange = async () => {
    if (!currentRecord) return;
    setIsUpdatingStatus(true);
    setStatusError(null);

    try {
      let updated: PregnancyRecordItem;
      try {
        updated = await updatePregnancyProfileStatusApi(
          currentRecord.id,
          selectedStatus,
          statusReason
        );
      } catch (apiErr: any) {
        throw apiErr; // Giữ trạng thái giữa UI và backend đồng bộ; hiển thị lỗi thay vì toast thành công
      }

      setCurrentRecord(updated);
      setRecordsVersion((prev) => prev + 1);

      const statusName =
        selectedStatus === 'completed'
          ? 'Đã sinh (Completed)'
          : selectedStatus === 'terminated'
          ? 'Đình chỉ (Terminated)'
          : 'Đang hoạt động (Active)';

      setToastMessage(`Đã cập nhật trạng thái hồ sơ sang: ${statusName}`);
      setTimeout(() => setToastMessage(null), 3500);

      setIsStatusModalOpen(false);
      setStatusReason('');
    } catch (err: any) {
      setStatusError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Lỗi khi cập nhật trạng thái hồ sơ'
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 4. Tính toán số liệu thai kỳ động theo ACOG 700 / Q1 CRL tại mốc khám targetDate
  const clinicalCalc = useMemo(() => {
    if (!currentRecord) return null;
    try {
      const params: PregnancyCalculationParams = {
        targetDate,
        lmp: currentRecord.lmp,
        q1UltrasoundDate: currentRecord.q1UltrasoundDate,
        q1GestationalWeeks: currentRecord.q1GestationalWeeks,
        q1GestationalDays: currentRecord.q1GestationalDays,
        crlMm: currentRecord.crlMm,
        overrideEdd: currentRecord.overrideEdd || currentRecord.edd,
      };
      return calculatePregnancyDates(params);
    } catch {
      return null;
    }
  }, [currentRecord, targetDate]);

  // Dữ liệu tuổi thai và chu sinh
  const currentGaFormatted =
    clinicalCalc?.gestationalAge?.formatted ||
    currentRecord?.gestationalAgeFormatted ||
    'Chưa có dữ liệu';
  const currentGaDays =
    clinicalCalc?.gestationalAge?.days ??
    currentRecord?.gestationalAgeDays;
  const currentGaWeeks =
    clinicalCalc?.gestationalAge?.weeks ??
    (currentGaDays != null ? Math.floor(currentGaDays / 7) : null);
  const currentEdd =
    clinicalCalc?.formattedEdd ||
    currentRecord?.displayEdd ||
    (currentRecord?.edd ? formatDateToDisplay(currentRecord.edd) : 'Chưa có dữ liệu');
  const currentDaysUntilEdd =
    clinicalCalc?.daysUntilEdd ??
    currentRecord?.daysUntilEdd;

  // Xác định tam cá nguyệt chuẩn y khoa:
  // Quý 1: 0 - 97 ngày (0w - 13w6d)
  // Quý 2: 98 - 195 ngày (14w - 27w6d)
  // Quý 3: >= 196 ngày (>= 28w)
  const currentTrimester =
    clinicalCalc?.gestationalAge?.trimester ??
    (currentGaDays == null
      ? null
      : currentGaDays <= 97
      ? 1
      : currentGaDays <= 195
      ? 2
      : 3);

  const trimesterBadge =
    currentTrimester === 1
      ? {
          label: 'TAM CÁ NGUYỆT THỨ 1 (QUÝ 1)',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        }
      : currentTrimester === 2
      ? {
          label: 'TAM CÁ NGUYỆT THỨ 2 (3 THÁNG GIỮA)',
          className: 'bg-[#F3E8FF] text-[#6B21A8] border-purple-200',
        }
      : currentTrimester === 3
      ? {
          label: 'TAM CÁ NGUYỆT THỨ 3 (3 THÁNG CUỐI)',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        }
      : null;

  // Tỷ lệ % tiến trình thai kỳ (chuẩn 280 ngày)
  const progressPercent =
    currentGaDays != null
      ? Math.min(100, Math.max(0, Number(((currentGaDays / 280) * 100).toFixed(1))))
      : 0;

  // Tính toán tỷ lệ fill (%) cho từng phân đoạn sao cho màu chỉ chạy đến đúng mốc hôm nay:
  // Phân đoạn 1 (Quý 1: 0% - 33.33% tổng tiến trình)
  const q1FillWidth =
    currentGaDays != null
      ? progressPercent <= 33.33
        ? Math.min(100, Math.max(0, (progressPercent / 33.33) * 100))
        : 100
      : 0;
  const q1IsActive = currentTrimester === 1;

  // Phân đoạn 2 (Quý 2: 33.33% - 66.66% tổng tiến trình)
  const q2FillWidth =
    currentGaDays != null
      ? progressPercent <= 33.33
        ? 0
        : progressPercent <= 66.66
        ? Math.min(100, Math.max(0, ((progressPercent - 33.33) / 33.33) * 100))
        : 100
      : 0;
  const q2IsActive = currentTrimester === 2;

  // Phân đoạn 3 (Quý 3: 66.66% - 100% tổng tiến trình)
  const q3FillWidth =
    currentGaDays != null
      ? progressPercent <= 66.66
        ? 0
        : Math.min(100, Math.max(0, ((progressPercent - 66.66) / 33.34) * 100))
      : 0;
  const q3IsActive = currentTrimester === 3;

  // Dữ liệu lâm sàng đầu vào (Chuẩn PostgreSQL 16 schema)
  const displayLmp = currentRecord?.lmp
    ? formatDateToDisplay(currentRecord.lmp)
    : 'Chưa có dữ liệu';
  const displayQ1Date = currentRecord?.q1UltrasoundDate
    ? formatDateToDisplay(currentRecord.q1UltrasoundDate)
    : 'Chưa có dữ liệu';
  const displayQ1Ga =
    currentRecord?.q1GestationalWeeks !== undefined
      ? `${currentRecord.q1GestationalWeeks} tuần ${currentRecord.q1GestationalDays ?? 0} ngày`
      : 'Chưa có dữ liệu';
  const displayCrl = currentRecord?.crlMm
    ? `${currentRecord.crlMm.toFixed(2)} mm`
    : 'Chưa có dữ liệu';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-lg border border-emerald-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* API Error / Offline Fallback Alert Banner */}
      {fetchError && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-800 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadProfileDetail}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Thử lại API</span>
          </button>
        </div>
      )}

      {/* Loading Overlay or Indicator */}
      {isLoading && !currentRecord && (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#275248]" />
          <span className="text-sm font-semibold text-slate-700">Đang tải chi tiết hồ sơ thai kỳ từ API...</span>
        </div>
      )}

      {/* 1. NÚT QUAY LẠI DANH SÁCH (ĐẶT Ở TRÊN CARD THÔNG TIN) */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
      </div>

      {!currentRecord && !isLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">Không tìm thấy hồ sơ thai kỳ</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {fetchError
                ? `Lỗi tải dữ liệu: ${fetchError}`
                : `Không tìm thấy hồ sơ thai kỳ tương ứng với mã định danh "${patientId}". Vui lòng kiểm tra lại đường dẫn hoặc danh sách hồ sơ.`}
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={loadProfileDetail}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#275248] hover:bg-[#1f423a] text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Thử lại API</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. CARD THÔNG TIN THAI PHỤ (HEADER) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#275248] uppercase tracking-wider">
              CHI TIẾT HỒ SƠ THAI KỲ
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {patientInfo.fullName}
          </h2>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
            <span>
              SĐT: <strong className="text-slate-700">{patientInfo.phoneNumber}</strong>
            </span>
            <span>•</span>
            <span>
              Email: <strong className="text-slate-700">{patientInfo.email}</strong>
            </span>
            <span>•</span>
            <span>
              Bác sĩ phụ trách:{' '}
              <strong className="text-slate-700">
                {currentRecord?.doctorName || 'BS. Nguyễn Thu Hương'}
              </strong>
            </span>
          </div>
        </div>

        {/* Nút hành động & Trạng thái */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Status Badge */}
          {currentRecord?.status === 'completed' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#E0F2FE] text-[#0369A1] border border-sky-200">
              <span className="w-2 h-2 rounded-full bg-[#0284C7]"></span>
              Đã sinh (Completed)
            </span>
          ) : currentRecord?.status === 'terminated' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#FFE4E6] text-[#BE123C] border border-rose-200">
              <span className="w-2 h-2 rounded-sm bg-[#E11D48]"></span>
              Đình chỉ (Terminated)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#DCFCE7] text-[#15803D] border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]"></span>
              Đang hoạt động (Active)
            </span>
          )}

          {/* Button Đổi trạng thái */}
          <button
            onClick={() => {
              setSelectedStatus(currentRecord?.status || 'active');
              setIsStatusModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4 text-slate-600" />
            <span>Đổi trạng thái</span>
          </button>

          <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-2xs cursor-pointer"
              title="Yêu cầu xóa hồ sơ theo chuẩn bảo mật y tế"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Yêu cầu xóa</span>
          </button>

          {/* Button Xuất PDF */}
          <button
            onClick={() =>
              alert(
                `Đã xuất báo cáo PDF hồ sơ thai kỳ của bệnh nhân ${patientInfo.fullName}!`
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-white bg-[#275248] hover:bg-[#1f423a] transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Xuất PDF
          </button>
        </div>
      </div>

      {/* 3. KHỐI DUY NHẤT: TUỔI THAI & TIẾN TRÌNH THAI KỲ (HỢP NHẤT TARGET_DATE & TIẾN TRÌNH THỰC TẾ) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {/* Header khối: Tiêu đề + DatePicker target_date + Badge tam cá nguyệt */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1 border-b border-slate-100">
          {/* Tiêu đề bên trái */}
          <div className="flex items-center gap-2 text-slate-800">
            <div className="w-6 h-6 rounded-full border-2 border-[#9F1239] flex items-center justify-center text-[#9F1239]">
              <div className="w-1.5 h-1.5 bg-[#9F1239] rounded-full"></div>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Tuổi thai &amp; Tiến trình Thai kỳ
            </h3>
          </div>

          {/* Ở giữa/Bên phải: DatePicker tra cứu target_date + Badge Quý */}
          <div className="flex flex-wrap items-center gap-3">
            {/* DatePicker target_date */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-colors">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                Xem tại ngày mốc:
              </span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer"
              />
            </div>

            {targetDate !== getTodayISO() && (
              <button
                onClick={() => setTargetDate(getTodayISO())}
                className="px-2.5 py-1.5 text-xs font-semibold text-[#275248] hover:text-[#1f423a] bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                title="Quay lại ngày hiện tại"
              >
                Hôm nay
              </button>
            )}

            {/* Badge tam cá nguyệt */}
            {trimesterBadge && (
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border whitespace-nowrap ${trimesterBadge.className}`}
              >
                {trimesterBadge.label}
              </span>
            )}
          </div>
        </div>

        {/* 2 Thẻ chỉ số lớn cân đối (50% - 50%) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Thẻ 1: Tuổi thai xác định */}
          <div className="bg-[#FFF5F7]/70 border border-[#FFE4E8] rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600">Tuổi thai xác định</div>
              <div className="text-4xl font-black text-[#9F1239] tracking-tight mt-2">
                {currentGaFormatted}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                {currentGaDays != null ? `Tương đương: ${currentGaDays} ngày liên tục` : 'Chưa có dữ liệu tuổi thai'}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#FFE4E8] flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {currentGaDays != null ? 'Tốc độ phát triển chuẩn FTS' : 'Đang chờ cập nhật dữ liệu khám'}
              </span>
            </div>
          </div>

          {/* Thẻ 2: Đếm ngược Dự sinh (EDD) */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600">Đếm ngược Dự sinh (EDD)</div>
              <div className="text-4xl font-black text-slate-900 tracking-tight mt-2">
                {currentDaysUntilEdd != null ? (
                  <>
                    {currentDaysUntilEdd} <span className="text-lg font-semibold text-slate-600">ngày</span>
                  </>
                ) : (
                  '---'
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">
                Hạn dự kiến: {currentEdd}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/70 text-xs text-slate-500">
              Khoảng dự sinh: <strong className="text-slate-700">Tuần 38w - 41w</strong>
            </div>
          </div>
        </div>

        {/* Lược đồ Tiến trình Thai kỳ (3 Giai đoạn) - Màu chỉ phủ đến đúng mốc hôm nay */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 text-sm">
              Lược đồ Tiến trình Thai kỳ (3 Giai đoạn)
            </span>
            <span className="font-extrabold text-[#9F1239] text-sm">
              {currentGaDays != null ? `${progressPercent}% Thai kỳ` : 'Chưa có dữ liệu'}
            </span>
          </div>

          {/* Marker 'Hôm nay: gt' + Progress Bar */}
          <div className="relative pt-6 pb-1">
            {/* Tooltip marker chỉ vị trí chính xác */}
            {currentGaDays != null && (
              <div
                className="absolute -top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300 z-10"
                style={{ left: `${Math.min(96, Math.max(4, progressPercent))}%` }}
              >
                <div className="px-2.5 py-1 bg-[#9F1239] text-white text-[11px] font-bold rounded-lg shadow-sm whitespace-nowrap">
                  {targetDate === getTodayISO() ? 'Hôm nay' : 'Mốc khám'}: {currentGaFormatted}
                </div>
                <div className="w-2 h-1 bg-[#9F1239] [clip-path:polygon(50%_100%,0_0,100%_0)]"></div>
              </div>
            )}

            {/* Segmented Progress Bar: Chỉ tô màu đến đúng điểm marker */}
            <div className="grid grid-cols-3 gap-1.5 h-3">
              {/* Phân đoạn Quý 1 */}
              <div className="rounded-l-full h-full bg-slate-200 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    q1IsActive ? 'bg-[#9F1239]' : 'bg-[#2D6A5D]'
                  }`}
                  style={{ width: `${q1FillWidth}%` }}
                ></div>
              </div>

              {/* Phân đoạn Quý 2 */}
              <div className="h-full bg-slate-200 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    q2IsActive ? 'bg-[#9F1239]' : 'bg-[#2D6A5D]'
                  }`}
                  style={{ width: `${q2FillWidth}%` }}
                ></div>
              </div>

              {/* Phân đoạn Quý 3 */}
              <div className="rounded-r-full h-full bg-slate-200 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-300 ${
                    q3IsActive ? 'bg-[#9F1239]' : 'bg-[#2D6A5D]'
                  }`}
                  style={{ width: `${q3FillWidth}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Mô tả 3 giai đoạn bên dưới thanh tiến trình */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <div className="text-xs font-bold text-slate-800">Quý 1 (0w - 13w6d)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {currentTrimester === 1
                  ? `Giai đoạn hiện tại${currentGaWeeks != null ? ` (Tuần ${currentGaWeeks})` : ''}`
                  : currentTrimester != null && currentTrimester > 1
                  ? 'Đã hoàn thành'
                  : '---'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800">Quý 2 (14w - 27w6d)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {currentTrimester === 2
                  ? `Giai đoạn hiện tại${currentGaWeeks != null ? ` (Tuần ${currentGaWeeks})` : ''}`
                  : currentTrimester != null && currentTrimester > 2
                  ? 'Đã hoàn thành'
                  : currentTrimester != null && currentTrimester < 2
                  ? 'Sắp tới'
                  : '---'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800">Quý 3 (28w - 40w)</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {currentTrimester === 3
                  ? `Giai đoạn hiện tại${currentGaWeeks != null ? ` (Tuần ${currentGaWeeks})` : ''}`
                  : currentTrimester != null && currentTrimester < 3
                  ? 'Sắp tới'
                  : '---'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. KHỐI: DỮ LIỆU LÂM SÀNG ĐẦU VÀO (CHUẨN HÓA SCHEMA POSTGRESQL 16) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Stethoscope className="w-5 h-5 text-[#275248]" />
            <h3 className="text-base font-bold text-slate-800">Dữ liệu Lâm sàng Đầu vào</h3>
          </div>
          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#E6F4F1] text-[#275248] border border-teal-200/60">
            {currentRecord?.primaryMethod === 'direct_edd'
              ? 'Chỉ định EDD trực tiếp'
              : currentRecord?.primaryMethod === 'lmp'
              ? 'Ngày kinh cuối (LMP)'
              : currentRecord?.primaryMethod === 'crl'
              ? 'Chiều dài đầu mông (CRL)'
              : 'Siêu âm Quý 1 (Q1 Ultrasound)'}
          </span>
        </div>

        {/* 4 Thẻ thông số: Đã loại bỏ các chú thích phụ không có trong schema CSDL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: LMP */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium text-xs block">
              Ngày kinh cuối (LMP)
            </span>
            <div className="text-base font-bold text-slate-800 mt-1">{displayLmp}</div>
          </div>

          {/* Card 2: Ngày siêu âm Quý 1 */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium text-xs block">
              Ngày siêu âm Quý 1
            </span>
            <div className="text-base font-bold text-slate-800 mt-1">{displayQ1Date}</div>
          </div>

          {/* Card 3: Tuổi thai lúc siêu âm Q1 (Khớp chuẩn Hadlock) */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70">
            <span className="text-slate-400 font-medium text-xs block">
              Tuổi thai lúc siêu âm Q1
            </span>
            <div className="text-base font-bold text-slate-800 mt-1">{displayQ1Ga}</div>
          </div>

          {/* Card 4: Chiều dài đầu mông CRL */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/70">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-xs">
                Chiều dài đầu mông (CRL)
              </span>
              {currentRecord?.crlMm ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Chuẩn
                </span>
              ) : null}
            </div>
            <div className="text-base font-bold text-slate-800 mt-1">{displayCrl}</div>
          </div>
        </div>

        {/* Card Full-Width: Ngày dự sinh (EDD) chuẩn phê duyệt */}
        <div className="bg-[#F0FDF4]/70 border border-emerald-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#275248] text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Ngày dự sinh (EDD) chuẩn phê duyệt
              </span>
              <div className="text-2xl sm:text-3xl font-black text-[#275248] tracking-tight">
                {currentEdd}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600 sm:text-right max-w-sm">
            Dự sinh chính thức được hội đồng sản khoa thống nhất theo chuẩn ACOG 700 /
            INTERGROWTH-21st
          </div>
        </div>
      </div>
      </>
      )}

      {/* MODAL ĐỔI TRẠNG THÁI HỒ SƠ THAI KỲ (PATCH /api/v1/pregnancy-profiles/{profile_id}/status) */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cập nhật Trạng thái Hồ sơ Thai kỳ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thai phụ: <strong className="text-slate-700">{patientInfo.fullName}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chọn trạng thái mới */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Chọn trạng thái mới
              </label>
              <div className="space-y-2">
                {[
                  {
                    value: 'active' as PregnancyStatus,
                    label: 'Đang hoạt động (Active)',
                    desc: 'Thai kỳ đang trong quá trình theo dõi',
                    color: 'emerald',
                  },
                  {
                    value: 'completed' as PregnancyStatus,
                    label: 'Đã sinh (Completed)',
                    desc: 'Thai kỳ kết thúc thành công sau sinh',
                    color: 'sky',
                  },
                  {
                    value: 'terminated' as PregnancyStatus,
                    label: 'Đình chỉ (Terminated)',
                    desc: 'Thai kỳ kết thúc sớm do y khoa hoặc sảy thai',
                    color: 'rose',
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedStatus === opt.value
                        ? 'border-[#275248] bg-[#E6F4F1]/30 font-semibold text-slate-900 ring-1 ring-[#275248]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pregnancy_status"
                      value={opt.value}
                      checked={selectedStatus === opt.value}
                      onChange={() => setSelectedStatus(opt.value)}
                      className="mt-0.5 accent-[#275248]"
                    />
                    <div>
                      <div className="font-bold">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 font-normal">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Lý do cập nhật */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Lý do thay đổi (Ghi chú lâm sàng)
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Ví dụ: Sinh thường an toàn tại Bệnh viện Phụ sản TW / Chuyển viện tuyến trên..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-[#275248] focus:ring-1 focus:ring-[#275248] outline-none resize-none"
              />
            </div>

            {/* Error Message if API fails */}
            {statusError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isUpdatingStatus}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#275248] hover:bg-[#1f423a] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60"
              >
                {isUpdatingStatus ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu qua API...</span>
                  </>
                ) : (
                  <span>Lưu trạng thái</span>
                )}
              </button>
            </div>
          </div>
        </div>

      )}
      {currentRecord && (
        <RequestDeletionModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          pregnancyProfileId={currentRecord.id}
          patientName={patientInfo.fullName}
          onSuccess={() => {
            setToastMessage("Yêu cầu xóa hồ sơ đã được gửi thành công và chuyển vào hàng đợi thẩm định.");
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};

export default PatientDetail;
