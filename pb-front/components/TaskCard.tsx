'use client';

import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { Search, Plus, Trash2, MinusCircle, Star } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskCardCallbacks {
  onDelete: (taskId: string) => void;
  onSearch?: (taskId: string) => void;
  onAddSub?: (taskId: string) => void;
}

interface TaskCardProps extends TaskCardCallbacks {
  task: Task;
  border?: string;
  isDone?: boolean;
}

interface TaskCardViewProps extends TaskCardCallbacks {
  task: Task;
  border?: string;
  isDone?: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: DraggableSyntheticListeners;
  };
  style?: React.CSSProperties;
}

export const TaskCardView = forwardRef<HTMLDivElement, TaskCardViewProps>(
  function TaskCardView(
    {
      task,
      border = '',
      isDone = false,
      isDragging = false,
      isOverlay = false,
      dragHandleProps,
      style,
      onDelete,
      onSearch,
      onAddSub,
    },
    ref
  ) {
    const ideaCount = task.ideas.length;
    const hasEmptyStar = ideaCount > 0 && task.ideas.some((i) => !i.starred);

    let statusIcon: React.ReactNode;
    let statusLabel: string;
    if (ideaCount === 0) {
      statusIcon = <MinusCircle className="w-4 h-4 text-gray-400" />;
      statusLabel = '아이디어 없음';
    } else if (hasEmptyStar) {
      statusIcon = <Star className="w-4 h-4 text-gray-300" fill="none" />;
      statusLabel = '아이디어 있음';
    } else {
      statusIcon = (
        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
      );
      statusLabel = '모든 아이디어 별 표시';
    }

    return (
      <div
        ref={ref}
        style={style}
        {...(dragHandleProps?.attributes ?? {})}
        {...(dragHandleProps?.listeners ?? {})}
        className={`group relative bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${border} ${
          isDone ? 'opacity-70' : ''
        } ${isDragging ? 'opacity-40' : ''} ${
          isOverlay
            ? 'cursor-grabbing shadow-lg rotate-1'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 mt-0.5"
            aria-label={statusLabel}
            title={statusLabel}
          >
            {statusIcon}
          </span>
          <p
            className={`text-sm flex-1 min-w-0 wrap-break-word ${
              isDone ? 'line-through text-gray-400' : 'text-gray-700 font-medium'
            }`}
          >
            {task.title}
          </p>
          <div
            className="flex items-center gap-1 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onSearch?.(task.id)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              aria-label="아이디어 보기"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            {!isDone && (
              <>
                <button
                  type="button"
                  onClick={() => onAddSub?.(task.id)}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                  aria-label="아이디어 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  aria-label="삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export default function TaskCard({
  task,
  border,
  isDone,
  onDelete,
  onSearch,
  onAddSub,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'task', task } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      border={border}
      isDone={isDone}
      isDragging={isDragging}
      dragHandleProps={{ attributes, listeners }}
      style={style}
      onDelete={onDelete}
      onSearch={onSearch}
      onAddSub={onAddSub}
    />
  );
}
