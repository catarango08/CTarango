'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The primary tap target on this screen: thumb-sized +/- either side of a
 * quantity field, posting straight to the van count. Built for leaning into
 * the side door of a van, not a desk.
 */
export function StockControl({ itemId, name, defaultQty = 1 }: { itemId: string; name: string; defaultQty?: number }) {
  const router = useRouter();
  const [qty, setQty] = useState(Math.max(1, Math.round(defaultQty)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(delta: number) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/truck/${itemId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: delta }),
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
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          className="btn-hazard h-11 w-11 justify-center text-xl font-semibold"
          disabled={busy}
          onClick={() => send(-qty)}
          aria-label={`Remove ${qty} ${name} from the van`}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={qty}
          disabled={busy}
          onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))}
          className="input h-11 w-16 text-center text-base tabular-nums"
          aria-label={`Quantity for ${name}`}
        />
        <button
          type="button"
          className="btn-primary h-11 w-11 justify-center text-xl font-semibold"
          disabled={busy}
          onClick={() => send(qty)}
          aria-label={`Add ${qty} ${name} to the van`}
        >
          +
        </button>
      </div>
      {error && <p className="max-w-[10rem] text-right text-xs text-[color:var(--hazard)]">{error}</p>}
    </div>
  );
}
