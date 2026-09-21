import { getStore } from '../store';
import type { DbKey, RecordValue } from '../schema';
import { REQUIRED_PHOTO_STAGES } from '../schema';
import { num, relationIds, round2 } from '../calc';
import { closeoutStatus } from './gates';

/**
 * Rules applied on write, wherever the write comes from — the UI, the REST
 * API or a script. Keeps Notion from ever holding a half-finished record.
 */

export async function applyDerived(db: DbKey, values: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out = { ...values };

  switch (db) {
    case 'jobs': {
      if (!out.status) out.status = 'New call';
      if (!out.callIn) out.callIn = today();
      break;
    }
    case 'jobPhotos': {
      if (!out.takenAt) out.takenAt = new Date().toISOString();
      if (!out.stage) out.stage = 'Before';
      break;
    }
    case 'hourLedger': {
      if (!out.date) out.date = today();
      if (!out.source) out.source = 'Self-performed';
      break;
    }
    default:
      break;
  }

  return out;
}

/**
 * After a photo lands, flip the job's Photos checkbox once the three required
 * stages are on file. The checkbox is what Corey's Notion views filter on, so
 * it has to stay true to the photos themselves.
 */
export async function syncJobPhotoFlag(jobId: string): Promise<void> {
  const store = getStore();
  const photos = (await store.list('jobPhotos')).filter((p) => relationIds(p.job).includes(jobId));
  const stages = new Set(photos.map((p) => String(p.stage ?? '')));
  const complete = REQUIRED_PHOTO_STAGES.every((stage) => stages.has(stage));

  const job = await store.get('jobs', jobId);
  if (!job) return;
  if (Boolean(job.photos) !== complete) {
    await store.update('jobs', jobId, { photos: complete });
  }
}

/**
 * Copy a job's install hours into the Hour Ledger — "log hours toward 12,000",
 * the same night. Returns the entry, or null when there is nothing to log.
 *
 * Drive hours are deliberately not written: the ledger is the license file and
 * only tools-on-the-work counts.
 */
export async function logHoursToLedger(jobId: string): Promise<RecordValue | null> {
  const store = getStore();
  const job = await store.get('jobs', jobId);
  if (!job) return null;

  const hours = num(job.installHours);
  if (hours <= 0) return null;

  const existing = (await store.list('hourLedger')).filter((e) => relationIds(e.job).includes(jobId));
  const alreadyLogged = existing.reduce((sum, e) => sum + num(e.installHours), 0);
  const remaining = round2(hours - alreadyLogged);
  if (remaining <= 0) return null;

  const town = job.town ? ` — ${job.town}` : '';
  return store.create('hourLedger', {
    name: `${job.name ?? 'Job'}${town}`,
    job: [{ id: jobId }],
    source: 'Self-performed',
    installHours: remaining,
    date: String(job.onSite ?? today()).slice(0, 10),
    affidavit: false,
    notes: 'Logged from the field app closeout.',
  });
}

/**
 * Advance a job's status, refusing to close one that has not been closed out.
 * "Nothing is Closed until closeout is checked."
 */
export async function advanceStatus(
  jobId: string,
  nextStatus: string,
): Promise<{ ok: true; job: RecordValue } | { ok: false; blocking: string[] }> {
  const store = getStore();
  const job = await store.get('jobs', jobId);
  if (!job) return { ok: false, blocking: ['Job not found'] };

  if (nextStatus === 'Closed') {
    const photos = (await store.list('jobPhotos')).filter((p) => relationIds(p.job).includes(jobId));
    const closeout = closeoutStatus(job, photos);
    if (!closeout.canClose) return { ok: false, blocking: closeout.blocking };

    await logHoursToLedger(jobId);
    const updated = await store.update('jobs', jobId, { status: 'Closed', closeoutDone: true });

    // Closing a job makes the customer Active.
    const customerId = relationIds(job.customer)[0];
    if (customerId) {
      const customer = await store.get('customers', customerId);
      if (customer && String(customer.stage) !== 'Repeat') {
        await store.update('customers', customerId, { stage: 'Active' });
      }
    }
    return { ok: true, job: updated };
  }

  return { ok: true, job: await store.update('jobs', jobId, { status: nextStatus }) };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
