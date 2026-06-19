import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBoardItem,
  deleteBoardItem,
  reorderBoardItems,
  updateBoardItem,
} from './api';
import { workQueryKeys, type BoardItemDTO } from '../type';

export function useCreateBoardItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBoardItem,
    onSuccess: (created) => {
      qc.setQueryData<BoardItemDTO[]>(workQueryKeys.boardItems(created.boardId), (prev) =>
        prev ? [...prev, created] : [created]
      );
    },
  });
}

export function useUpdateBoardItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBoardItem,
    // 인라인 편집 즉시 반영 (낙관적 업데이트)
    onMutate: async ({ itemId, boardId, patch }) => {
      const key = workQueryKeys.boardItems(boardId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardItemDTO[]>(key);
      qc.setQueryData<BoardItemDTO[]>(key, (list) =>
        list?.map((it) => (it.id === itemId ? { ...it, ...patch } : it))
      );
      return { prev, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSuccess: (updated) => {
      qc.setQueryData<BoardItemDTO[]>(workQueryKeys.boardItems(updated.boardId), (list) =>
        list?.map((it) => (it.id === updated.id ? updated : it))
      );
    },
  });
}

export function useReorderBoardItemsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderBoardItems,
    // 드래그 결과 즉시 반영: 대상 그룹 아이템의 group_key/position 갱신
    onMutate: ({ boardId, groupKey, orderedIds }) => {
      const key = workQueryKeys.boardItems(boardId);
      const prev = qc.getQueryData<BoardItemDTO[]>(key);
      const orderIndex = new Map(orderedIds.map((id, idx) => [id, idx]));
      qc.setQueryData<BoardItemDTO[]>(key, (list) =>
        list?.map((it) =>
          orderIndex.has(it.id)
            ? { ...it, groupKey, position: orderIndex.get(it.id)! }
            : it
        )
      );
      return { prev, key };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
    },
  });
}

export function useDeleteBoardItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBoardItem,
    onSuccess: (_data, { itemId, boardId }) => {
      qc.setQueryData<BoardItemDTO[]>(workQueryKeys.boardItems(boardId), (prev) =>
        prev ? prev.filter((it) => it.id !== itemId) : prev
      );
    },
  });
}
