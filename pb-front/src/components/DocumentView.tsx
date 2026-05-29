'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Trash2, Wifi, WifiOff, Link2, Check } from 'lucide-react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import DocumentEditor from './DocumentEditor';
import { useDocumentQuery } from '@/services/work/documents/queries';
import { useUpdateDocumentMutation } from '@/services/work/documents/mutations';
import { ensureGuestName } from '@/lib/guest';

interface DocumentViewProps {
  documentId: string;
  projectId: string | null;
  onClose: () => void;
  onRequestDelete: (documentId: string) => void;
}

const AUTOSAVE_DELAY = 800;

const HOCUSPOCUS_URL =
  process.env.NEXT_PUBLIC_HOCUSPOCUS_URL ?? 'ws://localhost:1234';

const CARET_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

function colorFromName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CARET_COLORS[h % CARET_COLORS.length];
}

interface PeerUser {
  name: string;
  color: string;
}

export default function DocumentView({
  documentId,
  projectId,
  onClose,
  onRequestDelete,
}: DocumentViewProps) {
  const docQuery = useDocumentQuery(documentId);
  const updateMutation = useUpdateDocumentMutation(projectId);

  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('');

  // 세션 게스트 이름/색 (presence/커서용). 마운트 시 1회 확정.
  const user = useMemo<PeerUser>(() => {
    const name = ensureGuestName() || '게스트';
    return { name, color: colorFromName(name) };
  }, []);

  // ====== 실시간 협업 provider ======
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<PeerUser[]>([]);

  useEffect(() => {
    const p = new HocuspocusProvider({
      url: HOCUSPOCUS_URL,
      name: documentId,
      onStatus: ({ status }) => setConnected(status === 'connected'),
      onAwarenessChange: ({ states }) => {
        const list = states
          .map((s) => (s as { user?: PeerUser }).user)
          .filter((u): u is PeerUser => !!u && !!u.name);
        setPeers(list);
      },
    });
    setProvider(p);
    return () => {
      setProvider(null);
      setConnected(false);
      setPeers([]);
      p.destroy();
    };
  }, [documentId]);

  // ====== 제목/아이콘 REST 자동저장 (본문은 Yjs 가 처리) ======
  const pendingRef = useRef<{ title?: string; icon?: string }>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedDocRef = useRef<string | null>(null);

  const loadedDoc = docQuery.data;

  useEffect(() => {
    if (loadedDoc && syncedDocRef.current !== loadedDoc.id) {
      syncedDocRef.current = loadedDoc.id;
      setTitle(loadedDoc.title);
      setIcon(loadedDoc.icon);
    }
  }, [loadedDoc]);

  const flush = useCallback(() => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (Object.keys(patch).length === 0) return;
    updateMutation.mutate(
      { documentId, patch: { ...patch, updatedByName: user.name } },
      { onError: () => alert('문서 저장에 실패했어요.') }
    );
  }, [documentId, updateMutation, user.name]);

  const scheduleSave = useCallback(
    (patch: { title?: string; icon?: string }) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, AUTOSAVE_DELAY);
    },
    [flush]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleSave({ title: value });
  };

  const handleIconChange = (value: string) => {
    const next = value.slice(0, 4);
    setIcon(next);
    scheduleSave({ icon: next });
  };

  // 본인 제외 참여자 수 (clientId 중복 제거는 awareness 가 관리)
  const otherPeerCount = Math.max(peers.length - 1, 0);

  // task/todo 에 첨부된 문서는 카드 수명에 종속 → 개별 삭제 버튼 숨김
  const isAttached = !!(loadedDoc?.attachedTaskId || loadedDoc?.attachedTodoId);

  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/?doc=${documentId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('아래 링크를 복사하세요.', url);
      return;
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <header className="h-14 border-b flex items-center justify-between px-3 lg:px-6 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3">
          {/* 참여자 아바타 */}
          {peers.length > 0 && (
            <div className="flex -space-x-1.5">
              {peers.slice(0, 5).map((p, i) => (
                <span
                  key={i}
                  title={p.name}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.slice(0, 1).toUpperCase()}
                </span>
              ))}
              {otherPeerCount > 0 && (
                <span className="text-xs text-gray-400 self-center pl-2">
                  {otherPeerCount}명과 함께 편집 중
                </span>
              )}
            </div>
          )}

          <span
            className="text-xs flex items-center gap-1"
            title={connected ? '실시간 연결됨' : '연결 끊김'}
          >
            {connected ? (
              <Wifi className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-gray-400" />
            )}
          </span>

          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            aria-label="링크 복사"
            title="이 문서로 바로 가는 링크 복사"
          >
            {linkCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                복사됨
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5" />
                링크 복사
              </>
            )}
          </button>

          {!isAttached && (
            <button
              onClick={() => onRequestDelete(documentId)}
              className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
              aria-label="문서 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {docQuery.isLoading || !provider ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-sm">
            문서 불러오는 중…
          </div>
        ) : docQuery.isError ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">
            문서를 불러오지 못했어요.
          </div>
        ) : loadedDoc ? (
          <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-8 pb-28">
            <div className="flex items-start gap-2 mb-2">
              <input
                value={icon}
                onChange={(e) => handleIconChange(e.target.value)}
                placeholder="📄"
                aria-label="문서 아이콘(이모지)"
                className="w-12 text-3xl text-center bg-transparent focus:outline-none"
              />
            </div>
            <input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="제목 없음"
              className="w-full text-3xl font-bold text-gray-800 bg-transparent focus:outline-none placeholder:text-gray-300 mb-4"
            />
            <DocumentEditor key={documentId} provider={provider} user={user} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
