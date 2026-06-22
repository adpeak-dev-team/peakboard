import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteColumnOption, upsertColumnOption } from './api';
import { workQueryKeys, type ColumnOptionDTO } from '../type';

export function useUpsertColumnOptionMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertColumnOption,
    onSuccess: (saved) => {
      qc.setQueryData<ColumnOptionDTO[]>(workQueryKeys.columnOptions(boardId), (prev) => {
        if (!prev) return [saved];
        const idx = prev.findIndex((o) => o.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
    },
  });
}

export function useDeleteColumnOptionMutation(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteColumnOption,
    onSuccess: (_data, id) => {
      qc.setQueryData<ColumnOptionDTO[]>(workQueryKeys.columnOptions(boardId), (prev) =>
        prev ? prev.filter((o) => o.id !== id) : prev
      );
    },
  });
}
