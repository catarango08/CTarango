'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';

const SECTIONS: { heading: string; items: { href: string; label: string; icon: string }[] }[] = [
  {
    heading: 'Run the day',
    items: [
      { href: '/', label: 'Today', icon: '◉' },
      { href: '/dispatch', label: 'Dispatch board', icon: '▦' },
      { href: '/jobs', label: 'Jobs', icon: '⚡' },
      { href: '/photos', label: 'Job photos', icon: '◧' },
    ],
  },
  {
    heading: 'Customers',
    items: [
      { href: '/customers', label: 'CRM', icon: '◆' },
      { href: '/estimates', label: 'Estimates', icon: '◈' },
      { href: '/invoices', label: 'Invoices', icon: '$' },
    ],
  },
  {
    heading: 'Back office',
    items: [
      { href: '/inventory', label: 'Inventory', icon: '▤' },
      { href: '/team', label: 'Team', icon: '◍' },
      { href: '/permits', label: 'Permits', icon: '⚑' },
      { href: '/safety', label: 'Safety', icon: '⛑' },
      { href: '/reports', label: 'Reports', icon: '◑' },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/records', label: 'All databases', icon: '▣' },
      { href: '/setup', label: 'Notion setup', icon: '⚙' },
    ],
  },
];

export function Sidebar({ storeKind }: { storeKind: 'notion' | 'demo' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn fixed left-3 top-3 z-50 lg:hidden"
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-4 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 pt-8 lg:pt-0" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-volt-400 text-lg font-black text-slate-950">V</span>
          <span>
            <span className="block text-sm font-bold leading-tight tracking-tight">VoltFlow</span>
            <span className="block text-[11px] leading-tight text-[color:var(--muted)]">Electrical ops</span>
          </span>
        </Link>

        <nav className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="label px-2 pb-1.5">{section.heading}</div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          'flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition',
                          active
                            ? 'bg-volt-400/10 font-medium text-volt-200'
                            : 'text-[color:var(--muted)] hover:bg-[color:var(--panel-2)] hover:text-[color:var(--text)]',
                        )}
                      >
                        <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <Link
          href="/setup"
          onClick={() => setOpen(false)}
          className={clsx(
            'mt-6 block rounded-lg border px-3 py-2 text-xs',
            storeKind === 'notion'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-volt-500/30 bg-volt-500/10 text-volt-200',
          )}
        >
          <span className="block font-semibold">
            {storeKind === 'notion' ? '● Connected to Notion' : '● Demo data'}
          </span>
          <span className="mt-0.5 block opacity-80">
            {storeKind === 'notion' ? 'Reads and writes go to your workspace.' : 'Run the bootstrap to connect Notion.'}
          </span>
        </Link>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
