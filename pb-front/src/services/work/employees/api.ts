import { apiClient } from '@/api/apiClient';
import type { EmployeeDTO, EmployeePatch, UpdateEmployeeInput } from '../type';

export async function fetchEmployees(): Promise<EmployeeDTO[]> {
  const { data } = await apiClient.get<EmployeeDTO[]>('/employees');
  return data;
}

export async function createEmployee(input: EmployeePatch): Promise<EmployeeDTO> {
  const { data } = await apiClient.post<EmployeeDTO>('/employees', input);
  return data;
}

export async function updateEmployee(input: UpdateEmployeeInput): Promise<EmployeeDTO> {
  const { data } = await apiClient.patch<EmployeeDTO>(`/employees/${input.id}`, input.patch);
  return data;
}

export async function deleteEmployee(id: string): Promise<void> {
  await apiClient.delete(`/employees/${id}`);
}
