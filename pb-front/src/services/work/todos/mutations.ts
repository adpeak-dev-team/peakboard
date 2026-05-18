import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo, deleteTodo, updateTodo } from './api';
import {
  workQueryKeys,
  type CreateTodoInput,
  type DeleteTodoInput,
  type TodoDTO,
  type UpdateTodoInput,
} from '../type';

export function useCreateTodoMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<TodoDTO, Error, CreateTodoInput>({
    mutationFn: createTodo,
    onSuccess: (created) => {
      if (!projectId) return;
      qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateTodoMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<TodoDTO, Error, UpdateTodoInput>({
    mutationFn: updateTodo,
    onSuccess: (updated) => {
      if (!projectId) return;
      qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
        prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev
      );
    },
  });
}

export function useDeleteTodoMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteTodoInput>({
    mutationFn: deleteTodo,
    onSuccess: (_data, variables) => {
      if (!projectId) return;
      qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
        prev ? prev.filter((t) => t.id !== variables.todoId) : prev
      );
    },
  });
}
