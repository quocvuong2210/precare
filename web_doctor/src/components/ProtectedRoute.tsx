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
 * Dễ dàng kiểm thử tự động độc lập mọi kịch bản phân quyền.
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
  // 1. Chưa xác thực hoặc thiếu thông tin người dùng
  if (!isAuthenticated || !userRole) {
    return {
      status: 'redirect',
      target: '/login',
      preserveLocation: true,
    };
  }

  // 2. Kiểm tra vai trò nếu route có ràng buộc vai trò
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = allowedRoles.includes(userRole);

    if (!isAuthorized) {
      let fallbackTarget = redirectPath;

      if (!fallbackTarget) {
        if (userRole === 'doctor') {
          fallbackTarget = '/';
        } else if (userRole === 'admin') {
          fallbackTarget = '/admin';
        } else {
          fallbackTarget = '/unauthorized';
        }
      }

      // Tránh infinite redirect loop nếu fallback trùng đúng URL hiện tại
      if (fallbackTarget === currentPath) {
        return { status: 'redirect', target: '/unauthorized' };
      }

      return { status: 'redirect', target: fallbackTarget };
    }
  }

  // 3. Cho phép truy cập
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

  // 1. Khi đang khởi tạo phiên từ localStorage / API check: hiển thị loading mượt mà
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  // 2. Đánh giá quyết định truy cập
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
