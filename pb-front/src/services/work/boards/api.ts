import { apiClient } from '@/api/apiClient';
import type { BoardDTO } from '../type';

export async function fetchBoards(): Promise<BoardDTO[]> {
  const { data } = await apiClient.get<BoardDTO[]>('/boards');
  return data;
}
