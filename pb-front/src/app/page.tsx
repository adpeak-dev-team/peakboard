'use client';

import { useEffect, useMemo, useState } from 'react';
import { Table2, CalendarDays, ListTodo, LogOut } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import AppShell, { type NavKey } from '@/components/AppShell';
import BoardView from '@/components/BoardView';
import DevBoardView from '@/components/DevBoardView';
import ScheduleView from '@/components/ScheduleView';
import MembersView from '@/components/MembersView';
import HomeDashboard from '@/components/HomeDashboard';
import LeaveAdminView from '@/components/LeaveAdminView';
import MyPageModal from '@/components/MyPageModal';
import { useBoardsQuery } from '@/services/work/boards/queries';
import { fetchBoardItems } from '@/services/work/boardItems/api';
import { workQueryKeys } from '@/services/work/type';
import { useAuth } from '@/services/auth/AuthProvider';
import { logout } from '@/services/auth/api';

type ViewMode = 'table' | 'calendar';

const BOARD_SESSION_KEY = 'peakboard:activeBoardId';

export default function PeakBoard() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const me = user?.employee ?? null;

  const [nav, setNav] = useState<NavKey>('home');
  const [view, setView] = useState<ViewMode>('calendar');
  const [devView, setDevView] = useState<'calendar' | 'manage'>('calendar');
  const [myPageOpen, setMyPageOpen] = useState(false);
  // 세션에 저장된 선택을 초기값으로 복원 (SSR 안전)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : sessionStorage.getItem(BOARD_SESSION_KEY)
  );

  const boardsQuery = useBoardsQuery();
  const boards = useMemo(() => boardsQuery.data ?? [], [boardsQuery.data]);

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

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/auth/login';
    }
  };

  // 인증 확인 중 → 로더
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center text-sm text-gray-400">
        불러오는 중…
      </div>
    );
  }

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
    ) : (
      <div className="flex items-center justify-between w-full gap-3">
        <h1 className="text-base font-bold text-gray-800">
          {nav === 'home'
            ? '대시보드'
            : nav === 'members'
            ? '회원관리'
            : nav === 'leave'
            ? '연차관리'
            : '일정관리'}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <button
                onClick={() => setMyPageOpen(true)}
                title="마이페이지"
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <span className="w-8 h-8 rounded-full overflow-hidden bg-linear-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {me?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={me.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (user.name || user.email || '?').charAt(0)
                  )}
                </span>
                <span className="text-right leading-tight hidden sm:block">
                  <span className="block text-sm font-semibold text-gray-800">{user.name}</span>
                  <span className="block text-[11px] text-gray-400">
                    {[me?.department, isAdmin ? '관리자' : null].filter(Boolean).join(' · ') || '일반'}
                  </span>
                </span>
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </>
          ) : (
            <a
              href="/auth/login"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-50"
            >
              로그인
            </a>
          )}
        </div>
      </div>
    );

  return (
    <>
    <AppShell
      nav={nav}
      onNavChange={setNav}
      boards={boards}
      activeBoardId={activeBoardId}
      onSelectBoard={setSelectedBoardId}
      counts={counts}
      header={header}
      isAdmin={isAdmin}
    >
      {nav === 'home' ? (
        <HomeDashboard me={me} isAdmin={isAdmin} />
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
    {myPageOpen && user && <MyPageModal user={user} onClose={() => setMyPageOpen(false)} />}
    </>
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
