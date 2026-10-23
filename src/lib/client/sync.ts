'use client';

/**
 * Offline-safe writes. Every PATCH/POST goes into a localStorage queue first,
 * then flushes. Bad signal in a driveway never loses a keystroke: the queue
 * survives reloads and retries when the browser says it is back online.
 */

export interface QueuedWrite {
  id: string;
  url: string;
  method: 'PATCH' | 'POST';
  body: unknown;
  at: number;
  key?: string; // coalesce key: later writes to the same key replace earlier ones
}

type Status = 'idle' | 'saving' | 'saved' | 'offline' | 'failed';
const QKEY = 'te-write-queue-v1';
const listeners = new Set<(s: Status, pending: number, error?: string) => void>();
let status: Status = 'idle';
let lastError: string | undefined;
let flushing = false;

function read(): QueuedWrite[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(QKEY) ?? '[]') as QueuedWrite[];
  } catch {
    return [];
  }
}
function write(q: QueuedWrite[]) {
  localStorage.setItem(QKEY, JSON.stringify(q));
}
function emit(s: Status, err?: string) {
  status = s;
  lastError = err;
  const n = read().length;
  listeners.forEach((l) => l(s, n, err));
}

export function subscribe(fn: (s: Status, pending: number, error?: string) => void): () => void {
  listeners.add(fn);
  fn(status, read().length, lastError);
  return () => listeners.delete(fn);
}

export function enqueue(w: Omit<QueuedWrite, 'id' | 'at'>): void {
  let q = read();
  if (w.key && w.method === 'PATCH') {
    // Merge field patches to the same record so a flaky hour sends one request.
    const i = q.findIndex((x) => x.key === w.key);
    if (i >= 0) {
      q[i] = { ...q[i], body: { ...(q[i].body as object), ...(w.body as object) }, at: Date.now() };
      write(q);
      void flush();
      return;
    }
  }
  q = [...q, { ...w, id: Math.random().toString(36).slice(2), at: Date.now() }];
  write(q);
  void flush();
}

export async function flush(): Promise<void> {
  if (flushing || typeof window === 'undefined') return;
  flushing = true;
  try {
    let q = read();
    if (q.length === 0) return;
    if (!navigator.onLine) return emit('offline');
    emit('saving');
    while (q.length) {
      const w = q[0];
      let res: Response;
      try {
        res = await fetch(w.url, { method: w.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w.body) });
      } catch {
        return emit('offline');
      }
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string; issues?: unknown };
        if (res.status >= 500 || res.status === 401) return emit('failed', b.error ?? `Server said ${res.status}`);
        // 4xx validation: drop it so it does not block the queue, but say so.
        write(read().filter((x) => x.id !== w.id));
        return emit('failed', b.error ?? `Rejected (${res.status})`);
      }
      q = read().filter((x) => x.id !== w.id);
      write(q);
    }
    emit('saved');
  } finally {
    flushing = false;
  }
}

/** PATCH a record through the queue. */
export function patchRecord(db: string, id: string, values: Record<string, unknown>): void {
  enqueue({ url: `/api/records/${db}/${id}`, method: 'PATCH', body: values, key: `${db}:${id}` });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
  setInterval(() => void flush(), 20000);
  setTimeout(() => void flush(), 500);
}

/** localStorage-backed draft for a single field. */
export function loadDraft(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`te-draft:${key}`);
}
export function saveDraft(key: string, v: string): void {
  localStorage.setItem(`te-draft:${key}`, v);
}
export function clearDraft(key: string): void {
  localStorage.removeItem(`te-draft:${key}`);
}
