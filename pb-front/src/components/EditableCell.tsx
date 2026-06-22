'use client';

import { useId, useState } from 'react';
import type { ColumnDef } from '@/lib/boardConfig';

interface EditableCellProps {
  value: string;
  col: ColumnDef;
  /** select 콤보박스 옵션 (없으면 col.options 사용) */
  options?: string[];
  /** select 값별 색상 (없으면 col.optionColors 사용) */
  optionColors?: Record<string, string>;
  onCommit: (value: string) => void;
}

const baseInput =
  'w-full bg-transparent text-xs text-center px-1.5 py-1.5 rounded outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400';

export default function EditableCell({
  value,
  col,
  options,
  optionColors,
  onCommit,
}: EditableCellProps) {
  const [local, setLocal] = useState(value);
  // 외부에서 value 가 바뀌면(낙관적 업데이트 등) 로컬 입력값을 렌더 중 동기화
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setLocal(value);
  }
  const listId = useId();

  const commit = () => {
    if (local !== value) onCommit(local);
  };

  if (col.kind === 'date') {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onCommit(e.target.value)}
        className={`${baseInput} cursor-pointer`}
      />
    );
  }

  // select 는 콤보박스: 목록에서 고르거나 직접 입력 가능
  if (col.kind === 'select') {
    const opts = options ?? col.options ?? [];
    const colors = optionColors ?? col.optionColors;
    const color = colors?.[local];
    return (
      <>
        <input
          list={listId}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="-"
          className={`w-full text-xs text-center px-1.5 py-1.5 rounded outline-none focus:ring-1 focus:ring-indigo-400 cursor-pointer ${
            color ? `${color} font-medium` : 'bg-transparent'
          }`}
        />
        <datalist id={listId}>
          {opts.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </>
    );
  }

  if (col.kind === 'longtext') {
    return (
      <textarea
        value={local}
        rows={1}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        placeholder="-"
        className={`${baseInput} resize-none leading-snug`}
      />
    );
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      placeholder="-"
      className={baseInput}
    />
  );
}
