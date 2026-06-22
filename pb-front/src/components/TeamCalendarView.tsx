'use client';

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import BoardCalendarView, { type CalendarEvent } from './BoardCalendarView';
import ItemEditModal from './ItemEditModal';
import { BOARD_CONFIG, type BoardConfig } from '@/lib/boardConfig';
import { todayStr } from '@/lib/date';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import type { BoardDTO, BoardItemDTO, BoardItemPatch, EmployeeDTO } from '@/services/work/type';

// 성을 뺀 이름 (한국 성씨는 보통 1글자). "홍길동" → "길동"
function givenName(full: string): string {
  const n = full.trim();
  return n.length > 1 ? n.slice(1) : n;
}

// 그룹 헤더: 직원이면 프로필사진(있으면)+이름(성 제외), 아니면 원본 라벨
function PersonLabel({ name, employee }: { name: string; employee?: EmployeeDTO }) {
  if (!employee) {
    return <span className="text-xs font-semibold text-gray-700 truncate">{name}</span>;
  }
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {employee.avatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={employee.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
      )}
      <span className="text-xs font-semibold text-gray-700 truncate">{givenName(name)}</span>
    </span>
  );
}

interface TeamCalendarViewProps {
  board: BoardDTO;
  items: BoardItemDTO[];
  events: CalendarEvent[];
  onPatch: (item: BoardItemDTO, patch: BoardItemPatch) => void;
  onDelete: (item: BoardItemDTO) => void;
  /** 캘린더 칩/패널 라벨 커스터마이즈 */
  getLabel?: (item: BoardItemDTO) => string;
  /** 상세 모달 커스터마이즈 (없으면 config 기반 ItemEditModal) */
  renderItemModal?: (item: BoardItemDTO, close: () => void) => React.ReactNode;
  /** 상단 우측 영역(예: 추가 버튼/필터) */
  toolbar?: React.ReactNode;
  /** 캘린더 헤더(월/오늘 줄) 우측 영역 */
  calendarHeaderRight?: React.ReactNode;
  /** 선택 날짜 변경 알림(추가 모달 기본 날짜용) */
  onSelectedDateChange?: (date: string | null) => void;
  /** 우측 패널 그룹 기준 (기본: 담당자) */
  panelGroupOf?: (item: BoardItemDTO) => string;
  /** 우측 패널 항목 라벨 (기본: 제목) */
  panelLabelOf?: (item: BoardItemDTO) => string;
  /** 우측 패널 항목 태그(기본: 상태 groupKey). 지정 시 중립 배지로 표시 */
  panelTagOf?: (item: BoardItemDTO) => string;
  /** true 면 항목 클릭 시 상세 모달 없이 보기 전용 (영상팀 일정관리) */
  readOnlyItems?: boolean;
  /** 우측 패널에 항상 표시할 그룹(예: 전 직원). 비어있어도 표시 */
  panelGroups?: string[];
  /** 그룹 인라인 입력으로 추가 (그룹명, 선택날짜, 입력내용) */
  onPanelAdd?: (groupName: string, date: string, title: string) => void;
  /** 패널 항목 삭제 (보기 전용 패널에서 삭제 제공) */
  onPanelDelete?: (id: string) => void;
  /** 달력 작업 표시 방식: 'chip' | 'dot' */
  itemDisplay?: 'chip' | 'dot';
  /** dot 모드 단일 색 (예: 'bg-indigo-500') */
  itemDotColor?: string;
  /** 지정 시 달력 작업을 키별 "작업자 · 대표 외 N건" 요약으로 표시 */
  itemSummaryBy?: (item: BoardItemDTO) => string;
}

/** 영상팀/개발팀 공용 달력형: 일정관리(연차/공휴일/회사일정) + 작업 미리보기 + 날짜별 작업자 패널 */
export default function TeamCalendarView({
  board,
  items,
  events,
  onPatch,
  onDelete,
  getLabel,
  renderItemModal,
  toolbar,
  calendarHeaderRight,
  onSelectedDateChange,
  panelGroupOf,
  panelLabelOf,
  panelTagOf,
  readOnlyItems,
  panelGroups,
  onPanelAdd,
  onPanelDelete,
  itemDisplay,
  itemDotColor,
  itemSummaryBy,
}: TeamCalendarViewProps) {
  const config = BOARD_CONFIG[board.teamType];
  const [selectedDate, setSelectedDate] = useState<string | null>(() => todayStr());
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingItem =
    !readOnlyItems && editingId ? items.find((it) => it.id === editingId) ?? null : null;
  const openItem = readOnlyItems ? undefined : (id: string) => setEditingId(id);

  const selectDate = (date: string) => {
    setSelectedDate(date);
    onSelectedDateChange?.(date);
  };

  return (
    <div className="flex flex-col gap-3">
      {toolbar && <div className="flex justify-end">{toolbar}</div>}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <BoardCalendarView
            getConfig={() => config}
            items={items}
            events={events}
            eventDisplay="chip"
            itemDisplay={itemDisplay}
            itemDotColor={itemDotColor}
            itemSummaryBy={itemSummaryBy}
            headerRight={calendarHeaderRight}
            getLabel={getLabel}
            onItemClick={readOnlyItems ? () => undefined : (it) => setEditingId(it.id)}
            onDateClick={selectDate}
            selectedDate={selectedDate}
            onPatch={onPatch}
            onDelete={onDelete}
          />
        </div>

        <div className="xl:w-80 shrink-0">
          <DateTaskPanel
            date={selectedDate}
            items={items}
            config={config}
            groupOf={panelGroupOf}
            labelOf={panelLabelOf}
            tagOf={panelTagOf}
            onOpenItem={openItem}
            fixedGroups={panelGroups}
            onAddToGroup={onPanelAdd}
            onDeleteItem={onPanelDelete}
          />
        </div>
      </div>

      {editingItem &&
        (renderItemModal ? (
          renderItemModal(editingItem, () => setEditingId(null))
        ) : (
          <ItemEditModal
            config={config}
            item={editingItem}
            title="작업 상세"
            onClose={() => setEditingId(null)}
            onPatch={onPatch}
            onDelete={(item) => {
              onDelete(item);
              setEditingId(null);
            }}
          />
        ))}
    </div>
  );
}

// ===== 선택 날짜의 그룹별 할 일 (기본: 작업자, 커스텀 가능) =====
function DateTaskPanel({
  date,
  items,
  config,
  groupOf,
  labelOf,
  tagOf,
  onOpenItem,
  fixedGroups,
  onAddToGroup,
  onDeleteItem,
}: {
  date: string | null;
  items: BoardItemDTO[];
  config: BoardConfig;
  groupOf?: (item: BoardItemDTO) => string;
  labelOf?: (item: BoardItemDTO) => string;
  tagOf?: (item: BoardItemDTO) => string;
  /** 없으면 클릭 비활성(보기 전용) */
  onOpenItem?: (id: string) => void;
  /** 항상 표시할 그룹(비어있어도) */
  fixedGroups?: string[];
  /** 그룹 인라인 입력으로 추가 */
  onAddToGroup?: (groupName: string, date: string, title: string) => void;
  /** 항목 삭제 */
  onDeleteItem?: (id: string) => void;
}) {
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [addText, setAddText] = useState('');
  const employeesQuery = useEmployeesQuery();
  const empByName = useMemo(() => {
    const m = new Map<string, EmployeeDTO>();
    for (const e of employeesQuery.data ?? []) m.set(e.name, e);
    return m;
  }, [employeesQuery.data]);
  if (!date) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 h-full">
        <p className="text-sm text-gray-400 text-center py-6">
          날짜를 선택하면 그 날의 할 일이 표시됩니다.
        </p>
      </div>
    );
  }

  const resolveGroup = groupOf ?? ((it: BoardItemDTO) => it.assignee.trim() || '미지정');
  const resolveLabel = labelOf ?? ((it: BoardItemDTO) => it.title || getPreviewLabel(it, config));

  const dayItems = items
    .filter((it) => it.eventDate === date)
    .sort((a, b) => a.position - b.position);

  const byGroup = new Map<string, BoardItemDTO[]>();
  for (const it of dayItems) {
    const key = resolveGroup(it) || '미지정';
    const list = byGroup.get(key) ?? [];
    list.push(it);
    byGroup.set(key, list);
  }
  // 고정 그룹(전 직원)이 있으면 항상 표시 + 그 외 그룹은 뒤에
  const groupNames = fixedGroups
    ? [...fixedGroups, ...[...byGroup.keys()].filter((g) => !fixedGroups.includes(g))]
    : [...byGroup.keys()];
  const groups = groupNames.map((g) => [g, byGroup.get(g) ?? []] as [string, BoardItemDTO[]]);
  const showEmpty = !fixedGroups && dayItems.length === 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">{date}</span>
        <span className="text-xs text-gray-400">{dayItems.length}건</span>
      </div>
      <div className="p-2 flex flex-col gap-3">
        {showEmpty ? (
          <p className="text-sm text-gray-400 text-center py-6">이 날의 할 일이 없습니다.</p>
        ) : (
          groups.map(([groupName, list]) => (
            <div key={groupName}>
              <div className="flex items-center gap-1.5 px-1 mb-1">
                <PersonLabel name={groupName} employee={empByName.get(groupName)} />
                <span className="text-xs text-gray-400">{list.length}</span>
                {onAddToGroup && (
                  <button
                    onClick={() => {
                      setAddingGroup(addingGroup === groupName ? null : groupName);
                      setAddText('');
                    }}
                    className="ml-auto flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    <Plus className="w-3 h-3" />추가
                  </button>
                )}
              </div>
              {onAddToGroup && addingGroup === groupName && (
                <input
                  autoFocus
                  value={addText}
                  onChange={(e) => setAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const t = addText.trim();
                      if (t) onAddToGroup(groupName, date, t);
                      setAddText('');
                    } else if (e.key === 'Escape') {
                      setAddingGroup(null);
                    }
                  }}
                  onBlur={() => setAddingGroup(null)}
                  placeholder="작업 내용 입력 후 Enter"
                  className="w-full mb-1 px-2 py-1.5 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              )}
              <div className="flex flex-col gap-1">
                {list.length === 0 && (
                  <p className="text-[11px] text-gray-300 px-1 pb-1">작업 없음</p>
                )}
                {list.map((it) => {
                  // tagOf 지정 시 중립 배지(프로젝트명 등), 아니면 상태(groupKey) 색상 배지
                  const tag = tagOf ? tagOf(it) : it.groupKey;
                  const tagClass = tagOf
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : config.groupColors[it.groupKey]?.chip ??
                      'bg-gray-100 text-gray-600 border-gray-200';
                  return (
                    <div
                      key={it.id}
                      className={`group/item flex items-center gap-1.5 bg-white rounded-md border border-gray-200 px-2 py-1.5 ${
                        onOpenItem ? 'hover:border-indigo-300' : ''
                      }`}
                    >
                      <button
                        onClick={() => onOpenItem?.(it.id)}
                        disabled={!onOpenItem}
                        className={`flex-1 min-w-0 text-left flex items-center gap-1.5 ${onOpenItem ? '' : 'cursor-default'}`}
                      >
                        {tag && (
                          <span className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[10px] font-semibold ${tagClass}`}>
                            {tag}
                          </span>
                        )}
                        <span className={`flex-1 min-w-0 text-sm truncate ${it.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {resolveLabel(it)}
                        </span>
                      </button>
                      {onDeleteItem && (
                        <button
                          onClick={() => onDeleteItem(it.id)}
                          className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100"
                          aria-label="삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 제목이 비어있을 때 대체 라벨(영상팀은 업체명 등)
function getPreviewLabel(item: BoardItemDTO, config: BoardConfig): string {
  const col = config.columns.find((c) => c.key === config.calendarLabelKey);
  if (col && col.source === 'field') return item.fields[col.key] || '제목 없음';
  return '제목 없음';
}
