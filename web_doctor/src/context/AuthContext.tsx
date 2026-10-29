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
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('precare_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('precare_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      const currentToken = localStorage.getItem('precare_token');
      const storedUser = localStorage.getItem('precare_user');

      if (currentToken && storedUser) {
        try {
          const parsedUser: UserProfile = JSON.parse(storedUser);
          setUser(parsedUser);
          setToken(currentToken);

          // Asynchronously verify/refresh profile with backend if online
          try {
            const freshUser = await authApi.getMe();
            if (freshUser && freshUser.role) {
              setUser(freshUser);
              localStorage.setItem('precare_user', JSON.stringify(freshUser));
            }
          } catch (err: any) {
            // If token expired or invalid (401), clear invalid credentials
            if (err.response?.status === 401) {
              console.warn('[PreCare Auth] Session expired (401). Clearing stored auth.');
              localStorage.removeItem('precare_token');
              localStorage.removeItem('precare_user');
              localStorage.removeItem('precare_refresh_token');
              setUser(null);
              setToken(null);
            }
            // For network errors / offline dev mode, keep local user session
          }
        } catch {
          localStorage.removeItem('precare_user');
          setUser(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }

      setIsLoading(false);
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
      localStorage.removeItem('precare_user');
      localStorage.removeItem('precare_refresh_token');
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
