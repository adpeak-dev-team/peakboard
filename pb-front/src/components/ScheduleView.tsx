'use client';

import { useState } from 'react';
import { Trash2, Check } from 'lucide-react';
import Modal from './Modal';
import BoardCalendarView from './BoardCalendarView';
import { BOARD_CONFIG } from '@/lib/boardConfig';
import { useScheduleEvents, isLeaveEventId } from '@/lib/calendarEvents';
import type { EventCategory, EventDTO } from '@/services/work/type';
import { useEventsQuery } from '@/services/work/events/queries';
import {
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} from '@/services/work/events/mutations';

// 회사 일정/공휴일 추가/편집 대상
type EditTarget = { mode: 'add'; date: string } | { mode: 'edit'; event: EventDTO };

export default function ScheduleView() {
  const eventsQuery = useEventsQuery();
  const events = eventsQuery.data ?? [];
  const calendarEvents = useScheduleEvents();
  const createEvent = useCreateEventMutation();
  const updateEvent = useUpdateEventMutation();
  const deleteEvent = useDeleteEventMutation();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  return (
    <>
      {/* 일정관리: 회사 일정 + 공휴일(직접 추가) + 승인된 연차(자동) */}
      <BoardCalendarView
        getConfig={() => BOARD_CONFIG.dev}
        items={[]}
        events={calendarEvents}
        onEventClick={(id) => {
          if (isLeaveEventId(id)) return; // 연차는 연차관리에서만 관리
          const ev = events.find((e) => e.id === id);
          if (ev) setEditTarget({ mode: 'edit', event: ev });
        }}
        onAddOnDate={(date) => {
          // 그 날짜에 추가된 공휴일이 있으면 편집, 없으면 새로 추가
          const holiday = events.find((e) => e.category === 'holiday' && e.date === date);
          setEditTarget(holiday ? { mode: 'edit', event: holiday } : { mode: 'add', date });
        }}
        onPatch={() => undefined}
        onDelete={() => undefined}
      />

      {editTarget && (
        <EventModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onCreate={(date, category, title) =>
            createEvent.mutate(
              { date, category, title },
              { onError: () => alert('추가에 실패했어요.') }
            )
          }
          onUpdate={(id, date, category, title) =>
            updateEvent.mutate(
              { id, patch: { date, category, title } },
              { onError: () => alert('수정에 실패했어요.') }
            )
          }
          onDelete={(id) =>
            deleteEvent.mutate({ id }, { onError: () => alert('삭제에 실패했어요.') })
          }
        />
      )}
    </>
  );
}

function EventModal({
  target,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  target: EditTarget;
  onClose: () => void;
  onCreate: (date: string, category: EventCategory, title: string) => void;
  onUpdate: (id: string, date: string, category: EventCategory, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const initial =
    target.mode === 'edit'
      ? target.event
      : { date: target.date, category: 'company' as EventCategory, title: '' };
  const [category, setCategory] = useState<EventCategory>(
    initial.category === 'holiday' ? 'holiday' : 'company'
  );
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);

  const inputCls =
    'w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400';
  const isHoliday = category === 'holiday';

  const save = () => {
    if (!date) return;
    if (target.mode === 'add') onCreate(date, category, title);
    else onUpdate(target.event.id, date, category, title);
    onClose();
  };

  return (
    <Modal open title={target.mode === 'add' ? '일정 추가' : '일정 편집'} onClose={onClose} width="max-w-sm">
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">구분</label>
          <select
            className={`${inputCls} cursor-pointer`}
            value={category}
            onChange={(e) => setCategory(e.target.value as EventCategory)}
          >
            <option value="company">회사 일정</option>
            <option value="holiday">공휴일</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">
            {isHoliday ? '공휴일명' : '일정명'}
          </label>
          <input
            autoFocus
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
            placeholder={isHoliday ? '예) 창립기념일' : '예) 전사 워크샵'}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-0.5">날짜</label>
          <input
            type="date"
            className={`${inputCls} cursor-pointer`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-5">
        {target.mode === 'edit' ? (
          <button
            onClick={() => {
              onDelete(target.event.id);
              onClose();
            }}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />삭제
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
        >
          <Check className="w-4 h-4" />저장
        </button>
      </div>
    </Modal>
  );
}
