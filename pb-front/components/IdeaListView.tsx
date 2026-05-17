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
import type { Idea } from '@/lib/types';

export interface IdeaListViewProps {
  ideas: Idea[];
  emptyText?: string;
  onToggleStar: (ideaId: string) => void;
  onUpdate: (
    ideaId: string,
    patch: Partial<Pick<Idea, 'title' | 'assignee'>>
  ) => void;
  onDelete: (ideaId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onMove: (ideaId: string) => void;
  moveLabel?: string;
}

function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getFullYear() % 100)}/${pad(d.getMonth() + 1)}/${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface IdeaRowProps {
  idea: Idea;
  isEditing: boolean;
  draftTitle: string;
  draftAssignee: string;
  moveLabel: string;
  onChangeDraft: (patch: { title?: string; assignee?: string }) => void;
  onToggleStar: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onMove: () => void;
}

function IdeaRow({
  idea,
  isEditing,
  draftTitle,
  draftAssignee,
  moveLabel,
  onChangeDraft,
  onToggleStar,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onMove,
}: IdeaRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: idea.id });

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
          aria-label={idea.starred ? '별 해제' : '별 표시'}
        >
          <Star
            className={`w-5 h-5 ${
              idea.starred
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-gray-400'
            }`}
            fill={idea.starred ? 'currentColor' : 'none'}
          />
        </button>
        {isEditing ? (
          <input
            type="text"
            value={draftTitle}
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
            {idea.title}
          </span>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 pl-12 pt-1 text-xs text-gray-500">
        {isEditing ? (
          <input
            type="text"
            value={draftAssignee}
            onChange={(e) => onChangeDraft({ assignee: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="담당자"
            className="px-2 py-0.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-32"
          />
        ) : (
          <span>담당자: {idea.assignee || '-'}</span>
        )}
        <span className="text-gray-300">|</span>
        <span>등록일: {formatCreatedAt(idea.createdAt)}</span>
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

export default function IdeaListView({
  ideas,
  emptyText = '아직 아이디어가 없습니다.',
  onToggleStar,
  onUpdate,
  onDelete,
  onReorder,
  onMove,
  moveLabel = '이동',
}: IdeaListViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ title: string; assignee: string }>({
    title: '',
    assignee: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const startEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setDraft({ title: idea.title, assignee: idea.assignee });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (ideaId: string) => {
    const title = draft.title.trim();
    const assignee = draft.assignee.trim();
    if (!title) return;
    onUpdate(ideaId, { title, assignee });
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = ideas.findIndex((i) => i.id === active.id);
    const newIdx = ideas.findIndex((i) => i.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(ideas, oldIdx, newIdx).map((i) => i.id);
    onReorder(reordered);
  };

  if (ideas.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">{emptyText}</p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ideas.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="max-h-80 overflow-y-auto">
          {ideas.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              isEditing={editingId === idea.id}
              draftTitle={draft.title}
              draftAssignee={draft.assignee}
              moveLabel={moveLabel}
              onChangeDraft={(patch) =>
                setDraft((prev) => ({ ...prev, ...patch }))
              }
              onToggleStar={() => onToggleStar(idea.id)}
              onStartEdit={() => startEdit(idea)}
              onSaveEdit={() => saveEdit(idea.id)}
              onCancelEdit={cancelEdit}
              onDelete={() => onDelete(idea.id)}
              onMove={() => onMove(idea.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
