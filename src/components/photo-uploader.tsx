'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

import { PHOTO_STAGES } from '@/lib/schema';

export function PhotoUploader({
  jobId,
  stage: initialStage = 'Before',
  compact = false,
}: {
  jobId?: string;
  /** Pre-select the stage when the screen already knows which one is missing. */
  stage?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState(initialStage);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [customerOk, setCustomerOk] = useState(true);
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
    form.append('customerOk', String(customerOk));
    if (jobId) form.append('job', jobId);

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
            className="mt-1 block w-full text-sm text-[color:var(--ink-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--accent)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[color:var(--on-accent)] hover:file:brightness-110"
          />
        </label>
        <label className="block">
          <span className="label">Stage</span>
          <select className="input mt-1" value={stage} onChange={(e) => setStage(e.target.value)}>
            {PHOTO_STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Caption</span>
          <input className="input mt-1" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Panel cover off, before" />
        </label>
        <label className="block">
          <span className="label">Where on site</span>
          <input className="input mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Main panel, north wall" />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-[color:var(--ink-muted)]">
          <input type="checkbox" checked={customerOk} onChange={(e) => setCustomerOk(e.target.checked)} className="accent-[color:var(--accent)]" />
          Customer saw it and is OK with it
        </label>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Uploading…' : 'Attach photos'}
        </button>
      </div>

      {message && (
        <p className={`text-sm ${message.tone === 'ok' ? 'text-[color:var(--go)]' : 'text-[color:var(--hazard)]'}`}>{message.text}</p>
      )}
      <p className="text-xs text-[color:var(--ink-muted)]">
        Cover off / cover on. Files go straight into Notion storage, 20 MB each.
      </p>
    </form>
  );
}
