import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFolder, deleteFolder } from './api';
import {
  workQueryKeys,
  type CreateFolderInput,
  type DeleteFolderInput,
  type FolderDTO,
} from '../type';

export function useCreateFolderMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<FolderDTO, Error, CreateFolderInput>({
    mutationFn: createFolder,
    onSuccess: (created) => {
      if (!projectId) return;
      qc.setQueryData<FolderDTO[]>(workQueryKeys.folders(projectId), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useDeleteFolderMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteFolderInput>({
    mutationFn: deleteFolder,
    onSuccess: (_data, variables) => {
      if (!projectId) return;
      qc.setQueryData<FolderDTO[]>(workQueryKeys.folders(projectId), (prev) =>
        prev ? prev.filter((f) => f.id !== variables.folderId) : prev
      );
    },
  });
}
