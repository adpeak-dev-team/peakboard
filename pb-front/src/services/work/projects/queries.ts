import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from './api';
import { workQueryKeys } from '../type';

export function useProjectsQuery() {
  return useQuery({
    queryKey: workQueryKeys.projects(),
    queryFn: fetchProjects,
  });
}
