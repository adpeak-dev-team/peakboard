import type { Folder, Project, Task, TaskStatus } from '@/lib/types';

export interface ProjectDTO {
  id: string;
  name: string;
}

export interface CreateProjectInput {
  name: string;
}

export interface UpdateProjectInput {
  projectId: string;
  name: string;
}

export interface DeleteProjectInput {
  projectId: string;
}

export type TaskDTO = Task;

export interface CreateTaskInput {
  projectId: string;
  title: string;
}

export interface UpdateTaskInput {
  taskId: string;
  patch: {
    title?: string;
    status?: TaskStatus;
    position?: number;
  };
}

export interface DeleteTaskInput {
  taskId: string;
}

export type FolderDTO = Folder;

export interface CreateFolderInput {
  name: string;
}

export interface DeleteFolderInput {
  folderId: string;
}

export interface UpdateFolderInput {
  folderId: string;
  name: string;
}

export interface TodoDTO {
  id: string;
  taskId: string | null;
  folderId: string | null;
  title: string;
  description: string;
  assignee: string;
  starred: boolean;
  position: number;
  createdAt: number;
}

export interface CreateTodoInput {
  parent: { kind: 'task' | 'folder'; id: string };
  title: string;
  description?: string;
  assignee: string;
}

export interface UpdateTodoInput {
  todoId: string;
  kind: 'task' | 'folder';
  patch: {
    title?: string;
    description?: string;
    assignee?: string;
    starred?: boolean;
    position?: number;
    taskId?: string | null;
    folderId?: string | null;
  };
}

export interface DeleteTodoInput {
  todoId: string;
  kind: 'task' | 'folder';
}

// 문서(documents). content 는 TipTap JSON (Phase 2). 트리 목록은 메타만.
export interface DocumentSummaryDTO {
  id: string;
  projectId: string;
  parentId: string | null;
  attachedTaskId: string | null;
  attachedTodoId: string | null;
  title: string;
  icon: string;
  position: number;
  updatedAt: string;
}

export interface DocumentDTO extends DocumentSummaryDTO {
  content: unknown | null;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
}

export interface CreateDocumentInput {
  projectId: string;
  title?: string;
  icon?: string;
  parentId?: string | null;
  createdByName?: string;
}

export interface UpdateDocumentInput {
  documentId: string;
  patch: {
    title?: string;
    icon?: string;
    content?: unknown;
    parentId?: string | null;
    position?: number;
    updatedByName?: string;
  };
}

export interface DeleteDocumentInput {
  documentId: string;
}

export interface AttachDocumentInput {
  kind: 'task' | 'todo';
  id: string;
  createdByName: string;
}

export const workQueryKeys = {
  all: ['work'] as const,
  projects: () => [...workQueryKeys.all, 'projects'] as const,
  tasksAll: () => [...workQueryKeys.all, 'tasks'] as const,
  tasks: (projectId: string) => [...workQueryKeys.tasksAll(), projectId] as const,
  foldersAll: () => [...workQueryKeys.all, 'folders'] as const,
  todosAll: () => [...workQueryKeys.all, 'todos'] as const,
  todos: (projectId: string) => [...workQueryKeys.todosAll(), projectId] as const,
  folderTodosAll: () => [...workQueryKeys.all, 'folderTodos'] as const,
  documentsAll: () => [...workQueryKeys.all, 'documents'] as const,
  documents: (projectId: string) => [...workQueryKeys.documentsAll(), projectId] as const,
  document: (documentId: string) =>
    [...workQueryKeys.all, 'document', documentId] as const,
};

export type { Folder, Project, Task, TaskStatus };
