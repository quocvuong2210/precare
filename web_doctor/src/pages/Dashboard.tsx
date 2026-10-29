import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calendar,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppointmentTable, mockClinicalRecords } from '../components/AppointmentTable';
import { ClinicalDisclaimerBanner } from '../components/ClinicalDisclaimerBanner';
import { ClinicalPregnancyRecord } from '../types';
import { dashboardService } from '../services/dashboard.service';

interface DashboardProps {
  onSelectPatient: (id: string) => void;
  searchQuery?: string;
  onClearSearch?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectPatient,
  searchQuery: externalSearchQuery,
  onClearSearch: externalClearSearch,
}) => {
  const { user } = useAuth();

  // Quản lý internal search query nếu không được truyền từ props ngoài
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const handleClearSearch = externalClearSearch || (() => setInternalSearchQuery(''));

  // Tên bác sĩ ưu tiên lấy từ phiên người dùng đã xác thực (GET /api/v1/auth/me)
  const doctorDisplayName = user?.full_name
    ? (user.full_name.startsWith('BS.') ? user.full_name : `BS. ${user.full_name}`)
    : 'BS. CKI LÊ HOÀNG';

  // State dữ liệu lâm sàng & trạng thái API
  const [records, setRecords] = useState<ClinicalPregnancyRecord[]>(mockClinicalRecords);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiNotice, setApiNotice] = useState<string | null>(null);
  const [analysisInfo, setAnalysisInfo] = useState<{ ruleVersion: string; modelVersion: string }>({
    ruleVersion: 'Hadlock-ACOG-v1.0',
    modelVersion: 'RACA-Net-ResNet50-v1.2',
  });

  const loadDashboardData = async () => {
    setIsLoading(true);
    setApiNotice(null);
    try {
      // 1. Lấy thông tin phiên bản luật/mô hình từ Analysis Service (:8001 GET /api/v1/health)
      const health = await dashboardService.getAnalysisHealth();
      setAnalysisInfo({
        ruleVersion: health.rule_version || 'Hadlock-ACOG-v1.0',
        modelVersion: health.model_version || 'RACA-Net-ResNet50-v1.2',
      });

      // 2. Tải danh sách hồ sơ thai kỳ từ API Gateway
      const res = await dashboardService.getClinicalRecords();
      setRecords(res.data);
      if (res.message) {
        setApiNotice(res.message);
      }
    } catch {
      setApiNotice('Không thể kết nối đến máy chủ API Gateway. Đang sử dụng dữ liệu dự phòng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Thống kê số liệu lâm sàng trong ngày
  const metrics = useMemo(() => {
    return dashboardService.calculateMetrics(records);
  }, [records]);

  const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div className="space-y-5">
      {/* 1. Banner chào bác sĩ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0C4E47] via-[#0F5C53] to-[#0A423C] p-6 sm:p-7 text-white shadow-sm">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-white uppercase">
              CHÀO BUỔI SÁNG, {doctorDisplayName}!
            </h1>
            <p className="font-sans text-xs sm:text-sm text-teal-100/95 leading-relaxed">
              Hôm nay bạn có{' '}
              <strong className="text-white font-bold">{metrics.recordsToday} hồ sơ thai kỳ</strong> cần
              theo dõi. Hệ thống tự động phát hiện{' '}
              <strong className="text-white font-bold">
                {metrics.redAlertsToday} hồ sơ có cờ đỏ lâm sàng (nghi ngờ thai chậm phát triển FGR)
              </strong>{' '}
              và <strong className="text-white font-bold">{metrics.pendingOcrTotal} tệp siêu âm</strong>{' '}
              đang ở trạng thái chờ bác sĩ đối soát kết quả OCR.
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('[aria-label="Danh sách trạng thái hồ sơ thai kỳ"]');
                if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#0C4E47] hover:bg-teal-50 text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-95 whitespace-nowrap"
            >
              <span>Xem {metrics.pendingOcrTotal} tệp OCR cần duyệt</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* Thông báo trạng thái kết nối API (khi backend chưa có API danh sách hồ sơ) */}
      {apiNotice && (
        <div className="bg-amber-50/90 border border-amber-200/90 text-amber-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">{apiNotice}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="inline-flex items-center gap-1 font-bold text-teal-800 hover:text-teal-950 hover:underline shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 2. Cảnh báo an toàn lâm sàng & thông tin mô hình phân tích */}
      <ClinicalDisclaimerBanner
        rulesVersion={analysisInfo.ruleVersion}
        modelVersion={analysisInfo.modelVersion}
        disclaimerText="LƯU Ý Y TẾ: Kết quả phân tích của PreCare chỉ mang tính chất hỗ trợ sàng lọc và tham khảo, không thay thế quyết định chẩn đoán của bác sĩ chuyên khoa."
      />

      {/* 3. Thẻ thống kê chỉ số (KPI Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Tổng thai phụ */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="h-8 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              TỔNG THAI PHỤ
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="h-9 flex items-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {metrics.totalPatientsManaged.toLocaleString()}
            </div>
            <div className="h-5 flex items-center text-xs font-medium text-slate-500 mt-1">
              <span>Hồ sơ trong hệ thống</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Hồ sơ khám hôm nay */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="h-8 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              HỒ SƠ KHÁM HÔM NAY
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100/80 text-teal-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="h-9 flex items-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {formatTwoDigits(metrics.recordsToday)}
            </div>
            <div className="h-5 flex items-center gap-1.5 text-xs font-medium text-slate-600 mt-1 truncate">
              <span>{metrics.verifiedToday} đã xác nhận</span>
              <span className="text-slate-400">·</span>
              <span className="text-teal-700 font-semibold">{metrics.pendingOcrToday} chờ đối soát</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Cảnh báo nguy cơ cao */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="h-8 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              CẢNH BÁO NGUY CƠ CAO
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="h-9 flex items-center text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
              {formatTwoDigits(metrics.redAlertsToday)}
            </div>
            <div className="h-5 flex items-center text-xs text-rose-600 font-medium mt-1 truncate">
              <span>Hồ sơ cần bác sĩ xem xét</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Hồ sơ chờ duyệt OCR */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
          <div className="h-8 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              HỒ SƠ CHỜ DUYỆT OCR
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1">
            <div className="h-9 flex items-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
              {formatTwoDigits(metrics.pendingOcrTotal)}
            </div>
            <div className="h-5 flex items-center text-xs text-slate-600 font-medium mt-1">
              <span>Tệp siêu âm chờ đối soát</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Danh sách hồ sơ thai kỳ & đối soát cận lâm sàng */}
      <section className="w-full">
        <AppointmentTable
          records={records}
          isLoading={isLoading}
          searchQuery={searchQuery}
          clearSearch={handleClearSearch}
          onOpenRecord={(rec: ClinicalPregnancyRecord) => onSelectPatient(rec.patientId)}
          onReviewOcr={(rec: ClinicalPregnancyRecord) => onSelectPatient(rec.patientId)}
        />
      </section>
    </div>
  );
};

export default Dashboard;
