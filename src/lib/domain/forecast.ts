import type { RecordValue } from '../schema';
import { num, relationIds, round2 } from '../calc';
import { ZONE_FALLBACK, type ZoneNumber } from './pricing';

/**
 * How long will this take, and how long to get there.
 *
 * Both answers come from Corey's own closed jobs where there is history, and
 * from a documented default where there is not. The forecast always says which
 * it used — a number with no provenance is worse than no number, because you
 * cannot tell whether to trust it.
 */

export interface Forecast {
  minutes: number;
  /** How the number was arrived at, in plain words. */
  basis: string;
  /** How many past jobs informed it. Zero means the default. */
  sample: number;
  confidence: 'measured' | 'thin' | 'default';
}

/* ------------------------------------------------------------------ *
 * Travel
 * ------------------------------------------------------------------ */

/**
 * Town → trip zone, measured from Elkland, per the Rate Book's zone lists.
 * Towns and counties not on those lists default to Zone 3 and are flagged
 * "confirm zone" so nobody under-quotes a long drive.
 */
const TOWN_ZONE: Record<string, ZoneNumber> = {
  // Zone 1
  'Elkland': 1,
  'Fair Grove': 1,
  'Marshfield': 1,
  'Strafford': 1,
  'Pleasant Hope': 1,
  // Zone 2
  'Buffalo': 2,
  'Bolivar': 2,
  'Niangua': 2,
  'Long Lane': 2,
  'Louisburg': 2,
  'Seymour': 2,
  'Rogersville': 2,
  // Zone 3
  'Urbana': 3,
  'Walnut Grove': 3,
  'Ash Grove': 3,
  'Humansville': 3,
};

/** One-way minutes when there is no history to go on. */
const ZONE_DEFAULT_MINUTES: Record<ZoneNumber, number> = { 1: 15, 2: 30, 3: 50 };

export function zoneForTown(town: unknown): ZoneNumber {
  return TOWN_ZONE[String(town ?? '').trim()] ?? 3;
}

/** True when the town is not on a Rate Book zone list, so Zone 3 is a guess. */
export function zoneNeedsConfirm(town: unknown): boolean {
  return !(String(town ?? '').trim() in TOWN_ZONE);
}

/** Full zone fee for a flat-rate visit to this town (fallback prices). */
export function travelFeeForTown(town: unknown, zones: Record<ZoneNumber, number> = ZONE_FALLBACK): number {
  return zones[zoneForTown(town)];
}

/**
 * Drive hours are logged per job and cover the round trip, so one-way is half.
 * Anything implausible is ignored rather than allowed to drag the average.
 */
export function forecastTravel(town: unknown, jobs: RecordValue[]): Forecast {
  const name = String(town ?? '').trim();
  const zone = zoneForTown(name);
  const fallback = ZONE_DEFAULT_MINUTES[zone];

  const history = jobs
    .filter((j) => String(j.town ?? '').trim() === name && num(j.driveHours) > 0)
    .map((j) => (num(j.driveHours) * 60) / 2)
    .filter((m) => m >= 2 && m <= 180);

  if (history.length === 0) {
    return {
      minutes: fallback,
      basis: `Zone ${zone} default${zoneNeedsConfirm(name) ? ' (confirm zone)' : ''}, no drive time logged for ${name || 'this town'} yet`,
      sample: 0,
      confidence: 'default',
    };
  }

  const average = history.reduce((a, b) => a + b, 0) / history.length;
  return {
    minutes: Math.round(average),
    basis: `Average of ${history.length} logged ${history.length === 1 ? 'trip' : 'trips'} to ${name}`,
    sample: history.length,
    confidence: history.length >= 3 ? 'measured' : 'thin',
  };
}

/* ------------------------------------------------------------------ *
 * Job duration
 * ------------------------------------------------------------------ */

/** Starting points by job type, in hours, until there is history. */
const TYPE_DEFAULT_HOURS: Record<string, number> = {
  'Residential': 2.5,
  'Commercial': 3,
  'Farm / Shop': 4,
  'Standby / Critical': 4,
};

/**
 * Forecast install hours for a job.
 *
 * Matching gets narrower as history allows: same type in the same town first,
 * then same type anywhere, then the type default. Only closed jobs count — an
 * open job's hours are still moving.
 */
export function forecastDuration(job: RecordValue, jobs: RecordValue[]): Forecast {
  const type = String(job.type ?? '').trim();
  const town = String(job.town ?? '').trim();

  const closed = jobs.filter(
    (j) => j.id !== job.id && String(j.status) === 'Closed' && num(j.installHours) > 0,
  );

  const sameTypeAndTown = closed.filter(
    (j) => String(j.type ?? '').trim() === type && String(j.town ?? '').trim() === town,
  );
  const sameType = closed.filter((j) => String(j.type ?? '').trim() === type);

  const pick =
    sameTypeAndTown.length >= 3
      ? { rows: sameTypeAndTown, label: `${type} jobs in ${town}` }
      : sameType.length >= 2
        ? { rows: sameType, label: `${type} jobs` }
        : null;

  if (!pick) {
    const fallback = TYPE_DEFAULT_HOURS[type] ?? 2.5;
    return {
      minutes: Math.round(fallback * 60),
      basis: `${type || 'Service'} starting point — not enough closed jobs to measure yet`,
      sample: sameType.length,
      confidence: 'default',
    };
  }

  const hours = pick.rows.map((j) => num(j.installHours));
  const average = hours.reduce((a, b) => a + b, 0) / hours.length;
  return {
    minutes: Math.round(average * 60),
    basis: `Average of ${hours.length} closed ${pick.label}`,
    sample: hours.length,
    confidence: hours.length >= 4 ? 'measured' : 'thin',
  };
}

/* ------------------------------------------------------------------ *
 * The whole day, end to end
 * ------------------------------------------------------------------ */

export interface DayPlan {
  travelOneWay: Forecast;
  onSite: Forecast;
  /** Door to door: out, on site, and back. */
  totalMinutes: number;
  /** What to tell the customer, rounded to a sensible window. */
  arrivalWindow: string;
  travelFee: number;
}

export function planJob(job: RecordValue, jobs: RecordValue[]): DayPlan {
  const travel = forecastTravel(job.town, jobs);
  const onSite = forecastDuration(job, jobs);
  const total = travel.minutes * 2 + onSite.minutes;

  return {
    travelOneWay: travel,
    onSite,
    totalMinutes: total,
    arrivalWindow: windowFor(onSite.minutes),
    travelFee: travelFeeForTown(job.town),
  };
}

/** Customers get a window, never a promise of a minute. */
function windowFor(onSiteMinutes: number): string {
  if (onSiteMinutes <= 90) return 'two-hour window';
  if (onSiteMinutes <= 240) return 'half day';
  if (onSiteMinutes <= 480) return 'full day';
  return 'multi-day';
}

export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/**
 * How the estimate held up. Positive means it ran long.
 * Only meaningful once the job has real hours on it.
 */
export function forecastAccuracy(job: RecordValue): { deltaHours: number; pct: number } | null {
  const est = num(job.estHours);
  const actual = num(job.installHours);
  if (est <= 0 || actual <= 0) return null;
  return { deltaHours: round2(actual - est), pct: round2((actual - est) / est) };
}

export { relationIds };
