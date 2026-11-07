import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, Home, LogIn } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="text-4xl font-extrabold text-slate-800 tracking-tight">404</div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Không tìm thấy trang</h1>
          <p className="text-sm text-slate-500">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được di chuyển.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleReturnHome}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4D7D74] hover:bg-[#3D645D] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            {isAuthenticated ? (
              <>
                <Home className="w-4 h-4" />
                <span>Quay về trang chính</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Về trang đăng nhập</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
