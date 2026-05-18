import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject } from './api';
import { workQueryKeys, type CreateProjectInput, type ProjectDTO } from '../type';

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
