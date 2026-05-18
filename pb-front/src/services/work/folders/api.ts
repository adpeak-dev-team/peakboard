import { apiClient } from '@/api/apiClient';
import type {
  CreateFolderInput,
  UpdateFolderInput,
  DeleteFolderInput,
  FolderDTO,
} from '../type';

export async function fetchFolders(): Promise<FolderDTO[]> {
  const { data } = await apiClient.get<FolderDTO[]>('/folders');
  return data;
}

export async function createFolder(input: CreateFolderInput): Promise<FolderDTO> {
  const { data } = await apiClient.post<FolderDTO>('/folders', { name: input.name });
  return data;
}

export async function updateFolder(input: UpdateFolderInput): Promise<FolderDTO> {
  const { data } = await apiClient.patch<FolderDTO>(`/folders/${input.folderId}`, { name: input.name });
  return data;
}

export async function deleteFolder(input: DeleteFolderInput): Promise<void> {
  await apiClient.delete(`/folders/${input.folderId}`);
}
