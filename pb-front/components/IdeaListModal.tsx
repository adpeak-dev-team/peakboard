'use client';

import Modal from './Modal';
import IdeaListView from './IdeaListView';
import type { Idea } from '@/lib/types';

interface IdeaListModalProps {
  open: boolean;
  taskTitle: string;
  ideas: Idea[];
  onClose: () => void;
  onToggleStar: (ideaId: string) => void;
  onUpdate: (
    ideaId: string,
    patch: Partial<Pick<Idea, 'title' | 'assignee'>>
  ) => void;
  onRequestDelete: (ideaId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onRequestMove: (ideaId: string) => void;
}

export default function IdeaListModal({
  open,
  taskTitle,
  ideas,
  onClose,
  onToggleStar,
  onUpdate,
  onRequestDelete,
  onReorder,
  onRequestMove,
}: IdeaListModalProps) {
  return (
    <Modal open={open} title="아이디어 리스트" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-gray-500">
          작업: <span className="text-gray-700 font-medium">{taskTitle}</span>
        </div>

        <IdeaListView
          ideas={ideas}
          emptyText="아직 아이디어가 없습니다. 작업 카드의 + 버튼으로 추가해보세요."
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
