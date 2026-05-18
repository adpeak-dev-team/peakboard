'use client';

import { Plus } from 'lucide-react';
import Modal from './Modal';
import TodoListView from './TodoListView';
import type { Todo } from '@/lib/types';

interface TodoListModalProps {
  open: boolean;
  taskTitle: string;
  todos: Todo[];
  onClose: () => void;
  onAddTodo: () => void;
  onToggleStar: (todoId: string) => void;
  onUpdate: (
    todoId: string,
    patch: Partial<Pick<Todo, 'title' | 'assignee'>>
  ) => void;
  onRequestDelete: (todoId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onRequestMove: (todoId: string) => void;
  onRequestCopy: (todoId: string) => void;
}

export default function TodoListModal({
  open,
  taskTitle,
  todos,
  onClose,
  onAddTodo,
  onToggleStar,
  onUpdate,
  onRequestDelete,
  onReorder,
  onRequestMove,
  onRequestCopy,
}: TodoListModalProps) {
  return (
    <Modal open={open} title={taskTitle} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAddTodo}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            할 일 추가
          </button>
        </div>

        <TodoListView
          todos={todos}
          emptyText="아직 할 일이 없습니다."
          onToggleStar={onToggleStar}
          onUpdate={onUpdate}
          onDelete={onRequestDelete}
          onReorder={onReorder}
          onMove={onRequestMove}
          onCopy={onRequestCopy}
          moveLabel="폴더로 이동"
          copyLabel="폴더로 복사"
        />

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}
