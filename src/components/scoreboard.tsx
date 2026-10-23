'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface ScoreRow { key: string; label: string; actual: number; target: number; money?: boolean; log?: { type: string; name: string }; href?: string; note?: string }

/** This week vs The Closer's targets, with one-tap +1 for touches and calls. */
export function Scoreboard({ rows, today }: { rows: ScoreRow[]; today: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [bump, setBump] = useState<Record<string, number>>({});

  async function plusOne(r: ScoreRow) {
    if (!r.log) return;
    setBusy(r.key);
    const res = await fetch('/api/records/activityLog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: r.log.name, date: today, type: r.log.type, count: 1, outcome: 'Logged from Home scoreboard' }),
    });
    setBusy(null);
    if (res.ok) {
      setBump((b) => ({ ...b, [r.key]: (b[r.key] ?? 0) + 1 }));
      router.refresh();
    }
  }

  return (
    <section className="panel mb-6 p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider">This week&apos;s scoreboard</h2>
        <Link href="/dashboard" className="text-xs underline">Goals</Link>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {rows.map((r) => {
          const pct = Math.min(100, r.target ? (r.actual / r.target) * 100 : 0);
          return (
            <div key={r.key} className="rounded border border-[color:var(--line)] p-3">
              <div className="text-[11px] uppercase tracking-wider text-[color:var(--ink-muted)]">{r.label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">
                {r.money ? `$${Math.round(r.actual).toLocaleString()}` : r.actual}
                <span className="text-sm font-normal text-[color:var(--ink-muted)]"> / {r.money ? `$${r.target.toLocaleString()}` : r.target}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded bg-[color:var(--line)]"><div className="h-1.5 rounded bg-[color:var(--accent)]" style={{ width: `${pct}%` }} /></div>
              {r.log ? (
                <button type="button" className="btn mt-2 min-h-11 w-full" disabled={busy === r.key} onClick={() => void plusOne(r)}>
                  {busy === r.key ? '…' : `+1 ${r.log.type.toLowerCase()}`}{bump[r.key] ? ` (${bump[r.key]})` : ''}
                </button>
              ) : r.href ? (
                <Link href={r.href} className="btn mt-2 min-h-11 w-full justify-center">{r.note ?? 'Open'}</Link>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
