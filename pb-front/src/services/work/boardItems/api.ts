import { apiClient } from '@/api/apiClient';
import type {
  BoardItemDTO,
  CreateBoardItemInput,
  DeleteBoardItemInput,
  ReorderBoardItemsInput,
  UpdateBoardItemInput,
} from '../type';

export async function fetchBoardItems(boardId: string): Promise<BoardItemDTO[]> {
  const { data } = await apiClient.get<BoardItemDTO[]>(`/boards/${boardId}/items`);
  return data;
}

export async function createBoardItem(input: CreateBoardItemInput): Promise<BoardItemDTO> {
  const { boardId, ...body } = input;
  const { data } = await apiClient.post<BoardItemDTO>(`/boards/${boardId}/items`, body);
  return data;
}

export async function updateBoardItem(input: UpdateBoardItemInput): Promise<BoardItemDTO> {
  const { data } = await apiClient.patch<BoardItemDTO>(
    `/board-items/${input.itemId}`,
    input.patch
  );
  return data;
}

export async function deleteBoardItem(input: DeleteBoardItemInput): Promise<void> {
  await apiClient.delete(`/board-items/${input.itemId}`);
}

export async function reorderBoardItems(input: ReorderBoardItemsInput): Promise<void> {
  await apiClient.put(`/boards/${input.boardId}/reorder`, {
    groupKey: input.groupKey,
    orderedIds: input.orderedIds,
  });
}
