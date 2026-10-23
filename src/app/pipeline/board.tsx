'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface BoardCard { id: string; column: string; status: string; first: string; town: string; age: number | null; amount: number; source: string; lossReason: string; nextFollowUp: string }
interface Column { key: string; label: string; moveTo: string; statuses: string[] }

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function PipelineBoard({ columns, cards: initial, lossReasons }: { columns: Column[]; cards: BoardCard[]; lossReasons: string[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [losing, setLosing] = useState<{ id: string; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  async function move(id: string, colKey: string, lossReason?: string) {
    const col = columns.find((c) => c.key === colKey)!;
    const card = cards.find((c) => c.id === id);
    if (!card || card.column === colKey) return;
    if (colKey === 'lost' && !lossReason) { setLosing({ id, reason: '' }); return; }
    setError(null);
    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, column: colKey, status: col.moveTo, lossReason: lossReason ?? c.lossReason } : c)));
    const res = await fetch(`/api/records/jobs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lossReason ? { status: col.moveTo, lossReason } : { status: col.moveTo }),
    });
    if (!res.ok) {
      setCards(prev);
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Move failed');
    } else router.refresh();
  }

  return (
    <>
      {error && <p className="mb-3 rounded border border-[color:var(--hazard)] px-3 py-2 text-sm">{error}</p>}
      {losing && (
        <div className="mb-4 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3">
          <p className="text-sm font-semibold">Why was it lost?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <select className="input w-auto" value={losing.reason} onChange={(e) => setLosing({ ...losing, reason: e.target.value })} aria-label="Loss reason">
              <option value="">Pick a reason…</option>
              {lossReasons.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="btn-primary min-h-11" disabled={!losing.reason} onClick={() => { const l = losing; setLosing(null); void move(l.id, 'lost', l.reason); }}>Move to Lost</button>
            <button type="button" className="btn min-h-11" onClick={() => setLosing(null)}>Cancel</button>
          </div>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {columns.map((col) => {
          const inCol = cards.filter((c) => c.column === col.key);
          const total = inCol.reduce((s, c) => s + c.amount, 0);
          return (
            <section
              key={col.key}
              className={`panel min-h-40 p-3 ${over === col.key ? 'ring-2 ring-[color:var(--accent)]' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); void move(e.dataTransfer.getData('text/plain'), col.key); }}
            >
              <header className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider">{col.label}</h2>
                <span className="text-xs tabular-nums text-[color:var(--ink-muted)]">{inCol.length} · {money(total)}</span>
              </header>
              <ul className="space-y-2">
                {inCol.map((c) => (
                  <li key={c.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', c.id)} className="cursor-grab rounded border border-[color:var(--line)] bg-[color:var(--surface)] p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/jobs/${c.id}`} className="truncate text-sm font-medium hover:underline">{c.first}{c.town ? ` · ${c.town}` : ''}</Link>
                      <span className="text-sm font-semibold tabular-nums">{money(c.amount)}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
                      {c.age === null ? 'age —' : `${c.age}d old`} · {c.source || 'no source'} · {c.status}
                      {c.lossReason && col.key === 'lost' ? ` · ${c.lossReason}` : ''}
                      {c.nextFollowUp && col.key === 'quoted' ? ` · call ${c.nextFollowUp}` : ''}
                    </div>
                    <select className="input mt-2 py-1 text-xs" value="" onChange={(e) => void move(c.id, e.target.value)} aria-label="Move card">
                      <option value="">Move to…</option>
                      {columns.filter((x) => x.key !== col.key).map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
