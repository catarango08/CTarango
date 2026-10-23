'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { compressImage } from '@/lib/client/image';
import { flushPhotos, listQueued, queuePhoto } from '@/lib/client/upload-queue';

/** One tap per stage: opens the camera, uploads on shutter. No form. */
export function QuickPhoto({ jobId, stages, counts }: { jobId: string; stages: string[]; counts: Record<string, number> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [local, setLocal] = useState<Record<string, number>>({});

  async function upload(stage: string, files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setBusy(stage);
    setLocal((l) => ({ ...l, [stage]: (l[stage] ?? 0) + list.length }));
    try {
      for (const f of list) await queuePhoto({ jobId, stage, caption: stage, name: f.name.replace(/\.\w+$/, '') + '.jpg', blob: await compressImage(f) });
      await flushPhotos();
      const left = (await listQueued()).length;
      setMsg(left ? { ok: false, text: `${stage}: saved on this phone — uploads when you have signal.` } : { ok: true, text: `${stage} photo saved.` });
      router.refresh();
    } catch (e) {
      setLocal((l) => ({ ...l, [stage]: Math.max(0, (l[stage] ?? 1) - list.length) }));
      setMsg({ ok: false, text: `${stage}: ${e instanceof Error ? e.message : 'failed'} — tap again.` });
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
