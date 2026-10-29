import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { PatientDetail } from './pages/PatientDetail';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { AdminPage } from './pages/AdminPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PatientSearchDialog } from './components/PatientSearchDialog';
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
  Building2,
  X,
} from 'lucide-react';

/**
 * Giao diện Bác sĩ (Doctor Portal)
 */
const DoctorPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'records' | 'reports' | 'settings'>('overview');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const doctorDisplayName = user?.full_name
    ? (user.full_name.startsWith('BS.') ? user.full_name : `BS. ${user.full_name}`)
    : 'BS. CKI LÊ HOÀNG';

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
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold text-slate-900 tracking-tight leading-tight">PreCare</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 tracking-wider">
                MD
              </span>
            </div>
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
            <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-teal-800">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
                alt={doctorDisplayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-bold text-xs text-teal-800 hidden only:block">LH</span>
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="text-xs font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate"
                title={doctorDisplayName}
              >
                {doctorDisplayName}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {user?.email || 'Chuyên khoa Sản Phụ Khoa'}
              </div>
              <div className="text-[9.5px] text-teal-700 font-medium truncate">
                Bệnh viện Sản Phụ Khoa PreCare
              </div>
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
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc mã bệnh nhân..."
              className="w-full pl-11 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Hủy tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Thông tin cơ sở y tế & Thông báo */}
          <div className="flex items-center gap-4">
            <button
              aria-label="Thông báo"
              className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer shrink-0"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2"></span>
            </button>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  Bệnh viện Sản Phụ Khoa PreCare
                </div>
                <div className="text-[11px] text-slate-500">
                  Khoa Chẩn Đoán Trước Sinh
                </div>
              </div>
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
            <Dashboard
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
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLoginSuccess = (authData: { user: any; token: string }) => {
    login(authData);
    const target = (location.state as any)?.from?.pathname;
    const role = authData.user?.role;

    // Nếu có đường dẫn yêu cầu trước đó hợp lệ theo vai trò -> chuyển về đích đó
    if (target && target !== '/login' && target !== '/unauthorized') {
      if (role === 'admin' && target.startsWith('/admin')) {
        navigate(target, { replace: true });
        return;
      }
      if (role === 'doctor' && !target.startsWith('/admin')) {
        navigate(target, { replace: true });
        return;
      }
    }

    // Điều hướng mặc định theo vai trò người dùng
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="relative">
      <Login
        onSuccess={handleLoginSuccess}
        onLoginSuccess={() => {
          // Xử lý thông qua onSuccess
        }}
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
      </Route>

      {/* 3. ADMIN PROTECTED ROUTES (Chỉ vai trò 'admin') */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/*" element={<AdminPage />} />
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
