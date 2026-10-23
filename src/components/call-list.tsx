'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface CallItem { id: string; name: string; first: string; town: string; phone: string; amount: number; due: string; quotedOn: string; overdue: boolean }

/** "Call these today": quoted jobs due a follow-up. Tap to call; nothing auto-sends. */
export function CallList({ items }: { items: CallItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function done(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${id}/follow-up`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not log the call');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not log the call');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel mb-6 p-4">
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Call these today</h2>
        <span className="text-xs text-[color:var(--ink-muted)]">Quote follow-ups at +2, +5, +10 days. You make the call.</span>
      </header>
      {items.length === 0 ? (
        <p className="text-sm text-[color:var(--ink-muted)]">No follow-ups due today.</p>
      ) : (
        <ul className="divide-y divide-[color:var(--line)]">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <Link href={`/jobs/${c.id}`} className="block truncate text-sm font-medium hover:underline">{c.name}</Link>
                <span className="text-xs text-[color:var(--ink-muted)]">
                  {c.first}{c.town ? ` · ${c.town}` : ''} · ${c.amount.toLocaleString()} · quoted {c.quotedOn || '—'} ·{' '}
                  <span className={c.overdue ? 'font-semibold text-[color:var(--hazard)]' : ''}>{c.overdue ? `overdue since ${c.due}` : 'due today'}</span>
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                {c.phone ? <a className="btn min-h-11" href={`tel:${c.phone}`}>Call {c.first}</a> : <span className="text-xs text-[color:var(--ink-muted)]">No phone on file</span>}
                <button type="button" className="btn-primary min-h-11" disabled={busy === c.id} onClick={() => void done(c.id)}>
                  {busy === c.id ? 'Logging…' : 'Done / log call'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-xs text-[color:var(--hazard)]">{error}</p>}
    </section>
  );
}
