'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { fetchMe, type AuthUser } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAdmin: false,
});

export const authMeQueryKey = ['auth', 'me'] as const;

// 미로그인 상태(401)는 에러가 아니라 "세션 없음"으로 취급해 콘솔 로그를 남기지 않는다.
async function fetchMeOrNull(): Promise<AuthUser | null> {
  try {
    return await fetchMe();
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) return null;
    throw err;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchMeOrNull,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const user = data ?? null;
  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
