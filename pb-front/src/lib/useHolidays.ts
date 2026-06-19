import { useMemo } from 'react';
import { useEventsQuery } from '@/services/work/events/queries';

/** 일정관리에서 추가한 공휴일(company_events category='holiday') 맵: 날짜 → 이름 */
export function useCustomHolidayMap(): Map<string, string> {
  const eventsQuery = useEventsQuery();
  return useMemo(() => {
    const map = new Map<string, string>();
    for (const e of eventsQuery.data ?? []) {
      if (e.category === 'holiday') map.set(e.date, e.title || '공휴일');
    }
    return map;
  }, [eventsQuery.data]);
}
