import { apiClient } from '@/api/apiClient';
import type { ColumnOptionDTO, UpsertColumnOptionInput } from '../type';

export async function fetchColumnOptions(boardId: string): Promise<ColumnOptionDTO[]> {
  const { data } = await apiClient.get<ColumnOptionDTO[]>(`/boards/${boardId}/column-options`);
  return data;
}

export async function upsertColumnOption(
  input: UpsertColumnOptionInput
): Promise<ColumnOptionDTO> {
  const { boardId, ...body } = input;
  const { data } = await apiClient.put<ColumnOptionDTO>(`/boards/${boardId}/column-options`, body);
  return data;
}

export async function deleteColumnOption(id: string): Promise<void> {
  await apiClient.delete(`/column-options/${id}`);
}
