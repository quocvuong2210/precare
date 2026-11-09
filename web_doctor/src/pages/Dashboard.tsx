import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppointmentTable } from '../components/AppointmentTable';
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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Quản lý internal search query nếu không được truyền từ props ngoài
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
  const handleClearSearch = externalClearSearch || (() => setInternalSearchQuery(''));

  // Khôi phục nghiêm ngặt Auth Guard: Nếu chưa xác thực qua Backend thật, lập tức chuyển hướng về /login
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user)) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  // Cập nhật câu chào tự động theo thời gian thực (0h-11h59: Sáng, 12h-17h59: Chiều, 18h-23h59: Tối)
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
      return 'CHÀO BUỔI SÁNG';
    }
    if (hour >= 12 && hour < 18) {
      return 'CHÀO BUỔI CHIỀU';
    }
    return 'CHÀO BUỔI TỐI';
  };

  // Định dạng tên Bác sĩ chỉ lấy trực tiếp từ user?.full_name, xử lý tiền tố tránh lặp
  const formatDoctorName = (name?: string | null): string | null => {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (/^(BS\.?|Bác\s*sĩ)\s*/i.test(trimmed)) {
      return trimmed;
    }
    return `BS. ${trimmed}`;
  };

  const doctorName = formatDoctorName(user?.full_name);

  // State dữ liệu lâm sàng & trạng thái API
  const [records, setRecords] = useState<ClinicalPregnancyRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [ruleVersion, setRuleVersion] = useState<string>('Hadlock (ACOG)');

  const loadDashboardData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Lấy thông tin phiên bản bộ luật từ Analysis Service (:8001 GET /api/v1/health)
      const health = await dashboardService.getAnalysisHealth();
      if (health.rule_version) {
        setRuleVersion(health.rule_version);
      }

      // 2. Tải danh sách hồ sơ thai kỳ thực tế từ API Gateway
      const res = await dashboardService.getClinicalRecords();
      setRecords(res.data);
    } catch (err: any) {
      const status = err.status || err.response?.status;
      const is404 = status === 404;
      setApiError(
        is404
          ? 'Dịch vụ quản lý hồ sơ thai kỳ trên máy chủ hiện chưa sẵn sàng (404 Not Found).'
          : err.message || 'Không thể kết nối đến máy chủ API Gateway.'
      );
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Thống kê số liệu lâm sàng động từ tập records thực tế (trả về null nếu API lỗi)
  const metrics = useMemo(() => {
    if (apiError || records.length === 0) {
      return null;
    }
    return dashboardService.calculateMetrics(records);
  }, [records, apiError]);

  const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div className="space-y-5">
      {/* 1. Banner chào bác sĩ */}
      <section className="relative overflow-hidden rounded-2xl bg-[#0D9488] p-6 sm:p-7 text-white shadow-sm">
        {/* Subtle decorative background glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-white">
              {doctorName ? (
                <span className="uppercase">
                  {getGreeting()}, {doctorName}!
                </span>
              ) : (
                'Chào Bác sĩ! (Không thể tải thông tin định danh)'
              )}
            </h1>
            {apiError ? (
              <p className="font-sans text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Chưa thể tải dữ liệu tổng quan trong ngày do dịch vụ Hồ sơ thai kỳ chưa phản hồi.
              </p>
            ) : metrics ? (
              <p className="font-sans text-xs sm:text-sm text-teal-100/95 leading-relaxed">
                Hôm nay bạn có{' '}
                <strong className="text-white font-bold">{metrics.recordsToday} hồ sơ thai kỳ</strong> cần
                theo dõi. Hệ thống tự động phát hiện{' '}
                <strong className="text-white font-bold">
                  {metrics.redAlertsToday} hồ sơ có cờ đỏ lâm sàng (nghi ngờ thai chậm phát triển FGR)
                </strong>{' '}
                và{' '}
                <strong className="text-white font-bold">{metrics.pendingOcrTotal} tệp siêu âm</strong>{' '}
                đang ở trạng thái chờ bác sĩ đối soát kết quả OCR.
              </p>
            ) : (
              <p className="font-sans text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Đang chuẩn bị thông tin hồ sơ thai kỳ và phân tích lâm sàng trong ngày...
              </p>
            )}
          </div>

          {metrics && metrics.pendingOcrTotal > 0 && (
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
          )}
        </div>
      </section>

      {/* Thông báo lỗi kết nối API (khi backend chưa có API danh sách hồ sơ) */}
      {apiError && (
        <div className="bg-amber-50/90 border border-amber-200/90 text-amber-900 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0" />
            <span className="font-medium leading-relaxed">{apiError}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs shrink-0 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* 2. Cảnh báo an toàn lâm sàng */}
      <ClinicalDisclaimerBanner
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
              {metrics ? metrics.totalPatientsManaged.toLocaleString() : '--'}
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
              {metrics ? formatTwoDigits(metrics.recordsToday) : '--'}
            </div>
            <div className="h-5 flex items-center gap-1.5 text-xs font-medium text-slate-600 mt-1 truncate">
              {metrics ? (
                <>
                  <span>{metrics.verifiedToday} đã xác nhận</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-teal-700 font-semibold">{metrics.pendingOcrToday} chờ đối soát</span>
                </>
              ) : (
                <span>Chờ kết nối dữ liệu</span>
              )}
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
              {metrics ? formatTwoDigits(metrics.redAlertsToday) : '--'}
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
              {metrics ? formatTwoDigits(metrics.pendingOcrTotal) : '--'}
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
          error={apiError}
          onRetry={loadDashboardData}
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
