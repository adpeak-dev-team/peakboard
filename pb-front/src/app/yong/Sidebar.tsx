'use client';

import { useState } from 'react';
import { Menu, X, Home, Settings, Users, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { icon: Home, label: '홈' },
  { icon: Users, label: '사용자' },
  { icon: FileText, label: '문서' },
  { icon: Settings, label: '설정' },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* 모바일 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200
          transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* 사이드바 헤더 */}
        <div className={`flex items-center h-14 border-b border-gray-200 px-3 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <span className="text-base font-semibold text-gray-800 truncate">Peakboard</span>
          )}
          <div className="flex items-center gap-1">
            {/* 모바일 닫기 버튼 */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
            {/* 데스크톱 접기 버튼 */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className={`
                w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-gray-600
                hover:text-gray-900 hover:bg-gray-100 transition-colors
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* 사이드바 푸터 */}
        {!collapsed && (
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
                Y
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">Yong</p>
                <p className="text-xs text-gray-400 truncate">yong@example.com</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 모바일 탑바 */}
        <header className="lg:hidden flex items-center h-14 px-4 bg-white border-b border-gray-200 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 text-base font-semibold text-gray-800">Peakboard</span>
        </header>

        {/* 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
