import { useQuery } from '@tanstack/react-query';
import { fetchFolders } from './api';
import { workQueryKeys } from '../type';

export function useFoldersQuery() {
  return useQuery({
    queryKey: workQueryKeys.foldersAll(),
    queryFn: fetchFolders,
  });
}
