'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { priceOption, type AddOnDef, type QuoteDoc, type QuoteOptionDef } from '@/lib/domain/options';
import type { Pricing, TripKind } from '@/lib/domain/pricing';
import { checkCopy } from '@/lib/domain/rules';

export interface RateOpt { id: string; name: string; price: number; book: string; assumes: string }

const TRIPS: [TripKind, string][] = [['none', 'No trip (flat covers it)'], ['day', 'Daytime trip'], ['afterHours', 'After hours'], ['emergency', 'Emergency'], ['holiday', 'Holiday']];
const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function QuoteBuilder({ jobId, initial, pricing, rates }: { jobId: string; initial: QuoteDoc; pricing: Pricing; rates: RateOpt[] }) {
  const router = useRouter();
  const [doc, setDoc] = useState<QuoteDoc>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const recAddOns = doc.addOns.filter((a) => a.recommended).map((a) => a.id);
  const priced = useMemo(() => doc.options.map((o) => priceOption(doc, o, pricing, recAddOns)), [doc, pricing, recAddOns.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const copyIssues = checkCopy([doc.scope, ...doc.options.flatMap((o) => [o.label, o.summary]), doc.discount?.label ?? ''].join(' '));

  const setOpt = (i: number, patch: Partial<QuoteOptionDef>) => setDoc((d) => ({ ...d, options: d.options.map((o, k) => (k === i ? { ...o, ...patch } : o)) }));
  const pick = (rateId: string) => { const r = rates.find((x) => x.id === rateId)!; return { rateId: r.id, name: r.name, price: r.price, quantity: 1, kind: 'flat' as const }; };

  async function save() {
    setSaving(true); setMsg(null);
    const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId, data: JSON.stringify(doc) }) });
    setSaving(false);
    const j = (await res.json().catch(() => ({}))) as { quote?: { id: string; version: number }; error?: string };
    if (!res.ok || !j.quote) { setMsg(j.error ?? 'Save failed'); return; }
    setMsg(`Saved v${j.quote.version}.`);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="panel grid gap-3 p-4 sm:grid-cols-3">
        <label className="text-sm">Tier
          <select className="input" value={doc.tier} onChange={(e) => setDoc({ ...doc, tier: e.target.value as QuoteDoc['tier'] })}>
            <option value="residential">Residential</option><option value="commercial">Commercial</option>
          </select>
        </label>
        <label className="text-sm">Zone
          <select className="input" value={doc.zone} onChange={(e) => setDoc({ ...doc, zone: Number(e.target.value) as QuoteDoc['zone'] })}>
            <option value={1}>Zone 1</option><option value={2}>Zone 2</option><option value={3}>Zone 3</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doc.oldWork} onChange={(e) => setDoc({ ...doc, oldWork: e.target.checked })} /> Older wiring condition</label>
        <label className="text-sm sm:col-span-3">Scope (customer sees this)
          <textarea className="input" rows={2} value={doc.scope} onChange={(e) => setDoc({ ...doc, scope: e.target.value })} />
        </label>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        {doc.options.map((o, i) => (
          <section key={o.id} className={`panel p-4 ${o.recommended ? 'ring-2 ring-[color:var(--accent)]' : ''}`}>
            <div className="flex items-center gap-2">
              <input className="input font-semibold" value={o.label} onChange={(e) => setOpt(i, { label: e.target.value })} aria-label="Option name" />
              {doc.options.length > 1 && <button type="button" className="btn text-xs" onClick={() => setDoc({ ...doc, options: doc.options.filter((_, k) => k !== i) })}>Remove</button>}
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs"><input type="radio" name="rec" checked={!!o.recommended} onChange={() => setDoc({ ...doc, options: doc.options.map((x, k) => ({ ...x, recommended: k === i })) })} /> Recommended</label>
            <input className="input mt-2 text-sm" placeholder="One-line summary" value={o.summary} onChange={(e) => setOpt(i, { summary: e.target.value })} />
            <ul className="mt-2 space-y-1 text-sm">
              {o.lines.map((l, k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="flex-1 truncate">{l.name}</span>
                  <input type="number" min={1} className="input w-14 py-1" value={l.quantity} onChange={(e) => setOpt(i, { lines: o.lines.map((x, n) => (n === k ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)) })} aria-label="Quantity" />
                  <span className="w-16 text-right tabular-nums">{money(l.price * l.quantity)}</span>
                  <button type="button" className="text-xs underline" onClick={() => setOpt(i, { lines: o.lines.filter((_, n) => n !== k) })}>×</button>
                </li>
              ))}
            </ul>
            <select className="input mt-2 text-sm" value="" onChange={(e) => e.target.value && setOpt(i, { lines: [...o.lines, pick(e.target.value)] })} aria-label="Add Rate Book line">
              <option value="">+ Add from Rate Book…</option>
              {rates.map((r) => <option key={r.id} value={r.id}>{r.name} — ${r.price}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <label className="col-span-3">Trip
                <select className="input py-1" value={o.trip} onChange={(e) => setOpt(i, { trip: e.target.value as TripKind })}>{TRIPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </label>
              <label>Extra hrs<input type="number" min={0} step={0.5} className="input py-1" value={o.extraHours} onChange={(e) => setOpt(i, { extraHours: Number(e.target.value) || 0 })} /></label>
              <label className="col-span-2">Materials at cost<input type="number" min={0} className="input py-1" value={o.materialsCost} onChange={(e) => setOpt(i, { materialsCost: Number(e.target.value) || 0 })} /></label>
            </div>
            <div className="mt-3 border-t border-[color:var(--line)] pt-2 text-sm">
              {priced[i].lines.map((l, k) => <div key={k} className={`flex justify-between ${l.kind === 'discount' ? 'font-semibold' : ''}`}><span>{l.label}</span><span className="tabular-nums">{money(l.amount)}</span></div>)}
              <div className="mt-1 flex justify-between font-semibold"><span>Total{recAddOns.length ? ' (with recommended add-ons)' : ''}</span><span className="tabular-nums">{money(priced[i].total)}</span></div>
              {priced[i].deposit > 0 && <div className="flex justify-between text-xs"><span>Deposit to book</span><span>{money(priced[i].deposit)}</span></div>}
              {priced[i].quote.notes.map((n, k) => <p key={k} className="mt-1 text-xs text-[color:var(--ink-muted)]">{n}</p>)}
            </div>
          </section>
        ))}
      </div>
      <button type="button" className="btn text-sm" onClick={() => setDoc({ ...doc, options: [...doc.options, { id: `s${Date.now()}`, label: 'Scenario', summary: '', lines: [], trip: 'none', extraHours: 0, materialsCost: 0 }] })}>+ Add scenario</button>

      <section className="panel p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Optional add-ons</h2>
        <ul className="space-y-1 text-sm">
          {doc.addOns.map((a, k) => (
            <li key={a.id} className="flex items-center gap-2">
              <span className="flex-1">{a.name}</span>
              <span className="tabular-nums">{money(a.price * a.quantity)}</span>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!a.recommended} onChange={(e) => setDoc({ ...doc, addOns: doc.addOns.map((x, n) => (n === k ? { ...x, recommended: e.target.checked } : x)) })} /> Recommended</label>
              <button type="button" className="text-xs underline" onClick={() => setDoc({ ...doc, addOns: doc.addOns.filter((_, n) => n !== k) })}>×</button>
            </li>
          ))}
        </ul>
        <select className="input mt-2 text-sm" value="" onChange={(e) => { if (!e.target.value) return; const p = pick(e.target.value); const a: AddOnDef = { ...p, id: `a${Date.now()}` }; setDoc({ ...doc, addOns: [...doc.addOns, a] }); }} aria-label="Add add-on">
          <option value="">+ Add-on from Rate Book…</option>
          {rates.map((r) => <option key={r.id} value={r.id}>{r.name} — ${r.price}</option>)}
        </select>
      </section>

      <section className="panel grid gap-2 p-4 sm:grid-cols-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider sm:col-span-3">Discount (applied once, shown as its own line)</h2>
        <input className="input sm:col-span-2" placeholder="Label, e.g. Repeat customer" value={doc.discount?.label ?? ''} onChange={(e) => setDoc({ ...doc, discount: { label: e.target.value, amount: doc.discount?.amount ?? 0 } })} />
        <input type="number" min={0} className="input" placeholder="$" value={doc.discount?.amount ?? ''} onChange={(e) => setDoc({ ...doc, discount: Number(e.target.value) > 0 ? { label: doc.discount?.label ?? 'Discount', amount: Number(e.target.value) } : null })} />
      </section>

      {copyIssues.length > 0 && <p className="text-sm text-[color:var(--hazard)]">Fix before saving: {copyIssues.map((c) => `"${c.phrase}" (${c.reason})`).join('; ')}</p>}
      <div className="flex items-center gap-3">
        <button type="button" className="btn-primary min-h-11" disabled={saving || copyIssues.length > 0} onClick={save}>{saving ? 'Saving…' : 'Save as new version'}</button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>
    </div>
  );
}
