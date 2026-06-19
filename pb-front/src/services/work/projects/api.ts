import { apiClient } from '@/api/apiClient';
import type {
  CreateProjectInput,
  DeleteProjectInput,
  ProjectDTO,
  UpdateProjectInput,
} from '../type';

export async function fetchProjects(boardId: string): Promise<ProjectDTO[]> {
  const { data } = await apiClient.get<ProjectDTO[]>(`/boards/${boardId}/projects`);
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDTO> {
  const { data } = await apiClient.post<ProjectDTO>(`/boards/${input.boardId}/projects`, {
    name: input.name,
  });
  return data;
}

export async function updateProject(input: UpdateProjectInput): Promise<{ id: string; name: string }> {
  const { data } = await apiClient.patch<{ id: string; name: string }>(
    `/projects/${input.projectId}`,
    { name: input.name }
  );
  return data;
}

export async function deleteProject(input: DeleteProjectInput): Promise<void> {
  await apiClient.delete(`/projects/${input.projectId}`);
}
