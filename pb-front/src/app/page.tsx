'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table2, CalendarDays, ListTodo } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import AppShell, { type NavKey } from '@/components/AppShell';
import BoardView from '@/components/BoardView';
import DevBoardView from '@/components/DevBoardView';
import ScheduleView from '@/components/ScheduleView';
import MembersView from '@/components/MembersView';
import HomeDashboard from '@/components/HomeDashboard';
import LeaveAdminView from '@/components/LeaveAdminView';
import { useBoardsQuery } from '@/services/work/boards/queries';
import { useEmployeesQuery } from '@/services/work/employees/queries';
import { fetchBoardItems } from '@/services/work/boardItems/api';
import { workQueryKeys } from '@/services/work/type';

type ViewMode = 'table' | 'calendar';

const BOARD_SESSION_KEY = 'peakboard:activeBoardId';
const ME_KEY = 'peakboard:meId';

export default function PeakBoard() {
  const [nav, setNav] = useState<NavKey>('home');
  const [view, setView] = useState<ViewMode>('calendar');
  const [devView, setDevView] = useState<'calendar' | 'manage'>('calendar');
  // 세션에 저장된 선택을 초기값으로 복원 (SSR 안전)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : sessionStorage.getItem(BOARD_SESSION_KEY)
  );

  const boardsQuery = useBoardsQuery();
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

  // 대시보드 계정 선택 (헤더 우측)
  const employeesQuery = useEmployeesQuery();
  const employees = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data]);
  const [meId, setMeId] = useState<string>(() =>
    typeof window === 'undefined' ? '' : sessionStorage.getItem(ME_KEY) ?? ''
  );
  const me = employees.find((e) => e.id === meId) ?? employees[0] ?? null;
  const selectMe = (id: string) => {
    setMeId(id);
    if (typeof window !== 'undefined') sessionStorage.setItem(ME_KEY, id);
  };

  // 모든 보드의 아이템을 미리 조회 (사이드바 카운트 + 일정관리 통합 캘린더용).
  // BoardView 의 useBoardItemsQuery 와 같은 쿼리키라 중복 요청 없이 캐시 공유.
  const itemQueries = useQueries({
    queries: boards.map((b) => ({
      queryKey: workQueryKeys.boardItems(b.id),
      queryFn: () => fetchBoardItems(b.id),
    })),
  });

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    boards.forEach((b, i) => {
      map[b.id] = itemQueries[i]?.data?.length ?? 0;
    });
    return map;
  }, [boards, itemQueries]);

  // 유효한 선택이 없으면 첫 보드로 폴백 (렌더 중 파생)
  const activeBoardId =
    selectedBoardId && boards.some((b) => b.id === selectedBoardId)
      ? selectedBoardId
      : boards[0]?.id ?? null;

  useEffect(() => {
    if (activeBoardId) sessionStorage.setItem(BOARD_SESSION_KEY, activeBoardId);
  }, [activeBoardId]);

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null;

  const header =
    nav === 'projects' ? (
      <div className="flex items-center justify-between w-full gap-3">
        <h1 className="text-base font-bold text-gray-800 truncate">
          {activeBoard ? activeBoard.name : '프로젝트관리'}
        </h1>
        {/* 영상팀: 달력형 / 프로젝트 관리(엑셀형) */}
        {activeBoard?.teamType === 'video' && (
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 shrink-0">
            <ToggleButton active={view === 'calendar'} onClick={() => setView('calendar')}>
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">일정 관리</span>
            </ToggleButton>
            <ToggleButton active={view === 'table'} onClick={() => setView('table')}>
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">프로젝트 관리</span>
            </ToggleButton>
          </div>
        )}
        {/* 개발팀: 달력형/프로젝트 관리 */}
        {activeBoard?.teamType === 'dev' && (
          <div className="flex items-center bg-gray-100 rounded-md p-0.5 shrink-0">
            <ToggleButton active={devView === 'calendar'} onClick={() => setDevView('calendar')}>
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">일정 관리</span>
            </ToggleButton>
            <ToggleButton active={devView === 'manage'} onClick={() => setDevView('manage')}>
              <ListTodo className="w-4 h-4" />
              <span className="hidden sm:inline">프로젝트 관리</span>
            </ToggleButton>
          </div>
        )}
      </div>
    ) : nav === 'home' ? (
      <div className="flex items-center justify-between w-full gap-3">
        <h1 className="text-base font-bold text-gray-800">대시보드</h1>
        <div className="flex items-center gap-2 shrink-0">
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
      </div>
    ) : (
      <h1 className="text-base font-bold text-gray-800">
        {nav === 'members' ? '회원관리' : nav === 'leave' ? '연차관리' : '일정관리'}
      </h1>
    );

  return (
    <AppShell
      nav={nav}
      onNavChange={setNav}
      boards={boards}
      activeBoardId={activeBoardId}
      onSelectBoard={setSelectedBoardId}
      counts={counts}
      header={header}
    >
      {nav === 'home' ? (
        <HomeDashboard me={me} />
      ) : nav === 'members' ? (
        <MembersView />
      ) : nav === 'leave' ? (
        <LeaveAdminView />
      ) : nav === 'schedule' ? (
        <ScheduleView />
      ) : boardsQuery.isLoading ? (
        <div className="text-sm text-gray-400 py-10 text-center">보드 불러오는 중…</div>
      ) : activeBoard ? (
        activeBoard.teamType === 'dev' ? (
          <DevBoardView board={activeBoard} view={devView} />
        ) : (
          <BoardView board={activeBoard} view={view} />
        )
      ) : (
        <div className="text-sm text-gray-400 py-10 text-center">보드가 없습니다.</div>
      )}
    </AppShell>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        active ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
}
