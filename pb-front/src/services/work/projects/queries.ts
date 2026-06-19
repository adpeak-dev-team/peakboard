import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from './api';
import { workQueryKeys } from '../type';

export function useProjectsQuery(boardId: string | null) {
  return useQuery({
    queryKey: workQueryKeys.projects(boardId ?? ''),
    queryFn: () => fetchProjects(boardId as string),
    enabled: !!boardId,
  });
}
