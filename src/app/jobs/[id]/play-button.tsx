'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * One button, one move. Closing goes through /api/jobs/:id/close, which runs
 * the closeout gate server-side and logs the hours — a 422 back from it is the
 * checklist talking, not an error, so its blocking list is shown as-is.
 */
export function PlayButton({
  jobId,
  action,
  advanceTo,
  terminal,
}: {
  jobId: string;
  action: string;
  advanceTo?: string;
  terminal?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [blocking, setBlocking] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (terminal || !advanceTo) {
    return <p className="text-sm text-[color:var(--ink-muted)]">Nothing to advance. This ticket is finished.</p>;
  }

  async function go() {
    setBusy(true);
    setBlocking([]);
    setError(null);
    try {
      const closing = advanceTo === 'Closed';
      const res = await fetch(closing ? `/api/jobs/${jobId}/close` : `/api/records/jobs/${jobId}`, {
        method: closing ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: closing ? undefined : JSON.stringify({ status: advanceTo }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; blocking?: string[] };
      if (res.status === 422 && body.blocking?.length) {
        setBlocking(body.blocking);
        return;
      }
      if (!res.ok) throw new Error(body.error ?? `Could not advance (${res.status})`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not advance');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn-primary min-h-12 w-full justify-center text-base" disabled={busy} onClick={go}>
        {busy ? 'Working…' : action}
      </button>
      <p className="mt-1 text-center text-xs text-[color:var(--ink-muted)]">Moves this ticket to {advanceTo}</p>

      {blocking.length > 0 && (
        <div className="mt-3 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3">
          <p className="text-sm font-semibold text-[color:var(--hazard)]">Closeout is not finished.</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-sm">
            {blocking.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-[color:var(--hazard)]">{error}</p>}
    </div>
  );
}
