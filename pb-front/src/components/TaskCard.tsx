'use client';

import { forwardRef, useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import { Search, Plus, Trash2, MinusCircle, Star, FileText } from 'lucide-react';
import type { Task } from '@/lib/types';

interface TaskCardCallbacks {
  onDelete: (taskId: string) => void;
  onSearch?: (taskId: string) => void;
  onAddSub?: (taskId: string) => void;
  onOpenDocument?: (taskId: string) => void;
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
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (val: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
  onStartEdit?: () => void;
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
      onOpenDocument,
    },
    ref
  ) {
    const todoCount = task.todos.length;
    const hasEmptyStar = todoCount > 0 && task.todos.some((i) => !i.starred);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (isEditing) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, [isEditing]);

    let statusIcon: React.ReactNode;
    let statusLabel: string;
    if (todoCount === 0) {
      statusIcon = <MinusCircle className="w-4 h-4 text-gray-400" />;
      statusLabel = '할 일 없음';
    } else if (hasEmptyStar) {
      statusIcon = <Star className="w-4 h-4 text-gray-300" fill="none" />;
      statusLabel = '할 일이 있음';
    } else {
      statusIcon = (
        <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
      );
      statusLabel = '모든 할 일 별 표시';
    }

    return (
      <div
        ref={ref}
        style={style}
        {...(dragHandleProps?.attributes ?? {})}
        {...(!isEditing ? (dragHandleProps?.listeners ?? {}) : {})}
        className={`group relative bg-white p-3 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${border} ${isDone ? 'opacity-70' : ''
          } ${isDragging ? 'opacity-40' : ''} ${isOverlay
            ? 'cursor-grabbing shadow-lg rotate-1'
            : isEditing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
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
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => onEditChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave?.();
                if (e.key === 'Escape') onEditCancel?.();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="text-sm flex-1 min-w-0 border border-indigo-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-700 font-medium"
            />
          ) : (
            <p
              className={`text-sm flex-1 min-w-0 wrap-break-word ${isDone ? 'line-through text-gray-400' : 'text-gray-700 font-medium'
                }`}
            >
              {task.title}
            </p>
          )}
          <div
            className="flex items-center gap-1 shrink-0"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onSearch?.(task.id)}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
              aria-label="할 일 보기"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onOpenDocument?.(task.id)}
              className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
              aria-label="문서 열기"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>
            {!isDone && (
              <>
                <button
                  type="button"
                  onClick={onEditSave}
                  className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                  aria-label="저장"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onEditCancel}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                  aria-label="취소"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onSearch?.(task.id)}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                  aria-label="할 일 보기"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                {!isDone && (
                  <>
                    <button
                      type="button"
                      onClick={onStartEdit}
                      className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      aria-label="이름 수정"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddSub?.(task.id)}
                      className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                      aria-label="할 일 추가"
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
  onOpenDocument,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

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

  const handleStartEdit = () => {
    setEditValue(task.title);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) {
      onRename?.(task.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
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
      onOpenDocument={onOpenDocument}
    />
  );
}
