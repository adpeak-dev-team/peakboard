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
  projectId: string;
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
}

export const workQueryKeys = {
  all: ['work'] as const,
  projects: () => [...workQueryKeys.all, 'projects'] as const,
  tasksAll: () => [...workQueryKeys.all, 'tasks'] as const,
  tasks: (projectId: string) => [...workQueryKeys.tasksAll(), projectId] as const,
  foldersAll: () => [...workQueryKeys.all, 'folders'] as const,
  folders: (projectId: string) => [...workQueryKeys.foldersAll(), projectId] as const,
  todosAll: () => [...workQueryKeys.all, 'todos'] as const,
  todos: (projectId: string) => [...workQueryKeys.todosAll(), projectId] as const,
};

export type { Folder, Project, Task, TaskStatus };
