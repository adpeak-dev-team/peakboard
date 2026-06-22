import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from './api';

export const usersQueryKey = ['users'] as const;

export function useUsersQuery() {
  return useQuery({ queryKey: usersQueryKey, queryFn: fetchUsers });
}
