import { apiClient } from '@/api/apiClient';
import type { CreateLeaveInput, LeaveRequestDTO, LeaveStatus } from '../type';

export async function fetchLeaveRequests(): Promise<LeaveRequestDTO[]> {
  const { data } = await apiClient.get<LeaveRequestDTO[]>('/leave-requests');
  return data;
}

export async function createLeaveRequest(input: CreateLeaveInput): Promise<LeaveRequestDTO> {
  const { data } = await apiClient.post<LeaveRequestDTO>('/leave-requests', input);
  return data;
}

export async function updateLeaveStatus(input: {
  id: string;
  status: LeaveStatus;
}): Promise<LeaveRequestDTO> {
  const { data } = await apiClient.patch<LeaveRequestDTO>(`/leave-requests/${input.id}`, {
    status: input.status,
  });
  return data;
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  await apiClient.delete(`/leave-requests/${id}`);
}
