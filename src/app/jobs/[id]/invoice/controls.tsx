'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function PrintButton() {
  return <button type="button" className="btn" onClick={() => window.print()}>Print / save PDF</button>;
}

export function InvoiceControls({ jobId, status, statuses, payLink, linkLabel }: { jobId: string; status: string; statuses: string[]; payLink: string; linkLabel: string }) {
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

  return (
    <div className="panel flex flex-wrap items-end gap-3 p-3 text-sm">
      <label>Invoice Status
        <select className="input" value={s} onChange={(e) => { setS(e.target.value); void save({ invoiceStatus: e.target.value }); }}>
          {statuses.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className="min-w-64 flex-1">{linkLabel} (paste from Stripe)
        <input type="url" className="input" placeholder="https://buy.stripe.com/…" value={link} onChange={(e) => setLink(e.target.value)} />
      </label>
      <button type="button" className="btn-primary" onClick={() => save({ payLink: link.trim() || null })}>Save link</button>
      {msg && <span>{msg}</span>}
    </div>
  );
}
