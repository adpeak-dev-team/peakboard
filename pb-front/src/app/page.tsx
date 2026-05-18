'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Menu } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Sidebar from '@/components/Sidebar';
import Column from '@/components/Column';
import TaskCard, { TaskCardView } from '@/components/TaskCard';
import AddTaskModal from '@/components/AddTaskModal';
import AddTodoModal from '@/components/AddTodoModal';
import TodoListModal from '@/components/TodoListModal';
import FolderModal from '@/components/FolderModal';
import AddFolderModal from '@/components/AddFolderModal';
import MoveTodoModal, { type MoveTarget } from '@/components/MoveTodoModal';
import ConfirmModal from '@/components/ConfirmModal';
import type { Folder, Todo, Project, Task, TaskStatus } from '@/lib/types';
import { useProjectsQuery } from '@/services/work/projects/queries';
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/services/work/projects/mutations';
import { useTasksQuery } from '@/services/work/tasks/queries';
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from '@/services/work/tasks/mutations';
import { useFoldersQuery } from '@/services/work/folders/queries';
import {
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from '@/services/work/folders/mutations';
import { useTodosQuery, useFolderTodosQuery } from '@/services/work/todos/queries';
import {
  useCreateTodoMutation,
  useDeleteTodoMutation,
  useUpdateTodoMutation,
} from '@/services/work/todos/mutations';
import { workQueryKeys, type TaskDTO, type TodoDTO } from '@/services/work/type';

const SESSION_KEY = 'peakboard:activeProjectId';

const COLUMNS: { status: TaskStatus; title: string; bg: string; border: string }[] = [
  { status: 'todo', title: '해야 할 일', bg: 'bg-gray-100', border: '' },
  { status: 'inProgress', title: '진행 중', bg: 'bg-blue-50', border: 'border-l-4 border-blue-500' },
  { status: 'done', title: '완료', bg: 'bg-green-50', border: 'border-l-4 border-green-500' },
];

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.status));

type TodoSource =
  | { kind: 'task'; id: string }
  | { kind: 'folder'; id: string };

function findContainer(id: string, tasks: TaskDTO[]): TaskStatus | null {
  if (COLUMN_IDS.has(id)) return id as TaskStatus;
  return tasks.find((t) => t.id === id)?.status ?? null;
}

export default function PeakBoard() {
  const qc = useQueryClient();

  const projectsQuery = useProjectsQuery();
  const projectsList = projectsQuery.data ?? [];

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setActiveProjectId(stored);
  }, []);
  useEffect(() => {
    if (activeProjectId) sessionStorage.setItem(SESSION_KEY, activeProjectId);
    else sessionStorage.removeItem(SESSION_KEY);
  }, [activeProjectId]);
  useEffect(() => {
    if (!projectsQuery.data) return;
    if (activeProjectId && !projectsQuery.data.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(null);
    }
  }, [projectsQuery.data, activeProjectId]);

  const tasksQuery = useTasksQuery(activeProjectId);
  const foldersQuery = useFoldersQuery();
  const todosQuery = useTodosQuery(activeProjectId);
  const folderTodosQuery = useFolderTodosQuery();

  const todosByTaskId = useMemo(() => {
    const byTask = new Map<string, Todo[]>();
    for (const t of todosQuery.data ?? []) {
      if (!t.taskId) continue;
      const todo: Todo = {
        id: t.id,
        title: t.title,
        description: t.description,
        starred: t.starred,
        assignee: t.assignee,
        createdAt: t.createdAt,
      };
      const list = byTask.get(t.taskId) ?? [];
      list.push(todo);
      byTask.set(t.taskId, list);
    }
    return byTask;
  }, [todosQuery.data]);

  const todosByFolderId = useMemo(() => {
    const byFolder = new Map<string, Todo[]>();
    for (const t of folderTodosQuery.data ?? []) {
      if (!t.folderId) continue;
      const todo: Todo = {
        id: t.id,
        title: t.title,
        description: t.description,
        starred: t.starred,
        assignee: t.assignee,
        createdAt: t.createdAt,
      };
      const list = byFolder.get(t.folderId) ?? [];
      list.push(todo);
      byFolder.set(t.folderId, list);
    }
    return byFolder;
  }, [folderTodosQuery.data]);

  const tasks: Task[] = useMemo(() => {
    return (tasksQuery.data ?? []).map((t) => ({
      ...t,
      todos: todosByTaskId.get(t.id) ?? [],
    }));
  }, [tasksQuery.data, todosByTaskId]);

  const folders: Folder[] = useMemo(() => {
    return (foldersQuery.data ?? []).map((f) => ({
      ...f,
      todos: todosByFolderId.get(f.id) ?? [],
    }));
  }, [foldersQuery.data, todosByFolderId]);

  const activeProject: Project | null = useMemo(() => {
    if (!activeProjectId) return null;
    const meta = projectsList.find((p) => p.id === activeProjectId);
    if (!meta) return null;
    return { id: meta.id, name: meta.name, tasks, folders };
  }, [activeProjectId, projectsList, tasks, folders]);

  const sidebarProjects: Project[] = useMemo(
    () =>
      projectsList.map((p) =>
        p.id === activeProjectId
          ? { id: p.id, name: p.name, tasks, folders }
          : { id: p.id, name: p.name, tasks: [], folders: [] }
      ),
    [projectsList, activeProjectId, tasks, folders]
  );

  // ====== mutations ======
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const deleteProjectMutation = useDeleteProjectMutation();
  const createTaskMutation = useCreateTaskMutation(activeProjectId);
  const updateTaskMutation = useUpdateTaskMutation(activeProjectId);
  const deleteTaskMutation = useDeleteTaskMutation(activeProjectId);
  const createFolderMutation = useCreateFolderMutation();
  const updateFolderMutation = useUpdateFolderMutation();
  const deleteFolderMutation = useDeleteFolderMutation();
  const createTodoMutation = useCreateTodoMutation(activeProjectId);
  const updateTodoMutation = useUpdateTodoMutation(activeProjectId);
  const deleteTodoMutation = useDeleteTodoMutation(activeProjectId);

  // ====== modal/state ======
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false);

  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [addTodoTarget, setAddTodoTarget] = useState<TodoSource | null>(null);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<
    { source: TodoSource; todoId: string } | null
  >(null);
  const [movingTodo, setMovingTodo] = useState<
    { source: TodoSource; todoId: string } | null
  >(null);
  const [copyingTodo, setCopyingTodo] = useState<
    { source: TodoSource; todoId: string } | null
  >(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // ====== project handlers ======
  const handleAddProject = (name: string) => {
    createProjectMutation.mutate(
      { name },
      {
        onSuccess: (created) => setActiveProjectId(created.id),
        onError: (err) => {
          console.error('프로젝트 생성 실패:', err);
          alert('프로젝트 생성에 실패했어요.');
        },
      }
    );
  };

  const handleRenameProject = (projectId: string, name: string) => {
    updateProjectMutation.mutate(
      { projectId, name },
      { onError: () => alert('프로젝트 이름 변경에 실패했어요.') }
    );
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProjectMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          if (activeProjectId === projectId) setActiveProjectId(null);
        },
        onError: () => alert('프로젝트 삭제에 실패했어요.'),
      }
    );
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    updateFolderMutation.mutate(
      { folderId, name },
      { onError: () => alert('폴더 이름 변경에 실패했어요.') }
    );
  };

  // ====== task handlers (DB) ======
  const handleAddTask = (title: string) => {
    if (!activeProjectId) return;
    createTaskMutation.mutate(
      { projectId: activeProjectId, title },
      {
        onError: (err) => {
          console.error('작업 생성 실패:', err);
          alert('작업 생성에 실패했어요.');
        },
      }
    );
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(
      { taskId },
      {
        onSuccess: () => {
          if (!activeProjectId) return;
          // DB CASCADE 로 task 의 todos 도 사라졌으니 캐시에서도 제거
          qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(activeProjectId), (prev) =>
            prev ? prev.filter((t) => t.taskId !== taskId) : prev
          );
        },
        onError: (err) => {
          console.error('작업 삭제 실패:', err);
          alert('작업 삭제에 실패했어요.');
        },
      }
    );
  };

  // ====== folder handlers (DB) ======
  const handleAddFolder = (name: string) => {
    createFolderMutation.mutate(
      { name },
      {
        onError: (err) => {
          console.error('폴더 생성 실패:', err);
          alert('폴더 생성에 실패했어요.');
        },
      }
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolderMutation.mutate(
      { folderId },
      {
        onSuccess: () => {
          // DB CASCADE 로 folder 의 todos 도 사라졌으니 캐시에서도 제거
          qc.setQueryData<TodoDTO[]>(workQueryKeys.folderTodosAll(), (prev) =>
            prev ? prev.filter((t) => t.folderId !== folderId) : prev
          );
        },
        onError: (err) => {
          console.error('폴더 삭제 실패:', err);
          alert('폴더 삭제에 실패했어요.');
        },
      }
    );
  };

  // ====== todo handlers (DB) ======
  const sourceLabel = (source: TodoSource): string => {
    if (source.kind === 'task') {
      return tasks.find((t) => t.id === source.id)?.title ?? '';
    }
    return folders.find((f) => f.id === source.id)?.name ?? '';
  };

  const handleAddTodo = (source: TodoSource, title: string, assignee: string, description?: string) => {
    createTodoMutation.mutate(
      { parent: { kind: source.kind, id: source.id }, title, assignee, description },
      {
        onError: (err) => {
          console.error('아이디어 생성 실패:', err);
          alert('아이디어 생성에 실패했어요.');
        },
      }
    );
  };

  const handleUpdateTodo = (
    source: TodoSource,
    todoId: string,
    patch: Partial<Pick<Todo, 'title' | 'assignee' | 'description'>>
  ) => {
    updateTodoMutation.mutate(
      { todoId, kind: source.kind, patch },
      {
        onError: (err) => {
          console.error('아이디어 수정 실패:', err);
          alert('아이디어 수정에 실패했어요.');
        },
      }
    );
  };

  const handleDeleteTodo = (source: TodoSource, todoId: string) => {
    deleteTodoMutation.mutate(
      { todoId, kind: source.kind },
      {
        onError: (err) => {
          console.error('아이디어 삭제 실패:', err);
          alert('아이디어 삭제에 실패했어요.');
        },
      }
    );
  };

  // 순서 변경은 DB 미반영 (캐시만, 추후 개선 단계에서 batch position PATCH 처리)
  const handleReorderTodos = (source: TodoSource, orderedIds: string[]) => {
    if (source.kind === 'folder') {
      qc.setQueryData<TodoDTO[]>(workQueryKeys.folderTodosAll(), (prev) => {
        if (!prev) return prev;
        const inScope = prev.filter((t) => t.folderId === source.id);
        const outScope = prev.filter((t) => t.folderId !== source.id);
        const byId = new Map(inScope.map((t) => [t.id, t]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter((t): t is TodoDTO => !!t);
        return [...outScope, ...reordered];
      });
    } else if (activeProjectId) {
      qc.setQueryData<TodoDTO[]>(workQueryKeys.todos(activeProjectId), (prev) => {
        if (!prev) return prev;
        const inScope = prev.filter((t) => t.taskId === source.id);
        const outScope = prev.filter((t) => t.taskId !== source.id);
        const byId = new Map(inScope.map((t) => [t.id, t]));
        const reordered = orderedIds.map((id) => byId.get(id)).filter((t): t is TodoDTO => !!t);
        return [...outScope, ...reordered];
      });
    }
  };

  const handleToggleTodoStar = (source: TodoSource, todoId: string) => {
    const current = source.kind === 'task'
      ? todosByTaskId.get(source.id)?.find((t) => t.id === todoId)
      : todosByFolderId.get(source.id)?.find((t) => t.id === todoId);
    if (!current) return;
    updateTodoMutation.mutate(
      { todoId, kind: source.kind, patch: { starred: !current.starred } },
      {
        onError: (err) => {
          console.error('별 표시 변경 실패:', err);
          alert('별 표시 변경에 실패했어요.');
        },
      }
    );
  };

  const handleCopyTodo = (
    source: TodoSource,
    todoId: string,
    destination: TodoSource
  ) => {
    const list = source.kind === 'task'
      ? todosByTaskId.get(source.id) ?? []
      : todosByFolderId.get(source.id) ?? [];
    const original = list.find((t) => t.id === todoId);
    if (!original) return;
    createTodoMutation.mutate(
      {
        parent: { kind: destination.kind, id: destination.id },
        title: original.title,
        assignee: original.assignee,
        description: original.description,
      },
      {
        onError: (err) => {
          console.error('아이디어 복사 실패:', err);
          alert('아이디어 복사에 실패했어요.');
        },
      }
    );
  };

  const handleMoveTodo = (
    source: TodoSource,
    todoId: string,
    destination: TodoSource
  ) => {
    const patch =
      destination.kind === 'task'
        ? { taskId: destination.id, folderId: null }
        : { taskId: null, folderId: destination.id };
    updateTodoMutation.mutate(
      { todoId, kind: source.kind, patch },
      {
        onError: (err) => {
          console.error('아이디어 이동 실패:', err);
          alert('아이디어 이동에 실패했어요.');
        },
      }
    );
  };

  // ====== drag handlers — 캐시 미리보기 + drop 시 status PATCH ======
  const updateTaskCache = (updater: (prev: TaskDTO[]) => TaskDTO[]) => {
    if (!activeProjectId) return;
    qc.setQueryData<TaskDTO[]>(workQueryKeys.tasks(activeProjectId), (prev) =>
      prev ? updater(prev) : prev
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const task = tasks.find((t) => t.id === id) ?? null;
    setActiveDragTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeProjectId) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    updateTaskCache((prev) => {
      const activeContainer = findContainer(activeId, prev);
      const overContainer = findContainer(overId, prev);
      if (!activeContainer || !overContainer) return prev;
      if (activeContainer === overContainer) return prev;

      const next = [...prev];
      const activeIdx = next.findIndex((t) => t.id === activeId);
      if (activeIdx < 0) return prev;

      const [moved] = next.splice(activeIdx, 1);
      const updated: TaskDTO = { ...moved, status: overContainer };

      if (COLUMN_IDS.has(overId)) {
        next.push(updated);
      } else {
        const overIdx = next.findIndex((t) => t.id === overId);
        if (overIdx < 0) next.push(updated);
        else next.splice(overIdx, 0, updated);
      }
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over || !activeProjectId) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    // 컬럼 내 순서 변경 (캐시만, position PATCH는 다음 개선 단계)
    updateTaskCache((prev) => {
      const activeContainer = findContainer(activeId, prev);
      const overContainer = findContainer(overId, prev);
      if (!activeContainer || !overContainer) return prev;
      if (activeContainer !== overContainer) return prev;

      const activeIdx = prev.findIndex((t) => t.id === activeId);
      const overIdx = COLUMN_IDS.has(overId)
        ? prev.length - 1
        : prev.findIndex((t) => t.id === overId);
      if (activeIdx < 0 || overIdx < 0) return prev;
      if (activeIdx === overIdx) return prev;
      return arrayMove(prev, activeIdx, overIdx);
    });

    // 컬럼 간 이동 시 status를 DB에 PATCH
    const currentTasks = qc.getQueryData<TaskDTO[]>(workQueryKeys.tasks(activeProjectId)) ?? [];
    const originalTasks = tasksQuery.data ?? [];
    const movedTask = currentTasks.find((t) => t.id === activeId);
    const originalTask = originalTasks.find((t) => t.id === activeId);
    if (movedTask && originalTask && movedTask.status !== originalTask.status) {
      updateTaskMutation.mutate(
        { taskId: activeId, patch: { status: movedTask.status } },
        {
          onError: (err) => {
            console.error('작업 상태 변경 실패:', err);
            alert('작업 상태 변경에 실패했어요.');
            // rollback: 원래 데이터로 캐시 복원
            qc.invalidateQueries({ queryKey: workQueryKeys.tasks(activeProjectId) });
          },
        }
      );
    }
  };

  const handleDragCancel = () => {
    setActiveDragTask(null);
  };

  // ====== derived for render ======
  const viewingTask = viewingTaskId
    ? tasks.find((t) => t.id === viewingTaskId) ?? null
    : null;
  const viewingFolder = viewingFolderId
    ? folders.find((f) => f.id === viewingFolderId) ?? null
    : null;
  const addTodoContextLabel = addTodoTarget ? sourceLabel(addTodoTarget) : '';

  const movingTodoTargets: MoveTarget[] = useMemo(() => {
    if (!movingTodo) return [];
    if (movingTodo.source.kind === 'task') {
      return folders.map((f) => ({ type: 'folder' as const, id: f.id, name: f.name }));
    }
    return tasks.map((t) => ({ type: 'task' as const, id: t.id, name: t.title }));
  }, [movingTodo, folders, tasks]);

  const movingTodoTitle = (() => {
    if (!movingTodo) return '';
    const list = movingTodo.source.kind === 'task'
      ? todosByTaskId.get(movingTodo.source.id) ?? []
      : todosByFolderId.get(movingTodo.source.id) ?? [];
    return list.find((i) => i.id === movingTodo.todoId)?.title ?? '';
  })();

  const copyingTodoTargets: MoveTarget[] = useMemo(() => {
    if (!copyingTodo) return [];
    if (copyingTodo.source.kind === 'task') {
      return folders.map((f) => ({ type: 'folder' as const, id: f.id, name: f.name }));
    }
    return tasks.map((t) => ({ type: 'task' as const, id: t.id, name: t.title }));
  }, [copyingTodo, folders, tasks]);

  const copyingTodoTitle = (() => {
    if (!copyingTodo) return '';
    const list = copyingTodo.source.kind === 'task'
      ? todosByTaskId.get(copyingTodo.source.id) ?? []
      : todosByFolderId.get(copyingTodo.source.id) ?? [];
    return list.find((i) => i.id === copyingTodo.todoId)?.title ?? '';
  })();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        projects={sidebarProjects}
        activeProjectId={activeProjectId}
        folders={folders}
        onAddProject={handleAddProject}
        onSelectProject={(id) => { setActiveProjectId(id); setSidebarOpen(false); }}
        onAddFolder={() => { setAddFolderModalOpen(true); setSidebarOpen(false); }}
        onSelectFolder={(id) => { setViewingFolderId(id); setSidebarOpen(false); }}
        onRenameProject={handleRenameProject}
        onDeleteProject={(id) => setDeletingProjectId(id)}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={(id) => setDeletingFolderId(id)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-600 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
              aria-label="메뉴 열기"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm md:text-lg font-bold text-gray-800">
              {activeProject ? activeProject.name : '프로젝트를 선택하세요'}
            </h1>
          </div>
          <button
            onClick={() => setTaskModalOpen(true)}
            disabled={!activeProject}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm rounded-md  font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2 " />새 작업 추가
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          {activeProject ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex flex-col lg:flex-row gap-6 h-full items-start">
                {COLUMNS.map((col) => {
                  const colTasks = activeProject.tasks.filter((t) => t.status === col.status);
                  return (
                    <Column
                      key={col.status}
                      title={col.title}
                      status={col.status}
                      count={colTasks.length}
                      bgColor={col.bg}
                    >
                      <SortableContext
                        items={colTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {colTasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            border={col.border}
                            isDone={col.status === 'done'}
                            onDelete={(taskId) => setDeletingTaskId(taskId)}
                            onSearch={(taskId) => setViewingTaskId(taskId)}
                            onAddSub={(taskId) =>
                              setAddTodoTarget({ kind: 'task', id: taskId })
                            }
                          />
                        ))}
                      </SortableContext>
                    </Column>
                  );
                })}
              </div>
              <DragOverlay>
                {activeDragTask ? (
                  <TaskCardView
                    task={activeDragTask}
                    border={
                      COLUMNS.find((c) => c.status === activeDragTask.status)?.border ?? ''
                    }
                    isDone={activeDragTask.status === 'done'}
                    isOverlay
                    onDelete={() => undefined}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              {projectsQuery.isLoading
                ? '프로젝트 불러오는 중…'
                : '왼쪽에서 프로젝트를 추가하거나 선택해주세요.'}
            </div>
          )}
        </div>
      </main>

      <AddTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSubmit={handleAddTask}
      />

      <AddFolderModal
        open={addFolderModalOpen}
        onClose={() => setAddFolderModalOpen(false)}
        onSubmit={handleAddFolder}
      />

      <ConfirmModal
        open={!!deletingProjectId}
        title="프로젝트 삭제"
        message="프로젝트를 삭제하면 모든 작업, 폴더, 할 일이 함께 삭제됩니다."
        onConfirm={() => {
          if (deletingProjectId) handleDeleteProject(deletingProjectId);
        }}
        onClose={() => setDeletingProjectId(null)}
      />

      <ConfirmModal
        open={!!deletingTaskId}
        title="작업 삭제"
        message="삭제된 데이터는 복구 불가 합니다."
        onConfirm={() => {
          if (deletingTaskId) handleDeleteTask(deletingTaskId);
        }}
        onClose={() => setDeletingTaskId(null)}
      />

      <TodoListModal
        open={!!viewingTask}
        taskTitle={viewingTask?.title ?? ''}
        todos={viewingTask?.todos ?? []}
        onClose={() => setViewingTaskId(null)}
        onToggleStar={(todoId) =>
          viewingTaskId &&
          handleToggleTodoStar({ kind: 'task', id: viewingTaskId }, todoId)
        }
        onUpdate={(todoId, patch) =>
          viewingTaskId &&
          handleUpdateTodo({ kind: 'task', id: viewingTaskId }, todoId, patch)
        }
        onRequestDelete={(todoId) =>
          viewingTaskId &&
          setDeletingTodo({
            source: { kind: 'task', id: viewingTaskId },
            todoId,
          })
        }
        onReorder={(orderedIds) =>
          viewingTaskId &&
          handleReorderTodos({ kind: 'task', id: viewingTaskId }, orderedIds)
        }
        onRequestMove={(todoId) =>
          viewingTaskId &&
          setMovingTodo({
            source: { kind: 'task', id: viewingTaskId },
            todoId,
          })
        }
        onRequestCopy={(todoId) =>
          viewingTaskId &&
          setCopyingTodo({
            source: { kind: 'task', id: viewingTaskId },
            todoId,
          })
        }
      />

      <FolderModal
        open={!!viewingFolder}
        folderName={viewingFolder?.name ?? ''}
        todos={viewingFolder?.todos ?? []}
        onClose={() => setViewingFolderId(null)}
        onAddTodo={() =>
          viewingFolderId &&
          setAddTodoTarget({ kind: 'folder', id: viewingFolderId })
        }
        onToggleStar={(todoId) =>
          viewingFolderId &&
          handleToggleTodoStar({ kind: 'folder', id: viewingFolderId }, todoId)
        }
        onUpdate={(todoId, patch) =>
          viewingFolderId &&
          handleUpdateTodo({ kind: 'folder', id: viewingFolderId }, todoId, patch)
        }
        onRequestDelete={(todoId) =>
          viewingFolderId &&
          setDeletingTodo({
            source: { kind: 'folder', id: viewingFolderId },
            todoId,
          })
        }
        onReorder={(orderedIds) =>
          viewingFolderId &&
          handleReorderTodos({ kind: 'folder', id: viewingFolderId }, orderedIds)
        }
        onRequestMove={(todoId) =>
          viewingFolderId &&
          setMovingTodo({
            source: { kind: 'folder', id: viewingFolderId },
            todoId,
          })
        }
        onRequestCopy={(todoId) =>
          viewingFolderId &&
          setCopyingTodo({
            source: { kind: 'folder', id: viewingFolderId },
            todoId,
          })
        }
        onDeleteFolder={() => viewingFolderId && setDeletingFolderId(viewingFolderId)}
      />

      <AddTodoModal
        open={!!addTodoTarget}
        taskTitle={addTodoContextLabel}
        onClose={() => setAddTodoTarget(null)}
        onSubmit={(title, assignee, description) => {
          if (addTodoTarget) handleAddTodo(addTodoTarget, title, assignee, description);
        }}
      />

      <MoveTodoModal
        open={!!movingTodo}
        todoTitle={movingTodoTitle}
        targets={movingTodoTargets}
        targetKind={movingTodo?.source.kind === 'task' ? 'folder' : 'task'}
        onClose={() => setMovingTodo(null)}
        onPick={(target) => {
          if (!movingTodo) return;
          const destination: TodoSource =
            target.type === 'folder'
              ? { kind: 'folder', id: target.id }
              : { kind: 'task', id: target.id };
          handleMoveTodo(movingTodo.source, movingTodo.todoId, destination);
          setMovingTodo(null);
        }}
      />

      <MoveTodoModal
        open={!!copyingTodo}
        mode="copy"
        todoTitle={copyingTodoTitle}
        targets={copyingTodoTargets}
        targetKind={copyingTodo?.source.kind === 'task' ? 'folder' : 'task'}
        onClose={() => setCopyingTodo(null)}
        onPick={(target) => {
          if (!copyingTodo) return;
          const destination: TodoSource =
            target.type === 'folder'
              ? { kind: 'folder', id: target.id }
              : { kind: 'task', id: target.id };
          handleCopyTodo(copyingTodo.source, copyingTodo.todoId, destination);
          setCopyingTodo(null);
        }}
      />

      <ConfirmModal
        open={!!deletingFolderId}
        title="폴더 삭제"
        message="폴더 안의 아이디어도 함께 삭제됩니다. 계속할까요?"
        onConfirm={() => {
          if (deletingFolderId) {
            handleDeleteFolder(deletingFolderId);
            if (viewingFolderId === deletingFolderId) {
              setViewingFolderId(null);
            }
          }
        }}
        onClose={() => setDeletingFolderId(null)}
      />

      <ConfirmModal
        open={!!deletingTodo}
        title="아이디어 삭제"
        message="삭제된 데이터는 복구 불가 합니다."
        onConfirm={() => {
          if (deletingTodo)
            handleDeleteTodo(deletingTodo.source, deletingTodo.todoId);
        }}
        onClose={() => setDeletingTodo(null)}
      />
    </div>
  );
}
