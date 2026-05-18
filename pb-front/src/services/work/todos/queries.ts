import { useQuery } from '@tanstack/react-query';
import { fetchTodos } from './api';
import { workQueryKeys } from '../type';

export function useTodosQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? workQueryKeys.todos(projectId) : workQueryKeys.todosAll(),
    queryFn: () => fetchTodos(projectId as string),
    enabled: !!projectId,
  });
}
