'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const DRAFT = 'te-draft:new-customer';

export function NewCustomerForm() {
  const router = useRouter();
  const [v, setV] = useState({ name: '', phone: '', town: '', address: '', notes: '', preferredContact: 'Call' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { const d = localStorage.getItem(DRAFT); if (d) setV(JSON.parse(d)); }, []);
  function set(k: keyof typeof v, val: string) { const n = { ...v, [k]: val }; setV(n); localStorage.setItem(DRAFT, JSON.stringify(n)); }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/records/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, stage: 'New' }) });
      const b = (await res.json().catch(() => ({}))) as { record?: { id: string }; error?: string };
      if (!res.ok || !b.record) throw new Error(b.error ?? `Save failed (${res.status})`);
      localStorage.removeItem(DRAFT);
      router.push(`/customers/${b.record.id}`);
    } catch (x) { setErr(`${x instanceof Error ? x.message : 'Save failed'}. Your typing is kept on this phone.`); setBusy(false); }
  }
  const row = (k: keyof typeof v, label: string, type = 'text', mode?: 'tel' | 'text') => (
    <label className="block"><span className="label mb-1 block">{label}</span>
      <input className="input" type={type} inputMode={mode} value={v[k]} onChange={(e) => set(k, e.target.value)} required={k === 'name'} /></label>
  );
  return (
    <form onSubmit={save} className="panel space-y-3 p-4">
      {row('name', 'Name')}
      {row('phone', 'Phone', 'tel', 'tel')}
      {row('town', 'Town')}
      {row('address', 'Address (internal only)')}
      <label className="block"><span className="label mb-1 block">Prefers</span>
        <div className="grid grid-cols-2 gap-2">{['Call', 'Text'].map((o) => (
          <button key={o} type="button" onClick={() => set('preferredContact', o)} className={`btn justify-center ${v.preferredContact === o ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/15' : ''}`}>{o}</button>
        ))}</div></label>
      <label className="block"><span className="label mb-1 block">Notes</span>
        <textarea className="input min-h-24" value={v.notes} onChange={(e) => set('notes', e.target.value)} /></label>
      <button className="btn-primary min-h-14 w-full text-lg" disabled={busy}>{busy ? 'Saving…' : 'Save customer'}</button>
      {err && <p className="text-sm text-[color:var(--hazard)]">{err}</p>}
    </form>
  );
}
