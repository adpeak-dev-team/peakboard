import { useQuery } from '@tanstack/react-query';
import { fetchBoardItems } from './api';
import { workQueryKeys } from '../type';

export function useBoardItemsQuery(boardId: string | null) {
  return useQuery({
    queryKey: workQueryKeys.boardItems(boardId ?? ''),
    queryFn: () => fetchBoardItems(boardId as string),
    enabled: !!boardId,
  });
}
