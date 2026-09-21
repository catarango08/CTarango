'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useState } from 'react';
import { Monogram } from './brand';
import { ThemeToggle } from './theme-toggle';

const SECTIONS: { heading: string; items: { href: string; label: string }[] }[] = [
  {
    heading: 'Run the truck',
    items: [
      { href: '/', label: 'Today' },
      { href: '/new-call', label: 'New call' },
      { href: '/jobs', label: 'Jobs' },
      { href: '/photos', label: 'Photos' },
    ],
  },
  {
    heading: 'Money',
    items: [
      { href: '/rates', label: 'Rate book' },
      { href: '/hours', label: 'Hours to license' },
    ],
  },
  {
    heading: 'Who and where',
    items: [
      { href: '/customers', label: 'Customers' },
      { href: '/territory', label: 'Territory' },
      { href: '/referrals', label: 'Referrals' },
      { href: '/equipment', label: 'Keep Power' },
      { href: '/permits', label: 'Permit offices' },
    ],
  },
  {
    heading: 'System',
    items: [
      { href: '/records', label: 'All databases' },
      { href: '/setup', label: 'Notion setup' },
    ],
  },
];

export function Sidebar({ storeKind }: { storeKind: 'notion' | 'demo' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-50 flex items-center gap-2 border-b border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 lg:hidden">
        <button type="button" onClick={() => setOpen((v) => !v)} className="btn" aria-label="Menu">☰</button>
        <Link href="/" className="flex items-center gap-2">
          <Monogram className="h-7 w-7 rounded" />
          <span className="display text-sm">Tarango Electric</span>
        </Link>
        <span className="ml-auto"><ThemeToggle /></span>
      </div>

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-60 shrink-0 overflow-y-auto border-r border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-4 transition-transform lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link href="/" className="mb-1 flex items-center gap-2.5 px-1 pt-12 lg:pt-0" onClick={() => setOpen(false)}>
          <Monogram className="h-10 w-10 rounded" />
          <span>
            <span className="display block text-base leading-none">Tarango</span>
            <span className="block font-serif text-[11px] leading-tight tracking-[0.18em] text-[color:var(--ink-muted)]">
              ELECTRIC
            </span>
          </span>
        </Link>
        <div className="rule-gold mb-4 mt-3" />

        <nav className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="label px-1 pb-1.5">{section.heading}</div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={clsx(
                          'flex min-h-11 items-center rounded px-2 text-sm transition',
                          active
                            ? 'bg-[color:var(--accent)]/15 font-semibold text-[color:var(--accent-ink)]'
                            : 'text-[color:var(--ink-muted)] hover:bg-[color:var(--surface-2)] hover:text-[color:var(--ink)]',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-6 hidden lg:block"><ThemeToggle /></div>

        <Link
          href="/setup"
          onClick={() => setOpen(false)}
          className={clsx(
            'mt-3 block rounded border px-2.5 py-2 text-xs',
            storeKind === 'notion'
              ? 'border-[color:var(--go)] bg-[color:var(--go-bg)] text-[color:var(--go)]'
              : 'border-[color:var(--accent)] bg-[color:var(--accent)]/10 text-[color:var(--accent-ink)]',
          )}
        >
          <span className="block font-semibold">
            {storeKind === 'notion' ? 'Notion connected' : 'Sample data'}
          </span>
          <span className="mt-0.5 block opacity-80">
            {storeKind === 'notion' ? 'Reads and writes hit the OS.' : 'Add a token to use the real OS.'}
          </span>
        </Link>

        <p className="mt-4 px-1 font-serif text-[11px] italic text-[color:var(--tagline)]">Show up. Fix it right.</p>
        <p className="mt-1 px-1 text-[11px] text-[color:var(--ink-muted)]">(417) 501-4752</p>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
