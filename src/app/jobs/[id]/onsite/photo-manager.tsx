'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { compressImage } from '@/lib/client/image';
import { dropQueued, flushPhotos, queuePhoto, subscribePhotos, type QueuedPhoto } from '@/lib/client/upload-queue';

export const PHOTO_TAGS = ['Before', 'Panel', 'Completed work', 'Other'] as const;
const short = (t: string) => (t === 'Completed work' ? 'Completed' : t);

interface Saved { id: string; url: string; stage: string; caption: string }
interface Staged { key: string; file: File; url: string; tag: string }

/**
 * Pick many photos from the gallery or shoot with the camera, tag each one,
 * then save. Photos are shrunk on the phone and wait in an offline queue.
 */
export function PhotoManager({ jobId, saved }: { jobId: string; saved: Saved[] }) {
  const router = useRouter();
  const [tag, setTag] = useState<string>('Before');
  const [staged, setStaged] = useState<Staged[]>([]);
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [retag, setRetag] = useState<Record<string, string>>({});

  useEffect(() => subscribePhotos((q, up, e) => { setQueue(q.filter((x) => x.jobId === jobId && x.stage !== 'Receipt')); setUploading(up); setErr(e); }), [jobId]);
  useEffect(() => { const h = () => router.refresh(); window.addEventListener('te-photo-uploaded', h); return () => window.removeEventListener('te-photo-uploaded', h); }, [router]);
  const queuedUrls = useMemo(() => queue.map((q) => ({ id: q.id, url: URL.createObjectURL(q.blob), stage: q.stage })), [queue]);
  useEffect(() => () => queuedUrls.forEach((q) => URL.revokeObjectURL(q.url)), [queuedUrls]);

  function add(files: FileList | null) {
    if (!files?.length) return;
    const picked = Array.from(files); // copy now: the input is cleared right after, which empties the live FileList
    setStaged((s) => [...s, ...picked.map((file) => ({ key: `${file.name}-${file.size}-${Math.random()}`, file, url: URL.createObjectURL(file), tag }))]);
  }
  function remove(key: string) { setStaged((s) => { const x = s.find((i) => i.key === key); if (x) URL.revokeObjectURL(x.url); return s.filter((i) => i.key !== key); }); }

  async function saveAll() {
    setBusy(true);
    try {
      for (const s of staged) await queuePhoto({ jobId, stage: s.tag, caption: s.tag, name: s.file.name.replace(/\.\w+$/, '') + '.jpg', blob: await compressImage(s.file) });
      staged.forEach((s) => URL.revokeObjectURL(s.url));
      setStaged([]);
      await flushPhotos();
      if (navigator.onLine) router.refresh();
    } finally { setBusy(false); }
  }

  async function removeSaved(id: string) {
    if (!confirm('Remove this photo from the job?')) return;
    setGone((g) => new Set(g).add(id));
    const res = await fetch(`/api/records/jobPhotos/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) { setGone((g) => { const n = new Set(g); n.delete(id); return n; }); alert('Could not remove it — try again with signal.'); return; }
    if (navigator.onLine) router.refresh();
  }
  async function retagSaved(id: string, stage: string) {
    setRetag((r) => ({ ...r, [id]: stage }));
    await fetch(`/api/records/jobPhotos/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stage }) }).catch(() => null);
    if (navigator.onLine) router.refresh();
  }

  const visible = saved.filter((p) => !gone.has(p.id) && p.stage !== 'Receipt');
  const tagOpts = (cur: string) => [...new Set([...PHOTO_TAGS, cur])];

  return (
    <div className="space-y-3" data-testid="photo-manager">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--ink-muted)]">New photos are tagged</p>
        <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Tag for new photos">
          {PHOTO_TAGS.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={tag === t} onClick={() => setTag(t)}
              className={`btn min-h-12 justify-center px-1 text-center text-sm ${tag === t ? 'btn-primary' : ''}`}>{short(t)}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="btn min-h-14 cursor-pointer justify-center text-center text-base font-semibold">
          🖼️ Pick from gallery
          <input data-testid="gallery-input" type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        </label>
        <label className="btn min-h-14 cursor-pointer justify-center text-center text-base font-semibold">
          📸 Take photo
          <input data-testid="camera-input" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {staged.length > 0 && (
        <div className="rounded-lg border border-dashed border-[color:var(--line)] p-2">
          <div className="grid grid-cols-3 gap-2">
            {staged.map((s) => (
              <figure key={s.key} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="" className="aspect-square w-full rounded object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => remove(s.key)} className="absolute right-0 top-0 flex h-12 w-12 items-start justify-end p-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white">✕</span>
                </button>
                <select aria-label="Photo tag" value={s.tag} onChange={(e) => setStaged((all) => all.map((i) => (i.key === s.key ? { ...i, tag: e.target.value } : i)))}
                  className="input mt-1 min-h-12 w-full px-1 text-sm">
                  {PHOTO_TAGS.map((t) => <option key={t} value={t}>{short(t)}</option>)}
                </select>
              </figure>
            ))}
          </div>
          <button type="button" disabled={busy} onClick={() => void saveAll()} className="btn btn-primary mt-2 min-h-12 w-full text-base">
            {busy ? 'Saving…' : `Save ${staged.length} photo${staged.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {queuedUrls.length > 0 && (
        <div className="rounded-lg bg-[color:var(--surface-2)] p-2 text-sm">
          <p className="mb-1 font-semibold">{uploading ? 'Uploading…' : `${queuedUrls.length} waiting for signal`}{err && !uploading ? ` — ${err}` : ''}</p>
          <div className="grid grid-cols-5 gap-1">
            {queuedUrls.map((q) => (
              <div key={q.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.url} alt="" className="aspect-square w-full rounded object-cover opacity-70" />
                {!uploading && <button type="button" aria-label="Cancel upload" onClick={() => void dropQueued(q.id)} className="absolute inset-0 text-xs text-white">✕</button>}
              </div>
            ))}
          </div>
          {!uploading && <button type="button" onClick={() => void flushPhotos()} className="btn mt-2 min-h-12 w-full">Retry now</button>}
        </div>
      )}

      {visible.length > 0 ? (
        <div className="grid grid-cols-3 gap-2" data-testid="saved-photos">
          {visible.map((p) => (
            <figure key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption} loading="lazy" className="aspect-square w-full rounded object-cover" />
              <button type="button" aria-label="Remove saved photo" onClick={() => void removeSaved(p.id)} className="absolute right-0 top-0 flex h-12 w-12 items-start justify-end p-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/75 text-white">✕</span>
              </button>
              <select aria-label="Saved photo tag" value={retag[p.id] ?? p.stage} onChange={(e) => void retagSaved(p.id, e.target.value)} className="input mt-1 min-h-12 w-full px-1 text-sm">
                {tagOpts(retag[p.id] ?? p.stage).map((t) => <option key={t} value={t}>{short(t)}</option>)}
              </select>
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ink-muted)]">No photos yet. Before, panel, and completed work are required to close.</p>
      )}
    </div>
  );
}
