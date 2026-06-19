'use client';

import { useMemo, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import VideoManageView from './VideoManageView';
import TeamCalendarView from './TeamCalendarView';
import { BOARD_CONFIG } from '@/lib/boardConfig';
import { useScheduleEvents } from '@/lib/calendarEvents';
import type { BoardDTO, BoardItemPatch } from '@/services/work/type';
import { useBoardItemsQuery } from '@/services/work/boardItems/queries';
import {
  useCreateBoardItemMutation,
  useUpdateBoardItemMutation,
  useDeleteBoardItemMutation,
  useReorderBoardItemsMutation,
} from '@/services/work/boardItems/mutations';
import { useEmployeesQuery } from '@/services/work/employees/queries';

interface BoardViewProps {
  board: BoardDTO;
  view: 'table' | 'calendar';
}

export default function BoardView({ board, view }: BoardViewProps) {
  const config = BOARD_CONFIG[board.teamType];
  const itemsQuery = useBoardItemsQuery(board.id);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const calendarEvents = useScheduleEvents();
  const employeesQuery = useEmployeesQuery();
  // 영상팀 일정관리 패널에는 영상팀 직원만 표시
  const employees = (employeesQuery.data ?? []).filter((e) => e.department === '영상팀');

  const createMutation = useCreateBoardItemMutation();
  const updateMutation = useUpdateBoardItemMutation();
  const deleteMutation = useDeleteBoardItemMutation();
  const reorderMutation = useReorderBoardItemsMutation();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 작업자 필터
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const assignees = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const a = it.assignee.trim();
      if (a) set.add(a);
    }
    return [...set].sort();
  }, [items]);
  const employeeNames = useMemo(() => employees.map((e) => e.name), [employees]);
  const calendarItems = assigneeFilter
    ? items.filter((it) => it.assignee.trim() === assigneeFilter)
    : items;

  const handleCreate = (groupKey: string, eventDate?: string) => {
    createMutation.mutate(
      { boardId: board.id, groupKey, eventDate },
      { onError: () => alert('행 추가에 실패했어요.') }
    );
  };

  // 일정관리 달력에서: 작업자 선택 + 제목으로 추가
  const handleCreateTask = (input: { title: string; assignee: string; eventDate: string }) => {
    createMutation.mutate(
      {
        boardId: board.id,
        groupKey: config.groups[0],
        title: input.title,
        assignee: input.assignee,
        eventDate: input.eventDate,
      },
      { onError: () => alert('작업 추가에 실패했어요.') }
    );
  };

  const handlePatch = (itemId: string, patch: BoardItemPatch) => {
    updateMutation.mutate(
      { itemId, boardId: board.id, patch },
      { onError: () => alert('수정에 실패했어요.') }
    );
  };

  const handleDelete = (itemId: string) => {
    deleteMutation.mutate(
      { itemId, boardId: board.id },
      { onError: () => alert('삭제에 실패했어요.') }
    );
  };

  const handleReorder = (groupKey: string, orderedIds: string[]) => {
    reorderMutation.mutate(
      { boardId: board.id, groupKey, orderedIds },
      { onError: () => alert('순서 변경에 실패했어요.') }
    );
  };

  if (itemsQuery.isLoading) {
    return <div className="text-sm text-gray-400 py-10 text-center">불러오는 중…</div>;
  }

  return (
    <>
      {view === 'table' ? (
        <VideoManageView
          config={config}
          boardId={board.id}
          items={items}
          onCreate={handleCreate}
          onPatch={handlePatch}
          onDelete={(id) => setDeletingId(id)}
          onReorder={handleReorder}
        />
      ) : (
        <TeamCalendarView
          board={board}
          items={calendarItems}
          events={calendarEvents}
          getLabel={(it) => it.title || it.fields.company || it.fields.customer || '항목'}
          panelLabelOf={(it) => it.title || it.fields.company || it.fields.customer || '항목'}
          panelTagOf={() => ''}
          readOnlyItems
          itemDisplay="dot"
          itemDotColor="bg-indigo-500"
          itemSummaryBy={
            assigneeFilter ? undefined : (it) => it.assignee.trim() || '미지정'
          }
          panelGroups={employeeNames}
          onPanelAdd={(name, date, title) =>
            handleCreateTask({ title, assignee: name, eventDate: date })
          }
          onPanelDelete={(id) => setDeletingId(id)}
          calendarHeaderRight={
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">전체 작업자</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          }
          onPatch={(item, patch) => handlePatch(item.id, patch)}
          onDelete={(item) => setDeletingId(item.id)}
        />
      )}

      <ConfirmModal
        open={!!deletingId}
        title="행 삭제"
        message="삭제된 데이터는 복구할 수 없습니다."
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
        }}
        onClose={() => setDeletingId(null)}
      />
    </>
  );
}

