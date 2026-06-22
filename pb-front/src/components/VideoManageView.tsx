'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, Table2, CalendarDays, Settings2, X } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EditableCell from './EditableCell';
import BoardCalendarView from './BoardCalendarView';
import {
  buildColumnPatch,
  getColumnValue,
  type BoardConfig,
  type ColumnDef,
} from '@/lib/boardConfig';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import { useColumnOptionsQuery } from '@/services/work/columnOptions/queries';
import {
  useUpsertColumnOptionMutation,
  useDeleteColumnOptionMutation,
} from '@/services/work/columnOptions/mutations';
import type { BoardItemDTO, BoardItemPatch, ColumnOptionDTO } from '@/services/work/type';
import { CELL_COLORS } from '@/lib/cellColors';

/** 컬럼별 유효 옵션/색상 (정적 config + 사용자 커스텀 병합) */
interface ColResolved {
  options: string[];
  colors: Record<string, string>;
}

interface VideoManageViewProps {
  config: BoardConfig;
  boardId: string;
  items: BoardItemDTO[];
  onCreate: (groupKey: string, eventDate?: string) => void;
  onPatch: (itemId: string, patch: BoardItemPatch) => void;
  onDelete: (itemId: string) => void;
  onReorder: (groupKey: string, orderedIds: string[]) => void;
}

export default function VideoManageView({
  config,
  boardId,
  items,
  onCreate,
  onPatch,
  onDelete,
  onReorder,
}: VideoManageViewProps) {
  const [sub, setSub] = useState<'table' | 'calendar'>('table');
  const [activeStatus, setActiveStatus] = useState(config.groups[0]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const employeesQuery = useEmployeesQuery();
  // 영상팀 작업자 후보 = 개발팀 제외 전 직원
  const employeeNames = (employeesQuery.data ?? [])
    .filter((e) => e.department !== '개발팀')
    .map((e) => e.name);

  // 컬럼 커스텀 옵션(값/색상)
  const columnOptionsQuery = useColumnOptionsQuery(boardId);
  const customByColumn = useMemo(() => {
    const m = new Map<string, ColumnOptionDTO[]>();
    for (const o of columnOptionsQuery.data ?? []) {
      const arr = m.get(o.columnKey);
      if (arr) arr.push(o);
      else m.set(o.columnKey, [o]);
    }
    return m;
  }, [columnOptionsQuery.data]);

  // 정적 config + 커스텀 병합 (작업자는 회원관리에서 불러오므로 제외)
  const resolveCol = useMemo(() => {
    return (col: ColumnDef): ColResolved => {
      if (col.source === 'assignee') return { options: employeeNames, colors: {} };
      const custom = customByColumn.get(col.key) ?? [];
      const staticOpts = col.options ?? [];
      const extra = custom.map((c) => c.value).filter((v) => !staticOpts.includes(v));
      const colors: Record<string, string> = { ...(col.optionColors ?? {}) };
      for (const c of custom) if (c.color) colors[c.value] = c.color;
      return { options: [...staticOpts, ...extra], colors };
    };
  }, [customByColumn, employeeNames]);

  // 헤더에서 관리 중인 컬럼
  const [managingCol, setManagingCol] = useState<ColumnDef | null>(null);

  const columns = config.columns;
  const countOf = (g: string) => items.filter((it) => it.groupKey === g).length;
  const statusItems = items
    .filter((it) => it.groupKey === activeStatus)
    .sort((a, b) => a.position - b.position);

  const handleCellCommit = (item: BoardItemDTO, col: ColumnDef, value: string) =>
    onPatch(item.id, buildColumnPatch(item, col, value));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = statusItems.map((it) => it.id);
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from < 0 || to < 0) return;
    onReorder(activeStatus, arrayMove(ids, from, to));
  };

  const activeItem = activeId ? statusItems.find((it) => it.id === activeId) ?? null : null;
  const rowLabel = (it: BoardItemDTO) =>
    [it.fields.brand, it.fields.company, it.fields.customer].filter(Boolean).join(' / ') || '항목';

  return (
    <div className="flex flex-col gap-3 h-full min-h-0">
      {/* 상단: 표/캘린더 토글 + 행 추가 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center bg-gray-100 rounded-md p-0.5">
          <SubTab active={sub === 'table'} onClick={() => setSub('table')}>
            <Table2 className="w-4 h-4" />표
          </SubTab>
          <SubTab active={sub === 'calendar'} onClick={() => setSub('calendar')}>
            <CalendarDays className="w-4 h-4" />캘린더
          </SubTab>
        </div>
        {sub === 'table' && (
          <button
            onClick={() => onCreate(activeStatus)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
          >
            <Plus className="w-4 h-4" />행 추가
          </button>
        )}
      </div>

      {sub === 'table' ? (
        <>
          {/* 상태 탭 (작업중/자료대기/보류) */}
          <div className="flex border-b border-gray-200">
            {config.groups.map((g) => {
              const active = g === activeStatus;
              const color = config.groupColors[g];
              return (
                <button
                  key={g}
                  onClick={() => setActiveStatus(g)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'text-indigo-700 border-b-2 border-indigo-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-semibold ${
                      color?.chip ?? 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {g}
                  </span>
                  <span className="text-xs text-gray-400">{countOf(g)}</span>
                </button>
              );
            })}
          </div>

          {/* 표 */}
          <div className="overflow-auto flex-1 min-h-0 rounded-lg border border-gray-200 bg-white">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <table className="min-w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-center">
                    <th className="w-7" />
                    {columns.map((col) => {
                      const manageable = col.kind === 'select' && col.source !== 'assignee';
                      return (
                        <th
                          key={col.key}
                          style={{ minWidth: col.width }}
                          className="px-2 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap text-center"
                        >
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {manageable && (
                              <button
                                onClick={() => setManagingCol(col)}
                                className="text-gray-300 hover:text-indigo-600"
                                title={`${col.label} 값/색상 관리`}
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </span>
                        </th>
                      );
                    })}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  <SortableContext
                    items={statusItems.map((it) => it.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {statusItems.map((item) => (
                      <VideoRow
                        key={item.id}
                        item={item}
                        columns={columns}
                        resolveCol={resolveCol}
                        onCommit={handleCellCommit}
                        onDelete={onDelete}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
              <DragOverlay>
                {activeItem ? (
                  <div className="px-3 py-2 rounded-md bg-white border border-indigo-300 shadow-lg text-sm text-gray-700">
                    {rowLabel(activeItem)}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            {statusItems.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">행이 없습니다.</p>
            )}
          </div>
        </>
      ) : (
        // 단순 캘린더: 브랜드 / 업체명 / 고객명
        <BoardCalendarView
          getConfig={() => config}
          items={items}
          getLabel={rowLabel}
          onAddOnDate={(date) => onCreate(config.groups[0], date)}
          onPatch={(item, patch) => onPatch(item.id, patch)}
          onDelete={(item) => onDelete(item.id)}
        />
      )}

      {managingCol && (
        <ColumnOptionsModal
          boardId={boardId}
          column={managingCol}
          customRows={customByColumn.get(managingCol.key) ?? []}
          onClose={() => setManagingCol(null)}
        />
      )}
    </div>
  );
}

function ColumnOptionsModal({
  boardId,
  column,
  customRows,
  onClose,
}: {
  boardId: string;
  column: ColumnDef;
  customRows: ColumnOptionDTO[];
  onClose: () => void;
}) {
  const upsert = useUpsertColumnOptionMutation(boardId);
  const del = useDeleteColumnOptionMutation(boardId);
  const [newValue, setNewValue] = useState('');

  const staticOpts = column.options ?? [];
  const staticColors = column.optionColors ?? {};
  // 유효 값 목록 (정적 + 커스텀 추가)
  const extra = customRows.map((c) => c.value).filter((v) => !staticOpts.includes(v));
  const values = [...staticOpts, ...extra];
  const rowById = new Map(customRows.map((c) => [c.value, c]));
  const colorOf = (v: string) => rowById.get(v)?.color || staticColors[v] || '';

  const setColor = (value: string, color: string) =>
    upsert.mutate({ boardId, columnKey: column.key, value, color });

  const addValue = () => {
    const v = newValue.trim();
    if (!v || values.includes(v)) return;
    upsert.mutate({ boardId, columnKey: column.key, value: v, color: CELL_COLORS[0].cls });
    setNewValue('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            {column.label} · 값/색상 관리
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-auto space-y-2">
          {values.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">값이 없습니다. 아래에서 추가하세요.</p>
          )}
          {values.map((v) => {
            const cls = colorOf(v);
            const isCustom = !staticOpts.includes(v);
            const customRow = rowById.get(v);
            return (
              <div key={v} className="flex items-center gap-3 py-1">
                <span
                  className={`shrink-0 min-w-18 text-center px-2 py-1 rounded text-xs font-medium ${
                    cls || 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {v}
                </span>
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {CELL_COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setColor(v, c.cls)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full ${c.dot} ${
                        cls === c.cls ? 'ring-2 ring-offset-1 ring-gray-700' : ''
                      }`}
                    />
                  ))}
                  <button
                    onClick={() => setColor(v, '')}
                    title="색 없음"
                    className={`w-5 h-5 rounded-full border border-gray-300 bg-white text-[10px] text-gray-400 ${
                      !cls ? 'ring-2 ring-offset-1 ring-gray-700' : ''
                    }`}
                  >
                    ×
                  </button>
                </div>
                {isCustom && customRow && (
                  <button
                    onClick={() => del.mutate(customRow.id)}
                    className="shrink-0 text-gray-300 hover:text-red-500"
                    title="값 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-gray-100">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addValue();
            }}
            placeholder="새 값 추가"
            className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-200 outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            onClick={addValue}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
          >
            <Plus className="w-4 h-4" />추가
          </button>
        </div>
      </div>
    </div>
  );
}

function SubTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        active ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

function VideoRow({
  item,
  columns,
  resolveCol,
  onCommit,
  onDelete,
}: {
  item: BoardItemDTO;
  columns: ColumnDef[];
  resolveCol: (col: ColumnDef) => ColResolved;
  onCommit: (item: BoardItemDTO, col: ColumnDef, value: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <tr ref={setNodeRef} style={style} className="border-b border-gray-100 hover:bg-indigo-50/30">
      <td className="text-center align-middle">
        <button
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
          aria-label="행 이동"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      {columns.map((col) => {
        const resolved = resolveCol(col);
        return (
          <td key={col.key} className="align-center px-0.5">
            <EditableCell
              value={getColumnValue(item, col)}
              col={col}
              options={resolved.options.length ? resolved.options : undefined}
              optionColors={resolved.colors}
              onCommit={(v) => onCommit(item, col, v)}
            />
          </td>
        );
      })}
      <td className="text-center align-middle">
        <button
          onClick={() => onDelete(item.id)}
          className="text-gray-300 hover:text-red-500 transition-colors"
          aria-label="행 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
