import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  Stethoscope,
  Copy,
  ScanLine,
  FileX,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AdminDashboardData,
} from '../../types/adminDashboard.types';
import {
  adminMockService,
  DashboardOverviewResponse,
} from '../../mocks/adminMockData';

const mapOverviewToDashboardData = (overview: DashboardOverviewResponse): AdminDashboardData => {
  return {
    kpis: overview.kpis,
    riskDistribution: {
      totalAnalyzed: overview.warningDistribution.totalAnalyzed,
      items: overview.warningDistribution.breakdown.map((item) => ({
        id: (item.level === 'yellow' ? 'amber' : item.level) as 'green' | 'amber' | 'red',
        name: item.label,
        description: item.description,
        count: item.count,
        percentage: item.percentage,
        colorHex: item.colorHex,
      })),
    },
    pendingTasks: overview.pendingTasks as any,
    lastUpdated: overview.lastUpdated,
  };
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const overview = await adminMockService.getDashboardOverview();
      setDashboardData(mapOverviewToDashboardData(overview));
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tổng quan Hệ thống & Trí tuệ nhân tạo
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi sức khỏe dịch vụ, rủi ro lâm sàng và hàng đợi vận hành.
            </p>
          </div>
        </div>
        <div className="min-h-[420px] flex flex-col items-center justify-center gap-3 bg-white rounded-xl border border-slate-200/80 p-12 shadow-2xs">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500">Đang tính toán các chỉ số hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & Nút Cập nhật trạng thái */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tổng quan Hệ thống & Trí tuệ nhân tạo
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi sức khỏe dịch vụ, rủi ro lâm sàng và hàng đợi vận hành.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Cập nhật trạng thái</span>
        </button>
      </div>

      {/* Khối Tổng quan hoạt động (3 thẻ KPI) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900">Tổng quan hoạt động</h2>
          <span className="text-xs text-slate-400 font-normal">Dữ liệu nghiệp vụ cập nhật gần nhất</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Tổng Phụ nữ mang thai */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tổng Phụ nữ mang thai</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {dashboardData.kpis.totalPregnantWomen.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-normal ml-3">
                Tại {dashboardData.kpis.totalFacilities} cơ sở
              </span>
            </div>
          </div>

          {/* Card 2: Tổng Bác sĩ lâm sàng */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Bác sĩ lâm sàng</span>
              <Stethoscope className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {dashboardData.kpis.totalDoctors || 12}
              </span>
              <span className="text-xs text-slate-400 font-normal ml-3">
                {dashboardData.kpis.activeDoctors || 12} bác sĩ đang hoạt động
              </span>
            </div>
          </div>

          {/* Card 3: Tệp OCR chờ xử lý */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Tệp OCR chờ xử lý</span>
              <Copy className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline mt-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {dashboardData.kpis.pendingOcrFiles}
              </span>
              <span className="text-xs text-slate-400 font-normal ml-3">
                {dashboardData.kpis.readyToMapOcrFiles} tệp sẵn sàng ánh xạ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Khối bên dưới chia 2 cột: Phân bổ mức cảnh báo & Cần xử lý */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái: Phân bổ mức cảnh báo lâm sàng */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Phân bổ mức cảnh báo lâm sàng</h3>
              <span className="text-[11px] text-slate-400 font-normal">
                Theo kết quả phân tích gần nhất của mỗi hồ sơ
              </span>
            </div>

            <div className="flex items-baseline mt-3">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {dashboardData.riskDistribution.totalAnalyzed.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-normal ml-3">
                thống kê trên các hồ sơ đã có kết quả phân tích
              </span>
            </div>

            {/* Thanh Progress Bar ngang ghép từ 3 màu */}
            <div className="mt-5 flex w-full h-3 rounded-full overflow-hidden bg-slate-100 gap-0.5">
              {dashboardData.riskDistribution.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.colorHex,
                  }}
                  className="h-full transition-all"
                  title={`${item.name}: ${item.percentage}%`}
                />
              ))}
            </div>

            {/* Danh sách chi tiết 3 dòng */}
            <div className="mt-6 space-y-3">
              {dashboardData.riskDistribution.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <span className="font-semibold text-slate-800 w-12">{item.name}</span>
                    <span className="text-slate-500">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-bold text-slate-900">{item.count.toLocaleString()}</span>
                    <span className="text-slate-400 w-8 text-right font-medium">{item.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cột phải: Card Cần xử lý */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Cần xử lý</h3>
            <div className="divide-y divide-slate-100">
              {dashboardData.pendingTasks.map((task) => (
                <div key={task.id} className="py-3.5 flex items-start gap-3">
                  <div className="text-slate-500 mt-0.5 flex-shrink-0">
                    {task.type === 'doctor_approval' && <UserCheck className="w-4 h-4" />}
                    {task.type === 'ocr_fix' && <ScanLine className="w-4 h-4" />}
                    {task.type === 'ocr_failed' && <FileX className="w-4 h-4" />}
                    {(task as any).type === 'ocr_ready' && <ScanLine className="w-4 h-4" />}
                    {(task as any).type === 'audit_check' && <ShieldCheck className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{task.subtitle}</p>
                    <button
                      onClick={() => {
                        if (task.targetTab === 'doctors' || task.targetTab === 'users') {
                          navigate('/admin/users');
                        } else if (task.targetTab === 'ocr') {
                          navigate('/admin/ocr');
                        } else if (task.targetTab === 'logs') {
                          navigate('/admin/audit-logs');
                        }
                      }}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700 mt-1 inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {task.actionText}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dòng trạng thái bảo mật dưới cùng card */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[11px]">Truy cập dữ liệu bệnh nhân được ghi nhật ký đầy đủ.</span>
          </div>
        </div>
      </div>

      {/* Footer nhỏ dưới cùng */}
      <footer className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 pt-8 pb-4 gap-2 border-t border-slate-200/60 mt-8">
        <p>Cảnh báo lâm sàng hỗ trợ quyết định chăm sóc; chúng không thay thế phán đoán lâm sàng.</p>
        <p>Khung báo cáo: nhóm bệnh nhân đang hoạt động hiện tại</p>
      </footer>
    </div>
  );
};

export default Dashboard;

