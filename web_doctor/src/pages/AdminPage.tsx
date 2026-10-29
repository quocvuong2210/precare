import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  LogOut,
  HeartPulse,
  Users,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-800 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
              PreCare <span className="text-teal-700">Admin</span>
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              HỆ THỐNG QUẢN TRỊ NỀN TẢNG
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pr-2 border-r border-slate-200">
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{user?.full_name || 'Quản trị viên'}</div>
              <div className="text-xs text-slate-500">{user?.email || 'admin@precare.vn'}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="p-8 max-w-[1280px] w-full mx-auto flex-1 space-y-6">
        {/* Welcome Status Banner */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">Khu vực Quản trị Hệ thống</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Vai trò: Admin
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Phiên xác thực hợp lệ. Bạn đang đăng nhập với quyền Quản trị viên (Admin) của nền tảng PreCare.
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 shrink-0">
            Mã định danh: <span className="font-mono font-medium text-slate-700">{user?.id || 'admin-root'}</span>
          </div>
        </div>

        {/* Informative Roadmap Notice */}
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-5 flex items-start gap-3.5">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <div className="font-bold text-amber-950 text-sm">Thông tin phát triển chức năng Quản trị</div>
            <p className="leading-relaxed">
              Các mô-đun quản trị chuyên sâu (Duyệt tài khoản bác sĩ, Giám sát hệ thống, Cấu hình API và Phân quyền tổ chức)
              đang được hoàn thiện trong gói tác vụ quản trị tiếp theo (STORY-2.3).
              Hiện tại phân hệ Router đã tách biệt hoàn toàn quyền truy cập giữa Bác sĩ và Quản trị viên.
            </p>
          </div>
        </div>

        {/* Admin Operational Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="text-base font-bold text-slate-800">Xét duyệt hồ sơ Bác sĩ</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Kiểm tra giấy phép hành nghề, chứng chỉ y khoa và phê duyệt hồ sơ bác sĩ sản phụ khoa đăng ký mới.
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Sẵn sàng liên kết API
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-base font-bold text-slate-800">Quản lý người dùng</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Danh sách tài khoản bác sĩ, điều dưỡng và thai phụ trên toàn hệ sinh thái PreCare.
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              Đang hoàn thiện UI
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
              <Database className="w-5 h-5" />
            </div>
            <div className="text-base font-bold text-slate-800">Cấu hình hệ thống</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Thiết lập chính sách bảo mật, tỷ lệ ngưỡng cảnh báo và tích hợp dịch vụ FastAPI / PostgreSQL.
            </p>
            <div className="pt-2 text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Cấu hình bảo mật
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
