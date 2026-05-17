'use client';

import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

interface AddIdeaModalProps {
  open: boolean;
  taskTitle: string;
  onClose: () => void;
  onSubmit: (title: string, assignee: string) => void;
}

export default function AddIdeaModal({
  open,
  taskTitle,
  onClose,
  onSubmit,
}: AddIdeaModalProps) {
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setAssignee('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedAssignee = assignee.trim();
    if (!trimmedTitle) return;
    onSubmit(trimmedTitle, trimmedAssignee);
    onClose();
  };

  return (
    <Modal open={open} title="아이디어 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-gray-500">
          작업: <span className="text-gray-700 font-medium">{taskTitle}</span>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            아이디어
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: CTA 버튼 색상 A/B 테스트"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            담당자
          </label>
          <input
            type="text"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="예: 박창용"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 rounded-md transition-colors"
          >
            추가
          </button>
        </div>
      </form>
    </Modal>
  );
}
