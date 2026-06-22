'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import ItemEditModal from './ItemEditModal';
import { getCalendarLabel, type BoardConfig } from '@/lib/boardConfig';
import { getHoliday } from '@/lib/holidays';
import { useCustomHolidayMap } from '@/lib/useHolidays';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import type { BoardItemDTO, BoardItemPatch, EmployeeDTO } from '@/services/work/type';

// 성을 뺀 이름 (한국 성씨는 보통 1글자). "홍길동" → "길동"
function givenName(full: string): string {
  const n = full.trim();
  return n.length > 1 ? n.slice(1) : n;
}

/** 달력에 함께 표시할 일정(연차/회사일정 등). 보드 아이템과 별개 레이어. */
export interface CalendarEvent {
  id: string;
  date: string; // 'YYYY-MM-DD'
  label: string;
  chip: string; // Tailwind 클래스
}

interface BoardCalendarViewProps {
  /** 아이템별 보드 설정 (단일 보드는 항상 같은 config, 일정관리는 보드별 config) */
  getConfig: (item: BoardItemDTO) => BoardConfig;
  items: BoardItemDTO[];
  onPatch: (item: BoardItemDTO, patch: BoardItemPatch) => void;
  onDelete: (item: BoardItemDTO) => void;
  /** 칩 라벨 커스터마이즈 (예: "[프로젝트명] 제목") */
  getLabel?: (item: BoardItemDTO) => string;
  /** 지정 시 칩 클릭이 내부 편집 모달 대신 이 콜백 호출 */
  onItemClick?: (item: BoardItemDTO) => void;
  /** 지정 시 빈 날짜 칸 클릭으로 그 날짜에 일정 추가 */
  onAddOnDate?: (dateStr: string) => void;
  /** 별도 일정 레이어(연차/회사일정 등) */
  events?: CalendarEvent[];
  /** 이벤트 칩 클릭 콜백 */
  onEventClick?: (id: string) => void;
  /** 이벤트 표시 방식: 'chip'(칩) | 'plain'(날짜 옆 아이콘+텍스트) */
  eventDisplay?: 'chip' | 'plain';
  /** 작업(아이템) 표시 방식: 'chip'(배지) | 'dot'(도트+텍스트) */
  itemDisplay?: 'chip' | 'dot';
  /** dot 모드에서 모든 도트를 이 색으로 고정 (예: 'bg-indigo-500'). 없으면 상태별 색 */
  itemDotColor?: string;
  /** 지정 시 작업을 이 키(예: 작업자)로 묶어 "작업자 · 대표 외 N건" 요약으로 표시 */
  itemSummaryBy?: (item: BoardItemDTO) => string;
  /** 캘린더 헤더(월/오늘 줄) 우측 영역 */
  headerRight?: React.ReactNode;
  /** 지정 시 날짜 칸 클릭으로 그 날짜 선택(추가가 아닌 보기 용) */
  onDateClick?: (dateStr: string) => void;
  /** 선택된 날짜 강조 ('YYYY-MM-DD') */
  selectedDate?: string | null;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 아이템을 키별로 묶기 (입력 순서 유지) */
function groupItems(
  items: BoardItemDTO[],
  by: (it: BoardItemDTO) => string
): [string, BoardItemDTO[]][] {
  const m = new Map<string, BoardItemDTO[]>();
  for (const it of items) {
    const k = by(it) || '미지정';
    const arr = m.get(k);
    if (arr) arr.push(it);
    else m.set(k, [it]);
  }
  return [...m.entries()];
}

export default function BoardCalendarView({
  getConfig,
  items,
  onPatch,
  onDelete,
  getLabel,
  onItemClick,
  onAddOnDate,
  events,
  onEventClick,
  eventDisplay = 'chip',
  itemDisplay = 'chip',
  itemDotColor,
  itemSummaryBy,
  headerRight,
  onDateClick,
  selectedDate,
}: BoardCalendarViewProps) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const customHolidays = useCustomHolidayMap();
  const employeesQuery = useEmployeesQuery();
  const empByName = useMemo(() => {
    const m = new Map<string, EmployeeDTO>();
    for (const e of employeesQuery.data ?? []) m.set(e.name, e);
    return m;
  }, [employeesQuery.data]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, BoardItemDTO[]>();
    for (const it of items) {
      if (!it.eventDate) continue;
      const list = map.get(it.eventDate) ?? [];
      list.push(it);
      map.set(it.eventDate, list);
    }
    return map;
  }, [items]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events ?? []) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const { year, month } = cursor;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  // 6주(42칸) 그리드 셀 구성
  const cells: { day: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, dateStr: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: ymd(year, month, d) });
  while (cells.length % 7 !== 0) cells.push({ day: null, dateStr: null });

  const goPrev = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  const goNext = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const selected = selectedId ? items.find((it) => it.id === selectedId) ?? null : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-base font-bold text-gray-800">
          {year}년 {month + 1}월
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="p-1 rounded hover:bg-gray-100" aria-label="이전 달">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={goNext} className="p-1 rounded hover:bg-gray-100" aria-label="다음 달">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <button
          onClick={goToday}
          className="text-xs px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          오늘
        </button>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>

      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`px-2 py-1.5 text-xs font-semibold text-center border-r border-b border-gray-200 bg-gray-50 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, idx) => {
          const dayItems = cell.dateStr ? itemsByDate.get(cell.dateStr) ?? [] : [];
          const dayEvents = cell.dateStr ? eventsByDate.get(cell.dateStr) ?? [] : [];
          const holiday = cell.dateStr
            ? getHoliday(cell.dateStr) ?? customHolidays.get(cell.dateStr) ?? null
            : null;
          const isToday = cell.dateStr === todayStr;
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;
          const addable = !!onAddOnDate && !!cell.dateStr;
          const selectable = !!onDateClick && !!cell.dateStr;
          const clickable = addable || selectable;
          const isSelected = !!selectedDate && cell.dateStr === selectedDate;
          const handleCellClick = clickable
            ? () => (onDateClick ? onDateClick(cell.dateStr!) : onAddOnDate!(cell.dateStr!))
            : undefined;
          return (
            <div
              key={idx}
              onClick={handleCellClick}
              className={`group min-h-24 border-r border-b border-gray-200 p-1 align-top ${
                cell.day ? 'bg-white' : 'bg-gray-50/40'
              } ${holiday ? 'bg-red-50/40' : ''} ${
                isSelected ? 'ring-2 ring-inset ring-indigo-500' : ''
              } ${clickable ? 'cursor-pointer hover:bg-indigo-50/40' : ''}`}
            >
              {cell.day && (
                <div className="flex flex-col gap-1 h-full">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0 flex-wrap">
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          isToday
                            ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white'
                            : holiday || isSunday
                            ? 'text-red-500'
                            : isSaturday
                            ? 'text-blue-500'
                            : 'text-gray-600'
                        }`}
                      >
                        {cell.day}
                      </span>
                      {holiday && (
                        <span className="text-[10px] text-red-500 truncate" title={holiday}>
                          {holiday}
                        </span>
                      )}
                      {/* plain: 날짜 옆에 아이콘+텍스트만 (배지 없음) */}
                      {eventDisplay === 'plain' &&
                        dayEvents.map((ev) => (
                          <span
                            key={ev.id}
                            className="text-[10px] text-gray-500 truncate"
                            title={ev.label}
                          >
                            {ev.label}
                          </span>
                        ))}
                    </div>
                    {addable && (
                      <Plus className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 shrink-0" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {/* 이벤트(연차/회사일정): 가로 일렬 배지 */}
                    {eventDisplay === 'chip' && dayEvents.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                        {dayEvents.map((ev) => (
                          <button
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick?.(ev.id);
                            }}
                            className={`max-w-full text-left text-[10px] leading-tight truncate px-1.5 py-0.5 rounded-full border font-medium ${ev.chip}`}
                            title={ev.label}
                          >
                            {ev.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* 작업: 세로 나열 (요약 모드 시 작업자별 "대표 외 N건") */}
                    {itemSummaryBy
                      ? groupItems(dayItems, itemSummaryBy).map(([key, list]) => {
                          const cfg = getConfig(list[0]);
                          const rep = getLabel ? getLabel(list[0]) : getCalendarLabel(list[0], cfg);
                          const more = list.length - 1;
                          const dot = itemDotColor ?? cfg.groupColors[list[0].groupKey]?.dot ?? 'bg-gray-400';
                          return (
                            <div
                              key={key}
                              className="flex items-center gap-1 max-w-full min-w-0 text-[11px]"
                              title={`${key} · ${rep}${more > 0 ? ` 외 ${more}건` : ''}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                              {(() => {
                                const emp = empByName.get(key);
                                if (!emp)
                                  return (
                                    <span className="font-semibold text-gray-700 shrink-0">{key}</span>
                                  );
                                return (
                                  <span className="flex items-center gap-1 shrink-0">
                                    {emp.avatar && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={emp.avatar}
                                        alt=""
                                        className="w-4 h-4 rounded-full object-cover"
                                      />
                                    )}
                                    <span className="font-semibold text-gray-700">
                                      {givenName(key)}
                                    </span>
                                  </span>
                                );
                              })()}
                              <span className="truncate text-gray-500">
                                {rep}
                                {more > 0 ? ` 외 ${more}건` : ''}
                              </span>
                            </div>
                          );
                        })
                      : dayItems.map((it) => {
                      const cfg = getConfig(it);
                      const label = getLabel ? getLabel(it) : getCalendarLabel(it, cfg);
                      const onClick = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (onItemClick) onItemClick(it);
                        else setSelectedId(it.id);
                      };
                      if (itemDisplay === 'dot') {
                        const dot =
                          itemDotColor ?? cfg.groupColors[it.groupKey]?.dot ?? 'bg-gray-400';
                        return (
                          <button
                            key={it.id}
                            onClick={onClick}
                            className="flex items-center gap-1 max-w-full min-w-0 text-left text-[11px] text-gray-700"
                            title={label}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                            <span className="truncate">{label}</span>
                          </button>
                        );
                      }
                      const chip =
                        cfg.groupColors[it.groupKey]?.chip ??
                        'bg-gray-100 text-gray-600 border-gray-200';
                      return (
                        <button
                          key={it.id}
                          onClick={onClick}
                          className={`self-start max-w-full text-left text-[11px] truncate px-1.5 py-0.5 rounded border ${chip}`}
                          title={label}
                        >
                          {label}
                        </button>

                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <ItemEditModal
          config={getConfig(selected)}
          item={selected}
          onClose={() => setSelectedId(null)}
          onPatch={onPatch}
          onDelete={(item) => {
            onDelete(item);
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}
