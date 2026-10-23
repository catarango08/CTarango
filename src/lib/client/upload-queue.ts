'use client';

/**
 * Offline photo queue. Photos are too big for localStorage, so they wait in
 * IndexedDB and upload one at a time when there is signal (on load, on
 * 'online', and every 20 s). Same idea as the save queue in sync.ts.
 */
export interface QueuedPhoto { id: string; jobId: string; stage: string; caption: string; name: string; blob: Blob; at: number; error?: string }
type Listener = (pending: QueuedPhoto[], uploading: boolean, lastError?: string) => void;

const DB = 'te-photo-queue', STORE = 'photos';
const listeners = new Set<Listener>();
let uploading = false;
let lastError: string | undefined;

function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => { const q = fn(d.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
export const listQueued = () => tx<QueuedPhoto[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedPhoto[]>).catch(() => [] as QueuedPhoto[]);
async function emit() { const all = await listQueued(); listeners.forEach((l) => l(all, uploading, lastError)); }

export function subscribePhotos(fn: Listener): () => void {
  listeners.add(fn); void emit();
  return () => listeners.delete(fn);
}

export async function queuePhoto(p: Omit<QueuedPhoto, 'id' | 'at'>): Promise<void> {
  await tx('readwrite', (s) => s.put({ ...p, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now() }));
  void emit();
}
export async function dropQueued(id: string) { await tx('readwrite', (s) => s.delete(id)); void emit(); }

/** Upload everything waiting. Returns created photo rows (for receipts that need the id). */
export async function flushPhotos(onDone?: (q: QueuedPhoto, record: { id: string } | null) => void): Promise<void> {
  if (uploading || typeof navigator === 'undefined' || !navigator.onLine) { void emit(); return; }
  uploading = true; lastError = undefined; void emit();
  try {
    for (const q of (await listQueued()).sort((a, b) => a.at - b.at)) {
      const form = new FormData();
      form.append('file', new File([q.blob], q.name, { type: q.blob.type || 'image/jpeg' }));
      form.append('stage', q.stage); form.append('caption', q.caption); form.append('job', q.jobId); form.append('customerOk', q.stage === 'Receipt' ? 'false' : 'true');
      try {
        const res = await fetch('/api/photos', { method: 'POST', body: form });
        const data = (await res.json().catch(() => ({}))) as { created?: { id: string }[]; error?: string; failed?: { reason: string }[] };
        if (res.ok) { await tx('readwrite', (s) => s.delete(q.id)); onDone?.(q, data.created?.[0] ?? null); window.dispatchEvent(new CustomEvent('te-photo-uploaded', { detail: { jobId: q.jobId } })); }
        else if (res.status >= 400 && res.status < 500) { lastError = data.error ?? data.failed?.[0]?.reason ?? 'Rejected'; await tx('readwrite', (s) => s.delete(q.id)); }
        else { lastError = data.error ?? 'Upload failed'; break; }
      } catch { lastError = 'No signal'; break; }
      void emit();
    }
  } finally { uploading = false; void emit(); }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushPhotos());
  setInterval(() => void flushPhotos(), 20_000);
  setTimeout(() => void flushPhotos(), 1500);
}
