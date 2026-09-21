'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * "I'm on site." One tap, stamps arrival server-side and moves the ticket.
 * Big enough to hit one-handed, no confirmation dialog in the way.
 */
export function ArriveButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/arrive`, { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Could not stamp arrival (${res.status})`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stamp arrival');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="btn-primary min-h-16 w-full justify-center text-lg"
        disabled={busy}
        onClick={go}
      >
        {busy ? 'Stamping…' : "I'm on site"}
      </button>
      {error && <p className="mt-2 text-sm text-[color:var(--hazard)]">{error}</p>}
    </div>
  );
}
