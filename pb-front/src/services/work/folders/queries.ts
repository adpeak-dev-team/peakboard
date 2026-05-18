import { useQuery } from '@tanstack/react-query';
import { fetchFolders } from './api';
import { workQueryKeys } from '../type';

export function useFoldersQuery(projectId: string | null) {
  return useQuery({
    queryKey: projectId ? workQueryKeys.folders(projectId) : workQueryKeys.foldersAll(),
    queryFn: () => fetchFolders(projectId as string),
    enabled: !!projectId,
  });
}
