import type { RecordValue } from '../schema';
import { CLOSE } from '@/config/close';

/** Pipeline board columns, mapped onto the existing Jobs → Status values. */
export const PIPELINE = [
  { key: 'lead', label: 'Lead', statuses: ['Lead', 'New call', 'Qualify'], moveTo: 'Lead' },
  { key: 'estimate', label: 'Estimate scheduled', statuses: ['Booked', 'On site'], moveTo: 'Booked' },
  { key: 'quoted', label: 'Quoted', statuses: ['Quoted'], moveTo: 'Quoted' },
  { key: 'won', label: 'Won', statuses: ['Approved', 'Scheduled', 'In Progress', 'Invoiced', 'Closed'], moveTo: 'Approved' },
  { key: 'lost', label: 'Lost', statuses: ['Declined', 'Lost', 'No-go'], moveTo: 'Lost' },
] as const;

export type ColumnKey = (typeof PIPELINE)[number]['key'];

export function columnFor(status: unknown): ColumnKey | null {
  const s = String(status ?? '');
  return PIPELINE.find((c) => (c.statuses as readonly string[]).includes(s))?.key ?? null;
}

export const WON_STATUSES = PIPELINE[3].statuses as readonly string[];
export const LOST_STATUSES = PIPELINE[4].statuses as readonly string[];

/** YYYY-MM-DD in Elkland time. */
export function todayCentral(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(isoDay: string, days: number): string {
  const [y, m, d] = isoDay.slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** The follow-up after `after` (exclusive) on the +2/+5/+10 track, or null when the track is done. */
export function nextOnTrack(quotedOn: string, after: string): string | null {
  for (const n of CLOSE.followUpDays) {
    const d = addDays(quotedOn, n);
    if (d > after) return d;
  }
  return null;
}

/**
 * Rules for a status change on a job. Returns the extra fields to write, or
 * an error when the change is not allowed (Lost needs a Loss Reason).
 */
export function statusSideEffects(
  job: RecordValue | null,
  patch: Record<string, unknown>,
  today = todayCentral(),
): { ok: true; extra: Record<string, unknown> } | { ok: false; error: string } {
  if (patch.status === undefined) return { ok: true, extra: {} };
  const next = String(patch.status);
  const prev = String(job?.status ?? '');
  const extra: Record<string, unknown> = {};
  if (next === prev) return { ok: true, extra };

  if (next === 'Lost' && !patch.lossReason && !job?.lossReason) {
    return { ok: false, error: 'Pick a Loss Reason before moving this job to Lost.' };
  }
  if (next === 'Quoted') {
    const quotedOn = String(patch.quotedOn || job?.quotedOn || '').slice(0, 10) || today;
    if (!job?.quotedOn && !patch.quotedOn) extra.quotedOn = quotedOn;
    if (!patch.nextFollowUp) extra.nextFollowUp = nextOnTrack(quotedOn, addDays(quotedOn, 0));
  }
  if ((WON_STATUSES.includes(next) || LOST_STATUSES.includes(next)) && job?.nextFollowUp) {
    extra.nextFollowUp = null;
  }
  return { ok: true, extra };
}

/** Quoted jobs whose next follow-up is today or overdue. */
export function callList(jobs: RecordValue[], today = todayCentral()): RecordValue[] {
  return jobs
    .filter((j) => String(j.status) === 'Quoted' && j.nextFollowUp && String(j.nextFollowUp).slice(0, 10) <= today)
    .sort((a, b) => String(a.nextFollowUp).localeCompare(String(b.nextFollowUp)));
}

/** First name only, for anything that could end up in front of a customer. */
export function firstName(name: unknown): string {
  const n = String(name ?? '').trim();
  if (!n) return '';
  // Business names stay whole ("Reeder Farm & Shop"), people get their first name.
  return /\b(farm|shop|center|llc|inc|co\b|company|church)/i.test(n) ? n : n.split(/\s+/)[0];
}

export function ageDays(from: unknown, today = todayCentral()): number | null {
  const s = String(from ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const a = Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const b = Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}
