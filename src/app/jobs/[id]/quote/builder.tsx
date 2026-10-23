'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { priceOption, type EstItem, type QuoteDoc, type QuoteOptionDef } from '@/lib/domain/options';
import type { Pricing, ZoneNumber } from '@/lib/domain/pricing';
import { checkCopy } from '@/lib/domain/rules';
import { ASSEMBLIES, ESTIMATE, MATERIAL_PRICES_AS_OF, SCENARIOS, type Assembly } from '@/config/assemblies';
import { enqueue } from '@/lib/client/sync';

export interface RateOpt { id: string; name: string; price: number; book: string; assumes: string }

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fromAsm = (a: Assembly, qty = 1): EstItem => ({ id: a.id, name: a.name, qty, hours: a.hours, material: a.material, benefit: a.benefit, generatorGear: a.generatorGear });

function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" onClick={() => onChange(v)}
          className={`btn min-h-12 justify-center px-1 text-sm ${v === value ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/20 font-semibold' : ''}`}>{l}</button>
      ))}
    </div>
  );
}

/**
 * On-site estimator. Tap assemblies, step quantities, the price builds itself.
 * Hours, buffer and markups are internal; the customer screen shows names and
 * totals only. Drafts live on the phone until saved.
 */
export function QuoteBuilder({ jobId, initial, pricing, customer, diagnostic, foundDefault, latestQuoteId }: {
  jobId: string; initial: QuoteDoc; pricing: Pricing; rates?: RateOpt[]; customer: string; diagnostic: number; foundDefault: string; latestQuoteId?: string;
}) {
  const DKEY = `te-quote-draft:${jobId}`;
  const [doc, setDoc] = useState<QuoteDoc>(() => ({ furnish: 'contractor', visits: 1, found: foundDefault, ...initial }));
  const [active, setActive] = useState(() => Math.max(0, initial.options.findIndex((o) => o.recommended)));
  const [q, setQ] = useState('');
  const [free, setFree] = useState({ name: '', hours: '', material: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | undefined>(latestQuoteId);
  const [showScen, setShowScen] = useState(false);

  useEffect(() => { const d = localStorage.getItem(DKEY); if (d) { try { setDoc(JSON.parse(d)); setMsg('Restored your unsaved draft.'); } catch { /* ignore */ } } }, [DKEY]);
  useEffect(() => { localStorage.setItem(DKEY, JSON.stringify(doc)); }, [doc, DKEY]);

  const opt = doc.options[Math.min(active, doc.options.length - 1)];
  const priced = useMemo(() => doc.options.map((o) => priceOption(doc, o, pricing, [])), [doc, pricing]);
  const cur = priced[Math.min(active, priced.length - 1)];
  const copyIssues = checkCopy([doc.scope, doc.found ?? '', ...doc.options.flatMap((o) => [o.label, o.summary, o.benefit ?? '', ...(o.items ?? []).map((i) => i.name)]), doc.discount?.label ?? ''].join(' '));

  const setOpt = (patch: Partial<QuoteOptionDef>) => setDoc((d) => ({ ...d, options: d.options.map((o, k) => (k === active ? { ...o, ...patch } : o)) }));
  const items = opt.items ?? [];
  function addItem(it: EstItem) {
    const i = items.findIndex((x) => x.id === it.id && x.name === it.name);
    setOpt({ items: i >= 0 ? items.map((x, k) => (k === i ? { ...x, qty: x.qty + it.qty } : x)) : [...items, it] });
  }
  const step = (k: number, d: number) => setOpt({ items: items.map((x, n) => (n === k ? { ...x, qty: Math.max(0, x.qty + d) } : x)).filter((x) => x.qty > 0) });

  function makeTiers() {
    const base = (opt.items ?? []).map((x) => ({ ...x }));
    const better = [...base, ...ASSEMBLIES.filter((a) => a.betterAdd && !base.some((b) => b.id === a.id)).map((a) => fromAsm(a))];
    const best = [...better, ...(better.some((b) => b.id === 'afci') ? [] : [fromAsm(ASSEMBLIES.find((a) => a.id === 'afci')!)])];
    const mk = (id: string, label: string, its: EstItem[], benefit: string, recommended = false): QuoteOptionDef => ({ id, label, summary: '', benefit, recommended, lines: [], trip: 'none', extraHours: 0, materialsCost: 0, items: its });
    setDoc({ ...doc, options: [mk('good', 'Good', base, 'Fixes the problem.'), mk('better', 'Better', better, 'Fixes it and protects the house.', true), mk('best', 'Best', best, 'Everything, done once.')] });
    setActive(1);
  }
  function addScenario(id: string) {
    const s = SCENARIOS.find((x) => x.id === id)!;
    const its: EstItem[] = s.items.filter((i) => i.qty > 0).map((i) => fromAsm(ASSEMBLIES.find((a) => a.id === i.id)!, i.qty));
    if (s.extraHours || s.extraMaterial) its.push({ id: `${s.id}-labor`, name: s.label.split('· ')[1] ?? s.label, qty: 1, hours: s.extraHours ?? 0, material: s.extraMaterial ?? 0 });
    const o: QuoteOptionDef = { id: `${s.id}-${Date.now()}`, label: s.label, summary: s.found, benefit: `If we find: ${s.found.toLowerCase()}`, lines: [], trip: 'none', extraHours: 0, materialsCost: 0, items: its };
    setDoc({ ...doc, diagCredit: doc.diagCredit ?? diagnostic, options: [...doc.options.filter((x) => (x.items?.length || x.lines.length)), o] });
    setActive(doc.options.length);
  }

  function shareText(): string {
    const lines = doc.options.map((o, i) => `${o.label}: ${money(priced[i].total)}${o.recommended ? ' (most picked)' : ''}\n  ${(o.items ?? []).map((x) => `✓ ${x.name}${x.qty > 1 ? ` × ${x.qty}` : ''}`).join('\n  ')}`).join('\n');
    const dep = cur.depositInfo?.sentence ?? '';
    return `Tarango Electric — estimate for ${customer || 'you'}\n\nWhat I found: ${doc.found ?? ''}\n\n${lines}\n\n${dep}\nThis price holds ${ESTIMATE.quoteHoldDays} days.\n\nCorey · 417-501-4752 · tarangoelectric417@gmail.com`;
  }

  async function save() {
    if (copyIssues.length) return;
    setMsg('Saving…');
    const body = { jobId, data: JSON.stringify({ ...doc, createdOn: new Date().toISOString().slice(0, 10) }) };
    try {
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await res.json().catch(() => ({}))) as { quote?: { id: string; version: number }; error?: string };
      if (!res.ok || !j.quote) throw new Error(j.error ?? 'Save failed');
      localStorage.removeItem(DKEY);
      setSavedId(j.quote.id);
      setMsg(`Saved v${j.quote.version}. Hand the phone over →`);
    } catch (e) {
      if (!navigator.onLine) { enqueue({ url: '/api/quotes', method: 'POST', body }); setMsg('No signal — queued. It saves when you are back in range.'); }
      else setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  }

  const list = ASSEMBLIES.filter((a) => !q || a.name.toLowerCase().includes(q.toLowerCase()));
  const eff = cur.internal?.effectiveRate ?? 0;

  return (
    <div className="space-y-4 pb-44">
      <section className="panel space-y-2 p-3">
        <p className="text-base font-semibold">{customer || 'Customer'}</p>
        <Seg value={doc.tier} options={[['residential', 'Residential'], ['commercial', 'Commercial']]} onChange={(v) => setDoc({ ...doc, tier: v })} />
        <Seg value={doc.furnish ?? 'contractor'} options={[['contractor', 'I furnish materials'], ['labor', 'Labor only']]} onChange={(v) => setDoc({ ...doc, furnish: v })} />
        <div className="grid grid-cols-2 gap-2">
          <div><span className="label">Zone</span><Seg value={doc.zone} options={[[1, '1'], [2, '2'], [3, '3']] as [ZoneNumber, string][]} onChange={(v) => setDoc({ ...doc, zone: v })} /></div>
          <div><span className="label">Visits</span>
            <div className="grid grid-cols-3 gap-1">
              <button type="button" className="btn justify-center" onClick={() => setDoc({ ...doc, visits: Math.max(1, (doc.visits ?? 1) - 1) })}>−</button>
              <span className="flex items-center justify-center text-lg font-semibold">{doc.visits ?? 1}</span>
              <button type="button" className="btn justify-center" onClick={() => setDoc({ ...doc, visits: (doc.visits ?? 1) + 1 })}>+</button>
            </div></div>
        </div>
        <label className="block"><span className="label">What I found (customer sees this)</span>
          <textarea className="input" rows={2} value={doc.found ?? ''} onChange={(e) => setDoc({ ...doc, found: e.target.value })} /></label>
      </section>

      <section className="panel p-3">
        <div className="flex flex-wrap gap-1">
          {doc.options.map((o, i) => (
            <button key={o.id} type="button" onClick={() => setActive(i)} className={`btn min-h-12 ${i === active ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/20 font-semibold' : ''}`}>
              {o.label} · {money(priced[i].total)}
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className="btn-primary min-h-12" onClick={makeTiers}>Make tiers</button>
          <button type="button" className="btn min-h-12 justify-center" onClick={() => setShowScen((v) => !v)}>If we find…</button>
        </div>
        {showScen && (
          <div className="mt-2 grid grid-cols-2 gap-1">
            {SCENARIOS.map((s) => <button key={s.id} type="button" className="btn min-h-12 text-left text-sm" onClick={() => addScenario(s.id)}>{s.label}</button>)}
          </div>
        )}
        <input className="input mt-2" placeholder="One-line benefit (customer sees this)" value={opt.benefit ?? ''} onChange={(e) => setOpt({ benefit: e.target.value })} />

        <ul className="mt-3 divide-y divide-[color:var(--line)]">
          {items.map((it, k) => (
            <li key={`${it.id}-${k}`} className="py-2">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 break-words text-base">{it.name}</span>
                <button type="button" className="btn h-12 w-12 justify-center text-xl" onClick={() => step(k, -1)} aria-label="Less">−</button>
                <input className="input w-16 text-center" type="number" inputMode="decimal" value={it.qty} onChange={(e) => setOpt({ items: items.map((x, n) => (n === k ? { ...x, qty: Number(e.target.value) || 0 } : x)) })} />
                <button type="button" className="btn h-12 w-12 justify-center text-xl" onClick={() => step(k, 1)} aria-label="More">+</button>
              </div>
              <input className="input mt-1 text-sm" placeholder="Note for this line (optional)" value={it.note ?? ''} onChange={(e) => setOpt({ items: items.map((x, n) => (n === k ? { ...x, note: e.target.value } : x)) })} />
            </li>
          ))}
          {items.length === 0 && <li className="py-2 text-sm text-[color:var(--ink-muted)]">Tap an assembly below to add it.</li>}
        </ul>

        <input className="input mt-3" type="search" placeholder="Search assemblies…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          {list.map((a) => (
            <button key={a.id} type="button" className="btn min-h-14 flex-col items-start justify-center text-left" onClick={() => addItem(fromAsm(a))}>
              <span className="text-sm font-semibold">+ {a.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Material prices as of {MATERIAL_PRICES_AS_OF}. Edit in src/config/assemblies.ts.</p>

        <div className="mt-3 grid grid-cols-6 gap-2">
          <input className="input col-span-6" placeholder="Free-text line" value={free.name} onChange={(e) => setFree({ ...free, name: e.target.value })} />
          <input className="input col-span-2" type="number" inputMode="decimal" placeholder="Hours" value={free.hours} onChange={(e) => setFree({ ...free, hours: e.target.value })} />
          <input className="input col-span-2" type="number" inputMode="decimal" placeholder="Mat $" value={free.material} onChange={(e) => setFree({ ...free, material: e.target.value })} />
          <button type="button" className="btn col-span-2 justify-center" disabled={!free.name} onClick={() => { addItem({ id: `free-${Date.now()}`, name: free.name, qty: 1, hours: Number(free.hours) || 0, material: Number(free.material) || 0 }); setFree({ name: '', hours: '', material: '' }); }}>Add</button>
        </div>
      </section>

      <details className="panel p-3">
        <summary className="flex min-h-12 cursor-pointer items-center font-semibold">Discount, diagnostic credit, generator</summary>
        <div className="mt-2 space-y-2">
          <button type="button" className={`btn w-full justify-between ${doc.diagCredit ? 'border-[color:var(--go)]' : ''}`} onClick={() => setDoc({ ...doc, diagCredit: doc.diagCredit ? 0 : diagnostic })}>
            <span>Credit ${diagnostic} diagnostic (approved today)</span><span>{doc.diagCredit ? '✓' : 'No'}</span></button>
          <button type="button" className={`btn w-full justify-between ${doc.generator ? 'border-[color:var(--go)]' : ''}`} onClick={() => setDoc({ ...doc, generator: !doc.generator })}>
            <span>Generator job (deposit rule)</span><span>{doc.generator ? '✓' : 'No'}</span></button>
          <div className="grid grid-cols-3 gap-2">
            <input className="input col-span-2" placeholder="Discount label" value={doc.discount?.label ?? ''} onChange={(e) => setDoc({ ...doc, discount: { label: e.target.value, amount: doc.discount?.amount ?? 0 } })} />
            <input className="input" type="number" inputMode="decimal" placeholder="$" value={doc.discount?.amount ?? ''} onChange={(e) => setDoc({ ...doc, discount: Number(e.target.value) > 0 ? { label: doc.discount?.label || 'Discount', amount: Number(e.target.value) } : null })} />
          </div>
          {doc.options.length > 1 && <button type="button" className="btn-hazard w-full justify-center" onClick={() => { setDoc({ ...doc, options: doc.options.filter((_, k) => k !== active) }); setActive(0); }}>Remove “{opt.label}”</button>}
        </div>
      </details>

      {cur.depositInfo && (
        <section className="panel p-3 text-sm">
          <p className="font-semibold">Deposit rule: {cur.depositInfo.rule}</p>
          {cur.depositInfo.candidates.length > 1 && <ul className="mt-1 text-[color:var(--ink-muted)]">{cur.depositInfo.candidates.map((c) => <li key={c.rule}>{c.rule}: {money(c.amount)}</li>)}</ul>}
          {cur.depositInfo.schedule && <p className="mt-1">30/40/30: {money(cur.depositInfo.schedule.signing)} / {money(cur.depositInfo.schedule.roughIn)} / {money(cur.depositInfo.schedule.final)}</p>}
          <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Materials figure is at your cost (assumption).</p>
        </section>
      )}

      {copyIssues.length > 0 && <p className="text-sm text-[color:var(--hazard)]">Fix before saving: {copyIssues.map((c) => `"${c.phrase}" (${c.reason})`).join('; ')}</p>}
      {msg && <p className="text-sm">{msg}</p>}
      {savedId && <Link href={`/jobs/${jobId}/quote/${savedId}`} className="btn-primary min-h-14 w-full text-lg">Show the customer →</Link>}
      <button type="button" className="btn w-full justify-center" onClick={async () => { try { await navigator.clipboard.writeText(shareText()); setMsg('Draft text copied. You send it.'); } catch { setMsg(shareText()); } }}>Copy as text (draft you send)</button>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--line-strong)] bg-[color:var(--surface)] px-3 py-2 lg:left-60">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold tabular-nums">{money(cur.total)}</div>
            <div className="text-sm tabular-nums text-[color:var(--ink-muted)]">Deposit {money(cur.deposit)}</div>
          </div>
          <span className={`rounded px-2 py-1 text-xs font-semibold ${eff < ESTIMATE.minEffectiveRate ? 'bg-[color:var(--hazard-bg)] text-[color:var(--hazard)]' : 'bg-[color:var(--go-bg)] text-[color:var(--go)]'}`} title="Internal only">
            ${Math.round(eff)}/hr
          </span>
          <button type="button" className="btn-primary min-h-14 px-5 text-lg" disabled={copyIssues.length > 0} onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}
