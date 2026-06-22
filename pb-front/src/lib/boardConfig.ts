import type { BoardItemDTO, BoardItemPatch } from '@/services/work/type';

export type TeamType = 'video' | 'dev';

// 컬럼 값의 출처. 공통 컬럼은 board_item 본체에, 'field' 는 fields JSON 에 저장.
export type ColumnSource =
  | 'groupKey'
  | 'title'
  | 'eventDate'
  | 'assignee'
  | 'notes'
  | 'field';

export type ColumnKind = 'text' | 'select' | 'date' | 'longtext';

export interface ColumnDef {
  /** field 출처일 때 fields[key] 의 키. 공통 출처면 식별용. */
  key: string;
  label: string;
  kind: ColumnKind;
  source: ColumnSource;
  options?: string[];
  /** select 값별 셀 색상 (Tailwind 클래스) */
  optionColors?: Record<string, string>;
  width: number; // px
}

// 셀 색상 팔레트
const C = {
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-teal-100 text-teal-700',
  rose: 'bg-rose-100 text-rose-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  violet: 'bg-violet-100 text-violet-700',
  orange: 'bg-orange-100 text-orange-700',
  gray: 'bg-gray-100 text-gray-500',
};

export interface BoardConfig {
  groups: string[]; // 섹션(분류/상태) 순서 = group_key 후보
  /** 섹션별 색상 (section/칩/도트) */
  groupColors: Record<string, { section: string; chip: string; dot: string }>;
  /** 캘린더 칩에 표시할 컬럼 key */
  calendarLabelKey: string;
  columns: ColumnDef[];
}

const VIDEO_GROUPS = ['작업중', '자료대기', '보류'];
const DEV_GROUPS = ['해야할일', '진행중', '완료'];

export const BOARD_CONFIG: Record<TeamType, BoardConfig> = {
  video: {
    groups: VIDEO_GROUPS,
    groupColors: {
      작업중: { section: 'bg-blue-50 border-blue-400', chip: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
      자료대기: { section: 'bg-amber-50 border-amber-400', chip: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
      보류: { section: 'bg-gray-100 border-gray-400', chip: 'bg-gray-200 text-gray-600 border-gray-300', dot: 'bg-gray-400' },
    },
    calendarLabelKey: 'company',
    columns: [
      { key: 'groupKey', label: '분류', kind: 'select', source: 'groupKey', options: VIDEO_GROUPS, optionColors: { 작업중: C.blue, 자료대기: C.amber, 보류: C.gray }, width: 96 },
      { key: 'type', label: '구분', kind: 'select', source: 'field', options: ['신규', '현장변경', 'LMS', '시안변경'], optionColors: { 신규: C.sky, 현장변경: C.amber, LMS: C.teal, 시안변경: C.rose }, width: 96 },
      { key: 'brand', label: '브랜드', kind: 'select', source: 'field', options: ['탑', '위드', '리치'], optionColors: { 탑: C.blue, 위드: C.green, 리치: C.purple }, width: 80 },
      { key: 'eventDate', label: '날짜', kind: 'date', source: 'eventDate', width: 130 },
      { key: 'company', label: '업체명', kind: 'text', source: 'field', width: 120 },
      { key: 'customer', label: '고객명', kind: 'text', source: 'field', width: 120 },
      { key: 'pm', label: 'PM', kind: 'text', source: 'field', width: 80 },
      { key: 'confirm1', label: '컨펌①', kind: 'select', source: 'field', options: ['컨펌대기', '작업중', '완료', '미정'], optionColors: { 컨펌대기: C.rose, 작업중: C.amber, 완료: C.green, 미정: C.gray }, width: 96 },
      { key: 'material', label: '자료유형', kind: 'select', source: 'field', options: ['자료+영상', '자료만', '영상재촬영'], optionColors: { '자료+영상': C.violet, 자료만: C.orange, 영상재촬영: C.rose }, width: 110 },
      { key: 'work1', label: '작업①', kind: 'select', source: 'field', options: ['작업중', '작업완료'], optionColors: { 작업중: C.orange, 작업완료: C.blue }, width: 96 },
      { key: 'work2', label: '작업②', kind: 'select', source: 'field', options: ['작업중', '작업완료'], optionColors: { 작업중: C.orange, 작업완료: C.blue }, width: 96 },
      { key: 'confirm2', label: '컨펌②', kind: 'select', source: 'field', options: ['컨펌대기', '컨펌완료'], optionColors: { 컨펌대기: C.rose, 컨펌완료: C.purple }, width: 96 },
      { key: 'live', label: '라이브', kind: 'select', source: 'field', options: ['라이브완료', '라이브요청', 'lms발송'], optionColors: { 라이브완료: C.blue, 라이브요청: C.rose, 'lms발송': C.teal }, width: 110 },
      { key: 'assignee', label: '작업자', kind: 'select', source: 'assignee', width: 110 },
      { key: 'output', label: '산출물', kind: 'select', source: 'field', options: ['영상', '프리미엄 lms'], optionColors: { 영상: C.gray, '프리미엄 lms': C.rose }, width: 110 },
      { key: 'notes', label: '비고', kind: 'longtext', source: 'notes', width: 200 },
    ],
  },
  dev: {
    groups: DEV_GROUPS,
    groupColors: {
      해야할일: { section: 'bg-gray-100 border-gray-400', chip: 'bg-gray-200 text-gray-600 border-gray-300', dot: 'bg-gray-400' },
      진행중: { section: 'bg-blue-50 border-blue-400', chip: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
      완료: { section: 'bg-green-50 border-green-400', chip: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
    },
    calendarLabelKey: 'title',
    columns: [
      { key: 'groupKey', label: '상태', kind: 'select', source: 'groupKey', options: DEV_GROUPS, width: 110 },
      { key: 'title', label: '할 일', kind: 'text', source: 'title', width: 280 },
      { key: 'eventDate', label: '날짜', kind: 'date', source: 'eventDate', width: 130 },
      { key: 'assignee', label: '담당자', kind: 'text', source: 'assignee', width: 110 },
      { key: 'notes', label: '비고', kind: 'longtext', source: 'notes', width: 240 },
    ],
  },
};

/** 컬럼 정의에 해당하는 현재 값을 아이템에서 읽는다. */
export function getColumnValue(item: BoardItemDTO, col: ColumnDef): string {
  switch (col.source) {
    case 'groupKey':
      return item.groupKey;
    case 'title':
      return item.title;
    case 'eventDate':
      return item.eventDate ?? '';
    case 'assignee':
      return item.assignee;
    case 'notes':
      return item.notes;
    case 'field':
      return item.fields[col.key] ?? '';
  }
}

/** 컬럼 값 변경을 PATCH 입력으로 변환한다. (field 는 기존 fields 와 병합) */
export function buildColumnPatch(
  item: BoardItemDTO,
  col: ColumnDef,
  value: string
): BoardItemPatch {
  switch (col.source) {
    case 'groupKey':
      return { groupKey: value };
    case 'title':
      return { title: value };
    case 'eventDate':
      return { eventDate: value || null };
    case 'assignee':
      return { assignee: value };
    case 'notes':
      return { notes: value };
    case 'field':
      return { fields: { ...item.fields, [col.key]: value } };
  }
}

/** 캘린더 칩 라벨 텍스트 */
export function getCalendarLabel(item: BoardItemDTO, config: BoardConfig): string {
  const col = config.columns.find((c) => c.key === config.calendarLabelKey);
  const label = col ? getColumnValue(item, col) : '';
  return label || item.title || '(제목 없음)';
}
