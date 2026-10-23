'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { priceOption, type QuoteDoc } from '@/lib/domain/options';
import type { Pricing } from '@/lib/domain/pricing';

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

interface Props {
  quoteId: string; jobId: string; version: number; status: string; first: string; town: string;
  business: { name: string; phone: string; email: string; tagline: string };
  doc: QuoteDoc; pricing: Pricing; accepted: { optionId: string; addOns: string[] } | null; signedBy: string;
}

export function CustomerQuote(p: Props) {
  const router = useRouter();
  const done = p.status === 'Accepted';
  const [optionId, setOptionId] = useState(p.accepted?.optionId ?? (p.doc.options.find((o) => o.recommended) ?? p.doc.options[0])?.id);
  const [addOns, setAddOns] = useState<string[]>(p.accepted?.addOns ?? p.doc.addOns.filter((a) => a.recommended).map((a) => a.id));
  const [name, setName] = useState(p.signedBy);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const option = p.doc.options.find((o) => o.id === optionId) ?? p.doc.options[0];
  const priced = useMemo(() => priceOption(p.doc, option, p.pricing, addOns), [p.doc, option, p.pricing, addOns]);

  useEffect(() => {
    const c = canvas.current; if (!c || done) return;
    const ctx = c.getContext('2d')!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio; c.height = c.clientHeight * ratio; ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    let drawing = false;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
    const down = (e: PointerEvent) => { drawing = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setSigned(true); };
    const up = () => { drawing = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); };
  }, [done]);

  function clear() { const c = canvas.current; if (!c) return; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setSigned(false); }

  async function accept() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/quotes/${p.quoteId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionId: option.id, addOns, signedBy: name, signature: canvas.current!.toDataURL('image/png') }) });
    setBusy(false);
    if (!res.ok) { setErr(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save'); return; }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md bg-white p-4 text-[15px] text-neutral-900">
      <header className="border-b-4 border-[#f2b705] pb-3">
        <p className="text-xl font-bold">{p.business.name}</p>
        <p className="text-sm italic">{p.business.tagline}</p>
        <p className="mt-1 text-sm">{p.business.phone} · {p.business.email}</p>
      </header>
      <section className="mt-3">
        <p className="text-sm text-neutral-600">Estimate v{p.version}{p.town ? ` · ${p.town}` : ''}</p>
        <h1 className="text-lg font-semibold">{p.first ? `For ${p.first}` : 'Your estimate'}</h1>
        {p.doc.scope && <p className="mt-1 text-sm">{p.doc.scope}</p>}
      </section>

      <fieldset className="mt-4 space-y-2" disabled={done}>
        <legend className="mb-1 text-sm font-semibold">Pick an option</legend>
        {p.doc.options.map((o) => {
          const t = priceOption(p.doc, o, p.pricing, addOns).total;
          return (
            <label key={o.id} className={`block rounded-lg border-2 p-3 ${o.id === option.id ? 'border-[#f2b705] bg-amber-50' : 'border-neutral-200'}`}>
              <div className="flex items-center gap-2">
                <input type="radio" name="opt" checked={o.id === option.id} onChange={() => setOptionId(o.id)} />
                <span className="font-semibold">{o.label}</span>
                {o.recommended && <span className="rounded bg-[#f2b705] px-1.5 text-xs font-semibold">Recommended</span>}
                <span className="ml-auto font-semibold tabular-nums">{money(t)}</span>
              </div>
              {o.summary && <p className="ml-6 text-sm text-neutral-600">{o.summary}</p>}
            </label>
          );
        })}
      </fieldset>

      {p.doc.addOns.length > 0 && (
        <fieldset className="mt-4" disabled={done}>
          <legend className="mb-1 text-sm font-semibold">Add-ons</legend>
          {p.doc.addOns.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-2 border-b border-neutral-100">
              <input type="checkbox" checked={addOns.includes(a.id)} onChange={(e) => setAddOns(e.target.checked ? [...addOns, a.id] : addOns.filter((x) => x !== a.id))} />
              <span className="flex-1">{a.name}{a.recommended && <span className="ml-1 text-xs font-semibold text-amber-700">· recommended</span>}</span>
              <span className="tabular-nums">+{money(a.price * a.quantity)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <section className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm">
        {priced.lines.map((l, i) => <div key={i} className={`flex justify-between ${l.kind === 'discount' ? 'font-semibold text-green-700' : ''}`}><span>{l.label}</span><span className="tabular-nums">{money(l.amount)}</span></div>)}
        <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums">{money(priced.total)}</span></div>
        <div className="flex justify-between"><span>Deposit to book</span><span className="font-semibold tabular-nums">{priced.deposit ? money(priced.deposit) : 'None'}</span></div>
      </section>

      {done ? (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-800">Accepted{p.signedBy ? ` and signed by ${p.signedBy}` : ''}. Thank you!</p>
      ) : (
        <section className="mt-4">
          <label className="text-sm font-semibold">Print your name
            <input className="mt-1 w-full rounded border border-neutral-300 p-2" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <p className="mt-3 text-sm font-semibold">Sign here</p>
          <canvas ref={canvas} className="mt-1 h-36 w-full touch-none rounded border-2 border-dashed border-neutral-400 bg-white" aria-label="Signature pad" />
          <div className="mt-2 flex gap-2">
            <button type="button" className="min-h-11 rounded border px-4" onClick={clear}>Clear</button>
            <button type="button" className="min-h-11 flex-1 rounded bg-neutral-900 px-4 font-semibold text-white disabled:opacity-40" disabled={!signed || !name.trim() || busy} onClick={accept}>
              {busy ? 'Saving…' : `Accept ${option.label} · ${money(priced.total)}`}
            </button>
          </div>
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          <p className="mt-2 text-xs text-neutral-500">By signing you approve this work at the price shown{priced.deposit ? `, with a ${money(priced.deposit)} deposit to get on the schedule` : ''}.</p>
        </section>
      )}
    </div>
  );
}
