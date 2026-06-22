'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  FolderKanban,
  CalendarDays,
  Users,
  LayoutDashboard,
  CalendarCheck,
  Menu,
  X,
} from 'lucide-react';
import type { BoardDTO } from '@/services/work/type';

export type NavKey = 'home' | 'projects' | 'schedule' | 'members' | 'leave';

interface AppShellProps {
  nav: NavKey;
  onNavChange: (key: NavKey) => void;
  boards: BoardDTO[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  counts: Record<string, number>;
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({
  nav,
  onNavChange,
  boards,
  activeBoardId,
  onSelectBoard,
  counts,
  header,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // 모바일 슬라이드
  const [collapsed, setCollapsed] = useState(false); // 데스크톱 접기

  const closeSidebar = () => {
    setSidebarOpen(false);
    setCollapsed(true);
  };

  const sidebar = (
    <aside
      className={`w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0
        fixed inset-y-0 left-0 z-40 transition-transform duration-300
        ${collapsed ? 'lg:hidden' : 'lg:static lg:translate-x-0'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <CheckCircle2 className="w-6 h-6 text-indigo-400 mr-2" />
        <span className="text-white font-bold text-lg tracking-wide">PeakBoard</span>
        <button
          className="ml-auto text-gray-400 hover:text-white"
          onClick={closeSidebar}
          aria-label="사이드바 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <button
          onClick={() => {
            onNavChange('home');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left
            ${nav === 'home' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
        >
          <LayoutDashboard className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">홈</span>
        </button>

        <p className="px-3 pt-6 pb-1 text-xs uppercase tracking-wider text-gray-500">관리자</p>
        <button
          onClick={() => {
            onNavChange('members');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left
            ${nav === 'members' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
        >
          <Users className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">회원관리</span>
        </button>
        <button
          onClick={() => {
            onNavChange('leave');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left
            ${nav === 'leave' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
        >
          <CalendarCheck className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">연차관리</span>
        </button>
        <button
          onClick={() => {
            onNavChange('schedule');
            setSidebarOpen(false);
          }}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left
            ${nav === 'schedule' ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
        >
          <CalendarDays className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">일정관리</span>
        </button>
        

        <p className="px-3 pt-6 pb-1 text-xs uppercase tracking-wider text-gray-500">작업</p>
        {boards.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500">보드가 없습니다.</p>
        ) : (
          boards.map((b) => {
            const active = nav === 'projects' && b.id === activeBoardId;
            return (
              <button
                key={b.id}
                onClick={() => {
                  onNavChange('projects');
                  onSelectBoard(b.id);
                  setSidebarOpen(false);
                }}
                className={`group w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left
                  ${active ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              >
                <FolderKanban className="w-4 h-4 mr-2 shrink-0" />
                <span className="truncate flex-1">{b.name}</span>
                <span className="ml-2 text-xs text-gray-500 shrink-0">{counts[b.id] ?? 0}</span>
              </button>
            );
          })
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            U
          </div>
          <div className="ml-3">
            <p className="text-sm text-white font-medium">Workspace</p>
            <p className="text-xs text-gray-400">사무실 공용</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {sidebar}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-3 px-4 lg:px-6 shrink-0">
          {/* 메뉴 열기 버튼: 사이드바가 닫혀있을 때 표시 (모바일 닫힘 또는 데스크톱 접힘) */}
          <button
            className={`text-gray-600 hover:text-gray-900 ${collapsed ? 'block' : 'lg:hidden'}`}
            onClick={() => {
              setSidebarOpen(true);
              setCollapsed(false);
            }}
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
          {header}
        </header>
        <div className="flex-1 overflow-auto p-6 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
