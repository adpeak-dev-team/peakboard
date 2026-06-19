// ===== Board (팀 보드) =====
export interface BoardDTO {
  id: string;
  name: string;
  teamType: 'video' | 'dev';
  position: number;
}

// ===== Project (보드 내 프로젝트 — 주로 개발팀 탭) =====
export interface ProjectDTO {
  id: string;
  boardId: string;
  name: string;
  position: number;
}

export interface CreateProjectInput {
  boardId: string;
  name: string;
}

export interface UpdateProjectInput {
  projectId: string;
  boardId: string;
  name: string;
}

export interface DeleteProjectInput {
  projectId: string;
  boardId: string;
}

// ===== BoardItem (표의 한 행 = 달력의 한 일정) =====
export interface BoardItemDTO {
  id: string;
  boardId: string;
  projectId: string | null;
  title: string;
  groupKey: string;
  eventDate: string | null; // 'YYYY-MM-DD'
  assignee: string;
  notes: string;
  done: boolean;
  fields: Record<string, string>; // 팀별 추가 컬럼 값
  position: number;
}

export interface CreateBoardItemInput {
  boardId: string;
  groupKey: string;
  projectId?: string | null;
  title?: string;
  eventDate?: string | null;
  assignee?: string;
  notes?: string;
  fields?: Record<string, string>;
}

export type BoardItemPatch = Partial<{
  projectId: string | null;
  title: string;
  groupKey: string;
  eventDate: string | null;
  assignee: string;
  notes: string;
  done: boolean;
  fields: Record<string, string>;
  position: number;
}>;

export interface UpdateBoardItemInput {
  itemId: string;
  boardId: string; // 캐시 무효화용
  patch: BoardItemPatch;
}

export interface DeleteBoardItemInput {
  itemId: string;
  boardId: string;
}

export interface ReorderBoardItemsInput {
  boardId: string;
  groupKey: string;
  orderedIds: string[];
}

// ===== CompanyEvent (연차 / 회사 일정 / 공휴일 / 개인 todo) =====
export type EventCategory = 'leave' | 'company' | 'holiday' | 'todo';

export interface EventDTO {
  id: string;
  date: string; // 'YYYY-MM-DD'
  category: EventCategory;
  title: string;
  done: boolean;
}

export interface CreateEventInput {
  date: string;
  category: EventCategory;
  title: string;
}

export interface UpdateEventInput {
  id: string;
  patch: Partial<{ date: string; category: EventCategory; title: string; done: boolean }>;
}

export interface DeleteEventInput {
  id: string;
}

// ===== Employee (직원 / 회원) =====
export interface EmployeeDTO {
  id: string;
  name: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  hireDate: string | null; // 입사일 'YYYY-MM-DD'
  leaveTotal: number; // 연 연차 부여 일수
}

export type EmployeePatch = Partial<Omit<EmployeeDTO, 'id'>>;

export interface UpdateEmployeeInput {
  id: string;
  patch: EmployeePatch;
}

// ===== LeaveRequest (연차 신청) =====
export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequestDTO {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
}

export interface CreateLeaveInput {
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

// ===== ColumnOption (표 컬럼 select 값/색상 커스터마이즈) =====
export interface ColumnOptionDTO {
  id: string;
  columnKey: string;
  value: string;
  color: string;
  position: number;
}

export interface UpsertColumnOptionInput {
  boardId: string;
  columnKey: string;
  value: string;
  color: string;
  position?: number;
}

export const workQueryKeys = {
  all: ['work'] as const,
  boards: () => [...workQueryKeys.all, 'boards'] as const,
  columnOptions: (boardId: string) => [...workQueryKeys.all, 'columnOptions', boardId] as const,
  boardItemsAll: () => [...workQueryKeys.all, 'boardItems'] as const,
  boardItems: (boardId: string) => [...workQueryKeys.boardItemsAll(), boardId] as const,
  projectsAll: () => [...workQueryKeys.all, 'projects'] as const,
  projects: (boardId: string) => [...workQueryKeys.projectsAll(), boardId] as const,
  events: () => [...workQueryKeys.all, 'events'] as const,
  employees: () => [...workQueryKeys.all, 'employees'] as const,
  leaveRequests: () => [...workQueryKeys.all, 'leaveRequests'] as const,
};
