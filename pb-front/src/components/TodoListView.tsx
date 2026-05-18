'use client';

import { useState } from 'react';
import { GripVertical, Star } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Todo } from '@/lib/types';

export interface TodoListViewProps {
  todos: Todo[];
  emptyText?: string;
  onToggleStar: (todoId: string) => void;
  onUpdate: (
    todoId: string,
    patch: Partial<Pick<Todo, 'title' | 'assignee' | 'description'>>
  ) => void;
  onDelete: (todoId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMove: (todoId: string) => void;
  moveLabel?: string;
}

type Draft = { title: string; description: string; assignee: string };

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getFullYear() % 100)}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TodoRowProps {
  todo: Todo;
  isEditing: boolean;
  draft: Draft;
  moveLabel: string;
  onChangeDraft: (patch: Partial<Draft>) => void;
  onToggleStar: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
}

function TodoRow({
  todo,
  isEditing,
  draft,
  moveLabel,
  onChangeDraft,
  onToggleStar,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onMove,
}: TodoRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="py-2 border-b border-gray-100 last:border-b-0"
    >
      {/* 제목 행 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          {...listeners}
          className="shrink-0 p-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
          aria-label="드래그하여 순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onToggleStar}
          className="shrink-0 p-1 rounded hover:bg-gray-100"
          aria-label={todo.starred ? '별 해제' : '별 표시'}
        >
          <Star
            className={`w-5 h-5 ${todo.starred ? 'text-yellow-400' : 'text-gray-300 hover:text-gray-400'}`}
            fill={todo.starred ? 'currentColor' : 'none'}
          />
        </button>
        {isEditing ? (
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChangeDraft({ title: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        ) : (
          <span className="text-sm text-gray-700 wrap-break-word flex-1 min-w-0">
            {todo.title}
          </span>
        )}
      </div>

      {/* 설명 — 수정 모드: textarea / 뷰 모드: 텍스트 (있을 때만) */}
      {isEditing ? (
        <div className="pl-12 pt-1">
          <textarea
            value={draft.description}
            onChange={(e) => onChangeDraft({ description: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="설명 (선택)"
            rows={2}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
      ) : (
        todo.description && (
          <p className="pl-12 pt-0.5 text-xs text-gray-400 wrap-break-word whitespace-pre-wrap">
            {todo.description}
          </p>
        )
      )}

      {/* 담당자 / 날짜 / 버튼 행 */}
      <div className="flex items-center justify-end gap-2 pl-12 pt-1 text-xs text-gray-500">
        {isEditing ? (
          <input
            type="text"
            value={draft.assignee}
            onChange={(e) => onChangeDraft({ assignee: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="담당자"
            className="px-2 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
          />
        ) : (
          <span>담당자: {todo.assignee || '-'}</span>
        )}
        <span className="text-gray-300">|</span>
        <span>등록일: {formatCreatedAt(todo.createdAt)}</span>
        {isEditing ? (
          <>
            <button
              type="button"
              onClick={onSaveEdit}
              className="ml-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
            >
              저장
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onStartEdit}
              className="ml-1 px-2 py-1 text-xs text-blue-500 hover:bg-blue-50 rounded"
            >
              수정
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={onMove}
              className="px-2 py-1 text-xs text-green-500 hover:bg-green-50 rounded"
            >
              {moveLabel}
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function TodoListView({
  todos,
  emptyText = '아직 할 일이 없습니다.',
  onToggleStar,
  onUpdate,
  onDelete,
  onReorder,
  onMove,
  moveLabel = '이동',
}: TodoListViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ title: '', description: '', assignee: '' });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setDraft({ title: todo.title, description: todo.description, assignee: todo.assignee });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (todoId: string) => {
    const title = draft.title.trim();
    if (!title) return;
    onUpdate(todoId, {
      title,
      description: draft.description.trim(),
      assignee: draft.assignee.trim(),
    });
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = todos.findIndex((i) => i.id === active.id);
    const newIdx = todos.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(todos, oldIdx, newIdx).map((i) => i.id));
  };

  if (todos.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={todos.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="max-h-80 overflow-y-auto">
          {todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              isEditing={editingId === todo.id}
              draft={draft}
              moveLabel={moveLabel}
              onChangeDraft={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
              onToggleStar={() => onToggleStar(todo.id)}
              onStartEdit={() => startEdit(todo)}
              onSaveEdit={() => saveEdit(todo.id)}
              onCancelEdit={cancelEdit}
              onDelete={() => onDelete(todo.id)}
              onMove={() => onMove(todo.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
