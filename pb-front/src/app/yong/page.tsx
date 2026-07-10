import Link from 'next/link';

const SECTIONS = [
  { href: '/yong/nwork', label: 'nwork', desc: '네이버 계정 리스트' },
  { href: '/yong/logs', label: 'logs', desc: '작업 로그' },
  { href: '/yong/settings', label: 'settings', desc: '설정' },
];

export default function YongAdminOverview() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-xs text-neutral-500">개인 어드민</p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded border border-neutral-800 bg-neutral-900/40 p-4 hover:border-emerald-500/40 hover:bg-neutral-900 transition-colors"
          >
            <div className="text-[11px] uppercase tracking-widest text-neutral-500 group-hover:text-emerald-400">
              {s.label}
            </div>
            <div className="mt-2 text-sm text-neutral-200">{s.desc}</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
