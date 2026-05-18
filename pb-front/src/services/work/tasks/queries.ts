import { useQuery } from '@tanstack/react-query';
import { fetchTasks } from './api';
import { workQueryKeys } from '../type';

export function useTasksQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? workQueryKeys.tasks(projectId) : workQueryKeys.tasksAll(),
    queryFn: () => fetchTasks(projectId as string),
    enabled: !!projectId,
  });
}
