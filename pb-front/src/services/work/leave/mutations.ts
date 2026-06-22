import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLeaveRequest, deleteLeaveRequest, updateLeaveStatus } from './api';
import { workQueryKeys, type LeaveRequestDTO } from '../type';

export function useCreateLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: (created) => {
      qc.setQueryData<LeaveRequestDTO[]>(workQueryKeys.leaveRequests(), (prev) =>
        prev ? [created, ...prev] : [created]
      );
    },
  });
}

export function useUpdateLeaveStatusMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateLeaveStatus,
    onSuccess: (updated) => {
      qc.setQueryData<LeaveRequestDTO[]>(workQueryKeys.leaveRequests(), (prev) =>
        prev?.map((r) => (r.id === updated.id ? updated : r))
      );
    },
  });
}

export function useDeleteLeaveMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteLeaveRequest,
    onSuccess: (_data, id) => {
      qc.setQueryData<LeaveRequestDTO[]>(workQueryKeys.leaveRequests(), (prev) =>
        prev ? prev.filter((r) => r.id !== id) : prev
      );
    },
  });
}
