'use client';

import { useEffect, useState } from 'react';
import { enqueue } from '@/lib/client/sync';

const LS = (id: string) => `te-timer:${id}`;

/**
 * Arrived → Start work → Done. Each stamp is optimistic: the screen moves on
 * at once, the write goes through the offline queue, Done also logs install
 * hours to the Hour Ledger on the server.
 */
export function WorkTimer({ jobId, arrived, started, done }: { jobId: string; arrived?: string; started?: string; done?: string }) {
  const [t, setT] = useState({ arrived, started, done });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const raw = localStorage.getItem(LS(jobId));
    if (raw) setT((x) => ({ ...JSON.parse(raw), ...Object.fromEntries(Object.entries(x).filter(([, v]) => v)) }));
    const i = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(i);
  }, [jobId]);

  function stamp(action: 'arrive' | 'start' | 'done') {
    const at = new Date().toISOString();
    const key = action === 'arrive' ? 'arrived' : action === 'start' ? 'started' : 'done';
    const next = { ...t, [key]: at };
    setT(next);
    localStorage.setItem(LS(jobId), JSON.stringify(next));
    enqueue({ url: `/api/jobs/${jobId}/timer`, method: 'POST', body: { action, at } });
  }

  const mins = (a?: string, b?: string) => (a ? Math.max(0, Math.round(((b ? Date.parse(b) : now) - Date.parse(a)) / 60000)) : 0);
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;
  const clock = (s?: string) => (s ? new Date(s).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');

  return (
    <div className="space-y-2">
      {!t.arrived ? (
        <button type="button" className="btn-primary min-h-16 w-full text-lg" onClick={() => stamp('arrive')}>I&apos;m here — Arrived</button>
      ) : (
        <p className="text-base">Arrived {clock(t.arrived)} · on site {fmt(mins(t.arrived, t.done))}</p>
      )}
      {t.arrived && !t.started && (
        <button type="button" className="btn-primary min-h-14 w-full text-lg" onClick={() => stamp('start')}>Start work timer</button>
      )}
      {t.started && (
        <p className="text-base">Working since {clock(t.started)} · {fmt(mins(t.started, t.done))}{t.done ? ` · done ${clock(t.done)}` : ''}</p>
      )}
      {t.started && !t.done && (
        <button type="button" className="btn min-h-14 w-full justify-center text-lg" onClick={() => stamp('done')}>Done — stop timer + log hours</button>
      )}
    </div>
  );
}
