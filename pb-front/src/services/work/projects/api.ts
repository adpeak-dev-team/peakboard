import { apiClient } from '@/api/apiClient';
import type { CreateProjectInput, ProjectDTO } from '../type';

export async function fetchProjects(): Promise<ProjectDTO[]> {
  const { data } = await apiClient.get<ProjectDTO[]>('/projects');
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectDTO> {
  const { data } = await apiClient.post<ProjectDTO>('/projects', input);
  return data;
}
