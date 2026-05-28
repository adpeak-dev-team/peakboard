import { useQuery } from '@tanstack/react-query';
import { fetchDocuments, fetchDocument } from './api';
import { workQueryKeys } from '../type';

export function useDocumentsQuery(projectId: string | null) {
  return useQuery({
    queryKey: workQueryKeys.documents(projectId ?? ''),
    queryFn: () => fetchDocuments(projectId as string),
    enabled: !!projectId,
  });
}

export function useDocumentQuery(documentId: string | null) {
  return useQuery({
    queryKey: workQueryKeys.document(documentId ?? ''),
    queryFn: () => fetchDocument(documentId as string),
    enabled: !!documentId,
  });
}
