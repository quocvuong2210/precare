import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole, AuthResponseData } from '../types/auth.types';
import { authApi } from '../services/auth.service';

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: AuthResponseData | { user: UserProfile; token?: string; access_token?: string }) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Bắt đầu với null để đảm bảo không bypass trước khi xác thực với Backend thật
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khởi tạo và kiểm tra tính hợp lệ của phiên đăng nhập với Backend thật
  useEffect(() => {
    const initAuth = async () => {
      const currentToken =
        localStorage.getItem('precare_token') ||
        localStorage.getItem('precare_access_token') ||
        localStorage.getItem('token');

      // 1. Kiểm tra tính hợp lệ của token trước khi xác thực với Backend
      const isFakeToken =
        !currentToken ||
        currentToken === 'token_gia_de_test_ui' ||
        currentToken.startsWith('mock-') ||
        currentToken.startsWith('mock_') ||
        currentToken.startsWith('dev_');

      if (isFakeToken) {
        localStorage.removeItem('precare_token');
        localStorage.removeItem('precare_access_token');
        localStorage.removeItem('precare_user');
        localStorage.removeItem('precare_refresh_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        setIsLoading(false);
        return;
      }

      // 2. BẮT BUỘC gọi API GET /api/v1/auth/me để xác thực token đó với Backend thật
      try {
        const freshUser = await authApi.getMe();
        if (freshUser && freshUser.id && freshUser.role) {
          setUser(freshUser);
          setToken(currentToken);
          localStorage.setItem('precare_user', JSON.stringify(freshUser));
          localStorage.setItem('precare_token', currentToken);
        } else {
          throw new Error('Thông tin người dùng trả về từ Backend không hợp lệ.');
        }
      } catch (err: any) {
        // Token hết hạn, không hợp lệ (401) hoặc Backend từ chối: Lập tức xóa sạch localStorage
        console.warn('[PreCare Auth] Xác thực token với Backend thất bại. Xóa sạch phiên đăng nhập.');
        localStorage.removeItem('precare_token');
        localStorage.removeItem('precare_access_token');
        localStorage.removeItem('precare_user');
        localStorage.removeItem('precare_refresh_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(
    (data: AuthResponseData | { user: UserProfile; token?: string; access_token?: string; tokens?: any }) => {
      const newUser = data.user;
      const newToken =
        (data as any).token ||
        data.access_token ||
        data.tokens?.access_token ||
        localStorage.getItem('precare_token') ||
        '';

      if (newToken) {
        localStorage.setItem('precare_token', newToken);
        setToken(newToken);
      }

      if (newUser) {
        localStorage.setItem('precare_user', JSON.stringify(newUser));
        setUser(newUser);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[PreCare Auth] Error during logout API call:', err);
    } finally {
      localStorage.removeItem('precare_token');
      localStorage.removeItem('precare_access_token');
      localStorage.removeItem('precare_user');
      localStorage.removeItem('precare_refresh_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setToken(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authApi.getMe();
      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem('precare_user', JSON.stringify(freshUser));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        await logout();
      }
    }
  }, [logout]);

  const value: AuthContextType = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
