import { useQuery } from '@tanstack/react-query';
import { fetchEmployees } from './api';
import { workQueryKeys } from '../type';

export function useEmployeesQuery() {
  return useQuery({
    queryKey: workQueryKeys.employees(),
    queryFn: fetchEmployees,
  });
}
