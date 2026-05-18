import { apiClient } from '@/api/apiClient';
import type {
  CreateTaskInput,
  DeleteTaskInput,
  TaskDTO,
  UpdateTaskInput,
} from '../type';

export async function fetchTasks(projectId: string): Promise<TaskDTO[]> {
  const { data } = await apiClient.get<TaskDTO[]>(`/projects/${projectId}/tasks`);
  return data;
}

export async function createTask(input: CreateTaskInput): Promise<TaskDTO> {
  const { data } = await apiClient.post<TaskDTO>(
    `/projects/${input.projectId}/tasks`,
    { title: input.title }
  );
  return data;
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskDTO> {
  const { data } = await apiClient.patch<TaskDTO>(`/tasks/${input.taskId}`, input.patch);
  return data;
}

export async function deleteTask(input: DeleteTaskInput): Promise<void> {
  await apiClient.delete(`/tasks/${input.taskId}`);
}
