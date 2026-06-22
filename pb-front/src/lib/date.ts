/** Date 를 'YYYY-MM-DD' 로 (로컬 기준) */
export function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** 오늘 날짜를 'YYYY-MM-DD' 로 반환 (로컬 기준) */
export function todayStr(): string {
  return formatYmd(new Date());
}
