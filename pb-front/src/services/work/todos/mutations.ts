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
      if (created.folderId) {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.folderTodosAll(), (prev) =>
          prev ? [...prev, created] : [created]
        );
      } else if (created.taskId && projectId) {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
          prev ? [...prev, created] : [created]
        );
      }
    },
  });
}

export function useUpdateTodoMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<TodoDTO, Error, UpdateTodoInput>({
    mutationFn: updateTodo,
    onSuccess: (updated, variables) => {
      const isMove = 'taskId' in variables.patch || 'folderId' in variables.patch;
      if (isMove) {
        if (projectId) qc.invalidateQueries({ queryKey: workQueryKeys.todos(projectId) });
        qc.invalidateQueries({ queryKey: workQueryKeys.folderTodosAll() });
        return;
      }
      if (variables.kind === 'folder') {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.folderTodosAll(), (prev) =>
          prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev
        );
      } else if (projectId) {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
          prev ? prev.map((t) => (t.id === updated.id ? updated : t)) : prev
        );
      }
    },
  });
}

export function useDeleteTodoMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteTodoInput>({
    mutationFn: deleteTodo,
    onSuccess: (_data, variables) => {
      if (variables.kind === 'folder') {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.folderTodosAll(), (prev) =>
          prev ? prev.filter((t) => t.id !== variables.todoId) : prev
        );
      } else if (projectId) {
        qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(projectId), (prev) =>
          prev ? prev.filter((t) => t.id !== variables.todoId) : prev
        );
      }
    },
  });
}
