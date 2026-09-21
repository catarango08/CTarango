'use client';

import { useState } from 'react';

/**
 * Site conditions — the field Corey fills in standing there. Saves on blur so
 * he never has to hunt for a save button with one thumb; shows a plain
 * saved/failed indicator instead.
 */
export function SiteNotes({ jobId, initialValue }: { jobId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [status, setStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');

  async function save() {
    if (value === saved) return;
    setStatus('saving');
    try {
      const res = await fetch(`/api/records/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteConditions: value }),
      });
      if (!res.ok) throw new Error();
      setSaved(value);
      setStatus('ok');
    } catch {
      setStatus('err');
    }
  }

  return (
    <div>
      <textarea
        className="input min-h-40"
        rows={6}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        placeholder="Access, hazards, what the panel actually is, where the dog is."
      />
      <p className="mt-1.5 text-xs text-[color:var(--ink-muted)]">
        {status === 'saving' && 'Saving…'}
        {status === 'ok' && 'Saved.'}
        {status === 'err' && <span className="text-[color:var(--hazard)]">Could not save — tap away again to retry.</span>}
        {status === 'idle' && 'Saves when you tap out of the box.'}
      </p>
    </div>
  );
}
