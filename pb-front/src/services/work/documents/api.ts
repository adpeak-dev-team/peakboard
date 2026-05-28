import { apiClient } from '@/api/apiClient';
import type {
  CreateDocumentInput,
  UpdateDocumentInput,
  DeleteDocumentInput,
  DocumentDTO,
  DocumentSummaryDTO,
} from '../type';

export async function fetchDocuments(projectId: string): Promise<DocumentSummaryDTO[]> {
  const { data } = await apiClient.get<DocumentSummaryDTO[]>(
    `/projects/${projectId}/documents`
  );
  return data;
}

export async function fetchDocument(documentId: string): Promise<DocumentDTO> {
  const { data } = await apiClient.get<DocumentDTO>(`/documents/${documentId}`);
  return data;
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentDTO> {
  const { projectId, ...body } = input;
  const { data } = await apiClient.post<DocumentDTO>(
    `/projects/${projectId}/documents`,
    body
  );
  return data;
}

export async function updateDocument(input: UpdateDocumentInput): Promise<DocumentDTO> {
  const { data } = await apiClient.patch<DocumentDTO>(
    `/documents/${input.documentId}`,
    input.patch
  );
  return data;
}

export async function deleteDocument(input: DeleteDocumentInput): Promise<void> {
  await apiClient.delete(`/documents/${input.documentId}`);
}

// task/todo 첨부 문서 — 서버가 없으면 생성, 있으면 기존 문서를 반환.
export async function attachTaskDocument(
  taskId: string,
  createdByName: string
): Promise<DocumentDTO> {
  const { data } = await apiClient.post<DocumentDTO>(`/tasks/${taskId}/document`, {
    createdByName,
  });
  return data;
}

export async function attachTodoDocument(
  todoId: string,
  createdByName: string
): Promise<DocumentDTO> {
  const { data } = await apiClient.post<DocumentDTO>(`/todos/${todoId}/document`, {
    createdByName,
  });
  return data;
}
