import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AdminUser,
  MappingItem,
  AuditLog,
  StandardBiomarkerMetric,
  UserStatus,
} from '../types/admin.types';
import {
  fetchUsers,
  approveDoctor,
  toggleUserLock,
  fetchMappingQueue,
  confirmMapping,
  fetchAuditLogs,
  fetchSystemHealth,
} from '../services/admin.service';
import { UserTable } from '../components/admin/UserTable';
import { MappingQueue } from '../components/admin/MappingQueue';
import { AuditLogTable } from '../components/admin/AuditLogTable';
import {
  HeartPulse,
  Users,
  Layers,
  Activity,
  LogOut,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  RefreshCw,
  Cpu,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export type AdminModuleTab = 'users' | 'biomarkers' | 'audit_logs';

export interface ToastState {
  id: string;
  type: 'success' | 'warning' | 'info';
  message: string;
}

export const AdminPage: React.FC = () => {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Active Tab Module
  const [activeTab, setActiveTab] = useState<AdminModuleTab>('users');

  // Module States
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [mappingQueue, setMappingQueue] = useState<MappingItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Toast Notification
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 4000);
  };

  /**
   * Tải toàn bộ dữ liệu cho 3 module
   */
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersData, queueData, logsData, healthData] = await Promise.all([
        fetchUsers(),
        fetchMappingQueue(),
        fetchAuditLogs(auditPage, 5),
        fetchSystemHealth(),
      ]);

      setUsers(usersData);
      setMappingQueue(queueData);
      setAuditLogs(logsData.data);
      setTotalLogs(logsData.total);
      setSystemHealth(healthData);
    } catch (err: any) {
      console.error('[AdminDashboard] Lỗi tải dữ liệu:', err);
      setError(err?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    let isMounted = true;

    const executeLoad = async () => {
      setIsLoading(true);
      try {
        const [usersData, queueData, logsData, healthData] = await Promise.all([
          fetchUsers(),
          fetchMappingQueue(),
          fetchAuditLogs(auditPage, 5),
          fetchSystemHealth(),
        ]);
        if (isMounted) {
          setUsers(usersData);
          setMappingQueue(queueData);
          setAuditLogs(logsData.data);
          setTotalLogs(logsData.total);
          setSystemHealth(healthData);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Không thể kết nối máy chủ.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    executeLoad();

    return () => {
      isMounted = false;
    };
  }, [auditPage]);

  // 1. Action Module 1: Duyệt bác sĩ
  const handleApproveDoctor = async (userId: string, userName: string) => {
    try {
      const updatedUser = await approveDoctor(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
      showToast(`Đã phê duyệt tài khoản ${userName} thành công! Bác sĩ hiện đã được cấp quyền.`);

      // Cập nhật lại audit log mới nhất
      const logsRes = await fetchAuditLogs(1, 5);
      setAuditLogs(logsRes.data);
      setTotalLogs(logsRes.total);
    } catch (err: any) {
      showToast(err?.message || 'Phê duyệt thất bại. Vui lòng thử lại!', 'warning');
    }
  };

  // 2. Action Module 1: Khóa / Mở khóa tài khoản
  const handleToggleLock = async (userId: string, userName: string, currentStatus: UserStatus) => {
    try {
      const updatedUser = await toggleUserLock(userId);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));

      const isLocked = updatedUser.status === 'locked';
      showToast(
        isLocked
          ? `Đã khóa tài khoản của ${userName}!`
          : `Đã mở khóa quyền truy cập cho ${userName}!`,
        isLocked ? 'warning' : 'success'
      );

      // Cập nhật lại audit log mới nhất
      const logsRes = await fetchAuditLogs(1, 5);
      setAuditLogs(logsRes.data);
      setTotalLogs(logsRes.total);
    } catch (err: any) {
      showToast(err?.message || 'Thao tác khóa/mở khóa thất bại!', 'warning');
    }
  };

  // 3. Action Module 2: Xác nhận ánh xạ chỉ số OCR
  const handleConfirmMapping = async (
    itemId: string,
    targetMetric: StandardBiomarkerMetric,
    rawLabel: string
  ) => {
    try {
      await confirmMapping(itemId, targetMetric);
      // Xóa ngay lập tức dòng đó khỏi hàng đợi trên giao diện
      setMappingQueue((prev) => prev.filter((m) => m.id !== itemId));
      showToast(`Đã lưu quy tắc ánh xạ nhãn "${rawLabel}" sang chỉ số [${targetMetric.toUpperCase()}] thành công!`);

      // Cập nhật lại audit log mới nhất
      const logsRes = await fetchAuditLogs(1, 5);
      setAuditLogs(logsRes.data);
      setTotalLogs(logsRes.total);
    } catch (err: any) {
      showToast(err?.message || 'Ánh xạ thất bại. Vui lòng thử lại!', 'warning');
    }
  };

  // 4. Action Module 3: Chuyển trang Audit Log
  const handlePageChange = async (newPage: number) => {
    setAuditPage(newPage);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // KPI Calculations
  const pendingDoctorsCount = useMemo(() => {
    return users.filter((u) => u.role === 'doctor' && u.status === 'pending').length;
  }, [users]);

  const totalUsersCount = users.length;
  const doctorCount = users.filter((u) => u.role === 'doctor').length;
  const pregnantCount = users.filter((u) => u.role === 'pregnant_woman').length;

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800 font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* ================================================================= */}
      {/* SIDEBAR BÊN TRÁI (CỐ ĐỊNH) */}
      {/* ================================================================= */}
      <aside className="w-[280px] bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen p-5 z-20">
        <div className="space-y-6">
          {/* Logo & Header */}
          <div className="flex items-center gap-3 select-none px-2 py-1">
            <div className="w-10 h-10 rounded-xl bg-[#345C59] flex items-center justify-center text-white shadow-md shadow-teal-900/10">
              <HeartPulse className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">PreCare</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white tracking-wider">
                  PORTAL
                </span>
              </div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                ADMIN PORTAL
              </div>
            </div>
          </div>

          {/* Navigation Menu 3 Module */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2">
              QUẢN TRỊ TRUNG TÂM
            </div>
            <nav className="space-y-1.5">
              {/* Module 1: Quản lý người dùng */}
              <button
                onClick={() => setActiveTab('users')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-[#345C59] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Quản lý người dùng</span>
                </div>
                {pendingDoctorsCount > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === 'users' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {pendingDoctorsCount}
                  </span>
                )}
              </button>

              {/* Module 2: Hàng đợi ánh xạ OCR */}
              <button
                onClick={() => setActiveTab('biomarkers')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'biomarkers'
                    ? 'bg-[#345C59] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4" />
                  <span>Hàng đợi ánh xạ OCR</span>
                </div>
                {mappingQueue.length > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === 'biomarkers'
                        ? 'bg-amber-400 text-slate-900'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {mappingQueue.length}
                  </span>
                )}
              </button>

              {/* Module 3: Nhật ký hệ thống (Audit Logs) */}
              <button
                onClick={() => setActiveTab('audit_logs')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'audit_logs'
                    ? 'bg-[#345C59] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4" />
                  <span>Nhật ký hệ thống</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Profile & Logout */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-[#345C59] font-extrabold text-sm shrink-0">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.full_name || 'Quản trị viên Hệ thống'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser?.email || 'admin@precare.vn'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100/80 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Bar: Căn chỉnh dàn đều và canh giữa theo trục ngang */}
        <header className="bg-white border-b border-slate-200/80 px-8 py-4 sticky top-0 z-10 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {activeTab === 'users' && 'Quản lý Tài khoản & Xét duyệt Bác sĩ'}
              {activeTab === 'biomarkers' && 'Hàng đợi Ánh xạ Nhãn Siêu âm Cận lâm sàng (OCR Mapping)'}
              {activeTab === 'audit_logs' && 'Nhật ký Hoạt động & Kiểm toán Hệ thống (Audit Logs)'}
            </h1>
            <p className="text-xs text-slate-500">
              PreCare Medical Platform • Hệ thống số hóa hồ sơ cận lâm sàng
            </p>
          </div>

          {/* Cụm Gateway :8000 Healthy và nút Làm mới */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>
                Gateway :8000 {systemHealth?.gatewayStatus === 'healthy' ? 'Healthy' : 'Online'}
              </span>
            </div>

            <button
              type="button"
              onClick={loadDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </header>

        {/* Body Content */}
        <main className="p-8 max-w-[1500px] w-full mx-auto space-y-6">
          {/* HÀNG 4 THẺ KPI TỔNG QUAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Bác sĩ chờ duyệt (Rose alert) */}
            <div className="bg-rose-50/80 rounded-2xl p-5 border border-rose-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                  Bác sĩ chờ duyệt
                </span>
                <div className="text-2xl font-black text-rose-900 mt-1">{pendingDoctorsCount}</div>
                <div className="text-[11px] font-medium text-rose-700/80 mt-1">
                  Đăng ký mới cần phê duyệt
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
                <AlertOctagon className="w-6 h-6 stroke-[2]" />
              </div>
            </div>

            {/* Card 2: Tổng tài khoản */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Tổng người dùng
                </span>
                <div className="text-2xl font-extrabold text-slate-800 mt-1">{totalUsersCount}</div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {doctorCount} Bác sĩ • {pregnantCount} Thai phụ
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#345C59] flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 stroke-[2]" />
              </div>
            </div>

            {/* Card 3: Nhãn OCR chờ ánh xạ */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Nhãn OCR chờ ánh xạ
                </span>
                <div className="text-2xl font-extrabold text-amber-700 mt-1">{mappingQueue.length}</div>
                <div className="text-[11px] text-slate-500 mt-1">Phiếu siêu âm máy mới</div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 stroke-[2]" />
              </div>
            </div>

            {/* Card 4: Trạng thái Microservices */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Trạng thái RACA-Net
                </span>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">Healthy 2/2</div>
                <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[170px]" title="Hadlock-ACOG & RACA-Net">
                  Hadlock • RACA-Net-v1.2
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Cpu className="w-6 h-6 stroke-[2]" />
              </div>
            </div>
          </div>

          {/* ERROR NOTIFICATION BANNER */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-800 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={loadDashboardData}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* RENDER NỘI DUNG 3 MODULE */}
          {activeTab === 'users' && (
            <UserTable
              users={users}
              isLoading={isLoading}
              onApproveDoctor={handleApproveDoctor}
              onToggleLock={handleToggleLock}
            />
          )}

          {activeTab === 'biomarkers' && (
            <MappingQueue
              items={mappingQueue}
              isLoading={isLoading}
              onConfirmMapping={handleConfirmMapping}
            />
          )}

          {activeTab === 'audit_logs' && (
            <AuditLogTable
              logs={auditLogs}
              totalLogs={totalLogs}
              currentPage={auditPage}
              pageSize={5}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          )}
        </main>
      </div>

      {/* ================================================================= */}
      {/* TOAST FEEDBACK FLOATING NOTIFICATION */}
      {/* ================================================================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-[#345C59] text-white border-teal-800'
                : toast.type === 'warning'
                ? 'bg-amber-600 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-200 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
