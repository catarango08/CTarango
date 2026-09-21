'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';

export interface StockOption {
  id: string;
  name: string;
  category: string;
  onTruck: number;
  unit: string;
  cost: number;
  bin: string;
}

export interface MaterialLine {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  extendedCost: number;
  source: string;
  billable: boolean;
  pulledFromTruck: boolean;
}

/**
 * The job's material list.
 *
 * Picking from truck stock pulls the van count down on the server, so the
 * restock list stays honest — the alternative is finding out you are out of
 * 12/2 while standing in someone's attic.
 */
export function MaterialsPanel({
  jobId,
  lines,
  stock,
  markup,
}: {
  jobId: string;
  lines: MaterialLine[];
  stock: StockOption[];
  markup: number;
}) {
  const router = useRouter();
  const [pick, setPick] = useState('');
  const [qty, setQty] = useState('1');
  const [offBook, setOffBook] = useState('');
  const [offCost, setOffCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => stock.find((s) => s.id === pick), [stock, pick]);
  const cost = lines.reduce((sum, l) => sum + (l.extendedCost || l.quantity * l.unitCost), 0);
  const billed = lines
    .filter((l) => l.billable)
    .reduce((sum, l) => sum + (l.extendedCost || l.quantity * l.unitCost), 0) * (1 + markup);

  async function add(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/materials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Could not add (${res.status})`);
      }
      setPick('');
      setQty('1');
      setOffBook('');
      setOffCost('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  }

  async function remove(lineId: string) {
    setBusy(true);
    try {
      await fetch(`/api/materials/${lineId}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const byCategory = useMemo(() => {
    const groups = new Map<string, StockOption[]>();
    for (const s of stock) groups.set(s.category || 'Other', [...(groups.get(s.category || 'Other') ?? []), s]);
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [stock]);

  return (
    <div className="space-y-4">
      {lines.length > 0 ? (
        <ul className="divide-y divide-[color:var(--line)]">
          {lines.map((line) => (
            <li key={line.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium">{line.name}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="chip">{line.source}</span>
                  {!line.billable && <span className="chip">not billed</span>}
                  {line.source === 'Truck stock' && !line.pulledFromTruck && (
                    <span className="chip border-[color:var(--hazard)] text-[color:var(--hazard)]">van count not pulled</span>
                  )}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-[color:var(--ink-muted)]">
                {line.quantity} × {money(line.unitCost)}
              </span>
              <span className="w-20 shrink-0 text-right text-sm tabular-nums">
                {money(line.extendedCost || line.quantity * line.unitCost)}
              </span>
              <button
                type="button"
                className="min-h-11 shrink-0 px-2 text-[color:var(--hazard)]"
                onClick={() => void remove(line.id)}
                disabled={busy}
                aria-label={`Remove ${line.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[color:var(--ink-muted)]">
          Nothing logged yet. Anything off the van gets pulled from the truck count as you add it.
        </p>
      )}

      {lines.length > 0 && (
        <dl className="panel-2 space-y-1 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-[color:var(--ink-muted)]">Your cost</dt><dd className="tabular-nums">{money(cost)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-[color:var(--ink-muted)]">Billed at cost + {Math.round(markup * 100)}%</dt>
            <dd className="tabular-nums font-semibold">{money(billed)}</dd>
          </div>
        </dl>
      )}

      {/* Off the van */}
      <div className="panel-2 space-y-2 p-3">
        <div className="label">Pull from the van</div>
        <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Pick an item…</option>
          {byCategory.map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((s) => (
                <option key={s.id} value={s.id} disabled={s.onTruck <= 0}>
                  {s.name} — {s.onTruck} {s.unit} on truck{s.bin ? ` · ${s.bin}` : ''}{s.onTruck <= 0 ? ' (out)' : ''}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            aria-label="Quantity"
          />
          <button
            type="button"
            className="btn-primary min-h-11 shrink-0"
            disabled={busy || !selected || Number(qty) <= 0}
            onClick={() =>
              selected &&
              void add({ itemId: selected.id, name: selected.name, quantity: Number(qty), unitCost: selected.cost, source: 'Truck stock' })
            }
          >
            Use it
          </button>
        </div>
        {selected && Number(qty) > selected.onTruck && (
          <p className="text-xs text-[color:var(--hazard)]">
            Only {selected.onTruck} on the truck. Logging more will put the count negative.
          </p>
        )}
      </div>

      {/* Bought for the job */}
      <div className="panel-2 space-y-2 p-3">
        <div className="label">Bought for this job</div>
        <input className="input" value={offBook} onChange={(e) => setOffBook(e.target.value)} placeholder="60A fused disconnect" />
        <div className="flex gap-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={offCost}
            onChange={(e) => setOffCost(e.target.value)}
            placeholder="Your cost"
            aria-label="Cost"
          />
          <button
            type="button"
            className="btn min-h-11 shrink-0"
            disabled={busy || !offBook.trim()}
            onClick={() => void add({ name: offBook.trim(), quantity: 1, unitCost: Number(offCost) || 0, source: 'Supply house' })}
          >
            Add
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-[color:var(--hazard)]">{error}</p>}
    </div>
  );
}
