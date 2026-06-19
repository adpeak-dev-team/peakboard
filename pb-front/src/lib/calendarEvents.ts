import { useMemo } from 'react';
import type { CalendarEvent } from '@/components/BoardCalendarView';
import type { EventCategory, EventDTO, LeaveRequestDTO } from '@/services/work/type';
import { useEventsQuery } from '@/services/work/events/queries';
import { useLeaveRequestsQuery } from '@/services/work/leave/queries';

const CATEGORY_CHIP: Record<EventCategory, string> = {
  leave: 'bg-green-100 text-green-700 border-green-200',
  company: 'bg-purple-100 text-purple-700 border-purple-200',
  holiday: 'bg-red-100 text-red-600 border-red-200',
  todo: 'bg-gray-100 text-gray-600 border-gray-200',
};

/** 시작~종료(포함) 날짜 문자열 목록 (로컬 기준, 최대 90일) */
function eachDate(start: string, end: string): string[] {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = (end || start).split('-').map(Number);
  if (!ys || !ye) return [start];
  const cur = new Date(ys, ms - 1, ds);
  const last = new Date(ye, me - 1, de);
  const out: string[] = [];
  let guard = 0;
  while (cur <= last && guard < 90) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(
        cur.getDate()
      ).padStart(2, '0')}`
    );
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

/**
 * 일정관리 캘린더 이벤트 = 회사 일정(company_events 중 category='company')
 *   + 승인된 연차(leave_requests status='approved', 기간 펼침).
 * 연차는 더 이상 일정에서 직접 추가하지 않고 연차 승인으로 자동 반영된다.
 */
export function buildScheduleEvents(
  events: EventDTO[],
  leaves: LeaveRequestDTO[]
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const e of events) {
    if (e.category !== 'company') continue;
    out.push({
      id: e.id,
      date: e.date,
      label: `📌 ${e.title || '일정'}`,
      chip: CATEGORY_CHIP.company,
    });
  }
  for (const r of leaves) {
    if (r.status !== 'approved') continue;
    for (const d of eachDate(r.startDate, r.endDate)) {
      out.push({
        id: `leave-${r.id}`,
        date: d,
        label: `🌴 ${r.employeeName || '연차'}`,
        chip: CATEGORY_CHIP.leave,
      });
    }
  }
  return out;
}

/** 'leave-' 접두 id 는 연차(읽기전용) — 회사일정 편집 대상이 아니다. */
export function isLeaveEventId(id: string): boolean {
  return id.startsWith('leave-');
}

export function useScheduleEvents(): CalendarEvent[] {
  const eventsQuery = useEventsQuery();
  const leaveQuery = useLeaveRequestsQuery();
  return useMemo(
    () => buildScheduleEvents(eventsQuery.data ?? [], leaveQuery.data ?? []),
    [eventsQuery.data, leaveQuery.data]
  );
}
