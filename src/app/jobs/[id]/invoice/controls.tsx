'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PrintButton() {
  return <button type="button" className="btn" onClick={() => window.print()}>Print / save PDF</button>;
}

export function InvoiceControls({ jobId, jobStatus, due, byCard, coLinks, status, statuses, payLink, linkLabel }: { jobId: string; jobStatus: string; due: number; byCard: boolean; coLinks: { id: string; label: string }[]; status: string; statuses: string[]; payLink: string; linkLabel: string }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [link, setLink] = useState(payLink);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(patch: Record<string, unknown>) {
    setMsg(null);
    const res = await fetch(`/api/records/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    setMsg(res.ok ? 'Saved.' : (((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Save failed'));
    if (res.ok) router.refresh();
  }

  const [blocking, setBlocking] = useState<string[]>([]);
  async function markPaid(method: string) {
    await save({ invoiceStatus: 'Paid', status: 'Paid', paid: true, paymentMethod: method === 'Zelle' ? 'ACH' : method });
  }
  async function close() {
    setBlocking([]);
    const res = await fetch(`/api/jobs/${jobId}/close`, { method: 'POST' });
    const j = await res.json().catch(() => ({}));
    if (res.ok) { setMsg('Job closed and paid.'); router.refresh(); } else setBlocking(j.blocking ?? [j.error ?? 'Could not close']);
  }
  const paid = s === 'Paid' || status === 'Paid';
  return (
    <div className="space-y-3">
    <div className="panel p-3">
      <p className="text-base font-semibold">Balance {paid ? 'paid' : `due $${due.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}</p>
      {!paid ? (<>
        <p className="mt-2 text-sm">Got paid? Tap how:</p>
        <div className="mt-1 grid grid-cols-4 gap-2">{['Cash', 'Check', 'Zelle', 'Card'].map((m) => <button key={m} type="button" className="btn min-h-12 justify-center" onClick={() => markPaid(m)}>{m}</button>)}</div>
        <a className="mt-2 inline-flex min-h-12 items-center underline" href={byCard ? `?` : `?card=1`}>{byCard ? 'Remove card fee' : 'Paying by card? Add 2.5% fee'}</a>
      </>) : jobStatus !== 'Closed' ? (
        <button type="button" className="btn-primary mt-2 min-h-14 w-full text-base" onClick={close}>Close job ✓</button>
      ) : <p className="mt-1 text-sm text-[color:var(--go)]">Closed.</p>}
      {blocking.length > 0 && (
        <div className="mt-2 space-y-2">
          <p className="text-sm font-semibold text-[color:var(--hazard)]">Before closing:</p>
          {blocking.map((b) => {
            const fix: Record<string, Record<string, unknown>> = { 'Two magnets left': { magnets: true }, 'Paid checked — or Net 15 written': { paid: true } };
            return fix[b]
              ? <button key={b} type="button" className="btn min-h-12 w-full justify-start" onClick={async () => { await save(fix[b]); await close(); }}>☐ {b} — tap if done</button>
              : <a key={b} className="btn min-h-12 w-full justify-start" href={`/jobs/${jobId}/onsite`}>→ {b}</a>;
          })}
        </div>
      )}
      {coLinks.map((c) => <a key={c.id} className="mt-2 flex min-h-12 items-center underline" href={`?co=${c.id}`}>{c.label}</a>)}
    </div>
    <details className="panel p-3 text-sm"><summary className="min-h-12 cursor-pointer font-semibold">Invoice status · Stripe link</summary>
    <div className="mt-2 flex flex-wrap items-end gap-3">
      <label>Invoice Status
        <select className="input" value={s} onChange={(e) => { setS(e.target.value); void save({ invoiceStatus: e.target.value }); }}>
          {statuses.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="min-w-64 flex-1">{linkLabel} (paste from Stripe)
        <input type="url" className="input" placeholder="https://buy.stripe.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
      </label>
      <button type="button" className="btn-primary" onClick={() => save({ payLink: link.trim() || null })}>Save link</button>
    </div></details>
      {msg && <span>{msg}</span>}
    </div>
  );
}
