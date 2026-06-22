import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmployee, deleteEmployee, updateEmployee } from './api';
import { workQueryKeys, type EmployeeDTO } from '../type';

export function useCreateEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: (created) => {
      qc.setQueryData<EmployeeDTO[]>(workQueryKeys.employees(), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateEmployee,
    onSuccess: (updated) => {
      qc.setQueryData<EmployeeDTO[]>(workQueryKeys.employees(), (prev) =>
        prev?.map((e) => (e.id === updated.id ? updated : e))
      );
    },
  });
}

export function useDeleteEmployeeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEmployee,
    onSuccess: (_data, id) => {
      qc.setQueryData<EmployeeDTO[]>(workQueryKeys.employees(), (prev) =>
        prev ? prev.filter((e) => e.id !== id) : prev
      );
    },
  });
}
