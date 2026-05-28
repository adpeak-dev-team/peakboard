import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  attachTaskDocument,
  attachTodoDocument,
} from './api';
import {
  workQueryKeys,
  type CreateDocumentInput,
  type UpdateDocumentInput,
  type DeleteDocumentInput,
  type AttachDocumentInput,
  type DocumentDTO,
  type DocumentSummaryDTO,
} from '../type';

function toSummary(doc: DocumentDTO): DocumentSummaryDTO {
  return {
    id: doc.id,
    projectId: doc.projectId,
    parentId: doc.parentId,
    attachedTaskId: doc.attachedTaskId,
    attachedTodoId: doc.attachedTodoId,
    title: doc.title,
    icon: doc.icon,
    position: doc.position,
    updatedAt: doc.updatedAt,
  };
}

export function useCreateDocumentMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<DocumentDTO, Error, CreateDocumentInput>({
    mutationFn: createDocument,
    onSuccess: (created) => {
      if (!projectId) return;
      // 첨부 문서(task/todo)는 트리 목록에 넣지 않음
      if (created.attachedTaskId || created.attachedTodoId) return;
      qc.setQueryData<DocumentSummaryDTO[]>(
        workQueryKeys.documents(projectId),
        (prev) => (prev ? [...prev, toSummary(created)] : [toSummary(created)])
      );
      qc.setQueryData(workQueryKeys.document(created.id), created);
    },
  });
}

export function useUpdateDocumentMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<DocumentDTO, Error, UpdateDocumentInput>({
    mutationFn: updateDocument,
    onSuccess: (updated) => {
      qc.setQueryData(workQueryKeys.document(updated.id), updated);
      if (!projectId) return;
      qc.setQueryData<DocumentSummaryDTO[]>(
        workQueryKeys.documents(projectId),
        (prev) =>
          prev
            ? prev.map((d) => (d.id === updated.id ? toSummary(updated) : d))
            : prev
      );
    },
  });
}

// task/todo 첨부 문서 열기(없으면 생성). 트리 목록 캐시는 건드리지 않고
// 상세 캐시만 채워 DocumentView 가 즉시 렌더되도록 함.
export function useAttachDocumentMutation() {
  const qc = useQueryClient();

  return useMutation<DocumentDTO, Error, AttachDocumentInput>({
    mutationFn: ({ kind, id, createdByName }) =>
      kind === 'task'
        ? attachTaskDocument(id, createdByName)
        : attachTodoDocument(id, createdByName),
    onSuccess: (doc) => {
      qc.setQueryData(workQueryKeys.document(doc.id), doc);
    },
  });
}

export function useDeleteDocumentMutation(projectId: string | null) {
  const qc = useQueryClient();

  return useMutation<void, Error, DeleteDocumentInput>({
    mutationFn: deleteDocument,
    onSuccess: (_data, variables) => {
      if (!projectId) return;
      // 자식 문서도 DB CASCADE 로 삭제됨 — 캐시에서 본인+자손 모두 제거
      qc.setQueryData<DocumentSummaryDTO[]>(
        workQueryKeys.documents(projectId),
        (prev) => {
          if (!prev) return prev;
          const removed = new Set<string>([variables.documentId]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const d of prev) {
              if (d.parentId && removed.has(d.parentId) && !removed.has(d.id)) {
                removed.add(d.id);
                changed = true;
              }
            }
          }
          return prev.filter((d) => !removed.has(d.id));
        }
      );
      qc.removeQueries({ queryKey: workQueryKeys.document(variables.documentId) });
    },
  });
}
