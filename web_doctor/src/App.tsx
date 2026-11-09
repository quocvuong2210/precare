import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard as DoctorDashboard } from './pages/Dashboard';
import { PatientDetail } from './pages/PatientDetail';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PatientSearchDialog } from './components/PatientSearchDialog';
import { AdminLayout } from './layouts/AdminLayout';
import {
  Dashboard as AdminDashboard,
  UserManagement,
  AuditLogs,
  MappingQueuePage,
} from './pages/admin';
import {
  HeartPulse,
  Home,
  Users,
  BookOpen,
  BarChart2,
  Settings,
  Bell,
  LogOut,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';

/**
 * Giao diện Bác sĩ (Doctor Portal)
 */
const DoctorPortal: React.FC = () => {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'records' | 'reports' | 'settings'>('overview');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Quản lý thông báo: chỉ hiển thị chấm đỏ badge khi có thông báo chưa đọc (unreadCount > 0)
  interface SystemNotification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [isNotificationOpen, setIsNotificationOpen] = useState<boolean>(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown thông báo khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationOpen]);

  // Phím tắt Ctrl+K hoặc Cmd+K để mở nhanh dialog tìm kiếm bệnh nhân
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Khôi phục nghiêm ngặt quy trình Xác thực: Nếu chưa đăng nhập qua Backend thật, lập tức chuyển hướng về /login
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      navigate('/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: Home },
    { id: 'patients', label: 'Danh sách bệnh nhân', icon: Users },
    { id: 'records', label: 'Hồ sơ thai kỳ', icon: BookOpen },
    { id: 'reports', label: 'Báo cáo lâm sàng', icon: BarChart2 },
    { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings },
  ] as const;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Định dạng tên Bác sĩ chỉ lấy trực tiếp từ user?.full_name, xử lý tiền tố tránh lặp "BS. Bác sĩ"
  const formatDoctorName = (name?: string | null): string | null => {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    if (/^(BS\.?|Bác\s*sĩ)\s*/i.test(trimmed)) {
      return trimmed;
    }
    return `BS. ${trimmed}`;
  };

  const doctorDisplayName = formatDoctorName(user?.full_name) || 'Chưa xác định danh tính';

  const doctorInitial = user?.full_name?.trim()
    ? user.full_name.replace(/^(BS\.?|Bác\s*sĩ)\s*/i, '').trim().charAt(0).toUpperCase()
    : '';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans">
      {/* Left Sidebar */}
      <aside className="w-[260px] bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen p-5">
        <div className="space-y-6">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              setSelectedPatientId(null);
              setActiveTab('overview');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#0D8A7C] flex items-center justify-center text-white shadow-sm shadow-teal-900/10">
              <HeartPulse className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight leading-tight">PreCare</span>
          </div>

          {/* Bảng điều khiển */}
          <div>
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2">
              BẢNG ĐIỀU KHIỂN
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id && !selectedPatientId;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedPatientId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-slate-900 font-bold border border-teal-100/60 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#0D8A7C]' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Doctor Profile Card */}
        <div className="pt-3 border-t border-slate-100">
          <div
            onClick={() => navigate('/login')}
            title="Nhấp để chuyển tài khoản hoặc quản lý hồ sơ bác sĩ"
            className="border border-slate-200/80 rounded-xl p-2.5 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2.5 shadow-2xs group"
          >
            <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-800 font-bold text-xs shrink-0 select-none">
              {doctorInitial ? (
                doctorInitial
              ) : (
                <UserIcon className="w-4 h-4 text-teal-700" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate"
                title={doctorDisplayName}
              >
                {doctorDisplayName}
              </div>
              {user?.email && (
                <div className="text-[11px] text-slate-500 truncate" title={user.email}>
                  {user.email}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title="Đăng xuất"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 sticky top-0 z-30 flex items-center justify-between gap-4">
          {/* Ô tìm kiếm bệnh nhân (Live Search) */}
          <div className="flex-1 max-w-md relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập mã bệnh nhân, số CCCD hoặc họ tên..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs leading-normal"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors flex items-center justify-center"
                title="Hủy tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Chuông thông báo */}
          <div className="flex items-center">
            {/* Chuông thông báo với Popup Dropdown & Badge chấm đỏ */}
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen((prev) => !prev)}
                aria-label="Thông báo"
                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer shrink-0"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
                )}
              </button>

              {/* Popup Dropdown Thông báo */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">Thông báo</h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 rounded-full border border-rose-200">
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                        className="text-xs text-teal-700 hover:text-teal-800 font-semibold cursor-pointer transition-colors"
                      >
                        Đánh dấu tất cả đã đọc
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    /* Trạng thái khi không có thông báo mới */
                    <div className="py-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                        <Bell className="w-6 h-6 text-slate-300 stroke-[1.8]" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700">Hiện không có thông báo mới</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                        Hệ thống sẽ gửi thông báo khi có kết quả đối soát OCR hoặc cảnh báo thai chậm phát triển FGR mới.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{n.title}</span>
                            <span className="text-[10px] text-slate-400">{n.time}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="w-full max-w-[1600px] mx-auto px-6 py-6 sm:px-8 sm:py-6">
          {selectedPatientId ? (
            <PatientDetail
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
            />
          ) : (
            <DoctorDashboard
              onSelectPatient={(id) => setSelectedPatientId(id)}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          )}
        </main>
      </div>

      {/* Patient Search Dialog */}
      <PatientSearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPatient={(patientId) => {
          setSelectedPatientId(patientId);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
};

/**
 * PUBLIC ROUTE WRAPPERS
 */
const LoginWrapper: React.FC = () => {
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  const handleLoginSuccess = (authData: { user: any; token: string }) => {
    login(authData);
    const target = (location.state as any)?.from?.pathname;
    const userRole = authData.user?.role || 'doctor';

    // 1. Kiểm tra an toàn: chỉ redirect nếu target là đường dẫn nội bộ hợp lệ
    const isValidInternalPath =
      typeof target === 'string' &&
      target.startsWith('/') &&
      !target.startsWith('//') &&
      target !== '/login' &&
      target !== '/unauthorized';

    if (isValidInternalPath) {
      if (userRole === 'admin' && target.startsWith('/admin')) {
        navigate(target, { replace: true });
        return;
      }
      if (userRole === 'doctor' && !target.startsWith('/admin')) {
        navigate(target, { replace: true });
        return;
      }
    }

    // 2. Phân luồng chuyển hướng mặc định theo vai trò (user.role)
    if (userRole === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (userRole === 'pregnant_woman') {
      navigate('/thai-phu', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="relative">
      <Login
        onSuccess={handleLoginSuccess}
        onNavigateToRegister={() => navigate('/register')}
      />
    </div>
  );
};

const RegisterWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="relative">
      <Register
        onLoginClick={() => navigate('/login')}
        onSuccess={() => {
          navigate('/login');
        }}
      />
    </div>
  );
};

const ForgotPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ForgotPassword
      onNavigateToLogin={() => navigate('/login')}
      onOtpVerified={(email, otp) => {
        sessionStorage.setItem('precare_forgot_email', email);
        sessionStorage.setItem('precare_reset_otp', otp);
        navigate('/reset-password');
      }}
    />
  );
};

const ResetPasswordWrapper: React.FC = () => {
  const navigate = useNavigate();
  return (
    <ResetPassword
      onNavigateToLogin={() => navigate('/login')}
    />
  );
};

/**
 * TẬP HỢP ROUTE CHÍNH CỦA ỨNG DỤNG
 */
export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 1. PUBLIC ROUTES (Màn công khai) */}
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/register" element={<RegisterWrapper />} />
      <Route path="/forgot-password" element={<ForgotPasswordWrapper />} />
      <Route path="/reset-password" element={<ResetPasswordWrapper />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* 2. DOCTOR PROTECTED ROUTES (Chỉ vai trò 'doctor') */}
      <Route element={<ProtectedRoute allowedRoles={['doctor']} />}>
        <Route path="/" element={<DoctorPortal />} />
        <Route path="/doctor" element={<DoctorPortal />} />
        <Route path="/dashboard" element={<DoctorPortal />} />
        <Route path="/doctor/dashboard" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* 3. ADMIN PROTECTED ROUTES (Chỉ vai trò 'admin') */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="logs" element={<Navigate to="/admin/audit-logs" replace />} />
          <Route path="ocr" element={<MappingQueuePage />} />
          <Route path="mapping-queue" element={<Navigate to="/admin/ocr" replace />} />
        </Route>
      </Route>

      {/* 4. CATCH-ALL UNKNOWN ROUTES (Fallback 404) */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
