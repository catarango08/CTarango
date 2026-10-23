'use client';

import { useEffect, useState } from 'react';
import { flush, subscribe } from '@/lib/client/sync';

/** Always-visible saved / saving / offline / failed pill. Tap to retry. */
export function SyncBadge() {
  const [s, setS] = useState<{ status: string; pending: number; error?: string }>({ status: 'idle', pending: 0 });
  useEffect(() => subscribe((status, pending, error) => setS({ status, pending, error })), []);
  const map: Record<string, [string, string]> = {
    idle: ['All saved', 'border-[color:var(--line-strong)] text-[color:var(--ink-muted)]'],
    saved: ['Saved ✓', 'border-[color:var(--go)] text-[color:var(--go)]'],
    saving: ['Saving…', 'border-[color:var(--accent)] text-[color:var(--accent-ink)]'],
    offline: [`No signal · ${s.pending} queued`, 'border-[color:var(--accent)] text-[color:var(--accent-ink)]'],
    failed: [`Not saved · tap to retry`, 'border-[color:var(--hazard)] text-[color:var(--hazard)]'],
  };
  const [text, cls] = map[s.status] ?? map.idle;
  return (
    <button type="button" onClick={() => void flush()} title={s.error} className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-medium ${cls}`} data-testid="sync-badge">
      {text}
    </button>
  );
}
