import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'yong · admin',
};

const NAV = [
  { href: '/yong', label: 'overview' },
  { href: '/yong/nwork', label: 'nwork' },
  { href: '/yong/logs', label: 'logs' },
  { href: '/yong/settings', label: 'settings' },
];

export default function YongAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-mono flex flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="px-6 h-12 flex items-center gap-6">
          <Link href="/yong" className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-bold tracking-tight">yong.admin</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs uppercase tracking-widest text-neutral-400">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto text-[11px] text-neutral-500">v0.0.1</div>
        </div>
      </header>
      <main className="flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
