import { apiClient } from '@/api/apiClient';

export interface NworkRow {
  n_idx: number;
  n_id: string;
  n_pwd: string;
  n_memo1: string | null;
  n_memo2: string | null;
  n_status: string;
  n_lastwork_at: string | null;
  [key: string]: unknown;
}

export async function fetchNworkList(): Promise<NworkRow[]> {
  const { data } = await apiClient.get<NworkRow[]>('/yong/nwork/');
  return data;
}

export interface NworkPatch {
  n_memo1?: string | null;
  n_memo2?: string | null;
  n_status?: string;
}

export async function updateNwork(idx: number, patch: NworkPatch): Promise<NworkRow> {
  const { data } = await apiClient.patch<NworkRow>(`/yong/nwork/${idx}`, patch);
  return data;
}
