export type TaskStatus = 'todo' | 'inProgress' | 'done';

export interface Idea {
  id: string;
  title: string;
  starred: boolean;
  assignee: string;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  ideas: Idea[];
}

export interface Folder {
  id: string;
  name: string;
  ideas: Idea[];
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
