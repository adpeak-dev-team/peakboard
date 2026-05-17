'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
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
import AddIdeaModal from '@/components/AddIdeaModal';
import IdeaListModal from '@/components/IdeaListModal';
import FolderModal from '@/components/FolderModal';
import AddFolderModal from '@/components/AddFolderModal';
import MoveIdeaModal, { type MoveTarget } from '@/components/MoveIdeaModal';
import ConfirmModal from '@/components/ConfirmModal';
import { loadState, saveState, uid } from '@/lib/storage';
import type { Folder, Idea, Project, Task, TaskStatus } from '@/lib/types';

const COLUMNS: { status: TaskStatus; title: string; bg: string; border: string }[] = [
  { status: 'todo', title: '해야 할 일', bg: 'bg-gray-100', border: '' },
  { status: 'inProgress', title: '진행 중', bg: 'bg-blue-50', border: 'border-l-4 border-blue-500' },
  { status: 'done', title: '완료', bg: 'bg-green-50', border: 'border-l-4 border-green-500' },
];

const COLUMN_IDS = new Set<string>(COLUMNS.map((c) => c.status));

type IdeaSource =
  | { kind: 'task'; id: string }
  | { kind: 'folder'; id: string };

function findContainer(id: string, project: Project): TaskStatus | null {
  if (COLUMN_IDS.has(id)) return id as TaskStatus;
  return project.tasks.find((t) => t.id === id)?.status ?? null;
}

function updateIdeasIn(
  project: Project,
  source: IdeaSource,
  updater: (ideas: Idea[]) => Idea[]
): Project {
  if (source.kind === 'task') {
    return {
      ...project,
      tasks: project.tasks.map((t) =>
        t.id === source.id ? { ...t, ideas: updater(t.ideas) } : t
      ),
    };
  }
  return {
    ...project,
    folders: project.folders.map((f) =>
      f.id === source.id ? { ...f, ideas: updater(f.ideas) } : f
    ),
  };
}

function getIdeasFrom(project: Project, source: IdeaSource): Idea[] {
  if (source.kind === 'task') {
    return project.tasks.find((t) => t.id === source.id)?.ideas ?? [];
  }
  return project.folders.find((f) => f.id === source.id)?.ideas ?? [];
}

function sourceLabel(project: Project, source: IdeaSource): string {
  if (source.kind === 'task') {
    return project.tasks.find((t) => t.id === source.id)?.title ?? '';
  }
  return project.folders.find((f) => f.id === source.id)?.name ?? '';
}

export default function PeakBoard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [addFolderModalOpen, setAddFolderModalOpen] = useState(false);

  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [addIdeaTarget, setAddIdeaTarget] = useState<IdeaSource | null>(null);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [deletingIdea, setDeletingIdea] = useState<
    { source: IdeaSource; ideaId: string } | null
  >(null);
  const [movingIdea, setMovingIdea] = useState<
    { source: IdeaSource; ideaId: string } | null
  >(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  useEffect(() => {
    const data = loadState();
    if (data) {
      const normalized: Project[] = data.projects.map((p) => ({
        ...p,
        tasks: p.tasks.map((t) => ({
          ...t,
          ideas: (t.ideas ?? []).map((i) => ({
            ...i,
            assignee: i.assignee ?? '',
            createdAt: i.createdAt ?? Date.now(),
          })),
        })),
        folders: (p.folders ?? []).map((f) => ({
          ...f,
          ideas: (f.ideas ?? []).map((i) => ({
            ...i,
            assignee: i.assignee ?? '',
            createdAt: i.createdAt ?? Date.now(),
          })),
        })),
      }));
      setProjects(normalized);
      setActiveProjectId(data.activeProjectId);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState({ projects, activeProjectId });
  }, [projects, activeProjectId, hydrated]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;

  const handleAddProject = (name: string) => {
    const newProject: Project = { id: uid(), name, tasks: [], folders: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  const handleAddTask = (title: string) => {
    if (!activeProjectId) return;
    const newTask: Task = { id: uid(), title, status: 'todo', ideas: [] };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? { ...p, tasks: [...p.tasks, newTask] } : p
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) }
          : p
      )
    );
  };

  const handleAddFolder = (name: string) => {
    if (!activeProjectId) return;
    const newFolder: Folder = { id: uid(), name, ideas: [] };
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, folders: [...p.folders, newFolder] }
          : p
      )
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, folders: p.folders.filter((f) => f.id !== folderId) }
          : p
      )
    );
  };

  const updateIdeaList = (
    source: IdeaSource,
    updater: (ideas: Idea[]) => Idea[]
  ) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId ? updateIdeasIn(p, source, updater) : p
      )
    );
  };

  const handleAddIdea = (
    source: IdeaSource,
    title: string,
    assignee: string
  ) => {
    const newIdea: Idea = {
      id: uid(),
      title,
      starred: false,
      assignee,
      createdAt: Date.now(),
    };
    updateIdeaList(source, (ideas) => [...ideas, newIdea]);
  };

  const handleUpdateIdea = (
    source: IdeaSource,
    ideaId: string,
    patch: Partial<Pick<Idea, 'title' | 'assignee'>>
  ) => {
    updateIdeaList(source, (ideas) =>
      ideas.map((i) => (i.id === ideaId ? { ...i, ...patch } : i))
    );
  };

  const handleDeleteIdea = (source: IdeaSource, ideaId: string) => {
    updateIdeaList(source, (ideas) => ideas.filter((i) => i.id !== ideaId));
  };

  const handleReorderIdeas = (source: IdeaSource, orderedIds: string[]) => {
    updateIdeaList(source, (ideas) => {
      const byId = new Map(ideas.map((i) => [i.id, i]));
      return orderedIds
        .map((id) => byId.get(id))
        .filter((i): i is Idea => !!i);
    });
  };

  const handleToggleIdeaStar = (source: IdeaSource, ideaId: string) => {
    updateIdeaList(source, (ideas) =>
      ideas.map((i) => (i.id === ideaId ? { ...i, starred: !i.starred } : i))
    );
  };

  const handleMoveIdea = (
    source: IdeaSource,
    ideaId: string,
    destination: IdeaSource
  ) => {
    if (!activeProjectId) return;
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const idea = getIdeasFrom(p, source).find((i) => i.id === ideaId);
        if (!idea) return p;
        const removed = updateIdeasIn(p, source, (ideas) =>
          ideas.filter((i) => i.id !== ideaId)
        );
        return updateIdeasIn(removed, destination, (ideas) => [...ideas, idea]);
      })
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const task = activeProject?.tasks.find((t) => t.id === id) ?? null;
    setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !activeProjectId) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const activeContainer = findContainer(activeId, p);
        const overContainer = findContainer(overId, p);
        if (!activeContainer || !overContainer) return p;
        if (activeContainer === overContainer) return p;

        const tasks = [...p.tasks];
        const activeIdx = tasks.findIndex((t) => t.id === activeId);
        if (activeIdx < 0) return p;

        const [moved] = tasks.splice(activeIdx, 1);
        const updated: Task = { ...moved, status: overContainer };

        if (COLUMN_IDS.has(overId)) {
          tasks.push(updated);
        } else {
          const overIdx = tasks.findIndex((t) => t.id === overId);
          if (overIdx < 0) tasks.push(updated);
          else tasks.splice(overIdx, 0, updated);
        }
        return { ...p, tasks };
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !activeProjectId) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== activeProjectId) return p;
        const activeContainer = findContainer(activeId, p);
        const overContainer = findContainer(overId, p);
        if (!activeContainer || !overContainer) return p;
        if (activeContainer !== overContainer) return p;

        const activeIdx = p.tasks.findIndex((t) => t.id === activeId);
        const overIdx = COLUMN_IDS.has(overId)
          ? p.tasks.length - 1
          : p.tasks.findIndex((t) => t.id === overId);
        if (activeIdx < 0 || overIdx < 0) return p;
        if (activeIdx === overIdx) return p;
        return { ...p, tasks: arrayMove(p.tasks, activeIdx, overIdx) };
      })
    );
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  const viewingTask = viewingTaskId
    ? activeProject?.tasks.find((t) => t.id === viewingTaskId) ?? null
    : null;
  const viewingFolder = viewingFolderId
    ? activeProject?.folders.find((f) => f.id === viewingFolderId) ?? null
    : null;
  const addIdeaContextLabel =
    addIdeaTarget && activeProject
      ? sourceLabel(activeProject, addIdeaTarget)
      : '';

  const movingIdeaTargets: MoveTarget[] = useMemo(() => {
    if (!movingIdea || !activeProject) return [];
    if (movingIdea.source.kind === 'task') {
      return activeProject.folders.map((f) => ({
        type: 'folder' as const,
        id: f.id,
        name: f.name,
      }));
    }
    return activeProject.tasks.map((t) => ({
      type: 'task' as const,
      id: t.id,
      name: t.title,
    }));
  }, [movingIdea, activeProject]);

  const movingIdeaTitle = (() => {
    if (!movingIdea || !activeProject) return '';
    const ideas = getIdeasFrom(activeProject, movingIdea.source);
    return ideas.find((i) => i.id === movingIdea.ideaId)?.title ?? '';
  })();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        folders={activeProject?.folders ?? []}
        onAddProject={handleAddProject}
        onSelectProject={setActiveProjectId}
        onAddFolder={() => setAddFolderModalOpen(true)}
        onSelectFolder={setViewingFolderId}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <h1 className="text-xl font-bold text-gray-800">
            {activeProject ? activeProject.name : '프로젝트를 선택하세요'}
          </h1>
          <button
            onClick={() => setTaskModalOpen(true)}
            disabled={!activeProject}
            className="flex items-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />새 작업 추가
          </button>
        </header>

        <div className="flex-1 overflow-x-auto p-8">
          {activeProject ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="flex gap-6 h-full items-start">
                {COLUMNS.map((col) => {
                  const tasks = activeProject.tasks.filter(
                    (t) => t.status === col.status
                  );
                  return (
                    <Column
                      key={col.status}
                      title={col.title}
                      status={col.status}
                      count={tasks.length}
                      bgColor={col.bg}
                    >
                      <SortableContext
                        items={tasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            border={col.border}
                            isDone={col.status === 'done'}
                            onDelete={(taskId) => setDeletingTaskId(taskId)}
                            onSearch={(taskId) => setViewingTaskId(taskId)}
                            onAddSub={(taskId) =>
                              setAddIdeaTarget({ kind: 'task', id: taskId })
                            }
                          />
                        ))}
                      </SortableContext>
                    </Column>
                  );
                })}
              </div>
              <DragOverlay>
                {activeTask ? (
                  <TaskCardView
                    task={activeTask}
                    border={
                      COLUMNS.find((c) => c.status === activeTask.status)
                        ?.border ?? ''
                    }
                    isDone={activeTask.status === 'done'}
                    isOverlay
                    onDelete={() => undefined}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              왼쪽에서 프로젝트를 추가하거나 선택해주세요.
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
        open={!!deletingTaskId}
        title="작업 삭제"
        message="삭제된 데이터는 복구 불가 합니다."
        onConfirm={() => {
          if (deletingTaskId) handleDeleteTask(deletingTaskId);
        }}
        onClose={() => setDeletingTaskId(null)}
      />

      <IdeaListModal
        open={!!viewingTask}
        taskTitle={viewingTask?.title ?? ''}
        ideas={viewingTask?.ideas ?? []}
        onClose={() => setViewingTaskId(null)}
        onToggleStar={(ideaId) =>
          viewingTaskId &&
          handleToggleIdeaStar({ kind: 'task', id: viewingTaskId }, ideaId)
        }
        onUpdate={(ideaId, patch) =>
          viewingTaskId &&
          handleUpdateIdea({ kind: 'task', id: viewingTaskId }, ideaId, patch)
        }
        onRequestDelete={(ideaId) =>
          viewingTaskId &&
          setDeletingIdea({
            source: { kind: 'task', id: viewingTaskId },
            ideaId,
          })
        }
        onReorder={(orderedIds) =>
          viewingTaskId &&
          handleReorderIdeas({ kind: 'task', id: viewingTaskId }, orderedIds)
        }
        onRequestMove={(ideaId) =>
          viewingTaskId &&
          setMovingIdea({
            source: { kind: 'task', id: viewingTaskId },
            ideaId,
          })
        }
      />

      <FolderModal
        open={!!viewingFolder}
        folderName={viewingFolder?.name ?? ''}
        ideas={viewingFolder?.ideas ?? []}
        onClose={() => setViewingFolderId(null)}
        onAddIdea={() =>
          viewingFolderId &&
          setAddIdeaTarget({ kind: 'folder', id: viewingFolderId })
        }
        onToggleStar={(ideaId) =>
          viewingFolderId &&
          handleToggleIdeaStar({ kind: 'folder', id: viewingFolderId }, ideaId)
        }
        onUpdate={(ideaId, patch) =>
          viewingFolderId &&
          handleUpdateIdea(
            { kind: 'folder', id: viewingFolderId },
            ideaId,
            patch
          )
        }
        onRequestDelete={(ideaId) =>
          viewingFolderId &&
          setDeletingIdea({
            source: { kind: 'folder', id: viewingFolderId },
            ideaId,
          })
        }
        onReorder={(orderedIds) =>
          viewingFolderId &&
          handleReorderIdeas(
            { kind: 'folder', id: viewingFolderId },
            orderedIds
          )
        }
        onRequestMove={(ideaId) =>
          viewingFolderId &&
          setMovingIdea({
            source: { kind: 'folder', id: viewingFolderId },
            ideaId,
          })
        }
        onDeleteFolder={() =>
          viewingFolderId && setDeletingFolderId(viewingFolderId)
        }
      />

      <AddIdeaModal
        open={!!addIdeaTarget}
        taskTitle={addIdeaContextLabel}
        onClose={() => setAddIdeaTarget(null)}
        onSubmit={(title, assignee) => {
          if (addIdeaTarget) handleAddIdea(addIdeaTarget, title, assignee);
        }}
      />

      <MoveIdeaModal
        open={!!movingIdea}
        ideaTitle={movingIdeaTitle}
        targets={movingIdeaTargets}
        targetKind={movingIdea?.source.kind === 'task' ? 'folder' : 'task'}
        onClose={() => setMovingIdea(null)}
        onPick={(target) => {
          if (!movingIdea) return;
          const destination: IdeaSource =
            target.type === 'folder'
              ? { kind: 'folder', id: target.id }
              : { kind: 'task', id: target.id };
          handleMoveIdea(movingIdea.source, movingIdea.ideaId, destination);
          setMovingIdea(null);
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
        open={!!deletingIdea}
        title="아이디어 삭제"
        message="삭제된 데이터는 복구 불가 합니다."
        onConfirm={() => {
          if (deletingIdea)
            handleDeleteIdea(deletingIdea.source, deletingIdea.ideaId);
        }}
        onClose={() => setDeletingIdea(null)}
      />
    </div>
  );
}
