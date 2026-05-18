import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, updateProject, deleteProject } from './api';
import {
  workQueryKeys,
  type CreateProjectInput,
  type UpdateProjectInput,
  type DeleteProjectInput,
  type ProjectDTO,
} from '../type';

export function useCreateProjectMutation() {
  const qc = useQueryClient();

  return useMutation<ProjectDTO, Error, CreateProjectInput>({
    mutationFn: createProject,
    onSuccess: (created) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateProjectMutation() {
  const qc = useQueryClient();

  return useMutation<ProjectDTO, Error, UpdateProjectInput>({
    mutationFn: updateProject,
    onSuccess: (updated) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(), (prev) =>
        prev ? prev.map((p) => (p.id === updated.id ? updated : p)) : prev
      );
    },
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteProjectInput>({
    mutationFn: deleteProject,
    onSuccess: (_data, variables) => {
      qc.setQueryData<ProjectDTO[]>(workQueryKeys.projects(), (prev) =>
        prev ? prev.filter((p) => p.id !== variables.projectId) : prev
      );
      qc.removeQueries({ queryKey: workQueryKeys.tasks(variables.projectId) });
      qc.removeQueries({ queryKey: workQueryKeys.todos(variables.projectId) });
    },
  });
}
