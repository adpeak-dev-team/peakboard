'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  CalendarCheck,
  Check,
  ClipboardList,
  ExternalLink,
  Stamp,
  X,
} from 'lucide-react';
import Modal from './Modal';
import { todayStr } from '@/lib/date';
import { countLeaveDays, leavePeriod, usedLeaveDays } from '@/lib/leave';
import { getHoliday } from '@/lib/holidays';
import { useScheduleEvents, isLeaveEventId } from '@/lib/calendarEvents';
import { useCustomHolidayMap } from '@/lib/useHolidays';
import {
  workQueryKeys,
  type BoardItemDTO,
  type EmployeeDTO,
  type EventDTO,
  type LeaveRequestDTO,
  type LeaveStatus,
} from '@/services/work/type';
import { fetchBoardItems } from '@/services/work/boardItems/api';
import { useBoardsQuery } from '@/services/work/boards/queries';
import { useUpdateBoardItemMutation } from '@/services/work/boardItems/mutations';
import { useLeaveRequestsQuery } from '@/services/work/leave/queries';
import {
  useCreateLeaveMutation,
  useDeleteLeaveMutation,
  useUpdateLeaveStatusMutation,
} from '@/services/work/leave/mutations';
import { useEventsQuery } from '@/services/work/events/queries';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from '@/services/work/events/mutations';

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

// 패밀리사이트 (임시 링크 — 추후 교체)
const FAMILY_SITES: { name: string; url: string }[] = [
  { name: '탑분양', url: 'https://adpeak.kr' },
  { name: '위드분양', url: 'https://withby.kr/' },
  { name: '리치분양', url: 'https://richby.co.kr' },
  { name: '번개분양', url: 'https://lightby.co.kr' },
];

const STATUS_LABEL: Record<LeaveStatus, string> = { pending: '대기', approved: '승인', rejected: '반려' };
const STATUS_CHIP: Record<LeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-green-100 text-green-700 border-green-200',
  rejected: 'bg-gray-200 text-gray-500 border-gray-300',
};

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// 입사일 ~ 오늘 근속 기간 (YYYY-MM-DD 문자열 기준)
function tenureStr(hireDate: string | null | undefined, today: string): string {
  if (!hireDate) return '-';
  const [hy, hm, hd] = hireDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - hy) * 12 + (tm - hm);
  if (td < hd) months -= 1;
  if (months < 0) return '-';
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y}년 ${m}개월` : `${m}개월`;
}

export default function HomeDashboard({
  me,
  isAdmin,
}: {
  me: EmployeeDTO | null;
  isAdmin: boolean;
}) {
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
  const updateLeaveStatus = useUpdateLeaveStatusMutation();

  const holidaySet = useMemo(() => new Set(customHolidays.keys()), [customHolidays]);
  const isHoliday = (d: string) => !!getHoliday(d) || holidaySet.has(d);

  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveListOpen, setLeaveListOpen] = useState(false);
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
  const period = leavePeriod(me?.hireDate, today);
  const usedDays = usedLeaveDays(myRequests, period);
  const total = me?.leaveTotal ?? 0;
  const usagePct = total > 0 ? Math.round((usedDays / total) * 100) : 0;

  // 결재 대기: 승인 대기(pending) 연차 신청
  const pendingApprovals = useMemo(
    () => leaveRequests.filter((r) => r.status === 'pending'),
    [leaveRequests]
  );

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
    <div className="h-full min-h-0 max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 overflow-y-auto lg:overflow-hidden">
      {/* 중: 프로필 + 연차 현황 + 패밀리사이트 */}
      <div className="lg:flex-1 lg:min-w-0 lg:h-full lg:min-h-0 flex flex-col gap-4">
          <ProfileCard me={me} today={today} />

          {/* 연차 현황 */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 lg:flex-1 lg:min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-base font-bold text-gray-800">연차 현황</h3>
              <button
                onClick={() => setLeaveListOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-indigo-600"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                신청 내역
                {myRequests.length > 0 && (
                  <span className="ml-0.5 px-1.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                    {myRequests.length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-lg font-bold">
                <span className="text-indigo-600">{usedDays}</span>
                <span className="text-gray-400 text-sm font-semibold">/{total}일</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400">사용률</span>
                <span className="text-sm font-bold text-gray-700">{usagePct}%</span>
              </div>
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
              className="mt-auto w-full py-2.5 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              연차 신청
            </button>
          </div>

          <FamilySites />
      </div>
      
      
      

      

      {/* 우: 일정 (세로로 길게) */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col lg:flex-1 lg:min-w-0 lg:h-full lg:min-h-0">
          <h3 className="text-base font-bold text-gray-800 mb-4 shrink-0">일정</h3>
          <div className="shrink-0">
            <MiniCalendar now={now} selected={activeDate} onSelect={setSelectedDate} marked={markedDates} isHoliday={isHoliday} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {activeDate === today ? '오늘' : activeDate} 할일
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

        {/* 좌: 결재 대기 (관리자 전용, 세로로 길게) */}
      {isAdmin && (
        <PendingApprovalsCard
          className="lg:flex-[0.8] lg:min-w-0 lg:h-full lg:min-h-0"
          requests={pendingApprovals}
          onApprove={(id) => updateLeaveStatus.mutate({ id, status: 'approved' })}
          onReject={(id) => updateLeaveStatus.mutate({ id, status: 'rejected' })}
        />
      )}

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

      {leaveListOpen && (
        <LeaveListModal
          requests={myRequests}
          onDelete={(id) => deleteLeave.mutate(id)}
          onClose={() => setLeaveListOpen(false)}
        />
      )}
    </div>
  );
}

function ProfileCard({ me, today }: { me: EmployeeDTO | null; today: string }) {
  const initial = me?.name?.trim()?.[0] ?? '?';
  const tenure = tenureStr(me?.hireDate, today);
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col lg:flex-[1.6] lg:min-h-0">
      {/* 그라데이션 헤더 */}
      <div className="h-24 bg-linear-to-r from-indigo-500 via-violet-500 to-blue-500 shrink-0" />
      <div className="px-5 pb-5 -mt-9 flex-1 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-white bg-linear-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
          {me?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <p className="mt-3 text-lg font-bold text-gray-800 truncate w-full">{me?.name || '직원 미선택'}</p>
        <p className="text-sm text-gray-500 truncate w-full">
          {[me?.department, me?.position].filter(Boolean).join(' · ') || '-'}
        </p>
        <div className="mt-auto pt-4 w-full grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gray-50 py-2 px-1">
            <p className="text-[11px] text-gray-400">입사일</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{me?.hireDate || '-'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 py-2 px-1">
            <p className="text-[11px] text-gray-400">근속</p>
            <p className="text-sm font-semibold text-gray-700 truncate">{tenure}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FamilySites() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 lg:flex-[0.6] lg:min-h-0 flex flex-col">
      <h3 className="text-base font-bold text-gray-800 mb-3 shrink-0">패밀리사이트</h3>
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1 min-h-0">
        {FAMILY_SITES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors"
          >
            <span className="text-sm text-gray-700 truncate">{s.name}</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

function PendingApprovalsCard({
  requests,
  onApprove,
  onReject,
  className = '',
}: {
  requests: LeaveRequestDTO[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-800">
          <Stamp className="w-4 h-4 text-gray-400" />
          결재 대기
        </h3>
        {requests.length > 0 && (
          <span className="px-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
            {requests.length}
          </span>
        )}
      </div>
      {requests.length === 0 ? (
        <p className="text-sm text-gray-400 py-2 text-center">대기 중인 결재가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {requests.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
                {(r.employeeName || '?').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {r.employeeName || '-'}
                  <span className="ml-1.5 text-xs font-bold text-indigo-600">{r.days}일</span>
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {r.startDate}
                  {r.endDate !== r.startDate ? ` ~ ${r.endDate}` : ''}
                  {r.reason ? ` · ${r.reason}` : ''}
                </p>
              </div>
              <button
                onClick={() => onApprove(r.id)}
                className="p-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 shrink-0"
                aria-label="승인"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => onReject(r.id)}
                className="p-1.5 rounded-md text-gray-500 bg-gray-100 hover:bg-gray-200 shrink-0"
                aria-label="반려"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaveListModal({
  requests,
  onDelete,
  onClose,
}: {
  requests: LeaveRequestDTO[];
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal open title="내 연차 신청 내역" onClose={onClose} width="max-w-md">
      <div className="flex flex-col gap-1.5 min-h-64 max-h-[60vh] overflow-y-auto pr-1">
        {requests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">신청 내역이 없습니다.</p>
        ) : (
          requests.map((r) => (
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
                  onClick={() => onDelete(r.id)}
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
    </Modal>
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
