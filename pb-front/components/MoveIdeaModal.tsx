'use client';

import { Folder as FolderIcon, ListTodo } from 'lucide-react';
import Modal from './Modal';

export type MoveTarget =
  | { type: 'folder'; id: string; name: string }
  | { type: 'task'; id: string; name: string };

interface MoveIdeaModalProps {
  open: boolean;
  ideaTitle: string;
  targets: MoveTarget[];
  targetKind: 'folder' | 'task';
  onClose: () => void;
  onPick: (target: MoveTarget) => void;
}

export default function MoveIdeaModal({
  open,
  ideaTitle,
  targets,
  targetKind,
  onClose,
  onPick,
}: MoveIdeaModalProps) {
  const title =
    targetKind === 'folder' ? '폴더로 이동' : '작업으로 이동';
  const empty =
    targetKind === 'folder'
      ? '이동할 폴더가 없습니다. 사이드바에서 먼저 폴더를 만들어주세요.'
      : '이동할 작업이 없습니다. 먼저 작업을 추가해주세요.';

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-gray-500">
          이동할 아이디어:{' '}
          <span className="text-gray-700 font-medium">{ideaTitle}</span>
        </div>

        {targets.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{empty}</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-md">
            {targets.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onPick(t)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 transition-colors text-left"
                >
                  {t.type === 'folder' ? (
                    <FolderIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                  ) : (
                    <ListTodo className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}
                  <span className="truncate">{t.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </Modal>
  );
}
