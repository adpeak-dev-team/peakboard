import { useQuery } from '@tanstack/react-query';
import { fetchColumnOptions } from './api';
import { workQueryKeys } from '../type';

export function useColumnOptionsQuery(boardId: string | null) {
  return useQuery({
    queryKey: workQueryKeys.columnOptions(boardId ?? ''),
    queryFn: () => fetchColumnOptions(boardId as string),
    enabled: !!boardId,
  });
}
