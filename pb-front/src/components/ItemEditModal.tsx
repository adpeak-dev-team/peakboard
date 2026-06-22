'use client';

import { Trash2 } from 'lucide-react';
import Modal from './Modal';
import EditableCell from './EditableCell';
import {
  buildColumnPatch,
  getColumnValue,
  type BoardConfig,
  type ColumnDef,
} from '@/lib/boardConfig';
import type { BoardItemDTO, BoardItemPatch } from '@/services/work/type';

/** 보드 config 컬럼 기반 일정/작업 편집 모달 (달력/일정 공용) */
export default function ItemEditModal({
  config,
  item,
  title = '일정 편집',
  onClose,
  onPatch,
  onDelete,
}: {
  config: BoardConfig;
  item: BoardItemDTO;
  title?: string;
  onClose: () => void;
  onPatch: (item: BoardItemDTO, patch: BoardItemPatch) => void;
  onDelete: (item: BoardItemDTO) => void;
}) {
  const commit = (col: ColumnDef, value: string) =>
    onPatch(item, buildColumnPatch(item, col, value));

  return (
    <Modal open title={title} onClose={onClose} width="max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        {config.columns.map((col) => (
          <div key={col.key} className={col.kind === 'longtext' ? 'col-span-2' : ''}>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">{col.label}</label>
            <div className="border border-gray-200 rounded-md">
              <EditableCell
                value={getColumnValue(item, col)}
                col={col}
                onCommit={(v) => commit(col, v)}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-5">
        <button
          onClick={() => onDelete(item)}
          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />삭제
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          닫기
        </button>
      </div>
    </Modal>
  );
}
