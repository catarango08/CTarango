'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The Sunday tool count, one thumb tap per row. Checking a tool also stamps
 * the date, because a "Have" with no date is the same as never having looked.
 */
export function ToolCheck({ id, name, have }: { id: string; name: string; have: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const next = !have;
    try {
      const res = await fetch(`/api/records/tools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          have: next,
          lastChecked: new Date().toISOString().slice(0, 10),
          // Checking it off without saying where it is would be a lie by omission.
          ...(next ? {} : { location: 'Missing' }),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not update (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={have}
        aria-label={have ? `Mark ${name} as not on the truck` : `Mark ${name} as on the truck`}
        className={`btn h-11 min-w-[6.5rem] justify-center text-sm font-semibold ${
          have
            ? 'border-[color:var(--go)] bg-[color:var(--go-bg)] text-[color:var(--go)]'
            : 'border-[color:var(--hazard)] text-[color:var(--hazard)]'
        }`}
      >
        {have ? '✓ Have' : 'Buy / fetch'}
      </button>
      {error && <p className="max-w-[10rem] text-right text-xs text-[color:var(--hazard)]">{error}</p>}
    </div>
  );
}
