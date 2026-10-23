'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** One tap per stage: opens the camera, uploads on shutter. No form. */
export function QuickPhoto({ jobId, stages, counts }: { jobId: string; stages: string[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [local, setLocal] = useState<Record<string, number>>({});

  async function upload(stage: string, files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    for (const f of Array.from(files)) form.append('file', f);
    form.append('stage', stage);
    form.append('caption', stage);
    form.append('customerOk', 'true');
    form.append('job', jobId);
    setBusy(stage);
    setLocal((l) => ({ ...l, [stage]: (l[stage] ?? 0) + files.length }));
    try {
      const res = await fetch('/api/photos', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; failed?: { reason: string }[] };
      if (!res.ok) throw new Error(data.error ?? data.failed?.[0]?.reason ?? 'Upload failed');
      setMsg({ ok: true, text: `${stage} photo saved.` });
      router.refresh();
    } catch (e) {
      setLocal((l) => ({ ...l, [stage]: Math.max(0, (l[stage] ?? 1) - files.length) }));
      setMsg({ ok: false, text: `${stage}: ${e instanceof Error ? e.message : 'failed'} — tap again when you have signal.` });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {stages.map((s) => {
          const n = (counts[s] ?? 0) + (local[s] ?? 0);
          return (
            <label key={s} className={`btn min-h-16 cursor-pointer flex-col justify-center text-center ${n === 0 ? 'border-dashed' : 'border-[color:var(--go)]'}`}>
              <span className="text-base font-semibold">📷 {s}</span>
              <span className="text-xs text-[color:var(--ink-muted)]">{busy === s ? 'Uploading…' : n ? `${n} saved` : 'none yet'}</span>
              <input type="file" accept="image/*" capture="environment" multiple className="sr-only" onChange={(e) => { void upload(s, e.target.files); e.target.value = ''; }} />
            </label>
          );
        })}
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-[color:var(--go)]' : 'text-[color:var(--hazard)]'}`}>{msg.text}</p>}
    </div>
  );
}
