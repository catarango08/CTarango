import type { RecordValue } from '../schema';
import { REQUIRED_PHOTO_STAGES } from '../schema';
import { num } from '../calc';
import { MONEY } from './rules';

/* ------------------------------------------------------------------ *
 * The town gate — "Town first. Red or unknown → No-go."
 * ------------------------------------------------------------------ */

export type Gate = 'GO' | 'VERIFY' | 'NO-GO' | 'UNKNOWN';

export interface TownVerdict {
  gate: Gate;
  town: string;
  /** What the dispatcher does next, in Corey's words. */
  instruction: string;
  licenseNote?: string;
  /** True when a quote must not be given. */
  blockQuote: boolean;
  matched?: RecordValue;
}

/**
 * Looks a town up in Service Territory and returns the verdict.
 *
 * An unmatched town is deliberately treated as NO-GO rather than GO: the OS
 * says "Red or unknown → Status No-go", so the failure mode is a polite
 * decline, never an accidental quote outside the licensed footprint.
 */
export function gateTown(townInput: string, territory: RecordValue[]): TownVerdict {
  const town = townInput.trim();
  if (!town) {
    return { gate: 'UNKNOWN', town, instruction: 'Ask the town before anything else.', blockQuote: true };
  }

  const match = findTown(town, territory);
  if (!match) {
    return {
      gate: 'UNKNOWN',
      town,
      instruction: 'Not on the territory list. Treat as No-go until the clerk says otherwise. Be polite. Do not quote.',
      blockQuote: true,
    };
  }

  const status = String(match.status ?? '').toUpperCase();
  const licenseNote = match.licenseNote ? String(match.licenseNote) : undefined;

  if (status === 'GO') {
    return { gate: 'GO', town: String(match.name), instruction: 'Green. Book the diagnostic.', licenseNote, blockQuote: false, matched: match };
  }
  if (status === 'VERIFY') {
    return {
      gate: 'VERIFY',
      town: String(match.name),
      instruction: 'Amber. Status = Qualify, next action is call the AHJ. Do not quote until they answer.',
      licenseNote,
      blockQuote: true,
      matched: match,
    };
  }
  return {
    gate: 'NO-GO',
    town: String(match.name),
    instruction: 'Red. Status = No-go. Be polite. Do not quote.',
    licenseNote,
    blockQuote: true,
    matched: match,
  };
}

/**
 * Territory rows are named things like "Dallas County unincorporated" while a
 * job's Town select says "Dallas Co", so matching is loose on both sides.
 */
function findTown(town: string, territory: RecordValue[]): RecordValue | undefined {
  const needle = normalizeTown(town);
  if (!needle) return undefined;

  const exact = territory.find((row) => normalizeTown(String(row.name ?? '')) === needle);
  if (exact) return exact;

  return territory.find((row) => {
    const name = normalizeTown(String(row.name ?? ''));
    if (!name) return false;
    return name.startsWith(needle) || needle.startsWith(name);
  });
}

function normalizeTown(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(county|co\.?|city|unincorporated|mo|missouri)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------------ *
 * The closeout gate — "Nothing is Closed until closeout is checked."
 * ------------------------------------------------------------------ */

export interface CloseoutItem {
  key: string;
  label: string;
  done: boolean;
  /** Why it is not done yet, when that needs saying. */
  detail?: string;
}

export interface CloseoutStatus {
  items: CloseoutItem[];
  done: number;
  total: number;
  /** True only when every item is satisfied. */
  canClose: boolean;
  blocking: string[];
}

/**
 * The Closeout card, evaluated against the job and its photos.
 *
 * The photo rule is the one the checkbox alone cannot answer: closeout wants
 * cover off / cover on, so we check the Job Photos rows for the three stages
 * every job needs, not just the "Photos" flag.
 */
export function closeoutStatus(job: RecordValue, photos: RecordValue[]): CloseoutStatus {
  const stages = new Set(photos.map((p) => String(p.stage ?? '')));
  const missingStages = REQUIRED_PHOTO_STAGES.filter((stage) => !stages.has(stage));
  const hours = num(job.installHours) > 0 || num(job.driveHours) > 0;

  const items: CloseoutItem[] = [
    {
      key: 'hours',
      label: 'Install hours + drive hours on the job',
      done: hours,
      detail: hours ? undefined : 'Install hours are the license file. Log them tonight.',
    },
    {
      key: 'photos',
      label: 'Photos cover off / cover on',
      done: missingStages.length === 0,
      detail: missingStages.length ? `Still need: ${missingStages.join(', ')}` : `${photos.length} on file`,
    },
    { key: 'signed', label: 'Estimate signed or invoice filled', done: Boolean(job.signed) },
    {
      key: 'paid',
      label: 'Paid checked — or Net 15 written',
      done: Boolean(job.paid) || /net\s*15/i.test(String(job.notes ?? '')),
      detail: job.paid ? undefined : 'Tick Paid, or write Net 15 in the notes.',
    },
    { key: 'review', label: 'Review asked on your phone', done: Boolean(job.reviewAsked) },
    { key: 'magnets', label: 'Two magnets left', done: Boolean(job.magnets) },
  ];

  // Hidden damage is conditional: it only blocks if something was found.
  if (job.hiddenDamage) {
    items.push({
      key: 'hiddenDamage',
      label: 'Hidden damage logged and change order settled',
      done: /change[- ]order/i.test(String(job.nextAction ?? '')),
      detail: 'Next action should read change-order signed or change-order declined.',
    });
  }

  const done = items.filter((i) => i.done).length;
  return {
    items,
    done,
    total: items.length,
    canClose: done === items.length,
    blocking: items.filter((i) => !i.done).map((i) => i.label),
  };
}

/* ------------------------------------------------------------------ *
 * Deposit gate — "Deposit 50% over $1,500"
 * ------------------------------------------------------------------ */

export function depositRequired(amount: unknown): { required: boolean; amount: number } {
  const total = num(amount);
  if (total <= MONEY.depositThreshold) return { required: false, amount: 0 };
  return { required: true, amount: Math.round(total * MONEY.depositRate * 100) / 100 };
}
