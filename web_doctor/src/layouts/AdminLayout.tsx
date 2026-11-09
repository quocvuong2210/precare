import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Activity,
  Users,
  ClipboardList,
  Layers,
  Bell,
  HelpCircle,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface AdminLayoutProps {
  children?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user: currentUser, logout } = useAuth();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  const menuItems = [
    {
      id: 'overview',
      label: 'Tổng quan Hệ thống',
      path: '/admin',
      icon: Activity,
      isActive: (pathname: string) =>
        pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/overview' || pathname === '/admin/dashboard',
    },
    {
      id: 'users',
      label: 'Quản lý người dùng',
      path: '/admin/users',
      icon: Users,
      isActive: (pathname: string) => pathname.startsWith('/admin/users'),
    },
    {
      id: 'ocr',
      label: 'Hàng đợi OCR',
      path: '/admin/ocr',
      icon: Layers,
      isActive: (pathname: string) => pathname.startsWith('/admin/ocr') || pathname.startsWith('/admin/mapping-queue'),
    },
    {
      id: 'logs',
      label: 'Nhật ký kiểm toán',
      path: '/admin/audit-logs',
      icon: ClipboardList,
      isActive: (pathname: string) => pathname.startsWith('/admin/logs') || pathname.startsWith('/admin/audit-logs'),
    },
  ] as const;

  const getBreadcrumbTitle = (pathname: string): string => {
    if (pathname.startsWith('/admin/users')) {
      return 'Quản lý người dùng';
    }
    if (pathname.startsWith('/admin/ocr') || pathname.startsWith('/admin/mapping-queue')) {
      return 'Hàng đợi ánh xạ OCR';
    }
    if (pathname.startsWith('/admin/logs') || pathname.startsWith('/admin/audit-logs')) {
      return 'Nhật ký kiểm toán';
    }
    return 'Tổng quan Hệ thống';
  };

  const breadcrumbTitle = getBreadcrumbTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-slate-900">
      {/* 1. SIDEBAR CỐ ĐỊNH BÊN TRÁI (width: 256px / w-64) */}
      <aside className="w-64 bg-white border-r border-slate-200/80 fixed left-0 top-0 bottom-0 z-30 flex flex-col justify-between select-none">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 pb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0090FF] flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-800 tracking-tight leading-none">PreCare</span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-1">
                CỔNG QUẢN TRỊ Y TẾ
              </span>
            </div>
          </div>

          {/* Nhóm menu KHU VỰC LÀM VIỆC */}
          <div className="mt-2">
            <p className="px-6 text-[11px] font-semibold text-slate-400 tracking-wider uppercase mb-2">
              KHU VỰC LÀM VIỆC
            </p>
            <nav className="space-y-1 px-3">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const active = item.isActive(location.pathname);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors text-left ${
                      active
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${active ? 'text-blue-700' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Khối Chân Sidebar */}
        <div>
          {/* Thông tin User đang đăng nhập */}
          <div className="p-4 border-t border-slate-100 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 flex-shrink-0">
                  AM
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {currentUser?.full_name || 'Alex Morgan'}
                  </span>
                  <span className="text-xs text-slate-400 leading-tight mt-0.5">
                    {currentUser?.role === 'admin' ? 'Quản trị viên' : 'Quản trị viên'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
                title="Tùy chọn tài khoản"
              >
                <ChevronsUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Đăng xuất */}
            {showProfileMenu && (
              <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 text-xs text-slate-500">
                  Email: {currentUser?.email || 'admin@precare.health'}
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-medium text-left mt-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT (Chiếm không gian còn lại bên phải) */}
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        {/* Header cố định trên cùng (height: 64px / h-16) */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
          {/* Breadcrumb bên trái */}
          <div className="flex items-center text-xs text-slate-500">
            <Link
              to="/admin"
              className="hover:text-slate-800 transition-colors font-normal cursor-pointer"
            >
              Cổng quản trị
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 mx-2 flex-shrink-0" />
            <span className="font-semibold text-slate-800">{breadcrumbTitle}</span>
          </div>

          {/* Tiện ích bên phải */}
          <div className="flex items-center text-xs text-slate-500">
            <span className="mr-5 font-normal text-slate-500">01/11/2026 - UTC</span>
            <div className="h-4 w-px bg-slate-200 mr-5" />
            <button
              onClick={() => {
                setNotificationToast('Không có thông báo khẩn cấp mới.');
                setTimeout(() => setNotificationToast(null), 2500);
              }}
              className="text-slate-500 hover:text-slate-800 p-1 mr-3 transition-colors cursor-pointer"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setNotificationToast('Hệ thống PreCare hỗ trợ 24/7 tại support@precare.health');
                setTimeout(() => setNotificationToast(null), 3000);
              }}
              className="text-slate-500 hover:text-slate-800 p-1 transition-colors cursor-pointer"
              title="Trợ giúp"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Thông báo Toast ngắn nếu có */}
        {notificationToast && (
          <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
            <span>{notificationToast}</span>
            <button
              onClick={() => setNotificationToast(null)}
              className="text-slate-400 hover:text-white ml-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Vùng chứa nội dung scrollable bên dưới */}
        <main className="p-8 max-w-[1400px] w-full mx-auto flex-1 flex flex-col justify-between">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

