import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, deleteProject, updateProject } from './api';
import { workQueryKeys, type ProjectDTO } from '../type';

export function useCreateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProject,
    onSuccess: (created) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(created.boardId), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateProject,
    onSuccess: (updated, { boardId }) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(boardId), (prev) =>
        prev?.map((p) => (p.id === updated.id ? { ...p, name: updated.name } : p))
      );
    },
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProject,
    onSuccess: (_data, { projectId, boardId }) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(boardId), (prev) =>
        prev ? prev.filter((p) => p.id !== projectId) : prev
      );
      // 프로젝트 삭제 시 속한 아이템도 CASCADE → 보드 아이템 캐시 무효화
      qc.invalidateQueries({ queryKey: workQueryKeys.boardItems(boardId) });
    },
  });
}
