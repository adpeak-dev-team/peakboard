import { apiClient } from '@/api/apiClient';
import type { CreateProjectInput, UpdateProjectInput, DeleteProjectInput, ProjectDTO } from '../type';

export async function fetchProjects(): Promise<ProjectDTO[]> {
  const { data } = await apiClient.get<ProjectDTO[]>('/projects');
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDTO> {
  const { data } = await apiClient.post<ProjectDTO>('/projects', input);
  return data;
}

export async function updateProject(input: UpdateProjectInput): Promise<ProjectDTO> {
  const { data } = await apiClient.patch<ProjectDTO>(`/projects/${input.projectId}`, { name: input.name });
  return data;
}

export async function deleteProject(input: DeleteProjectInput): Promise<void> {
  await apiClient.delete(`/projects/${input.projectId}`);
}
