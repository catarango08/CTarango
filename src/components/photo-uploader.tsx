'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const STAGES = [
  'Before', 'During', 'After', 'Damage / Existing Condition', 'Code Violation',
  'Equipment Label', 'Meter / Serial', 'Permit', 'Thermal Scan', 'Completion',
];

export function PhotoUploader({
  jobId,
  customerId,
  propertyId,
  compact = false,
}: {
  jobId?: string;
  customerId?: string;
  propertyId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState('Before');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [includeInReport, setIncludeInReport] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const files = inputRef.current?.files;
    if (!files || files.length === 0) {
      setMessage({ tone: 'err', text: 'Pick at least one photo first.' });
      return;
    }

    const form = new FormData();
    for (const file of Array.from(files)) form.append('file', file);
    form.append('stage', stage);
    if (caption) form.append('caption', caption);
    if (location) form.append('location', location);
    form.append('includeInReport', String(includeInReport));
    if (jobId) form.append('job', jobId);
    if (customerId) form.append('customer', customerId);
    if (propertyId) form.append('property', propertyId);

    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: form });
      const data = (await res.json()) as { created?: unknown[]; failed?: { name: string; reason: string }[]; error?: string };
      if (!res.ok && !data.created?.length) {
        setMessage({ tone: 'err', text: data.error ?? data.failed?.[0]?.reason ?? 'Upload failed.' });
      } else {
        const okCount = data.created?.length ?? 0;
        const failCount = data.failed?.length ?? 0;
        setMessage({
          tone: failCount ? 'err' : 'ok',
          text: failCount
            ? `${okCount} uploaded, ${failCount} failed: ${data.failed?.[0]?.reason ?? ''}`
            : `${okCount} photo${okCount === 1 ? '' : 's'} attached.`,
        });
        setCaption('');
        if (inputRef.current) inputRef.current.value = '';
        router.refresh();
      }
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Upload failed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel-2 space-y-3 p-3">
      <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className="block">
          <span className="label">Photos</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="mt-1 block w-full text-sm text-[color:var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-volt-400 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-volt-300"
          />
        </label>
        <label className="block">
          <span className="label">Stage</span>
          <select className="input mt-1" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Caption</span>
          <input className="input mt-1" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Existing panel, double-tapped breakers" />
        </label>
        <label className="block">
          <span className="label">Where on site</span>
          <input className="input mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main panel, garage wall" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
          <input type="checkbox" checked={includeInReport} onChange={(e) => setIncludeInReport(e.target.checked)} className="accent-volt-400" />
          Include in the customer report
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Uploading…' : 'Attach photos'}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>{message.text}</p>
      )}
      <p className="text-xs text-[color:var(--muted)]">
        Files go straight into Notion storage (20 MB each) and land on the job, the customer and the location at once.
      </p>
    </form>
  );
}
