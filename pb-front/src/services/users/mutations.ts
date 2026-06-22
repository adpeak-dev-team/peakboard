import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateUserRole, createUserAccount, setUserPassword, type Role } from './api';
import { usersQueryKey } from './queries';

export function useUpdateUserRoleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersQueryKey }),
  });
}

export function useCreateUserAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, password }: { employeeId: string; password: string }) =>
      createUserAccount(employeeId, password),
    onSuccess: () => qc.invalidateQueries({ queryKey: usersQueryKey }),
  });
}

export function useSetUserPasswordMutation() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      setUserPassword(id, password),
  });
}
