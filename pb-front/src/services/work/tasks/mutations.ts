import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, deleteTask, updateTask } from './api';
import {
  workQueryKeys,
  type CreateTaskInput,
  type DeleteTaskInput,
  type TaskDTO,
  type UpdateTaskInput,
} from '../type';

export function useCreateTaskMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<TaskDTO, Error, CreateTaskInput>({
    mutationFn: createTask,
    onSuccess: (created) => {
      if (!projectId) return;
      qc.setQueryData<TaskDTO[]>(workQueryKeys.tasks(projectId), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateTaskMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<TaskDTO, Error, UpdateTaskInput>({
    mutationFn: updateTask,
    onSuccess: (updated) => {
      if (!projectId) return;
      qc.setQueryData<TaskDTO[]>(workQueryKeys.tasks(projectId), (prev) =>
        prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev
      );
    },
  });
}

export function useDeleteTaskMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteTaskInput>({
    mutationFn: deleteTask,
    onSuccess: (_data, variables) => {
      if (!projectId) return;
      qc.setQueryData<TaskDTO[]>(workQueryKeys.tasks(projectId), (prev) =>
        prev ? prev.filter((t) => t.id !== variables.taskId) : prev
      );
    },
  });
}
