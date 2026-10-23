'use client';

import { useEffect, useState } from 'react';
import { subscribe } from '@/lib/client/sync';

/** Quiet line when saves skipped fields Notion doesn't have yet (bootstrap not run). */
export function SchemaNotice() {
  const [gaps, setGaps] = useState<Record<string, string[]>>({});
  useEffect(() => {
    const check = () => fetch('/api/schema-status').then((r) => r.json()).then((j: { gaps: Record<string, string[]> }) => setGaps(j.gaps ?? {})).catch(() => {});
    check();
    return subscribe((status) => { if (status === 'saved' || status === 'idle') check(); });
  }, []);
  const names = Object.values(gaps).flat();
  if (!names.length) return null;
  return (
    <p className="mb-3 rounded border border-[color:var(--line)] px-3 py-2 text-xs text-[color:var(--ink-muted)]" title={names.join(', ')}>
      Some new fields aren’t in Notion yet ({names.slice(0, 4).join(', ')}{names.length > 4 ? '…' : ''}), so they weren’t saved there. Run <code>npm run notion:bootstrap</code> once to add them.
    </p>
  );
}
