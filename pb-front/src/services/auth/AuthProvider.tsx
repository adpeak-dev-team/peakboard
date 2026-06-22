'use client';

import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: authMeQueryKey,
    queryFn: fetchMe,
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
