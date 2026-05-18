import { apiClient } from '@/api/apiClient';
import type {
  CreateTodoInput,
  DeleteTodoInput,
  TodoDTO,
  UpdateTodoInput,
} from '../type';

export async function fetchTodos(projectId: string): Promise<TodoDTO[]> {
  const { data } = await apiClient.get<TodoDTO[]>(`/projects/${projectId}/todos`);
  return data;
}

export async function createTodo(input: CreateTodoInput): Promise<TodoDTO> {
  const url =
    input.parent.kind === 'task'
      ? `/tasks/${input.parent.id}/todos`
      : `/folders/${input.parent.id}/todos`;
  const { data } = await apiClient.post<TodoDTO>(url, {
    title: input.title,
    description: input.description,
    assignee: input.assignee,
  });
  return data;
}

export async function updateTodo(input: UpdateTodoInput): Promise<TodoDTO> {
  const { data } = await apiClient.patch<TodoDTO>(`/todos/${input.todoId}`, input.patch);
  return data;
}

export async function deleteTodo(input: DeleteTodoInput): Promise<void> {
  await apiClient.delete(`/todos/${input.todoId}`);
}
