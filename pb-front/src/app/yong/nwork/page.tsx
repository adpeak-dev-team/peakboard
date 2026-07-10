'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Search, X } from 'lucide-react';
import {
    fetchNworkList,
    updateNwork,
    type NworkPatch,
    type NworkRow,
} from '@/services/yong/nwork';

const COLUMNS: { key: keyof NworkRow; label: string; width?: string }[] = [
    { key: 'n_id', label: 'ID', width: 'w-40' },
    { key: 'n_pwd', label: 'PWD', width: 'w-40' },
    { key: 'n_memo1', label: 'MEMO 1' },
    { key: 'n_memo2', label: 'MEMO 2' },
    { key: 'n_status', label: 'STATUS', width: 'w-40' },
    { key: 'n_lastwork_at', label: 'LAST WORK', width: 'w-44' },
];

const STATUS_ALL = '__all__';
const STATUS_CUSTOM = '직접입력';
const STATUS_PRESETS = [
    '사용가능',
    '사용불가',
    '블로그',
    '최적화',
    '최적화의심',
    '카페',
];

type EditTarget =
    | { idx: number; field: 'n_memo1' | 'n_memo2' }
    | { idx: number; field: 'n_status' };

function sortStatuses(list: string[]): string[] {
    return [...list].sort((a, b) => {
        const rank = (v: string) => (v === '사용가능' ? -1 : v === '사용불가' ? 1 : 0);
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        return a.localeCompare(b, 'ko');
    });
}

function formatDate(v: unknown): string {
    if (!v) return '';
    const s = String(v);
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NworkPage() {
    const qc = useQueryClient();
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['yong', 'nwork'],
        queryFn: fetchNworkList,
    });

    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<string>(STATUS_ALL);
    const [editing, setEditing] = useState<EditTarget | null>(null);

    const mutation = useMutation({
        mutationFn: ({ idx, patch }: { idx: number; patch: NworkPatch }) =>
            updateNwork(idx, patch),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['yong', 'nwork'] });
            setEditing(null);
        },
        onError: (e) => {
            alert('저장 실패: ' + (e as Error).message);
        },
    });

    const statusOptions = useMemo(() => {
        const set = new Set<string>();
        (data ?? []).forEach((r) => {
            if (r.n_status) set.add(r.n_status);
        });
        return sortStatuses([...set]);
    }, [data]);

    const rows = useMemo(() => {
        let list = data ?? [];
        if (status !== STATUS_ALL) {
            list = status === '사용가능'
                ? list.filter((r) => r.n_status !== '사용불가')
                : list.filter((r) => r.n_status === status);
        }
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            list = list.filter((r) =>
                [r.n_id, r.n_memo1, r.n_memo2].some((v) =>
                    String(v ?? '').toLowerCase().includes(q)
                )
            );
        }
        return list;
    }, [data, query, status]);

    const isEditing = (idx: number, field: EditTarget['field']) =>
        editing?.idx === idx && editing.field === field;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight">nwork</h1>
                <span className="text-xs text-neutral-500">
                    {isLoading ? '…' : `${rows.length} / ${data?.length ?? 0}`}
                </span>
                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="px-2.5 py-1.5 text-xs rounded border border-neutral-800 hover:bg-neutral-900 disabled:opacity-50"
                    >
                        {isFetching ? 'loading…' : 'reload'}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 w-full max-w-xs">
                    <Search className="w-3.5 h-3.5 text-neutral-500" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="id / memo 검색"
                        className="flex-1 bg-transparent outline-none text-sm placeholder:text-neutral-600"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="uppercase tracking-widest text-neutral-500">상태</span>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-neutral-900/60 border border-neutral-800 rounded px-2 py-1.5 text-sm text-neutral-200 outline-none focus:border-emerald-500/50"
                    >
                        <option value={STATUS_ALL}>전체</option>
                        {statusOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rounded border border-neutral-800 overflow-hidden">
                <div className="overflow-auto max-h-[calc(100vh-16rem)]">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-neutral-900 text-neutral-400">
                            <tr>
                                {COLUMNS.map((c) => (
                                    <th
                                        key={String(c.key)}
                                        className={`text-left font-medium uppercase tracking-widest px-3 py-2 border-b border-neutral-800 ${c.width ?? ''}`}
                                    >
                                        {c.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-neutral-500">
                                        불러오는 중…
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-red-400">
                                        로드 실패: {(error as Error).message}
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-3 py-6 text-center text-neutral-500">
                                        결과 없음
                                    </td>
                                </tr>
                            ) : (
                                rows.map((r, i) => (
                                    <tr
                                        key={r.n_idx ?? i}
                                        className="odd:bg-neutral-950 even:bg-neutral-900/40 hover:bg-neutral-800/60"
                                    >
                                        {COLUMNS.map((c) => {
                                            const raw = r[c.key];
                                            return (
                                                <td
                                                    key={String(c.key)}
                                                    className="px-3 py-1.5 border-b border-neutral-900 align-top whitespace-pre-wrap break-all"
                                                >
                                                    {c.key === 'n_memo1' || c.key === 'n_memo2' ? (() => {
                                                        const memoKey: 'n_memo1' | 'n_memo2' = c.key;
                                                        return isEditing(r.n_idx, memoKey) ? (
                                                            <MemoEditor
                                                                initial={(raw as string | null) ?? ''}
                                                                saving={mutation.isPending}
                                                                onCancel={() => setEditing(null)}
                                                                onSave={(v) =>
                                                                    mutation.mutate({
                                                                        idx: r.n_idx,
                                                                        patch: { [memoKey]: v || null } as NworkPatch,
                                                                    })
                                                                }
                                                            />
                                                        ) : (
                                                            <EditableCell
                                                                value={raw == null ? '' : String(raw)}
                                                                onEdit={() =>
                                                                    setEditing({ idx: r.n_idx, field: memoKey })
                                                                }
                                                            />
                                                        );
                                                    })() : c.key === 'n_status' ? (
                                                        isEditing(r.n_idx, 'n_status') ? (
                                                            <StatusEditor
                                                                initial={r.n_status}
                                                                saving={mutation.isPending}
                                                                onCancel={() => setEditing(null)}
                                                                onSave={(v) =>
                                                                    mutation.mutate({
                                                                        idx: r.n_idx,
                                                                        patch: { n_status: v },
                                                                    })
                                                                }
                                                            />
                                                        ) : (
                                                            <EditableCell
                                                                value={r.n_status}
                                                                onEdit={() =>
                                                                    setEditing({ idx: r.n_idx, field: 'n_status' })
                                                                }
                                                            />
                                                        )
                                                    ) : c.key === 'n_lastwork_at' ? (
                                                        formatDate(raw) || <span className="text-neutral-700">—</span>
                                                    ) : (
                                                        (raw == null ? '' : String(raw)) || (
                                                            <span className="text-neutral-700">—</span>
                                                        )
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function EditableCell({ value, onEdit }: { value: string; onEdit: () => void }) {
    return (
        <div className="group flex items-start gap-2">
            <span className="flex-1 min-w-0">
                {value || <span className="text-neutral-700">—</span>}
            </span>
            <button
                type="button"
                onClick={onEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-emerald-400 shrink-0"
                title="변경"
            >
                <Pencil className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function MemoEditor({
    initial,
    saving,
    onSave,
    onCancel,
}: {
    initial: string;
    saving: boolean;
    onSave: (v: string) => void;
    onCancel: () => void;
}) {
    const [v, setV] = useState(initial);
    return (
        <div className="flex items-center gap-1">
            <input
                autoFocus
                value={v}
                onChange={(e) => setV(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave(v);
                    if (e.key === 'Escape') onCancel();
                }}
                className="flex-1 min-w-0 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/60"
            />
            <button
                type="button"
                onClick={() => onSave(v)}
                disabled={saving}
                className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50"
                title="확인"
            >
                <Check className="w-3.5 h-3.5" />
            </button>
            <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="p-1 rounded text-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
                title="취소"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

function StatusEditor({
    initial,
    saving,
    onSave,
    onCancel,
}: {
    initial: string;
    saving: boolean;
    onSave: (v: string) => void;
    onCancel: () => void;
}) {
    const initialIsPreset = STATUS_PRESETS.includes(initial);
    const [selected, setSelected] = useState<string>(initialIsPreset ? initial : STATUS_CUSTOM);
    const [custom, setCustom] = useState<string>(initialIsPreset ? '' : initial);

    const isCustom = selected === STATUS_CUSTOM;
    const finalValue = isCustom ? custom.trim() : selected;

    const submit = () => {
        if (!finalValue) return;
        onSave(finalValue);
    };

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
                <select
                    autoFocus
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    className="flex-1 min-w-0 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/60"
                >
                    {STATUS_PRESETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                    <option value={STATUS_CUSTOM}>{STATUS_CUSTOM}</option>
                </select>
                <button
                    type="button"
                    onClick={submit}
                    disabled={saving || !finalValue}
                    className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30"
                    title="확인"
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="p-1 rounded text-neutral-500 hover:bg-neutral-800 disabled:opacity-50"
                    title="취소"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            {isCustom && (
                <input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                        if (e.key === 'Escape') onCancel();
                    }}
                    placeholder="직접 입력"
                    className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500/60"
                />
            )}
        </div>
    );
}
