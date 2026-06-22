import { apiClient } from '@/api/apiClient';

export type Role = 'admin' | 'member';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId: string | null;
}

export async function fetchUsers(): Promise<UserAccount[]> {
  const { data } = await apiClient.get<UserAccount[]>('/users');
  return data;
}

export async function updateUserRole(id: string, role: Role): Promise<void> {
  await apiClient.patch(`/users/${id}/role`, { role });
}

// 직원에 대한 계정 생성 (비밀번호 지정)
export async function createUserAccount(employeeId: string, password: string): Promise<void> {
  await apiClient.post('/users', { employeeId, password });
}

// 비밀번호 설정/초기화
export async function setUserPassword(id: string, password: string): Promise<void> {
  await apiClient.patch(`/users/${id}/password`, { password });
}
