'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const checkAuth = useCallback(async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch {
      api.setAccessToken(null);
      api.setRefreshToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-check auth when tab regains focus (e.g. after token refresh in another tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onFocus = () => { checkAuth(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkAuth]);

  const login = async (identifier: string, password: string) => {
    const data = await api.login(identifier, password);
    setUser(data.user);
    queryClient.invalidateQueries({ queryKey: ['schema'] });
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      api.setAccessToken(null);
      api.setRefreshToken(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
