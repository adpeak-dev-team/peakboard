'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, Check, Pencil, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import TeamCalendarView from './TeamCalendarView';
import { BOARD_CONFIG } from '@/lib/boardConfig';
import type { BoardDTO, BoardItemDTO, BoardItemPatch, ProjectDTO } from '@/services/work/type';
import { useBoardItemsQuery } from '@/services/work/boardItems/queries';
import {
  useCreateBoardItemMutation,
  useUpdateBoardItemMutation,
  useDeleteBoardItemMutation,
  useReorderBoardItemsMutation,
} from '@/services/work/boardItems/mutations';
import { useProjectsQuery } from '@/services/work/projects/queries';
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/services/work/projects/mutations';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import { useScheduleEvents } from '@/lib/calendarEvents';
import { todayStr } from '@/lib/date';

const config = BOARD_CONFIG.dev;
const STATUSES = config.groups; // 해야할일 / 진행중 / 완료

interface DevBoardViewProps {
  board: BoardDTO;
  /** 헤더 토글에서 주입: 'calendar'(달력형) | 'manage'(프로젝트 관리) */
  view: 'calendar' | 'manage';
}

export default function DevBoardView({ board, view }: DevBoardViewProps) {
  const projectsQuery = useProjectsQuery(board.id);
  const projects = projectsQuery.data ?? [];
  const itemsQuery = useBoardItemsQuery(board.id);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const calendarEvents = useScheduleEvents();
  // 개발팀 작업자 후보 = 개발팀 직원만
  const employeesQuery = useEmployeesQuery();
  const devEmployeeNames = useMemo(
    () => (employeesQuery.data ?? []).filter((e) => e.department === '개발팀').map((e) => e.name),
    [employeesQuery.data]
  );

  const createItem = useCreateBoardItemMutation();
  const updateItem = useUpdateBoardItemMutation();
  const deleteItem = useDeleteBoardItemMutation();
  const reorderItems = useReorderBoardItemsMutation();
  const createProject = useCreateProjectMutation();
  const updateProject = useUpdateProjectMutation();
  const deleteProject = useDeleteProjectMutation();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const activeProjectId =
    selectedProjectId && projects.some((p) => p.id === selectedProjectId)
      ? selectedProjectId
      : projects[0]?.id ?? null;

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  // ===== 핸들러 =====
  const handleAddItem = (status: string, eventDate?: string) => {
    if (!activeProjectId) {
      alert('프로젝트를 먼저 추가해주세요.');
      return;
    }
    createItem.mutate(
      { boardId: board.id, groupKey: status, projectId: activeProjectId, title: '', eventDate },
      {
        onSuccess: (created) => setEditingItemId(created.id),
        onError: () => alert('추가에 실패했어요.'),
      }
    );
  };

  // 일정 관리(달력)에서 기존 작업을 골라 날짜에 배치
  const handleScheduleTask = (taskId: string, date: string) => {
    updateItem.mutate(
      { itemId: taskId, boardId: board.id, patch: { eventDate: date } },
      { onError: () => alert('일정 추가에 실패했어요.') }
    );
  };

  const handlePatch = (itemId: string, patch: BoardItemPatch) => {
    updateItem.mutate(
      { itemId, boardId: board.id, patch },
      { onError: () => alert('수정에 실패했어요.') }
    );
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem.mutate(
      { itemId, boardId: board.id },
      { onError: () => alert('삭제에 실패했어요.') }
    );
  };

  const handleReorder = (status: string, orderedIds: string[]) => {
    reorderItems.mutate(
      { boardId: board.id, groupKey: status, orderedIds },
      { onError: () => alert('순서 변경에 실패했어요.') }
    );
  };

  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) ?? null : null;

  const projectName = (id: string | null) =>
    projects.find((p) => p.id === id)?.name ?? '미지정';

  // 작업자 필터 (캘린더 상단 select)
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const a = it.assignee.trim();
      if (a) set.add(a);
    }
    return [...set].sort();
  }, [items]);
  const calendarItems = assigneeFilter
    ? items.filter((it) => it.assignee.trim() === assigneeFilter)
    : items;

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {view === 'calendar' ? (
        <TeamCalendarView
          board={board}
          items={calendarItems}
          events={calendarEvents}
          getLabel={(it) => `${projectName(it.projectId)} · ${it.title || '제목 없음'}`}
          itemDisplay="dot"
          panelLabelOf={(it) => it.title || '제목 없음'}
          panelTagOf={(it) => projectName(it.projectId)}
          onSelectedDateChange={setCalendarDate}
          calendarHeaderRight={
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">전체 작업자</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          }
          toolbar={
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
            >
              <Plus className="w-4 h-4" />작업 추가
            </button>
          }
          renderItemModal={(item, close) => (
            <DevItemModal
              key={item.id}
              item={item}
              employeeOptions={devEmployeeNames}
              onClose={close}
              onPatch={(patch) => handlePatch(item.id, patch)}
              onDelete={() => {
                setDeletingItemId(item.id);
                close();
              }}
            />
          )}
          onPatch={(it, patch) => handlePatch(it.id, patch)}
          onDelete={(it) => setDeletingItemId(it.id)}
        />
      ) : (
        <div className="flex flex-col gap-3 w-full flex-1 min-h-0">
          <ProjectTabs
            projects={projects}
            activeProjectId={activeProjectId}
            onSelect={setSelectedProjectId}
            onAdd={(name) => createProject.mutate({ boardId: board.id, name })}
            onRename={(projectId, name) =>
              updateProject.mutate({ projectId, boardId: board.id, name })
            }
            onRequestDelete={(projectId) => setDeletingProjectId(projectId)}
          />

          {activeProjectId ? (
            <StatusPanel
              items={items}
              projectId={activeProjectId}
              onAddItem={handleAddItem}
              onOpenItem={(id) => setEditingItemId(id)}
              onReorder={handleReorder}
            />
          ) : (
            <p className="text-sm text-gray-400 py-6 text-center">
              프로젝트를 추가하면 작업을 관리할 수 있어요.
            </p>
          )}
        </div>
      )}

      {editingItem && (
        <DevItemModal
          key={editingItem.id}
          item={editingItem}
          employeeOptions={devEmployeeNames}
          onClose={() => setEditingItemId(null)}
          onPatch={(patch) => handlePatch(editingItem.id, patch)}
          onDelete={() => {
            setDeletingItemId(editingItem.id);
            setEditingItemId(null);
          }}
        />
      )}

      {addOpen && (
        <DevAddModal
          projects={projects}
          items={items}
          defaultDate={calendarDate}
          onClose={() => setAddOpen(false)}
          onSchedule={handleScheduleTask}
        />
      )}

      <ConfirmModal
        open={!!deletingItemId}
        title="작업 삭제"
        message="삭제된 데이터는 복구할 수 없습니다."
        onConfirm={() => deletingItemId && handleDeleteItem(deletingItemId)}
        onClose={() => setDeletingItemId(null)}
      />
      <ConfirmModal
        open={!!deletingProjectId}
        title="프로젝트 삭제"
        message="프로젝트를 삭제하면 그 안의 작업도 모두 삭제됩니다."
        onConfirm={() =>
          deletingProjectId &&
          deleteProject.mutate({ projectId: deletingProjectId, boardId: board.id })
        }
        onClose={() => setDeletingProjectId(null)}
      />
    </div>
  );
}

// ===== 프로젝트 탭 + 추가/이름변경/삭제 =====
function ProjectTabs({
  projects,
  activeProjectId,
  onSelect,
  onAdd,
  onRename,
  onRequestDelete,
}: {
  projects: ProjectDTO[];
  activeProjectId: string | null;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (projectId: string, name: string) => void;
  onRequestDelete: (projectId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const submitAdd = () => {
    const t = name.trim();
    if (t) onAdd(t);
    setName('');
    setAdding(false);
  };
  const submitRename = () => {
    const t = editName.trim();
    if (t && editingId) onRename(editingId, t);
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {projects.map((p) => {
        const active = p.id === activeProjectId;
        if (editingId === p.id) {
          return (
            <input
              key={p.id}
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename();
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="px-2 py-1 text-sm rounded-md border border-indigo-400 focus:outline-none"
            />
          );
        }
        return (
          <div
            key={p.id}
            className={`group flex items-center rounded-md text-sm font-medium transition-colors ${
              active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <button
              onClick={() => onSelect(p.id)}
              onDoubleClick={() => {
                setEditingId(p.id);
                setEditName(p.name);
              }}
              className="px-3 py-1.5"
            >
              {p.name}
            </button>
            {active && (
              <div className="flex items-center pr-1.5 gap-0.5">
                <button
                  onClick={() => {
                    setEditingId(p.id);
                    setEditName(p.name);
                  }}
                  className="p-0.5 hover:text-white/80"
                  aria-label="이름 변경"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onRequestDelete(p.id)}
                  className="p-0.5 hover:text-red-200"
                  aria-label="프로젝트 삭제"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {adding ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={submitAdd}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitAdd();
            if (e.key === 'Escape') {
              setName('');
              setAdding(false);
            }
          }}
          placeholder="프로젝트 이름"
          className="px-2 py-1 text-sm rounded-md border border-indigo-400 focus:outline-none"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-md"
        >
          <Plus className="w-4 h-4" />프로젝트
        </button>
      )}
    </div>
  );
}

// ===== 칸반(해야할일/진행중/완료 3컬럼) + 컬럼 간 드래그 =====
function StatusPanel({
  items,
  projectId,
  onAddItem,
  onOpenItem,
  onReorder,
}: {
  items: BoardItemDTO[];
  projectId: string;
  onAddItem: (status: string) => void;
  onOpenItem: (id: string) => void;
  onReorder: (status: string, orderedIds: string[]) => void;
}) {
  const projectItems = items.filter((it) => it.projectId === projectId);
  const [order, setOrder] = useState<BoardItemDTO[]>(projectItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  // projectItems 변경 시 렌더 중 동기화 (드래그 중 제외)
  const sig = projectItems.map((it) => `${it.id}:${it.groupKey}:${it.position}`).join('|');
  const [prevSig, setPrevSig] = useState(sig);
  if (!activeId && sig !== prevSig) {
    setPrevSig(sig);
    setOrder(projectItems);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStatus = (status: string) =>
    order.filter((it) => it.groupKey === status).sort((a, b) => a.position - b.position);

  const containerOf = (id: string): string | null => {
    if (id.startsWith('status:')) return id.slice(7);
    return order.find((it) => it.id === id)?.groupKey ?? null;
  };

  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = containerOf(active.id as string);
    const to = containerOf(over.id as string);
    if (!from || !to || from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const idx = next.findIndex((it) => it.id === active.id);
      if (idx < 0) return prev;
      const moved = { ...next[idx], groupKey: to };
      next.splice(idx, 1);
      const overIdx = next.findIndex((it) => it.id === over.id);
      if ((over.id as string).startsWith('status:') || overIdx < 0) next.push(moved);
      else next.splice(overIdx, 0, moved);
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) {
      setOrder(projectItems);
      return;
    }
    const dest = containerOf(active.id as string);
    if (!dest) {
      setOrder(projectItems);
      return;
    }
    const ids = order.filter((it) => it.groupKey === dest).map((it) => it.id);
    const activeIdx = ids.indexOf(active.id as string);
    const overId = over.id as string;
    const overIdx = overId.startsWith('status:') ? ids.length - 1 : ids.indexOf(overId);
    let ordered = ids;
    if (activeIdx >= 0 && overIdx >= 0 && activeIdx !== overIdx) {
      ordered = arrayMove(ids, activeIdx, overIdx);
    }
    setOrder((prev) => {
      const others = prev.filter((it) => it.groupKey !== dest);
      const byId = new Map(prev.filter((it) => it.groupKey === dest).map((it) => [it.id, it]));
      const reordered = ordered
        .map((id, i) => {
          const it = byId.get(id);
          return it ? { ...it, groupKey: dest, position: i } : null;
        })
        .filter((it): it is BoardItemDTO => !!it);
      return [...others, ...reordered];
    });
    onReorder(dest, ordered);
  };

  const activeItem = activeId ? order.find((it) => it.id === activeId) ?? null : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOrder(projectItems);
      }}
    >
      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
        {STATUSES.map((status) => {
          const statusItems = byStatus(status);
          const color = config.groupColors[status];
          return (
            <KanbanColumn
              key={status}
              status={status}
              chip={color?.chip ?? 'bg-gray-100 text-gray-600 border-gray-200'}
              count={statusItems.length}
              onAdd={() => onAddItem(status)}
            >
              <SortableContext
                items={statusItems.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                {statusItems.map((it) => (
                  <TaskCard key={it.id} item={it} onOpen={() => onOpenItem(it.id)} />
                ))}
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="px-3 py-2 rounded-md bg-white border border-indigo-300 shadow-lg text-sm text-gray-700">
            {activeItem.title || '제목 없음'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  chip,
  count,
  onAdd,
  children,
}: {
  status: string;
  chip: string;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${status}` });
  return (
    <div className="flex-1 w-full min-h-0 flex flex-col rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 shrink-0">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${chip}`}>
          {status}
        </span>
        <span className="text-xs text-gray-400">{count}</span>
        <button
          onClick={onAdd}
          className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />추가
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={`p-2 flex flex-col gap-1.5 flex-1 min-h-32 md:min-h-0 overflow-y-auto ${isOver ? 'bg-indigo-50/40' : ''}`}
      >
        {children}
      </div>
    </div>
  );
}

function TaskCard({ item, onOpen }: { item: BoardItemDTO; onOpen: () => void }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-1.5 bg-white rounded-md border border-gray-200 px-2 py-1.5 hover:border-indigo-300"
    >
      <button
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
        aria-label="이동"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <button onClick={onOpen} className="flex-1 min-w-0 text-left">
        <p className="text-sm text-gray-800 truncate">{item.title || '제목 없음'}</p>
        {item.eventDate && <p className="text-xs text-gray-400">{item.eventDate}</p>}
      </button>
    </div>
  );
}

const DEV_INPUT_CLS =
  'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400';

// ===== 작업 상세/편집 모달 (제목 / 상세 / 담당자) =====
function DevItemModal({
  item,
  employeeOptions,
  onClose,
  onPatch,
  onDelete,
}: {
  item: BoardItemDTO;
  employeeOptions: string[];
  onClose: () => void;
  onPatch: (patch: BoardItemPatch) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const assigneeOptions =
    item.assignee && !employeeOptions.includes(item.assignee)
      ? [item.assignee, ...employeeOptions]
      : employeeOptions;

  return (
    <Modal open title="작업 상세" onClose={onClose} width="max-w-md">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">제목</label>
          <input
            className={DEV_INPUT_CLS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== item.title && onPatch({ title })}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            placeholder="할 일을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">상세</label>
          <textarea
            className={`${DEV_INPUT_CLS} resize-none`}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== item.notes && onPatch({ notes })}
            placeholder="상세 내용을 입력하세요"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">담당자</label>
          <select
            className={`${DEV_INPUT_CLS} cursor-pointer`}
            value={item.assignee}
            onChange={(e) => onPatch({ assignee: e.target.value })}
          >
            <option value="">미지정</option>
            {assigneeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mt-5">
        <button
          onClick={onDelete}
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />삭제
        </button>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Check className="w-4 h-4" />완료
        </button>
      </div>
    </Modal>
  );
}

// ===== 일정 관리(달력)에서 기존 작업을 골라 날짜에 배치 =====
function DevAddModal({
  projects,
  items,
  defaultDate,
  onClose,
  onSchedule,
}: {
  projects: ProjectDTO[];
  items: BoardItemDTO[];
  defaultDate: string | null;
  onClose: () => void;
  onSchedule: (taskId: string, date: string) => void;
}) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '');
  const [groupKey, setGroupKey] = useState(STATUSES[0]);
  const [taskId, setTaskId] = useState('');
  const [date, setDate] = useState(defaultDate ?? todayStr());

  // 선택한 프로젝트+상태에 해당하는 작업 목록
  const taskOptions = items
    .filter((it) => it.projectId === projectId && it.groupKey === groupKey)
    .sort((a, b) => a.position - b.position);

  const save = () => {
    if (!taskId) {
      alert('작업을 선택해주세요.');
      return;
    }
    if (!date) {
      alert('날짜를 선택해주세요.');
      return;
    }
    onSchedule(taskId, date);
    onClose();
  };

  return (
    <Modal open title="작업 일정 추가" onClose={onClose} width="max-w-md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">프로젝트</label>
            <select
              className={`${DEV_INPUT_CLS} cursor-pointer`}
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setTaskId('');
              }}
            >
              {projects.length === 0 && <option value="">프로젝트 없음</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">상태</label>
            <select
              className={`${DEV_INPUT_CLS} cursor-pointer`}
              value={groupKey}
              onChange={(e) => {
                setGroupKey(e.target.value);
                setTaskId('');
              }}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">작업</label>
          <select
            className={`${DEV_INPUT_CLS} cursor-pointer`}
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={taskOptions.length === 0}
          >
            <option value="">
              {taskOptions.length === 0 ? '해당 작업 없음' : '작업을 선택하세요'}
            </option>
            {taskOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title || '제목 없음'}
                {t.assignee ? ` (${t.assignee})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">날짜</label>
          <input
            type="date"
            className={`${DEV_INPUT_CLS} cursor-pointer`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <button
          onClick={save}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Check className="w-4 h-4" />추가
        </button>
      </div>
    </Modal>
  );
}
