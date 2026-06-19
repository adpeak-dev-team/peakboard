/** 셀/배지 색상 팔레트 (값별 색상 지정용) */
export interface CellColor {
  key: string;
  label: string;
  cls: string; // 셀 배경+글자 클래스
  dot: string; // 팔레트 표시용 스와치
}

export const CELL_COLORS: CellColor[] = [
  { key: 'sky', label: '하늘', cls: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400' },
  { key: 'blue', label: '파랑', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { key: 'teal', label: '청록', cls: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  { key: 'green', label: '초록', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { key: 'amber', label: '주황', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  { key: 'orange', label: '오렌지', cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  { key: 'rose', label: '빨강', cls: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  { key: 'pink', label: '분홍', cls: 'bg-pink-100 text-pink-700', dot: 'bg-pink-500' },
  { key: 'purple', label: '보라', cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { key: 'violet', label: '바이올렛', cls: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  { key: 'indigo', label: '인디고', cls: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  { key: 'gray', label: '회색', cls: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400' },
];

/** cls → 스와치 dot 클래스 (없으면 회색) */
export function swatchOf(cls: string): string {
  return CELL_COLORS.find((c) => c.cls === cls)?.dot ?? 'bg-gray-300';
}
