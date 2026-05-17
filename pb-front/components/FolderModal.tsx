'use client';

import { Plus } from 'lucide-react';
import Modal from './Modal';
import IdeaListView from './IdeaListView';
import type { Idea } from '@/lib/types';

interface FolderModalProps {
  open: boolean;
  folderName: string;
  ideas: Idea[];
  onClose: () => void;
  onAddIdea: () => void;
  onToggleStar: (ideaId: string) => void;
  onUpdate: (
    ideaId: string,
    patch: Partial<Pick<Idea, 'title' | 'assignee'>>
  ) => void;
  onRequestDelete: (ideaId: string) => void;
  onReorder: (orderedIds: string[]) => void;
  onRequestMove: (ideaId: string) => void;
  onDeleteFolder: () => void;
}

export default function FolderModal({
  open,
  folderName,
  ideas,
  onClose,
  onAddIdea,
  onToggleStar,
  onUpdate,
  onRequestDelete,
  onReorder,
  onRequestMove,
  onDeleteFolder,
}: FolderModalProps) {
  return (
    <Modal open={open} title="폴더" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            폴더:{' '}
            <span className="text-gray-700 font-medium">{folderName}</span>
          </div>
          <button
            type="button"
            onClick={onAddIdea}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            아이디어 추가
          </button>
        </div>

        <IdeaListView
          ideas={ideas}
          emptyText="아직 아이디어가 없습니다. 위의 추가 버튼으로 등록해보세요."
          onToggleStar={onToggleStar}
          onUpdate={onUpdate}
          onDelete={onRequestDelete}
          onReorder={onReorder}
          onMove={onRequestMove}
          moveLabel="작업으로 이동"
        />

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={onDeleteFolder}
            className="px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            폴더 삭제
          </button>
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
