import React, { useState, useEffect } from 'react';
import { authApi } from './services/auth.service';
import { Dashboard } from './pages/Dashboard';
import { PatientDetail } from './pages/PatientDetail';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import {
  HeartPulse,
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart2,
  Settings,
  Bell,
  Stethoscope,
  LogOut,
  ArrowRight,
} from 'lucide-react';

export const App: React.FC = () => {
  type AppView = 'login' | 'register' | 'app' | 'forgot-password' | 'reset-password';

  const getInitialView = (): AppView => {
    if (typeof window === 'undefined') return 'login';
    const path = window.location.pathname.toLowerCase();
    if (path === '/register' || path.startsWith('/register')) return 'register';
    if (path === '/forgot-password' || path.startsWith('/forgot-password')) return 'forgot-password';
    if (path === '/reset-password' || path.startsWith('/reset-password')) return 'reset-password';
    if (path === '/login' || path.startsWith('/login')) return 'login';
    const token = localStorage.getItem('precare_token');
    if (token) return 'app';
    return 'login';
  };

  const [currentView, setCurrentView] = useState<AppView>(getInitialView);

  // Điều hướng chuyển trang và đồng bộ URL trình duyệt
  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    const pathMap: Record<AppView, string> = {
      'app': '/',
      'login': '/login',
      'register': '/register',
      'forgot-password': '/forgot-password',
      'reset-password': '/reset-password',
    };
    const targetPath = pathMap[view];
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'records' | 'reports' | 'settings'>('overview');

  // VIEW 1: ĐĂNG NHẬP (LOGIN THEO THIẾT KẾ FIGMA)
  if (currentView === 'login') {
    return (
      <div className="relative">
        <Login
          onSuccess={(authData) => {
            console.log('Login success:', authData);
            navigateTo('app');
          }}
          onNavigateToRegister={() => navigateTo('register')}
        />
      </div>
    );
  }

  // VIEW 2: ĐĂNG KÝ (REGISTER 5 BƯỚC)
  if (currentView === 'register') {
    return (
      <div className="relative">
        <Register
          onLoginClick={() => navigateTo('login')}
          onSuccess={(userData) => {
            console.log('Registration success:', userData);
            navigateTo('app');
          }}
        />
      </div>
    );
  }

  // VIEW 3: QUÊN MẬT KHẨU
  if (currentView === 'forgot-password') {
    return (
      <ForgotPassword
        onNavigateToLogin={() => navigateTo('login')}
      />
    );
  }

  // VIEW 4: ĐẶT LẠI MẬT KHẨU (từ link email)
  if (currentView === 'reset-password') {
    return (
      <ResetPassword
        onNavigateToLogin={() => navigateTo('login')}
      />
    );
  }

  // VIEW 3: GIAO DIỆN BÁC SĨ (DASHBOARD)
  const navItems = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'patients', label: 'Danh sách bệnh nhân', icon: Users },
    { id: 'records', label: 'Hồ sơ thai kỳ', icon: BookOpen },
    { id: 'reports', label: 'Báo cáo', icon: BarChart2 },
    { id: 'settings', label: 'Cài đặt', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-800 font-sans">
      {/* Left Sidebar (260px) */}
      <aside className="w-[260px] bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen sticky top-0 h-screen p-5">
        <div className="space-y-7">
          {/* Logo & Brand Header */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              setSelectedPatientId(null);
              setActiveTab('overview');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-[#4D7D74] flex items-center justify-center text-white shadow-sm shadow-teal-900/10">
              <HeartPulse className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800 tracking-tight leading-tight">PreCare</div>
              <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">DIGITAL OBSTETRICS</div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
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
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#4D7D74] text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Doctor Profile Card & Logout */}
        <div className="space-y-2">
          <div className="border border-slate-200/80 rounded-2xl p-3 bg-white flex items-center gap-3 shadow-xs">
            <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-teal-800">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80"
                alt="BS. Lê Minh"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Stethoscope className="w-5 h-5 text-teal-700 hidden only:block" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-800 truncate">BS. Lê Minh</div>
              <div className="text-[11px] text-slate-500 truncate">Khoa Sản - Sản Phụ Khoa</div>
            </div>
          </div>

          <button
            onClick={() => navigateTo('login')}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-5 sticky top-0 z-30 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {selectedPatientId ? 'Hồ sơ chi tiết thai phụ' : 'Tổng quan hoạt động'}
          </h1>

          {/* Right Header Info */}
          <div className="flex items-center gap-3">

            <button
              aria-label="Thông báo"
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2.5 right-2.5"></span>
            </button>

            <div className="text-right pl-2">
              <div className="text-sm font-bold text-slate-800 leading-tight">Bệnh viện Phụ sản Trung ương</div>
              <div className="text-xs text-slate-500">Phòng khám sản 402</div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="p-8 max-w-[1440px] w-full mx-auto">
          {selectedPatientId ? (
            <PatientDetail
              patientId={selectedPatientId}
              onBack={() => setSelectedPatientId(null)}
            />
          ) : (
            <Dashboard onSelectPatient={(id) => setSelectedPatientId(id)} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
