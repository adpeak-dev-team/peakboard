'use client';

import Modal from './Modal';
import TodoListView from './TodoListView';
import type { Todo } from '@/lib/types';

interface TodoListModalProps {
  open: boolean;
  taskTitle: string;
  todos: Todo[];
  onClose: () => void;
  onToggleStar: (todoId: string) => void;
  onUpdate: (
    todoId: string,
    patch: Partial<Pick<Todo, 'title' | 'assignee'>>
  ) => void;
  onRequestDelete: (todoId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onRequestMove: (todoId: string) => void;
}

export default function TodoListModal({
  open,
  taskTitle,
  todos,
  onClose,
  onToggleStar,
  onUpdate,
  onRequestDelete,
  onReorder,
  onRequestMove,
}: TodoListModalProps) {
  return (
    <Modal open={open} title="할 일 리스트" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-gray-500">
          작업: <span className="text-gray-700 font-medium">{taskTitle}</span>
        </div>

        <TodoListView
          todos={todos}
          emptyText="아직 할 일이 없습니다. 작업 카드의 + 버튼으로 추가해보세요."
          onToggleStar={onToggleStar}
          onUpdate={onUpdate}
          onDelete={onRequestDelete}
          onReorder={onReorder}
          onMove={onRequestMove}
          moveLabel="폴더로 이동"
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
