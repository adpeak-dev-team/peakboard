export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Todo {
  id: string;
  title: string;
  description: string;
  starred: boolean;
  assignee: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  todos: Todo[];
}

export interface Folder {
  id: string;
  name: string;
  todos: Todo[];
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
  folders: Folder[];
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
}
