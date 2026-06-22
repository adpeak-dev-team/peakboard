import { apiClient } from '@/api/apiClient';
import type { EmployeeDTO } from '@/services/work/type';

export type Role = 'admin' | 'member';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employee: EmployeeDTO | null;
}

export interface SignupInput {
  email: string;
  name: string;
  password: string;
  department?: string;
  position?: string;
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/auth/login', { email, password });
  return data;
}

export async function signup(input: SignupInput): Promise<AuthUser> {
  const { data } = await apiClient.post<AuthUser>('/auth/signup', input);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/auth/password', { currentPassword, newPassword });
}

export interface ProfileInput {
  name?: string;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string | null;
}

// 내 프로필 수정 → 갱신된 AuthUser 반환
export async function updateProfile(input: ProfileInput): Promise<AuthUser> {
  const { data } = await apiClient.patch<AuthUser>('/auth/profile', input);
  return data;
}
