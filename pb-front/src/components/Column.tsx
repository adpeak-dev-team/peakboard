'use client';

import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal } from 'lucide-react';
import type { TaskStatus } from '@/lib/types';

interface ColumnProps {
  title: string;
  status: TaskStatus;
  count: number;
  bgColor: string;
  children: React.ReactNode;
}

export default function Column({
  title,
  status,
  count,
  bgColor,
  children,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  return (
    <div
      className={`w-full lg:w-80 lg:shrink-0 flex flex-col rounded-xl ${bgColor} p-4 max-h-full transition-colors ${
        isOver ? 'ring-2 ring-indigo-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
          {title}{' '}
          <span className="bg-white text-gray-500 text-xs px-2 py-0.5 rounded-full shadow-sm">
            {count}
          </span>
        </h2>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-3 pb-2 custom-scrollbar min-h-8"
      >
        {children}
      </div>
    </div>
  );
}
