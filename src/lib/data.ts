import { cache } from 'react';
import { getStore, type Query } from './store';
import { getDb, titleField, TERMINAL_STATUSES, type DbKey, type RecordValue, type RelationRef } from './schema';
import { num, relationIds } from './calc';
import { daysUntil, startOfDay, toDate } from './format';
import { LICENSE } from './domain/rules';
import { closeoutStatus, gateTown } from './domain/gates';

/* ------------------------------------------------------------------ *
 * Fetching + relation label hydration
 * ------------------------------------------------------------------ */

/** Whole-table read, memoized for the lifetime of one request. */
export const loadAll = cache(async (db: DbKey): Promise<RecordValue[]> => getStore().list(db));

export async function query(db: DbKey, q: Query = {}): Promise<RecordValue[]> {
  return getStore().list(db, q);
}

export const labelIndex = cache(async (db: DbKey): Promise<Map<string, string>> => {
  const rows = await loadAll(db);
  const key = titleField(getDb(db)).key;
  return new Map(rows.map((r) => [r.id, String(r[key] ?? '')]));
});

/** Fill in `label` on every relation value so the UI can render chips. */
export async function hydrate(dbKey: DbKey, records: RecordValue[]): Promise<RecordValue[]> {
  const db = getDb(dbKey);
  const relationFields = db.fields.filter((f) => f.type === 'relation' && f.relation);
  if (!relationFields.length || !records.length) return records;

  const indexes = new Map<DbKey, Map<string, string>>();
  for (const field of relationFields) {
    const target = field.relation as DbKey;
    if (!indexes.has(target)) indexes.set(target, await labelIndex(target));
  }

  return records.map((record) => {
    const copy: RecordValue = { ...record };
    for (const field of relationFields) {
      const index = indexes.get(field.relation as DbKey);
      const refs = Array.isArray(record[field.key]) ? (record[field.key] as RelationRef[]) : [];
      copy[field.key] = refs.map((ref) => ({ id: ref.id, label: index?.get(ref.id) ?? ref.label ?? '' }));
    }
    return copy;
  });
}

export async function loadHydrated(db: DbKey, q: Query = {}): Promise<RecordValue[]> {
  return hydrate(db, await query(db, q));
}

export async function findById(db: DbKey, id: string): Promise<RecordValue | null> {
  const record = await getStore().get(db, id);
  if (!record) return null;
  const [hydrated] = await hydrate(db, [record]);
  return hydrated;
}

/** Records in `db` whose relation `field` points at `id`. */
export async function relatedTo(db: DbKey, field: string, id: string): Promise<RecordValue[]> {
  const rows = await loadAll(db);
  const matching = rows.filter((row) => relationIds(row[field]).includes(id));
  return hydrate(db, matching);
}

/* ------------------------------------------------------------------ *
 * Today — "run the truck"
 * ------------------------------------------------------------------ */

export interface Alert {
  severity: 'stop' | 'watch' | 'note';
  title: string;
  detail: string;
  href?: string;
}

export interface Today {
  onDeck: RecordValue[];
  hanging: RecordValue[];
  needsCloseout: RecordValue[];
  newCalls: RecordValue[];
  hours: { logged: number; target: number; remaining: number; selfPerformed: number; thisMonth: number; unverified: number };
  money: { quotedOpen: number; unpaid: number; collectedThisMonth: number };
  counts: { openJobs: number; greenTowns: number; equipmentDue: number };
  alerts: Alert[];
}

export async function loadToday(): Promise<Today> {
  const [jobs, photos, hourRows, territory, equipment] = await Promise.all([
    loadAll('jobs'), loadAll('jobPhotos'), loadAll('hourLedger'), loadAll('territory'), loadAll('equipment'),
  ]);

  const terminal = new Set<string>(TERMINAL_STATUSES);
  const open = jobs.filter((j) => !terminal.has(String(j.status)));
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const onDeck = open
    .filter((j) => {
      const d = toDate(j.onSite);
      return d ? d >= today && d < tomorrow : false;
    })
    .concat(open.filter((j) => ['On site', 'In Progress'].includes(String(j.status)) && !toDate(j.onSite)))
    .filter((j, i, arr) => arr.findIndex((x) => x.id === j.id) === i);

  const hanging = open
    .filter((j) => ['Lead', 'New call', 'Qualify', 'Quoted'].includes(String(j.status)))
    .sort((a, b) => (daysUntil(a.callIn) ?? 0) - (daysUntil(b.callIn) ?? 0));

  const needsCloseout = jobs.filter((j) => {
    if (String(j.status) !== 'Invoiced') return false;
    const mine = photos.filter((p) => relationIds(p.job).includes(j.id));
    return !closeoutStatus(j, mine).canClose;
  });

  const newCalls = open.filter((j) => String(j.status) === 'New call');

  const logged = hourRows.reduce((sum, h) => sum + num(h.installHours), 0);
  const selfPerformed = hourRows.filter((h) => String(h.source) === 'Self-performed').reduce((s, h) => s + num(h.installHours), 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  // Self-performed only: a prior-employer opening balance is history, not pace.
  const thisMonth = hourRows
    .filter((h) => {
      const d = toDate(h.date);
      return d ? d >= monthStart && String(h.source) === 'Self-performed' : false;
    })
    .reduce((s, h) => s + num(h.installHours), 0);
  const unverified = hourRows.filter((h) => !h.affidavit).reduce((s, h) => s + num(h.installHours), 0);

  const quotedOpen = open.filter((j) => ['Quoted', 'Approved', 'Scheduled'].includes(String(j.status))).reduce((s, j) => s + num(j.amount), 0);
  const unpaid = jobs.filter((j) => String(j.status) === 'Invoiced' && !j.paid).reduce((s, j) => s + num(j.amount), 0);
  const collectedThisMonth = jobs
    .filter((j) => j.paid && toDate(j.onSite) && toDate(j.onSite)! >= monthStart)
    .reduce((s, j) => s + num(j.amount), 0);

  return {
    onDeck,
    hanging,
    needsCloseout,
    newCalls,
    hours: {
      logged,
      target: LICENSE.targetHours,
      remaining: Math.max(0, LICENSE.targetHours - logged),
      selfPerformed,
      thisMonth,
      unverified,
    },
    money: { quotedOpen, unpaid, collectedThisMonth },
    counts: {
      openJobs: open.length,
      greenTowns: territory.filter((t) => String(t.status) === 'GO').length,
      equipmentDue: equipment.filter((e) => (daysUntil(e.nextService) ?? 999) <= 30).length,
    },
    alerts: buildAlerts({ jobs, open, photos, territory, equipment, hourRows }),
  };
}

function buildAlerts(input: {
  jobs: RecordValue[];
  open: RecordValue[];
  photos: RecordValue[];
  territory: RecordValue[];
  equipment: RecordValue[];
  hourRows: RecordValue[];
}): Alert[] {
  const alerts: Alert[] = [];

  // A job sitting in a red or unverified town is the one thing that must stop.
  for (const job of input.open) {
    const verdict = gateTown(String(job.town ?? ''), input.territory);
    if (verdict.blockQuote && !['No-go', 'Lost', 'Declined'].includes(String(job.status))) {
      alerts.push({
        severity: verdict.gate === 'NO-GO' ? 'stop' : 'watch',
        title: `${job.name} is in a ${verdict.gate} town`,
        detail: verdict.instruction,
        href: `/jobs/${job.id}`,
      });
    }
  }

  for (const job of input.jobs) {
    if (job.hiddenDamage && !/change[- ]order/i.test(String(job.nextAction ?? ''))) {
      alerts.push({
        severity: 'stop',
        title: `Hidden damage open on ${job.name}`,
        detail: 'Show them, write the change line, get a yes in writing. Do not resume until they reply.',
        href: `/jobs/${job.id}`,
      });
    }
    if (String(job.status) === 'Approved' && num(job.amount) > 1500 && !job.depositIn) {
      alerts.push({
        severity: 'watch',
        title: `Deposit not collected on ${job.name}`,
        detail: `$${num(job.amount).toLocaleString()} job. 50% is due before the work starts.`,
        href: `/jobs/${job.id}`,
      });
    }
  }

  for (const item of input.equipment) {
    const due = daysUntil(item.nextService);
    if (due !== null && due < 0 && String(item.agreement) !== 'None') {
      alerts.push({
        severity: 'watch',
        title: `${item.name} service is overdue`,
        detail: `${Math.abs(due)} days past due on a Keep Power ${item.agreement} agreement.`,
        href: '/equipment',
      });
    }
  }

  const unverified = input.hourRows.filter((h) => !h.affidavit).reduce((s, h) => s + num(h.installHours), 0);
  if (unverified > 0) {
    alerts.push({
      severity: 'note',
      title: `${unverified.toLocaleString()} hours have no affidavit behind them`,
      detail: 'The board wants documentation. Chase the letters before the total matters.',
      href: '/hours',
    });
  }

  const order = { stop: 0, watch: 1, note: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function byDate(key: string): (a: RecordValue, b: RecordValue) => number {
  return (a, b) => (toDate(a[key])?.getTime() ?? 0) - (toDate(b[key])?.getTime() ?? 0);
}
