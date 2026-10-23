'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CO_DUE_ON_APPROVAL, type COLine } from '@/lib/domain/change-order';

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(Math.round(Math.abs(n) * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 })}`;

export function ChangeOrderForm({ jobId, presets, business, town }: { jobId: string; presets: { name: string; price: number }[]; business: { name: string; phone: string }; town: string }) {
  const router = useRouter();
  const [lines, setLines] = useState<COLine[]>([]);
  const [free, setFree] = useState({ name: '', price: '' });
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ total: number; due: boolean } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const total = Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100;

  function add(n: string, price: number) {
    setLines((ls) => { const i = ls.findIndex((l) => l.name === n); if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l)); return [...ls, { name: n, price, qty: 1 }]; });
  }

  useEffect(() => {
    const c = canvas.current; if (!c || !signing) return;
    const ctx = c.getContext('2d')!; const r = window.devicePixelRatio || 1;
    c.width = c.clientWidth * r; c.height = c.clientHeight * r; ctx.scale(r, r); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    let d = false;
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
    const down = (e: PointerEvent) => { d = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!d) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setSigned(true); };
    const up = () => { d = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); };
  }, [signing]);

  async function approve() {
    setBusy(true); setMsg(null);
    try {
      const r1 = await fetch(`/api/jobs/${jobId}/change-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error ?? 'Could not save');
      const r2 = await fetch(`/api/change-orders/${j1.changeOrder.id}/sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedBy: name, signature: canvas.current!.toDataURL('image/png') }) });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error ?? 'Could not save the signature');
      setDone({ total: j2.total, due: j2.dueOnApproval }); router.refresh();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'No signal. Tap again when you have a bar.'); }
    setBusy(false);
  }

  if (done) return (
    <div className="rounded-lg bg-green-50 p-4 text-lg text-green-900">
      <p className="font-semibold">Change order approved — {money(done.total)}.</p>
      {done.due ? <p className="mt-1 text-base">Over {money(CO_DUE_ON_APPROVAL)}: due now, on its own invoice. The office has a task to send it.</p> : <p className="mt-1 text-base">Added to the final invoice.</p>}
    </div>
  );

  return (
    <div className="space-y-3 bg-white p-1 text-neutral-900">
      <h1 className="text-2xl font-bold">Change order{town ? ` · ${town}` : ''}</h1>
      {!signing && (<>
        <p className="text-sm text-neutral-600">Tap to add. Tap again for one more.</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p) => <button key={p.name} type="button" className="min-h-14 rounded-lg border-2 border-neutral-300 p-2 text-left text-sm" onClick={() => add(p.name, p.price)}><span className="font-semibold">{p.name}</span><br />{money(p.price)}</button>)}
        </div>
        <div className="flex gap-2">
          <input className="input min-h-12 flex-1" placeholder="Other work" value={free.name} onChange={(e) => setFree({ ...free, name: e.target.value })} />
          <input className="input min-h-12 w-24" inputMode="decimal" placeholder="$" value={free.price} onChange={(e) => setFree({ ...free, price: e.target.value })} />
          <button type="button" className="btn min-h-12" onClick={() => { if (free.name && Number(free.price) > 0) { add(free.name, Number(free.price)); setFree({ name: '', price: '' }); } }}>Add</button>
        </div>
      </>)}
      {lines.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {lines.map((l, i) => (
            <li key={i} className="flex min-h-12 items-center gap-2 px-3">
              <span className="flex-1 text-base">{l.name}{l.qty > 1 ? ` × ${l.qty}` : ''}</span><span className="tabular-nums">{money(l.price * l.qty)}</span>
              {!signing && <button type="button" aria-label={`Remove ${l.name}`} className="min-h-12 min-w-12 text-xl" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button>}
            </li>
          ))}
        </ul>
      )}
      <div className="sticky bottom-20 rounded-lg bg-neutral-900 p-3 text-white">
        <div className="flex justify-between text-xl font-bold"><span>Change order total</span><span className="tabular-nums">{money(total)}</span></div>
        {total > CO_DUE_ON_APPROVAL && <p className="mt-1 rounded bg-[#f2b705] px-2 py-1 text-sm font-semibold text-black">Due on approval — billed on its own invoice</p>}
        {!signing && <button type="button" className="mt-2 min-h-14 w-full rounded-lg bg-white text-lg font-semibold text-black disabled:opacity-40" disabled={!lines.length} onClick={() => setSigning(true)}>Customer signs →</button>}
      </div>
      {signing && (
        <section>
          <p className="text-base">I approve this added work at {money(total)}.{total > CO_DUE_ON_APPROVAL ? ' Payment is due on approval.' : ' It is added to my final invoice.'}</p>
          <input className="input mt-2 min-h-12 w-full text-lg" placeholder="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          <canvas ref={canvas} className="mt-2 h-44 w-full touch-none rounded-lg border-2 border-dashed border-neutral-400 bg-white" aria-label="Signature pad" />
          <button type="button" className="mt-2 min-h-14 w-full rounded-lg bg-neutral-900 text-lg font-semibold text-white disabled:opacity-40" disabled={!signed || !name.trim() || busy} onClick={approve}>{busy ? 'Saving…' : `Approve ${money(total)}`}</button>
          <button type="button" className="mt-1 min-h-12 w-full underline" onClick={() => { setSigning(false); setSigned(false); }}>← Edit lines</button>
          {msg && <p className="mt-2 text-red-700">{msg}</p>}
          <p className="mt-2 text-center text-sm text-neutral-500">{business.name} · {business.phone}</p>
        </section>
      )}
    </div>
  );
}
