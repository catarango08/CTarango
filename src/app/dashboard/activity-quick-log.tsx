'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ACTIVITY_TYPES } from '@/lib/schema/activity-log';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** One tap per touch. Writes a row to the Activity Log. */
export function ActivityQuickLog() {
  const router = useRouter();
  const [type, setType] = useState<string>('Call');
  const [count, setCount] = useState('1');
  const [day, setDay] = useState(today());
  const [contact, setContact] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const n = Math.max(1, Number(count) || 1);
    const name = `${type}${n > 1 ? ` (${n})` : ''}${contact ? ` — ${contact}` : ''}`;
    try {
      const res = await fetch('/api/records/activityLog', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, date: day, type, count: n, contact, outcome, notes }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
      setMsg(`Logged: ${name}`);
      setContact('');
      setOutcome('');
      setNotes('');
      setCount('1');
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={t === type ? 'btn btn-primary' : 'btn'}>{t}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs"><span className="label">Date</span><input className="input mt-1 w-full" type="date" value={day} onChange={(e) => setDay(e.target.value)} required /></label>
        <label className="text-xs"><span className="label">How many</span><input className="input mt-1 w-full" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} /></label>
      </div>
      <input className="input w-full" placeholder="Contact" value={contact} onChange={(e) => setContact(e.target.value)} />
      <input className="input w-full" placeholder="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      <textarea className="input w-full" rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Log it'}</button>
      {msg && <p className="text-xs text-[color:var(--ink-muted)]">{msg}</p>}
    </form>
  );
}
