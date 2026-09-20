import { cache } from 'react';
import { getStore, type Query } from './store';
import { getDb, titleField, type DbKey, type RecordValue, type RelationRef } from './schema';
import { num, relationIds } from './calc';
import { daysUntil, startOfDay, toDate } from './format';

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
 * Dashboard + reporting aggregates
 * ------------------------------------------------------------------ */

export interface Alert {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  href?: string;
}

export interface Dashboard {
  todaysJobs: RecordValue[];
  activeJobs: RecordValue[];
  unscheduled: RecordValue[];
  openEstimates: RecordValue[];
  overdueInvoices: RecordValue[];
  recentPhotos: RecordValue[];
  followUps: RecordValue[];
  metrics: {
    revenueMtd: number;
    collectedMtd: number;
    arTotal: number;
    arOver30: number;
    openEstimateValue: number;
    winRate: number;
    avgTicket: number;
    jobsThisWeek: number;
    utilization: number;
    firstTimeFix: number;
    unscheduledCount: number;
  };
  aging: { label: string; amount: number }[];
  revenueByType: { label: string; amount: number }[];
  alerts: Alert[];
}

export async function loadDashboard(): Promise<Dashboard> {
  const [jobs, invoices, payments, estimates, photos, tasks, technicians, timeEntries, permits, assets, materials, customers] =
    await Promise.all([
      loadAll('jobs'), loadAll('invoices'), loadAll('payments'), loadAll('estimates'),
      loadAll('jobPhotos'), loadAll('tasks'), loadAll('technicians'), loadAll('timeEntries'),
      loadAll('permits'), loadAll('assets'), loadAll('materials'), loadAll('customers'),
    ]);

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekAhead = new Date(today.getTime() + 7 * 86_400_000);

  const onDay = (job: RecordValue) => {
    const start = toDate(job.scheduledStart);
    return start ? start >= today && start < tomorrow : false;
  };

  const todaysJobs = jobs.filter(onDay).sort(byDate('scheduledStart'));
  const activeJobs = jobs.filter((j) => ['Dispatched', 'On Site', 'In Progress', 'Needs Parts'].includes(String(j.status)));
  const unscheduled = jobs.filter((j) => String(j.status) === 'Unscheduled');
  const openEstimates = estimates.filter((e) => ['Draft', 'Sent', 'Viewed'].includes(String(e.status)));
  const overdueInvoices = invoices
    .filter((i) => num(i.balanceDue) > 0 && (String(i.status) === 'Overdue' || (daysUntil(i.dueOn) ?? 1) < 0))
    .sort((a, b) => (daysUntil(a.dueOn) ?? 0) - (daysUntil(b.dueOn) ?? 0));

  const decided = estimates.filter((e) => ['Approved', 'Converted to Job', 'Declined', 'Expired'].includes(String(e.status)));
  const won = decided.filter((e) => ['Approved', 'Converted to Job'].includes(String(e.status)));

  const revenueMtd = invoices
    .filter((i) => withinMonth(i.issuedOn, monthStart) && String(i.status) !== 'Void')
    .reduce((sum, i) => sum + num(i.total), 0);
  const collectedMtd = payments
    .filter((p) => withinMonth(p.receivedOn, monthStart))
    .reduce((sum, p) => sum + num(p.amount) * (p.kind === 'Refund' ? -1 : 1), 0);

  const arTotal = invoices.reduce((sum, i) => sum + num(i.balanceDue), 0);
  const arOver30 = invoices
    .filter((i) => num(i.balanceDue) > 0 && (daysUntil(i.dueOn) ?? 0) <= -30)
    .reduce((sum, i) => sum + num(i.balanceDue), 0);

  const closedJobs = jobs.filter((j) => ['Closed', 'Invoiced', 'Ready to Invoice'].includes(String(j.status)));
  const callbacks = jobs.filter((j) => j.warranty === true || String(j.jobType) === 'Warranty Callback');
  const firstTimeFix = closedJobs.length ? 1 - callbacks.length / closedJobs.length : 1;

  const recentHours = timeEntries.filter((e) => (daysUntil(e.startedAt) ?? -99) >= -14);
  const billableHours = recentHours.filter((e) => e.billable).reduce((sum, e) => sum + num(e.hours), 0);
  const totalHours = recentHours.reduce((sum, e) => sum + num(e.hours), 0);

  const paidJobs = closedJobs.filter((j) => num(j.revenue) > 0);
  const avgTicket = paidJobs.length ? paidJobs.reduce((s, j) => s + num(j.revenue), 0) / paidJobs.length : 0;

  const aging = agingBuckets(invoices);
  const revenueByType = groupSum(closedJobs, (j) => String(j.jobType ?? 'Other'), (j) => num(j.revenue))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 7);

  const alerts = buildAlerts({ technicians, assets, permits, invoices, materials, customers, jobs, tasks });

  return {
    todaysJobs,
    activeJobs,
    unscheduled,
    openEstimates,
    overdueInvoices,
    recentPhotos: [...photos].sort(byDate('takenAt')).reverse().slice(0, 12),
    followUps: tasks
      .filter((t) => String(t.status) !== 'Done' && (daysUntil(t.dueDate) ?? 99) <= 7)
      .sort((a, b) => (daysUntil(a.dueDate) ?? 99) - (daysUntil(b.dueDate) ?? 99)),
    metrics: {
      revenueMtd,
      collectedMtd,
      arTotal,
      arOver30,
      openEstimateValue: openEstimates.reduce((sum, e) => sum + num(e.total), 0),
      winRate: decided.length ? won.length / decided.length : 0,
      avgTicket,
      jobsThisWeek: jobs.filter((j) => {
        const d = toDate(j.scheduledStart);
        return d ? d >= today && d < weekAhead : false;
      }).length,
      utilization: totalHours ? billableHours / totalHours : 0,
      firstTimeFix,
      unscheduledCount: unscheduled.length,
    },
    aging,
    revenueByType,
    alerts,
  };
}

function buildAlerts(input: {
  technicians: RecordValue[];
  assets: RecordValue[];
  permits: RecordValue[];
  invoices: RecordValue[];
  materials: RecordValue[];
  customers: RecordValue[];
  jobs: RecordValue[];
  tasks: RecordValue[];
}): Alert[] {
  const alerts: Alert[] = [];

  for (const tech of input.technicians) {
    const licenseDays = daysUntil(tech.licenseExpires);
    if (licenseDays !== null && licenseDays < 0) {
      alerts.push({ severity: 'critical', title: `${tech.name}'s license has expired`, detail: `Expired ${Math.abs(licenseDays)} days ago. Do not assign permitted work.`, href: '/team' });
    } else if (licenseDays !== null && licenseDays <= 60) {
      alerts.push({ severity: 'warning', title: `${tech.name}'s license expires in ${licenseDays} days`, detail: 'Start the renewal now — the state board takes weeks.', href: '/team' });
    }
    const certDays = daysUntil(tech.certExpires);
    if (certDays !== null && certDays >= 0 && certDays <= 45) {
      alerts.push({ severity: 'info', title: `${tech.name}: certification expires in ${certDays} days`, detail: String(tech.certifications ?? ''), href: '/team' });
    }
  }

  for (const asset of input.assets) {
    const calDays = daysUntil(asset.calibrationDue);
    if (calDays !== null && calDays < 0) {
      alerts.push({ severity: 'critical', title: `${asset.name} calibration is overdue`, detail: `Overdue by ${Math.abs(calDays)} days. Readings from it are not defensible.`, href: '/records/assets' });
    }
    const regDays = daysUntil(asset.registrationExpires);
    if (regDays !== null && regDays < 0) {
      alerts.push({ severity: 'warning', title: `${asset.name} registration expired`, detail: 'Vehicle should not be on the road.', href: '/records/assets' });
    }
  }

  for (const permit of input.permits) {
    if (String(permit.status) === 'Corrections Required') {
      alerts.push({ severity: 'critical', title: `Failed inspection: ${permit.title}`, detail: String(permit.corrections ?? 'Corrections required before cover.'), href: '/permits' });
    }
  }

  for (const invoice of input.invoices) {
    const lienDays = daysUntil(invoice.lienDeadline);
    if (lienDays !== null && lienDays <= 14 && num(invoice.balanceDue) > 0) {
      alerts.push({ severity: 'critical', title: `Lien deadline in ${lienDays} days — ${invoice.invoiceNumber}`, detail: `${money(num(invoice.balanceDue))} outstanding. File the notice or lose the claim.`, href: '/invoices' });
    }
  }

  const lowStock = input.materials.filter((m) => num(m.onHand) <= num(m.reorderPoint));
  if (lowStock.length) {
    alerts.push({
      severity: lowStock.some((m) => num(m.onHand) === 0) ? 'warning' : 'info',
      title: `${lowStock.length} items at or below reorder point`,
      detail: lowStock.slice(0, 3).map((m) => m.name).join(', ') + (lowStock.length > 3 ? '…' : ''),
      href: '/inventory',
    });
  }

  for (const customer of input.customers) {
    if (customer.creditHold) {
      alerts.push({ severity: 'warning', title: `${customer.name} is on credit hold`, detail: 'Dispatch blocked until the office clears it.', href: '/customers' });
    }
  }

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

function money(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function agingBuckets(invoices: RecordValue[]): { label: string; amount: number }[] {
  const buckets = [
    { label: 'Current', amount: 0 },
    { label: '1–30', amount: 0 },
    { label: '31–60', amount: 0 },
    { label: '61–90', amount: 0 },
    { label: '90+', amount: 0 },
  ];
  for (const invoice of invoices) {
    const balance = num(invoice.balanceDue);
    if (balance <= 0) continue;
    const overdue = -(daysUntil(invoice.dueOn) ?? 0);
    const index = overdue <= 0 ? 0 : overdue <= 30 ? 1 : overdue <= 60 ? 2 : overdue <= 90 ? 3 : 4;
    buckets[index].amount += balance;
  }
  return buckets;
}

export function groupSum<T>(rows: T[], key: (row: T) => string, value: (row: T) => number): { label: string; amount: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, (map.get(k) ?? 0) + value(row));
  }
  return [...map.entries()].map(([label, amount]) => ({ label, amount }));
}

function withinMonth(value: unknown, monthStart: Date): boolean {
  const d = toDate(value);
  return d ? d >= monthStart : false;
}

export function byDate(key: string): (a: RecordValue, b: RecordValue) => number {
  return (a, b) => {
    const da = toDate(a[key])?.getTime() ?? 0;
    const db = toDate(b[key])?.getTime() ?? 0;
    return da - db;
  };
}
