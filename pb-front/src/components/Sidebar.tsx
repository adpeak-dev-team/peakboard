'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Plus, FolderKanban, Folder as FolderIcon, X, Pencil, Trash2 } from 'lucide-react';
import type { Folder, Project } from '@/lib/types';

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  folders: Folder[];
  onAddProject: (name: string) => void;
  onSelectProject: (id: string) => void;
  onAddFolder: () => void;
  onSelectFolder: (id: string) => void;
  onRenameProject?: (id: string, name: string) => void;
  onDeleteProject?: (id: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  projects,
  activeProjectId,
  folders,
  onAddProject,
  onSelectProject,
  onAddFolder,
  onSelectFolder,
  onRenameProject,
  onDeleteProject,
  onRenameFolder,
  onDeleteFolder,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<{ kind: 'project' | 'folder'; id: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) { setAdding(false); return; }
    onAddProject(trimmed);
    setName('');
    setAdding(false);
  };

  const submitRename = () => {
    const trimmed = editingName.trim();
    if (trimmed && editingId?.kind === 'project') onRenameProject?.(editingId.id, trimmed);
    if (trimmed && editingId?.kind === 'folder') onRenameFolder?.(editingId.id, trimmed);
    setEditingId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const startEdit = (kind: 'project' | 'folder', id: string, currentName: string) => {
    setEditingId({ kind, id });
    setEditingName(currentName);
  };

  return (
    <aside
      className={`w-64 bg-gray-900 text-gray-300 flex flex-col shrink-0
        fixed inset-y-0 left-0 z-40 transition-transform duration-300
        lg:static lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <CheckCircle2 className="w-6 h-6 text-indigo-400 mr-2" />
        <span className="text-white font-bold text-lg tracking-wide">PeakBoard</span>
        <button
          className="ml-auto lg:hidden text-gray-400 hover:text-white"
          onClick={onClose}
          aria-label="사이드바 닫기"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pt-4">
        {adding ? (
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={submit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') { setName(''); setAdding(false); }
            }}
            placeholder="프로젝트 이름"
            className="w-full px-3 py-2 bg-gray-800 text-white text-sm rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-gray-500"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            프로젝트 추가
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pt-2 pb-1 text-xs uppercase tracking-wider text-gray-500">프로젝트</p>

        {projects.length === 0 && !adding ? (
          <p className="px-3 py-2 text-xs text-gray-500">아직 프로젝트가 없습니다.</p>
        ) : (
          projects.map((p) => {
            const active = p.id === activeProjectId;
            const isEditing = editingId?.kind === 'project' && editingId.id === p.id;
            return (
              <div
                key={p.id}
                className={`group flex items-center px-3 py-2 rounded-lg text-sm transition-colors
                  ${active ? 'bg-gray-800 text-white' : 'hover:bg-gray-800 hover:text-white'}`}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="flex-1 px-2 py-0.5 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      className="flex-1 flex items-center min-w-0 text-left"
                      onClick={() => onSelectProject(p.id)}
                    >
                      <FolderKanban className="w-4 h-4 mr-2 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </button>
                    <span className="ml-2 text-xs text-gray-500 group-hover:hidden shrink-0">
                      {p.tasks.length}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-0.5 ml-2 shrink-0">
                      <button
                        onClick={() => startEdit('project', p.id, p.name)}
                        className="p-1 rounded text-gray-400 hover:text-white"
                        aria-label="이름 수정"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onDeleteProject?.(p.id)}
                        className="p-1 rounded text-gray-400 hover:text-red-400"
                        aria-label="삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}

        <div className="flex items-center justify-between px-3 pt-6 pb-1">
          <p className="text-xs uppercase tracking-wider text-gray-500">폴더</p>
          <button
            type="button"
            onClick={onAddFolder}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded"
            aria-label="폴더 추가"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {folders.length === 0 ? (
          <p className="px-3 py-2 text-xs text-gray-500">폴더가 없습니다.</p>
        ) : (
          folders.map((f) => {
                const isEditing = editingId?.kind === 'folder' && editingId.id === f.id;
                return (
                  <div
                    key={f.id}
                    className="group flex items-center px-3 py-2 rounded-lg text-sm transition-colors hover:bg-gray-800 hover:text-white"
                  >
                    {isEditing ? (
                      <input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 px-2 py-0.5 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:outline-none"
                      />
                    ) : (
                      <>
                        <button
                          className="flex-1 flex items-center min-w-0 text-left"
                          onClick={() => onSelectFolder(f.id)}
                        >
                          <FolderIcon className="w-4 h-4 mr-2 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </button>
                        <span className="ml-2 text-xs text-gray-500 group-hover:hidden shrink-0">
                          {f.todos.length}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-2 shrink-0">
                          <button
                            onClick={() => startEdit('folder', f.id, f.name)}
                            className="p-1 rounded text-gray-400 hover:text-white"
                            aria-label="이름 수정"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteFolder?.(f.id)}
                            className="p-1 rounded text-gray-400 hover:text-red-400"
                            aria-label="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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
}
