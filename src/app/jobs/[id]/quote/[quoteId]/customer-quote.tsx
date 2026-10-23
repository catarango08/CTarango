'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { priceOption, type QuoteDoc } from '@/lib/domain/options';
import type { Pricing } from '@/lib/domain/pricing';
import { patchRecord } from '@/lib/client/sync';

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: Number.isInteger(Math.round(Math.abs(n) * 100) / 100) ? 0 : 2, maximumFractionDigits: 2 })}`;
const REASONS = ['Price', 'Spouse', 'Timing', 'Other quotes', 'Other'];

interface Props {
  quoteId: string; jobId: string; version: number; status: string; first: string; town: string;
  business: { name: string; phone: string; email: string; tagline: string };
  doc: QuoteDoc; pricing: Pricing; accepted: { optionId: string; addOns: string[] } | null; signedBy: string;
  photo?: string; expires: string; payLink: string; depositIn: boolean; scheduled: string;
}

/**
 * The customer's screen, one step at a time, big text. Names and totals only:
 * no hours, rates, labor/material split, or street address.
 */
export function CustomerQuote(p: Props) {
  const router = useRouter();
  const done = p.status === 'Accepted';
  const [step, setStep] = useState(done ? 5 : 1);
  const [optionId, setOptionId] = useState(p.accepted?.optionId ?? (p.doc.options.find((o) => o.recommended) ?? p.doc.options[0])?.id);
  const [addOns, setAddOns] = useState<string[]>(p.accepted?.addOns ?? []);
  const [name, setName] = useState(p.signedBy);
  const [signed, setSigned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paid, setPaid] = useState<string | null>(p.depositIn ? 'received' : null);
  const [when, setWhen] = useState(p.scheduled);
  const [notToday, setNotToday] = useState<string | null>(null);
  const [ntDone, setNtDone] = useState<string | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const option = p.doc.options.find((o) => o.id === optionId) ?? p.doc.options[0];
  const priced = useMemo(() => priceOption(p.doc, option, p.pricing, addOns), [p.doc, option, p.pricing, addOns]);
  const dep = priced.depositInfo;
  const depositSentence = dep?.sentence ?? (priced.deposit ? `To schedule your job, a deposit of ${money(priced.deposit)} is due at signing and is credited in full to your final invoice.` : 'No deposit is required to schedule this job; payment is due on completion.');

  useEffect(() => {
    const c = canvas.current; if (!c || step !== 4) return;
    const ctx = c.getContext('2d')!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio; c.height = c.clientHeight * ratio; ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    let drawing = false;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] as const; };
    const down = (e: PointerEvent) => { drawing = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setSigned(true); };
    const up = () => { drawing = false; };
    c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up);
    return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); };
  }, [step]);

  function clear() { const c = canvas.current; if (!c) return; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setSigned(false); }

  async function accept() {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/quotes/${p.quoteId}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionId: option.id, addOns, signedBy: name, signature: canvas.current!.toDataURL('image/png') }) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) { setErr(res ? ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save' : 'No signal. Stay on this screen and tap again when you have a bar.'); return; }
    setStep(5);
    router.refresh();
  }

  async function decline(reason: string) {
    const res = await fetch(`/api/quotes/${p.quoteId}/decline`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }).catch(() => null);
    setNtDone(res?.ok ? 'Thanks — Corey will call you in two days.' : 'Saved on this phone; Corey will follow up.');
  }

  const big = 'min-h-14 w-full rounded-lg px-4 text-lg font-semibold';
  const Next = ({ to, label, disabled }: { to: number; label: string; disabled?: boolean }) => (
    <button type="button" className={`${big} mt-5 bg-neutral-900 text-white disabled:opacity-40`} disabled={disabled} onClick={() => setStep(to)}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-md bg-white p-4 text-[17px] text-neutral-900">
      <header className="border-b-4 border-[#f2b705] pb-3">
        <p className="text-xl font-bold">{p.business.name}</p>
        <p className="text-sm italic">{p.business.tagline}</p>
        <p className="mt-1 text-sm">{p.business.phone} · {p.business.email}</p>
      </header>
      <p className="mt-2 text-sm text-neutral-600">Estimate v{p.version}{p.town ? ` · ${p.town}` : ''} · Step {Math.min(step, 6)} of 6</p>

      {step === 1 && (
        <section className="mt-3">
          <h1 className="text-2xl font-bold">What I found</h1>
          {p.photo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.photo} alt="What I found" className="mt-3 aspect-[4/3] w-full rounded-lg object-cover" />}
          <p className="mt-3 whitespace-pre-wrap text-lg">{p.doc.found || p.doc.scope || 'Here is what I would do.'}</p>
          <Next to={2} label="See your options →" />
        </section>
      )}

      {step === 2 && (
        <section className="mt-3 space-y-3">
          <h1 className="text-2xl font-bold">Pick one</h1>
          {p.doc.options.filter((o, i, arr) => i === 0 || priceOption(p.doc, o, p.pricing, addOns).total !== priceOption(p.doc, arr[i - 1], p.pricing, addOns).total).map((o) => {
            const t = priceOption(p.doc, o, p.pricing, addOns).total;
            const sel = o.id === option.id;
            const checks = (o.items ?? []).filter((i) => i.qty > 0).map((i) => `${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''}`).concat(o.lines.map((l) => l.name));
            return (
              <button key={o.id} type="button" onClick={() => setOptionId(o.id)} className={`block w-full rounded-xl border-4 p-4 text-left ${sel ? 'border-[#f2b705] bg-amber-50' : 'border-neutral-200'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">{o.label}</span>
                  {o.recommended && <span className="rounded bg-[#f2b705] px-2 py-0.5 text-sm font-bold">Most picked</span>}
                  <span className="ml-auto text-xl font-bold tabular-nums">{money(t)}</span>
                </div>
                {(o.benefit || o.summary) && <p className="mt-1 text-base text-neutral-700">{o.benefit || o.summary}</p>}
                <ul className="mt-2 space-y-1 text-base">{checks.map((c, i) => <li key={i}>✓ {c}</li>)}</ul>
              </button>
            );
          })}
          {p.doc.addOns.length > 0 && (
            <div className="rounded-xl border p-3">
              <p className="font-semibold">Extras (tick any)</p>
              {p.doc.addOns.map((a) => (
                <label key={a.id} className="flex min-h-12 items-center gap-3">
                  <input type="checkbox" className="h-6 w-6" checked={addOns.includes(a.id)} onChange={(e) => setAddOns(e.target.checked ? [...addOns, a.id] : addOns.filter((x) => x !== a.id))} />
                  <span className="flex-1">{a.name}</span><span className="tabular-nums">+{money(a.price * a.quantity)}</span>
                </label>
              ))}
            </div>
          )}
          <Next to={3} label={`${option.label} · ${money(priced.total)} →`} />
          <button type="button" className={`${big} border-2 border-neutral-300`} onClick={() => setNotToday('ask')}>Not today</button>
          {notToday && !ntDone && (
            <div className="rounded-xl border-2 border-neutral-300 p-3">
              <p className="font-semibold">No problem. What’s holding you back?</p>
              <div className="mt-2 grid grid-cols-2 gap-2">{REASONS.map((r) => <button key={r} type="button" className="min-h-12 rounded border-2 border-neutral-300" onClick={() => decline(r)}>{r}</button>)}</div>
            </div>
          )}
          {ntDone && <p className="rounded bg-neutral-100 p-3">{ntDone}</p>}
        </section>
      )}

      {step === 3 && (
        <section className="mt-3">
          <h1 className="text-2xl font-bold">{option.label}</h1>
          <div className="mt-3 rounded-xl bg-neutral-50 p-4">
            <div className="flex justify-between text-2xl font-bold"><span>Total</span><span className="tabular-nums">{money(priced.total)}</span></div>
            <div className="mt-2 flex justify-between text-xl"><span>Deposit</span><span className="font-semibold tabular-nums">{priced.deposit ? money(priced.deposit) : 'None'}</span></div>
            {priced.discount > 0 && <p className="mt-2 text-base text-green-700">Includes {money(priced.discount)} off.</p>}
          </div>
          <p className="mt-3 text-base">{depositSentence}</p>
          <p className="mt-2 text-base font-semibold">This price holds 14 days (through {p.expires}).</p>
          <Next to={4} label="Sign →" />
          <button type="button" className="mt-2 min-h-12 w-full underline" onClick={() => setStep(2)}>← Back to options</button>
        </section>
      )}

      {step === 4 && !done && (
        <section className="mt-3">
          <h1 className="text-2xl font-bold">Sign to approve</h1>
          <label className="mt-3 block text-base font-semibold">Your name
            <input className="mt-1 min-h-12 w-full rounded border-2 border-neutral-300 p-2 text-lg" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
          <p className="mt-3 text-base font-semibold">Sign with your finger</p>
          <canvas ref={canvas} className="mt-1 h-48 w-full touch-none rounded-lg border-2 border-dashed border-neutral-400 bg-white" aria-label="Signature pad" />
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" className="min-h-14 rounded-lg border-2" onClick={clear}>Clear</button>
            <button type="button" className="col-span-2 min-h-14 rounded-lg bg-neutral-900 px-4 text-lg font-semibold text-white disabled:opacity-40" disabled={!signed || !name.trim() || busy} onClick={accept}>
              {busy ? 'Saving…' : `Approve ${money(priced.total)}`}
            </button>
          </div>
          {err && <p className="mt-2 text-base text-red-700">{err}</p>}
          <p className="mt-2 text-sm text-neutral-600">By signing you approve {option.label} at {money(priced.total)}. {depositSentence}</p>
          <button type="button" className="mt-2 min-h-12 w-full underline" onClick={() => setStep(3)}>← Back</button>
        </section>
      )}

      {step === 5 && (
        <section className="mt-3">
          <p className="rounded-lg bg-green-50 p-3 text-lg font-semibold text-green-800">Approved{p.signedBy || name ? ` — signed by ${p.signedBy || name}` : ''}. Thank you!</p>
          <h1 className="mt-4 text-2xl font-bold">Deposit {priced.deposit ? money(priced.deposit) : ''}</h1>
          {priced.deposit > 0 ? (
            <div className="mt-3 space-y-2">
              {p.payLink ? <a href={p.payLink} className={`${big} flex items-center justify-center bg-neutral-900 text-white`}>Pay by card ({money(priced.deposit + (dep?.cardFee ?? 0))} incl. 2.5% card fee)</a>
                : <p className="text-base text-neutral-600">Card link not set on this job yet.</p>}
              <div className="grid grid-cols-3 gap-2">
                {['Zelle', 'Check', 'Cash'].map((m) => (
                  <button key={m} type="button" className={`min-h-14 rounded-lg border-2 ${paid === m ? 'border-green-600 bg-green-50' : 'border-neutral-300'}`}
                    onClick={() => { setPaid(m); patchRecord('jobs', p.jobId, { depositIn: true, deposit: priced.deposit, paymentMethod: m === 'Zelle' ? 'ACH' : m }); }}>{m} received</button>
                ))}
              </div>
              {paid && <p className="text-base text-green-700">Deposit marked received{paid !== 'received' ? ` (${paid})` : ''}.</p>}
            </div>
          ) : <p className="mt-2 text-base">No deposit needed.</p>}
          <Next to={6} label="Pick a date →" />
        </section>
      )}

      {step === 6 && (
        <section className="mt-3">
          <h1 className="text-2xl font-bold">When should I come back?</h1>
          <input type="datetime-local" className="mt-3 min-h-14 w-full rounded border-2 border-neutral-300 p-2 text-lg" value={when} onChange={(e) => setWhen(e.target.value)} />
          <button type="button" className={`${big} mt-4 bg-neutral-900 text-white disabled:opacity-40`} disabled={!when}
            onClick={() => { patchRecord('jobs', p.jobId, { scheduledAt: new Date(when).toISOString(), status: 'Scheduled', onSite: when.slice(0, 10) }); setStep(7); }}>Put it on the calendar</button>
        </section>
      )}

      {step === 7 && <p className="mt-4 rounded-lg bg-green-50 p-3 text-lg font-semibold text-green-800">You’re on the schedule for {new Date(when).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. See you then.</p>}

      <p className="mt-6 text-center text-sm text-neutral-500">Questions? {p.business.phone}</p>
    </div>
  );
}
