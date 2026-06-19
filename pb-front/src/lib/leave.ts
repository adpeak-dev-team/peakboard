import { getHoliday } from './holidays';

/**
 * 연차 사용 일수 = 시작~종료(포함) 중 토/일/공휴일을 제외한 평일 수.
 * (주말·공휴일은 연차에서 차감하지 않음)
 */
export function countLeaveDays(
  start: string,
  end: string,
  extraHolidays?: Set<string>
): number {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = (end || start).split('-').map(Number);
  if (!ys || !ye) return 0;
  const cur = new Date(ys, ms - 1, ds);
  const last = new Date(ye, me - 1, de);
  let count = 0;
  let guard = 0;
  while (cur <= last && guard < 366) {
    const dow = cur.getDay();
    const dateStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(
      cur.getDate()
    ).padStart(2, '0')}`;
    const isHoliday = !!getHoliday(dateStr) || !!extraHolidays?.has(dateStr);
    if (dow !== 0 && dow !== 6 && !isHoliday) count++;
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return count;
}

/**
 * 입사일 기준 현재 연차 기간(시작 ~ 종료). 입사일 기념일마다 1년씩 갱신.
 * 입사일이 없으면 달력 연도(1/1 ~ 12/31).
 */
export function leavePeriod(
  hireDate: string | null | undefined,
  asOf?: string
): { start: string; end: string } {
  const fmt = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`;

  let ny: number, nm: number, nd: number;
  if (asOf) {
    [ny, nm, nd] = asOf.split('-').map(Number);
  } else {
    const d = new Date();
    [ny, nm, nd] = [d.getFullYear(), d.getMonth() + 1, d.getDate()];
  }
  if (!hireDate) return { start: `${ny}-01-01`, end: `${ny}-12-31` };

  const [, hm, hd] = hireDate.split('-').map(Number);
  // 올해 기념일이 오늘보다 이후면 작년 기념일부터 시작
  const startYear = ny * 10000 + nm * 100 + nd >= ny * 10000 + hm * 100 + hd ? ny : ny - 1;
  const start = new Date(startYear, hm - 1, hd);
  const end = new Date(startYear + 1, hm - 1, hd);
  end.setDate(end.getDate() - 1); // 다음 기념일 하루 전
  return { start: fmt(start), end: fmt(end) };
}

/**
 * 입사일 기준 연차 부여 일수 계산 (대한민국 근로기준법 근사)
 * - 1년 미만: 1개월 개근당 1일 (최대 11일)
 * - 1년 이상: 15일
 * - 3년 이상: 2년마다 +1일 (최대 25일)
 */
export function computeAnnualLeave(hireDate: string | null | undefined, asOf?: string): number {
  if (!hireDate) return 15;
  const start = new Date(hireDate);
  if (Number.isNaN(start.getTime())) return 15;
  const now = asOf ? new Date(asOf) : new Date();

  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) months = 0;

  const fullYears = Math.floor(months / 12);
  if (fullYears < 1) return Math.min(11, months);
  let days = 15;
  if (fullYears >= 3) days += Math.floor((fullYears - 1) / 2);
  return Math.min(25, days);
}
