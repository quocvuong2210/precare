import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, Home } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleReturnToDashboard = () => {
    if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Truy cập bị từ chối</h1>
          <p className="text-sm text-slate-600">
            Bạn không có quyền truy cập vào trang này. Khu vực này yêu cầu vai trò quyền hạn khác với tài khoản hiện tại của bạn.
          </p>
        </div>

        {user && (
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60 text-xs text-slate-600 text-left space-y-1">
            <div>
              <span className="font-semibold text-slate-700">Tài khoản:</span> {user.full_name || user.email}
            </div>
            <div>
              <span className="font-semibold text-slate-700">Vai trò hiện tại:</span>{' '}
              <span className="font-mono uppercase font-bold text-teal-800">{user.role}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleReturnToDashboard}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4D7D74] hover:bg-[#3D645D] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
