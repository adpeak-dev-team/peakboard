import { apiClient } from '@/api/apiClient';
import type {
  CreateFolderInput,
  DeleteFolderInput,
  FolderDTO,
} from '../type';

export async function fetchFolders(projectId: string): Promise<FolderDTO[]> {
  const { data } = await apiClient.get<FolderDTO[]>(`/projects/${projectId}/folders`);
  return data;
}

export async function createFolder(input: CreateFolderInput): Promise<FolderDTO> {
  const { data } = await apiClient.post<FolderDTO>(
    `/projects/${input.projectId}/folders`,
    { name: input.name }
  );
  return data;
}

export async function deleteFolder(input: DeleteFolderInput): Promise<void> {
  await apiClient.delete(`/folders/${input.folderId}`);
}
