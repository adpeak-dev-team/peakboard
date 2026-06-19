import { useQuery } from '@tanstack/react-query';
import { fetchBoards } from './api';
import { workQueryKeys } from '../type';

export function useBoardsQuery() {
  return useQuery({
    queryKey: workQueryKeys.boards(),
    queryFn: fetchBoards,
  });
}
