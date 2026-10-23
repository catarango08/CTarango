import { GOALS, type KrUnit } from '../../config/goals';
import type { RecordValue } from '../schema';
import { num } from '../calc';
import { toDate } from '../format';
import { placeFor, zoneForTown, zoneFor, zonesFromRateBook, type TripZone } from '../geo/territory';

/**
 * Goals dashboard math. Pure functions over whole tables, so the page and any
 * future digest compute the same numbers. Where the OS has no field for a
 * metric, the metric comes back with `actual: null` and a `needs` reason —
 * never a made-up number.
 */

export interface Metric {
  key: string;
  label: string;
  target: number | null;
  /** null = needs data. */
  actual: number | null;
  unit: KrUnit;
  /** true when lower is better (turnaround). */
  lowerIsBetter?: boolean;
  needs?: string;
  note?: string;
}

export interface KeyResult extends Metric { due: string }
export interface Okr { id: string; objective: string; primary: boolean; keyResults: KeyResult[] }

export interface GoalsReport {
  asOf: string;
  week: { start: string; end: string };
  month: { start: string; label: string };
  northStar: {
    thisMonthProfit: number | null;
    streak: number;
    months: { label: string; revenue: number; materials: number; profit: number }[];
    profitNote: string;
  };
  weekly: Metric[];
  monthly: Metric[];
  leadsBySource: { source: string; count: number }[];
  tripsByZone: { zone: string; trips: number; fees: number }[];
  okrs: Okr[];
  needsData: { metric: string; why: string }[];
}

const COMPLETED = new Set(['Invoiced', 'Closed']);
const WON = new Set(['Approved', 'Scheduled', 'In Progress', 'Invoiced', 'Closed']);
const BOOKED_OR_LATER = new Set(['Booked', 'On site', 'Quoted', 'Approved', 'Scheduled', 'In Progress', 'Invoiced', 'Closed']);
const LOST = new Set(['Declined', 'Lost']);
const NOT_QUALIFIED = new Set(['No-go']);

function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function inRange(value: unknown, from: Date, to: Date): boolean {
  const d = toDate(value);
  return d ? d >= from && d < to : false;
}

/** When the work happened: on-site day, else departure, else the call. */
function workDate(job: RecordValue): unknown {
  return job.onSite || job.departed || job.callIn || job.createdTime;
}

function isCompleted(job: RecordValue): boolean {
  return COMPLETED.has(String(job.status)) || Boolean(job.paid);
}

function relId(v: unknown): string[] {
  return Array.isArray(v) ? (v as { id: string }[]).map((r) => r.id) : [];
}

function activityCount(rows: RecordValue[], types: string[], from: Date, to: Date): number {
  return rows
    .filter((r) => types.includes(String(r.type)) && inRange(r.date, from, to))
    .reduce((s, r) => s + (r.count === null || r.count === undefined || r.count === '' ? 1 : num(r.count, 1)), 0);
}

const NEEDS = {
  quotedDate: 'Jobs has no "Quoted on" date, so the app cannot tell when an estimate went out.',
  followUp: 'Jobs has no "Quoted on" or "Followed up" date to measure the 48-hour window.',
  overhead: 'Jobs has no cost or profit field. Profit here is revenue minus Job Materials only — fuel, insurance and tools are not in the OS.',
  partnerLink: 'Jobs.Source says "HVAC referral" but does not link to which partner sent it.',
};

export function buildGoals(input: {
  jobs: RecordValue[];
  hours: RecordValue[];
  referrals: RecordValue[];
  activity: RecordValue[];
  materials: RecordValue[];
  rates: RecordValue[];
  now?: Date;
}): GoalsReport {
  const now = input.now ?? new Date();
  const tracking = toDate(GOALS.trackingStart)!;
  const zones = zonesFromRateBook(input.rates);

  const weekStart0 = startOfWeek(now);
  const weekEnd = new Date(weekStart0.getTime() + 7 * 86_400_000);
  const weekStart = weekStart0 < tracking ? tracking : weekStart0;
  const monthStart0 = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthStart = monthStart0 < tracking ? tracking : monthStart0;

  const materialsFor = (jobId: string) =>
    input.materials.filter((m) => relId(m.job).includes(jobId)).reduce((s, m) => s + (num(m.extendedCost) || num(m.quantity) * num(m.unitCost)), 0);

  const completedIn = (from: Date, to: Date) => input.jobs.filter((j) => isCompleted(j) && inRange(workDate(j), from, to));
  const revenueOf = (jobs: RecordValue[]) => jobs.reduce((s, j) => s + num(j.amount), 0);
  const profitOf = (jobs: RecordValue[]) => jobs.reduce((s, j) => s + num(j.amount) - materialsFor(j.id), 0);
  const leadsIn = (from: Date, to: Date) => input.jobs.filter((j) => inRange(j.callIn || j.createdTime, from, to));

  /* ---- weekly -------------------------------------------------------- */
  const wJobs = completedIn(weekStart, weekEnd);
  const wDecided = leadsIn(weekStart, weekEnd).filter((j) => WON.has(String(j.status)) || LOST.has(String(j.status)));
  const wWon = wDecided.filter((j) => WON.has(String(j.status)));
  const weekly: Metric[] = [
    { key: 'touches', label: 'Outreach touches', target: GOALS.weekly.outreachTouches, unit: 'count',
      actual: activityCount(input.activity, ['Email', 'Call', 'Text', 'Visit'], weekStart, weekEnd), note: 'Activity Log: emails, calls, texts, visits.' },
    { key: 'calls', label: 'Calls', target: GOALS.weekly.calls, unit: 'count', actual: activityCount(input.activity, ['Call'], weekStart, weekEnd), note: 'Activity Log.' },
    { key: 'estimates', label: 'Estimates sent', target: GOALS.weekly.estimatesSent, unit: 'count', actual: null, needs: NEEDS.quotedDate,
      note: `${input.jobs.filter((j) => String(j.status) === 'Quoted').length} jobs sit in Quoted right now.` },
    { key: 'closeRate', label: 'Close rate', target: GOALS.weekly.closeRate, unit: 'percent',
      actual: wDecided.length ? wWon.length / wDecided.length : null,
      needs: wDecided.length ? undefined : 'No quotes decided (won, declined or lost) on leads that came in this week yet.',
      note: 'Won ÷ (won + declined + lost), leads that came in this week. Approximate until Jobs has a quoted date.' },
    { key: 'jobs', label: 'Jobs completed', target: GOALS.weekly.jobsCompleted, unit: 'count', actual: wJobs.length, note: 'Invoiced, Closed or Paid.' },
    { key: 'revenue', label: 'Revenue', target: GOALS.weekly.revenue, unit: 'money', actual: revenueOf(wJobs) },
    { key: 'profit', label: 'Profit (after materials)', target: GOALS.weekly.profit, unit: 'money', actual: profitOf(wJobs), note: NEEDS.overhead },
    { key: 'followUp', label: 'Estimates followed up within 48h', target: GOALS.weekly.followUpWithin48h, unit: 'percent', actual: null, needs: NEEDS.followUp },
    { key: 'reviews', label: 'Reviews requested', target: GOALS.weekly.reviewsRequested, unit: 'percent',
      actual: wJobs.length ? wJobs.filter((j) => j.reviewAsked).length / wJobs.length : null,
      needs: wJobs.length ? undefined : 'No jobs completed this week yet.', note: 'Jobs → Review asked, on completed jobs.' },
  ];

  /* ---- monthly ------------------------------------------------------- */
  const mJobs = completedIn(monthStart, monthEnd);
  const mRevenue = revenueOf(mJobs);
  const mInstall = input.hours.filter((h) => String(h.source) === 'Self-performed' && inRange(h.date, monthStart, monthEnd)).reduce((s, h) => s + num(h.installHours), 0);
  const mDrive = mJobs.reduce((s, j) => s + num(j.driveHours), 0);
  const mHours = mInstall + mDrive;
  const mLeads = leadsIn(monthStart, monthEnd);
  const quoted = input.jobs.filter((j) => String(j.status) === 'Quoted');
  const activePartners = input.referrals.filter((r) => String(r.status) === 'Active');
  const referralLeads = input.jobs.filter((j) => /referral/i.test(String(j.source ?? '')));
  const totalHours = input.hours.reduce((s, h) => s + num(h.installHours), 0);

  const trips = new Map<string, { trips: number; fees: number }>();
  let travelFees = 0;
  for (const j of mJobs) {
    const p = placeFor(j.town);
    // Named towns use the drive-mile list; anything else falls back to the straight-line ring.
    const listed = zoneForTown(j.town, zones).zone;
    const z: TripZone | null = listed ?? (p ? zoneFor(p, zones).zone : null);
    const k = z ? `Zone ${z.zone}` : p ? 'Outside zones' : 'Unknown town';
    const row = trips.get(k) ?? { trips: 0, fees: 0 };
    row.trips += 1;
    row.fees += z?.fee ?? 0;
    travelFees += z?.fee ?? 0;
    trips.set(k, row);
  }

  const monthly: Metric[] = [
    { key: 'mRevenue', label: 'Revenue', target: null, unit: 'money', actual: mRevenue, note: 'Jobs.Amount on Invoiced, Closed or Paid jobs.' },
    { key: 'mJobs', label: 'Jobs completed', target: 16, unit: 'count', actual: mJobs.length },
    { key: 'hourly', label: 'Effective $/hr after travel', target: GOALS.monthly.effectiveHourly, unit: 'money', actual: mHours ? mRevenue / mHours : null,
      needs: mHours ? undefined : 'No self-performed Hour Ledger hours this month yet.', note: 'Revenue ÷ (Hour Ledger install hours + Jobs drive hours).' },
    { key: 'quotesOut', label: 'Quotes outstanding', target: null, unit: 'count', actual: quoted.length, note: `${quoted.length} quoted, worth $${revenueOf(quoted).toLocaleString()}.` },
    { key: 'quotesValue', label: 'Quotes outstanding, value', target: null, unit: 'money', actual: revenueOf(quoted) },
    { key: 'partners', label: 'Active referral partners', target: 5, unit: 'count', actual: activePartners.length, note: 'Referrals with Status Active.' },
    { key: 'perPartner', label: 'Leads per partner', target: 1, unit: 'count', actual: activePartners.length ? referralLeads.length / activePartners.length : null,
      needs: activePartners.length ? undefined : 'No active referral partners yet.', note: `${referralLeads.length} referral-sourced jobs, all time. ${NEEDS.partnerLink}` },
    { key: 'travelShare', label: 'Travel share of revenue', target: null, unit: 'percent', actual: mRevenue ? travelFees / mRevenue : null,
      needs: mRevenue ? undefined : 'No revenue this month yet.', note: 'Trip fee for each job’s zone (Jobs.Town → zone) ÷ revenue.' },
    { key: 'license', label: 'Hours toward 12,000', target: GOALS.monthly.licenseHours, unit: 'count', actual: totalHours, note: 'Hour Ledger, all sources.' },
  ];

  const sourceCounts = new Map<string, number>();
  for (const j of mLeads) sourceCounts.set(String(j.source || 'Not set'), (sourceCounts.get(String(j.source || 'Not set')) ?? 0) + 1);

  /* ---- north star ---------------------------------------------------- */
  const months: GoalsReport['northStar']['months'] = [];
  for (let d = new Date(tracking.getFullYear(), tracking.getMonth(), 1); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const from = d < tracking ? tracking : d;
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const jobs = completedIn(from, to);
    const revenue = revenueOf(jobs);
    const profit = profitOf(jobs);
    months.push({ label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }), revenue, materials: revenue - profit, profit });
  }
  let streak = 0;
  for (const m of months) streak = m.profit >= GOALS.northStar.monthlyProfit ? streak + 1 : 0;
  const thisMonthProfit = months.at(-1)?.profit ?? null;
  const bestProfit = Math.max(0, ...months.map((m) => m.profit));

  /* ---- OKRs ---------------------------------------------------------- */
  const gen = (j: RecordValue) => GOALS.generatorPattern.test(`${j.name ?? ''} ${j.notes ?? ''} ${j.type ?? ''}`);
  const genBooked = input.jobs.filter((j) => gen(j) && (WON.has(String(j.status)) || String(j.status) === 'Booked') && inRange(j.callIn || j.createdTime, tracking, new Date('2026-11-23')));
  const genQuotes = input.jobs.filter((j) => gen(j) && ['Quoted', ...WON].includes(String(j.status)));
  const dealer = input.referrals.find((r) => GOALS.dealerPattern.test(String(r.name ?? '')));
  const reviewsReceived = activityCount(input.activity, ['Review Received'], new Date(2000, 0, 1), new Date(2100, 0, 1));

  const actualFor: Record<string, Pick<Metric, 'actual' | 'needs' | 'note'>> = {
    'o1-profit': { actual: bestProfit, note: 'Best month so far. ' + NEEDS.overhead },
    'o1-jobs': { actual: mJobs.length, note: 'This month.' },
    'o1-estimates': { actual: null, needs: NEEDS.quotedDate },
    'o2-partners': { actual: null, needs: NEEDS.partnerLink, note: `${activePartners.length} partners are Active in Referrals.` },
    'o2-reviews': { actual: reviewsReceived, note: 'Activity Log → Review Received.' },
    'o2-gen-quotes': { actual: genQuotes.length, note: 'Generator jobs at Quoted or later.' },
    'o3-fulltime': { actual: streak, note: 'Current streak of $4,500+ profit months. ' + NEEDS.overhead },
    'gp-hookups': { actual: genBooked.length, note: 'Jobs mentioning generator / interlock / transfer switch, booked or later, by Nov 22.' },
    'gp-dealer': { actual: dealer && String(dealer.status) === 'Active' ? 1 : 0, note: dealer ? `Lockwood is "${dealer.status}" in Referrals.` : 'Lockwood is not in Referrals yet.' },
    'ef-hourly': { actual: monthly.find((m) => m.key === 'hourly')!.actual, needs: monthly.find((m) => m.key === 'hourly')!.needs },
  };

  const okrs: Okr[] = GOALS.okrs.map((o) => ({
    id: o.id,
    objective: o.objective,
    primary: o.primary,
    keyResults: o.keyResults.map((kr) => ({
      key: kr.id, label: kr.label, target: kr.target, unit: kr.unit as KrUnit, due: kr.due,
      ...actualFor[kr.id],
    })),
  }));

  const needsData = [
    ...weekly.filter((m) => m.actual === null).map((m) => ({ metric: `Weekly · ${m.label}`, why: m.needs ?? '' })),
    ...monthly.filter((m) => m.actual === null).map((m) => ({ metric: `Monthly · ${m.label}`, why: m.needs ?? '' })),
    ...okrs.flatMap((o) => o.keyResults.filter((k) => k.actual === null).map((k) => ({ metric: `${o.id} · ${k.label}`, why: k.needs ?? '' }))),
  ];

  return {
    asOf: now.toISOString(),
    week: { start: iso(weekStart), end: iso(new Date(weekEnd.getTime() - 86_400_000)) },
    month: { start: iso(monthStart), label: monthStart0.toLocaleString('en-US', { month: 'long', year: 'numeric' }) },
    northStar: { thisMonthProfit, streak, months, profitNote: NEEDS.overhead },
    weekly,
    monthly,
    leadsBySource: [...sourceCounts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
    tripsByZone: [...trips.entries()].map(([zone, v]) => ({ zone, ...v })).sort((a, b) => a.zone.localeCompare(b.zone)),
    okrs,
    needsData,
  };
}
