import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFolder, updateFolder, deleteFolder } from './api';
import {
  workQueryKeys,
  type CreateFolderInput,
  type UpdateFolderInput,
  type DeleteFolderInput,
  type FolderDTO,
} from '../type';

export function useCreateFolderMutation() {
  const qc = useQueryClient();

  return useMutation<FolderDTO, Error, CreateFolderInput>({
    mutationFn: createFolder,
    onSuccess: (created) => {
      qc.setQueryData<FolderDTO[]>(workQueryKeys.foldersAll(), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateFolderMutation() {
  const qc = useQueryClient();

  return useMutation<FolderDTO, Error, UpdateFolderInput>({
    mutationFn: updateFolder,
    onSuccess: (updated) => {
      qc.setQueryData<FolderDTO[]>(workQueryKeys.foldersAll(), (prev) =>
        prev ? prev.map((f) => (f.id === updated.id ? { ...f, name: updated.name } : f)) : prev
      );
    },
  });
}

export function useDeleteFolderMutation() {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteFolderInput>({
    mutationFn: deleteFolder,
    onSuccess: (_data, variables) => {
      qc.setQueryData<FolderDTO[]>(workQueryKeys.foldersAll(), (prev) =>
        prev ? prev.filter((f) => f.id !== variables.folderId) : prev
      );
    },
  });
}
