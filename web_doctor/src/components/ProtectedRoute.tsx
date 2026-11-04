import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth.types';

export interface RouteDecision {
  status: 'authorized' | 'redirect';
  target?: string;
  preserveLocation?: boolean;
}

/**
 * Hàm đánh giá quyết định điều hướng bảo vệ route thuần túy (Pure Function).
 * Dễ dàng kiểm thử tự động độc lập mọi kịch bản phân quyền vai trò người dùng.
 */
export function getRouteAccessDecision({
  isAuthenticated,
  userRole,
  allowedRoles,
  currentPath,
  redirectPath,
}: {
  isAuthenticated: boolean;
  userRole?: UserRole | null;
  allowedRoles?: UserRole[];
  currentPath: string;
  redirectPath?: string;
}): RouteDecision {
  // 1. Chưa xác thực hoặc thiếu thông tin vai trò người dùng -> chuyển hướng về /login
  if (!isAuthenticated || !userRole) {
    return {
      status: 'redirect',
      target: '/login',
      preserveLocation: true,
    };
  }

  // 2. Kiểm tra quyền hạn theo danh sách allowedRoles của route
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // 3. Phân luồng bảo vệ khu vực theo vai trò (Role-based area isolation):
  // - Bác sĩ cố tình vào khu vực quản trị (/admin) -> Chặn 403 (/unauthorized)
  if (userRole === 'doctor' && currentPath.startsWith('/admin')) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // - Quản trị viên cố tình vào khu vực lâm sàng Bác sĩ (không bắt đầu bằng /admin) -> Chặn 403 (/unauthorized)
  if (userRole === 'admin' && !currentPath.startsWith('/admin')) {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // - Thai phụ truy cập cổng Bác sĩ/Admin trên web -> Chặn 403 (/unauthorized)
  if (userRole === 'pregnant_woman') {
    return {
      status: 'redirect',
      target: redirectPath || '/unauthorized',
    };
  }

  // 4. Hợp lệ vai trò và đường dẫn -> Cấp quyền render
  return { status: 'authorized' };
}

export interface ProtectedRouteProps {
  /** Danh sách vai trò được phép truy cập route này */
  allowedRoles?: UserRole[];
  /** Tùy chọn đường dẫn redirect khi không đúng quyền */
  redirectPath?: string;
  /** Component con trực tiếp (tùy chọn, mặc định dùng Outlet) */
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  redirectPath,
  children,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // 1. Khi đang khởi tạo phiên: hiển thị loading mượt mà, không render protected content
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  // 2. Đánh giá quyết định truy cập dựa trên phiên xác thực duy nhất từ AuthContext
  const decision = getRouteAccessDecision({
    isAuthenticated,
    userRole: user?.role,
    allowedRoles,
    currentPath: location.pathname,
    redirectPath,
  });

  if (decision.status === 'redirect') {
    if (decision.preserveLocation) {
      return <Navigate to={decision.target || '/login'} state={{ from: location }} replace />;
    }
    return <Navigate to={decision.target || '/unauthorized'} replace />;
  }

  // 3. Đã xác thực và có quyền hợp lệ: render Outlet hoặc children
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
