'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Plus, ChevronLeft, ChevronRight, Trash2, CalendarCheck, Check } from 'lucide-react';
import Modal from './Modal';
import { todayStr } from '@/lib/date';
import { countLeaveDays, leavePeriod } from '@/lib/leave';
import { getHoliday } from '@/lib/holidays';
import { useScheduleEvents, isLeaveEventId } from '@/lib/calendarEvents';
import { useCustomHolidayMap } from '@/lib/useHolidays';
import { workQueryKeys, type BoardItemDTO, type EventDTO, type LeaveStatus } from '@/services/work/type';
import { fetchBoardItems } from '@/services/work/boardItems/api';
import { useBoardsQuery } from '@/services/work/boards/queries';
import { useUpdateBoardItemMutation } from '@/services/work/boardItems/mutations';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import { useLeaveRequestsQuery } from '@/services/work/leave/queries';
import { useCreateLeaveMutation, useDeleteLeaveMutation } from '@/services/work/leave/mutations';
import { useEventsQuery } from '@/services/work/events/queries';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from '@/services/work/events/mutations';

const ME_KEY = 'peakboard:meId';
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const STATUS_LABEL: Record<LeaveStatus, string> = { pending: '대기', approved: '승인', rejected: '반려' };
const STATUS_CHIP: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-gray-200 text-gray-500 border-gray-300',
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function HomeDashboard() {
  const employeesQuery = useEmployeesQuery();
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const leaveQuery = useLeaveRequestsQuery();
  const leaveRequests = leaveQuery.data ?? [];
  const boardsQuery = useBoardsQuery();
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);
  const teamByBoard = useMemo(() => {
    const m = new Map<string, 'video' | 'dev'>();
    for (const b of boards) m.set(b.id, b.teamType);
    return m;
  }, [boards]);
  const scheduleEvents = useScheduleEvents();
  const customHolidays = useCustomHolidayMap();

  const eventsQuery = useEventsQuery();
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();
  const updateItem = useUpdateBoardItemMutation();
  const createLeave = useCreateLeaveMutation();
  const deleteLeave = useDeleteLeaveMutation();

  const holidaySet = useMemo(() => new Set(customHolidays.keys()), [customHolidays]);
  const isHoliday = (d: string) => !!getHoliday(d) || holidaySet.has(d);

  const [meId, setMeId] = useState<string>(() =>
    typeof window === 'undefined' ? '' : sessionStorage.getItem(ME_KEY) ?? ''
  );
  const me = employees.find((e) => e.id === meId) ?? employees[0] ?? null;
  const selectMe = (id: string) => {
    setMeId(id);
    if (typeof window !== 'undefined') sessionStorage.setItem(ME_KEY, id);
  };

  const [applyOpen, setApplyOpen] = useState(false);
  const [eventTarget, setEventTarget] = useState<{ mode: 'add'; date: string } | { mode: 'edit'; event: EventDTO } | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(t);
  }, []);

  const itemQueries = useQueries({
    queries: boards.map((b) => ({
      queryKey: workQueryKeys.boardItems(b.id),
      queryFn: () => fetchBoardItems(b.id),
    })),
  });
  const allItems = useMemo<BoardItemDTO[]>(() => itemQueries.flatMap((q) => q.data ?? []), [itemQueries]);

  const today = todayStr();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? today;

  const myRequests = me ? leaveRequests.filter((r) => r.employeeId === me.id) : [];
  const usedDays = myRequests.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0);
  const total = me?.leaveTotal ?? 0;
  const usagePct = total > 0 ? Math.round((usedDays / total) * 100) : 0;
  const remaining = total - usedDays;
  const period = leavePeriod(me?.hireDate, today);

  const myTodos = useMemo(
    () => (me ? allItems.filter((it) => it.assignee.trim() === me.name && it.eventDate) : []),
    [allItems, me]
  );
  const dateTodos = myTodos.filter((it) => it.eventDate === activeDate);
  const dateCompanyEvents = events.filter((e) => e.category === 'company' && e.date === activeDate);
  const dateLeaves = scheduleEvents.filter((e) => isLeaveEventId(e.id) && e.date === activeDate);
  const datePersonalTodos = events.filter((e) => e.category === 'todo' && e.date === activeDate);

  const markedDates = useMemo(() => {
    const s = new Set<string>();
    for (const e of scheduleEvents) s.add(e.date);
    for (const e of events) if (e.category === 'todo') s.add(e.date);
    for (const it of myTodos) if (it.eventDate) s.add(it.eventDate);
    return s;
  }, [scheduleEvents, events, myTodos]);

  const isChecked = (it: BoardItemDTO) =>
    teamByBoard.get(it.boardId) === 'dev' ? it.groupKey === '완료' : it.done;

  const toggleTodo = (it: BoardItemDTO) => {
    const checked = isChecked(it);
    if (teamByBoard.get(it.boardId) === 'dev') {
      updateItem.mutate({ itemId: it.id, boardId: it.boardId, patch: { groupKey: checked ? '해야할일' : '완료' } });
    } else {
      updateItem.mutate({ itemId: it.id, boardId: it.boardId, patch: { done: !checked } });
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      <div className="flex items-center justify-end gap-2 shrink-0">
        <span className="text-xs text-gray-500">계정</span>
        <select
          value={me?.id ?? ''}
          onChange={(e) => selectMe(e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md cursor-pointer bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
        >
          {employees.length === 0 && <option value="">직원 없음</option>}
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} {e.department && `(${e.department})`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 연차 */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col min-h-0">
          <h3 className="text-base font-bold text-gray-800 mb-4 shrink-0">연차 현황</h3>
          <div className="shrink-0">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Stat label="부여" value={`${total}`} />
              <Stat label="사용" value={`${usedDays}`} tone="indigo" />
              <Stat label="잔여" value={`${remaining}`} tone="green" />
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-400">사용률</span>
              <span className="text-sm font-bold text-gray-700">{usagePct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-400 via-violet-400 to-blue-500"
                style={{ width: `${Math.min(100, usagePct)}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 text-right mt-1.5">
              {period.start} ~ {period.end}
            </p>
            <button
              onClick={() => setApplyOpen(true)}
              disabled={!me}
              className="mt-3 w-full py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              연차 신청
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col min-h-0">
            <p className="text-xs font-semibold text-gray-500 mb-2 shrink-0">내 연차 신청 내역</p>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {myRequests.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">신청 내역이 없습니다.</p>
              ) : (
                myRequests.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-2">
                    <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-semibold shrink-0 ${STATUS_CHIP[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-gray-700 truncate">
                      {r.startDate}
                      {r.endDate !== r.startDate ? ` ~ ${r.endDate}` : ''} · {r.days}일
                      {r.reason ? ` · ${r.reason}` : ''}
                    </span>
                    {r.status === 'pending' && (
                      <button
                        onClick={() => deleteLeave.mutate(r.id)}
                        className="text-gray-300 hover:text-red-500 shrink-0"
                        aria-label="취소"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 일정 */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col min-h-0">
          <h3 className="text-base font-bold text-gray-800 mb-4 shrink-0">일정</h3>
          <div className="shrink-0">
            <MiniCalendar now={now} selected={activeDate} onSelect={setSelectedDate} marked={markedDates} isHoliday={isHoliday} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {activeDate === today ? '오늘' : activeDate} 일정
              </p>
              <button
                onClick={() => setEventTarget({ mode: 'add', date: activeDate })}
                className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-3.5 h-3.5" />일정 추가
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
              {dateCompanyEvents.length === 0 &&
              dateLeaves.length === 0 &&
              dateTodos.length === 0 &&
              datePersonalTodos.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">일정이 없습니다.</p>
              ) : (
                <>
                  {/* 회사 일정: 읽기전용(일정관리에서 관리) */}
                  {dateCompanyEvents.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-md border border-purple-100 bg-purple-50/40 px-2.5 py-2">
                      <span className="text-sm text-purple-700 flex-1 min-w-0 truncate">📌 {e.title || '일정'}</span>
                    </div>
                  ))}
                  {/* 승인 연차: 읽기전용 */}
                  {dateLeaves.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-md border border-green-100 bg-green-50/40 px-2.5 py-2">
                      <span className="text-sm text-green-700 flex-1 min-w-0 truncate">{e.label}</span>
                    </div>
                  ))}
                  {/* 내 작업(불러온 데이터): 체크 가능 */}
                  {dateTodos.map((it) => {
                    const checked = isChecked(it);
                    return (
                      <div key={it.id} className="flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-2">
                        <button
                          onClick={() => toggleTodo(it)}
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent hover:border-indigo-400'
                          }`}
                          aria-label="완료 체크"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <span className={`flex-1 min-w-0 text-sm truncate ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {it.title || it.fields.company || '제목 없음'}
                        </span>
                      </div>
                    );
                  })}
                  {/* 직접 추가한 일정(개인 todo): 체크 + 클릭 시 수정/삭제 */}
                  {datePersonalTodos.map((pt) => (
                    <div key={pt.id} className="group flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-2">
                      <button
                        onClick={() => updateEvent.mutate({ id: pt.id, patch: { done: !pt.done } })}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          pt.done ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 text-transparent hover:border-indigo-400'
                        }`}
                        aria-label="완료 체크"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEventTarget({ mode: 'edit', event: pt })}
                        className={`flex-1 min-w-0 text-left text-sm truncate ${pt.done ? 'line-through text-gray-400' : 'text-gray-800'}`}
                      >
                        {pt.title || '제목 없음'}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {applyOpen && me && (
        <LeaveApplyModal
          holidaySet={holidaySet}
          onClose={() => setApplyOpen(false)}
          onSubmit={(startDate, endDate, reason) =>
            createLeave.mutate(
              { employeeId: me.id, startDate, endDate, days: countLeaveDays(startDate, endDate, holidaySet), reason },
              { onError: () => alert('연차 신청에 실패했어요.') }
            )
          }
        />
      )}

      {eventTarget && (
        <CompanyEventModal
          target={eventTarget}
          onClose={() => setEventTarget(null)}
          onCreate={(date, title) =>
            createEvent.mutate({ date, category: 'todo', title }, { onError: () => alert('일정 추가 실패') })
          }
          onUpdate={(id, date, title) =>
            updateEvent.mutate({ id, patch: { date, title } }, { onError: () => alert('일정 수정 실패') })
          }
          onDelete={(id) => deleteEvent.mutate({ id }, { onError: () => alert('일정 삭제 실패') })}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'gray' }: { label: string; value: string; tone?: 'gray' | 'indigo' | 'green' }) {
  const cls = tone === 'indigo' ? 'text-indigo-600' : tone === 'green' ? 'text-green-600' : 'text-gray-800';
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${cls}`}>
        {value}
        <span className="text-xs font-medium text-gray-400">일</span>
      </p>
    </div>
  );
}

function MiniCalendar({
  now,
  selected,
  onSelect,
  marked,
  isHoliday,
}: {
  now: Date | null;
  selected: string;
  onSelect: (d: string) => void;
  marked: Set<string>;
  isHoliday: (d: string) => boolean;
}) {
  const [offset, setOffset] = useState(0);
  if (!now) return <div className="h-56" />;
  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthName = base.toLocaleString('en-US', { month: 'long' });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setOffset((o) => o - 1)} className="p-1 rounded hover:bg-gray-100">
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
        <span className="text-sm font-bold text-gray-700">
          {monthName} {year}
        </span>
        <button onClick={() => setOffset((o) => o + 1)} className="p-1 rounded hover:bg-gray-100">
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-[10px] font-semibold py-1 ${i === 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateStr = ymd(year, month, d);
          const isToday = dateStr === todayDate;
          const isSel = dateStr === selected;
          const holiday = isHoliday(dateStr);
          const hasMark = marked.has(dateStr);
          return (
            <button key={i} onClick={() => onSelect(dateStr)} className="py-1 flex flex-col items-center">
              <span
                className={`inline-flex items-center justify-center w-7 h-7 text-xs rounded-full ${
                  isSel
                    ? 'bg-indigo-600 text-white font-bold'
                    : isToday
                    ? 'ring-1 ring-indigo-400 text-indigo-600 font-semibold'
                    : holiday || i % 7 === 0
                    ? 'text-red-400'
                    : 'text-gray-600'
                }`}
              >
                {d}
              </span>
              <span className={`mt-0.5 w-1 h-1 rounded-full ${hasMark ? 'bg-indigo-400' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompanyEventModal({
  target,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  target: { mode: 'add'; date: string } | { mode: 'edit'; event: EventDTO };
  onClose: () => void;
  onCreate: (date: string, title: string) => void;
  onUpdate: (id: string, date: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const initial = target.mode === 'edit' ? target.event : { date: target.date, title: '' };
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400';
  const save = () => {
    if (!date) return;
    if (target.mode === 'add') onCreate(date, title);
    else onUpdate(target.event.id, date, title);
    onClose();
  };
  return (
    <Modal open title={target.mode === 'add' ? '일정 추가' : '일정 편집'} onClose={onClose} width="max-w-sm">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">일정명</label>
          <input
            autoFocus
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="예) 팀 미팅"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">날짜</label>
          <input type="date" className={`${inputCls} cursor-pointer`} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-between items-center mt-5">
        {target.mode === 'edit' ? (
          <button onClick={() => { onDelete(target.event.id); onClose(); }} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
            <Trash2 className="w-4 h-4" />삭제
          </button>
        ) : (
          <span />
        )}
        <button onClick={save} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
          <Check className="w-4 h-4" />저장
        </button>
      </div>
    </Modal>
  );
}

function LeaveApplyModal({
  holidaySet,
  onClose,
  onSubmit,
}: {
  holidaySet: Set<string>;
  onClose: () => void;
  onSubmit: (startDate: string, endDate: string, reason: string) => void;
}) {
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());
  const [reason, setReason] = useState('');
  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400';
  const days = countLeaveDays(start, end, holidaySet);
  const save = () => {
    if (!start) {
      alert('시작일을 선택해주세요.');
      return;
    }
    if (days <= 0) {
      alert('주말·공휴일만으로는 연차를 신청할 수 없습니다.');
      return;
    }
    onSubmit(start, end || start, reason);
    onClose();
  };
  return (
    <Modal open title="연차 신청" onClose={onClose} width="max-w-sm">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">시작일</label>
            <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">종료일</label>
            <input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          사용 일수: <span className="font-semibold text-gray-700">{days}일</span>
          <span className="text-gray-400"> (주말·공휴일 제외)</span>
        </p>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">사유</label>
          <input
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder="예) 개인 사정"
          />
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button onClick={save} className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
          <Plus className="w-4 h-4" />신청
        </button>
      </div>
    </Modal>
  );
}
