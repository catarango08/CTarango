import type { RecordValue } from '../schema';
import { NOV3_PRICING as N } from '@/config/pricing-2026-11-03';

/**
 * Trip, hour and zone pricing, as the Notion Rate Book states it.
 *
 * The live Rate Book wins. These fallbacks are only used when Notion is not
 * reachable (demo mode, or a row was renamed) and they match the active rows
 * as of Oct 22, 2026.
 *
 * Rules from the Rate Book:
 * - RESIDENTIAL is locked to Corey's Nov 3, 2026 pricing (src/config/pricing-2026-11-03.ts);
 *   the Rate Book cannot override it. Commercial still reads the Rate Book.
 * - After-hours, emergency and holiday change the trip and the hour only.
 *   The zone add is never multiplied (fuel costs the same after dark).
 * - Flat rates are plus the full zone fee when there is no trip on the ticket.
 */

export type Tier = 'residential' | 'commercial';
export type TripKind = 'none' | 'day' | 'afterHours' | 'emergency' | 'holiday';
export type ZoneNumber = 1 | 2 | 3;

export interface TierRates {
  trip: Record<Exclude<TripKind, 'none'>, number>;
  /** Hourly after the included hours. */
  hourly: Record<Exclude<TripKind, 'none'>, number>;
  /** Hours on site included in the trip / service call. */
  includedHours: number;
  /** Project / flat-rate labor (estimates, no-trip hours). */
  projectHourly: number;
}

export interface Pricing {
  zones: Record<ZoneNumber, number>;
  residential: TierRates;
  commercial: TierRates;
  /** Where each number came from, for the rates page. */
  source: 'notion' | 'fallback' | 'mixed';
}

export const ZONE_LABELS: Record<ZoneNumber, string> = {
  1: 'Up to ~16 drive miles from Elkland',
  2: '~17–32 drive miles from Elkland',
  3: '32–50 drive miles from Elkland',
};

/**
 * Residential (everyone who is not commercial): Corey's Nov 3, 2026 pricing.
 * Locked. The stale Rate Book ($160 etc.) cannot override it.
 */
export const RESIDENTIAL_FALLBACK: TierRates = {
  trip: { ...N.serviceCall },
  hourly: { ...N.overtimeHourly },
  includedHours: N.includedHours,
  projectHourly: N.projectHourly,
};

/**
 * COMMERCIAL TIER: one place to change it.
 * Finalized by Estimator Oct 22, 2026 and active in the Rate Book. The live
 * rows override these numbers whenever they are active.
 */
export const COMMERCIAL_FALLBACK: TierRates = {
  trip: { day: 195, afterHours: 295, emergency: 370, holiday: 390 },
  hourly: { day: 110, afterHours: 165, emergency: 165, holiday: 220 },
  includedHours: 1,
  projectHourly: 110,
};

/**
 * Standalone zone fees for no-trip flat/project work (unchanged since Oct 22).
 * The over-Zone-1 differences (45 / 85) match the Nov 3 service-call supplements; a test checks this.
 */
export const ZONE_FALLBACK: Record<ZoneNumber, number> = { 1: 70, 2: 70 + N.zoneSupplement[2], 3: 70 + N.zoneSupplement[3] };

/** Rate Book row names, exactly as they appear in Notion. */
const ROWS = {
  zones: { 1: 'Travel Zone 1', 2: 'Travel Zone 2', 3: 'Travel Zone 3' } as Record<ZoneNumber, string>,
  residential: {
    trip: { day: 'Day trip / diagnostic', afterHours: 'After-hours trip', emergency: 'Emergency trip', holiday: 'Holiday trip' },
    hourly: { day: 'T&M hour — days', afterHours: 'T&M hour — after hours', emergency: 'T&M hour — after hours', holiday: 'T&M hour — holiday' },
  },
  commercial: {
    trip: { day: 'Commercial diagnostic', afterHours: 'Commercial after-hours trip', emergency: 'Commercial emergency trip', holiday: 'Commercial holiday trip' },
    hourly: { day: 'Commercial T&M hour — days', afterHours: 'Commercial T&M hour — after hours', emergency: 'Commercial T&M hour — after hours', holiday: 'Commercial T&M hour — holiday' },
  },
} as const;

/** Flat rows billed with no trip or zone fee. */
export const NO_TRIP_FLATS = ['LOTO / 70E add-on'];

export function fallbackPricing(): Pricing {
  return { zones: { ...ZONE_FALLBACK }, residential: clone(RESIDENTIAL_FALLBACK), commercial: clone(COMMERCIAL_FALLBACK), source: 'fallback' };
}

/** Builds pricing from the active Rate Book rows, falling back per number. */
export function pricingFromRateBook(rows: RecordValue[]): Pricing {
  const active = new Map<string, number>();
  for (const r of rows) {
    if (r.active === false) continue;
    const price = Number(r.price);
    if (r.name && Number.isFinite(price) && price > 0) active.set(norm(String(r.name)), price);
  }
  let hits = 0;
  let misses = 0;
  const get = (name: string, fallback: number) => {
    const v = active.get(norm(name));
    if (v === undefined) { misses++; return fallback; }
    hits++;
    return v;
  };
  const tier = (names: (typeof ROWS)['commercial'], fb: TierRates): TierRates => ({
    includedHours: fb.includedHours,
    projectHourly: get(names.hourly.day, fb.projectHourly),
    trip: {
      day: get(names.trip.day, fb.trip.day),
      afterHours: get(names.trip.afterHours, fb.trip.afterHours),
      emergency: get(names.trip.emergency, fb.trip.emergency),
      holiday: get(names.trip.holiday, fb.trip.holiday),
    },
    hourly: {
      day: get(names.hourly.day, fb.hourly.day),
      afterHours: get(names.hourly.afterHours, fb.hourly.afterHours),
      emergency: get(names.hourly.emergency, fb.hourly.emergency),
      holiday: get(names.hourly.holiday, fb.hourly.holiday),
    },
  });
  // Nov 3, 2026: residential and zone pricing are locked to config; the stale Rate Book is ignored for them.
  const zones = { ...ZONE_FALLBACK };
  const residential = clone(RESIDENTIAL_FALLBACK);
  const commercial = tier(ROWS.commercial, COMMERCIAL_FALLBACK);
  return { zones, residential, commercial, source: hits === 0 ? 'fallback' : 'mixed' };
}

export function tierForJobType(jobType: unknown): Tier {
  const t = String(jobType ?? '');
  return t === 'Commercial' || t === 'Standby / Critical' ? 'commercial' : 'residential';
}

/** What a zone adds on top of a trip that already includes Zone 1. */
export function zoneAddOverTrip(pricing: Pricing, zone: ZoneNumber): number {
  return Math.max(0, pricing.zones[zone] - pricing.zones[1]);
}

/**
 * Zone add for a trip. Residential day service call: the Nov 3 supplement.
 * Residential after-hours/emergency/holiday in Zone 2/3: UNRESOLVED, returns null (never guessed).
 * Commercial: unchanged (difference over Zone 1).
 */
export function zoneAddForTrip(pricing: Pricing, tier: Tier, kind: Exclude<TripKind, 'none'>, zone: ZoneNumber): number | null {
  if (tier === 'residential') {
    if (kind === 'day' || zone === 1) return N.zoneSupplement[zone];
    return null;
  }
  return zoneAddOverTrip(pricing, zone);
}

/** Trip charge, or null when the zone supplement is unresolved for that call type. */
export function tripCharge(pricing: Pricing, tier: Tier, kind: Exclude<TripKind, 'none'>, zone: ZoneNumber): number | null {
  const z = zoneAddForTrip(pricing, tier, kind, zone);
  return z == null ? null : pricing[tier].trip[kind] + z;
}

/** Billable overtime hours: residential day calls round UP to the $75 half-hour; others bill as entered. */
export function billableOvertime(tier: Tier, kind: Exclude<TripKind, 'none'>, hours: number): { hours: number; rounded: boolean; incrementUnresolved: boolean } {
  const h = Math.max(0, hours);
  if (tier === 'residential' && kind === 'day') { const r = Math.ceil(h / N.dayIncrementHours - 1e-9) * N.dayIncrementHours; return { hours: r, rounded: r !== h, incrementUnresolved: false }; }
  return { hours: h, rounded: false, incrementUnresolved: tier === 'residential' && h > 0 };
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[–—-]/g, '-').replace(/\s+/g, ' ').trim();
}

function clone(t: TierRates): TierRates {
  return { trip: { ...t.trip }, hourly: { ...t.hourly }, includedHours: t.includedHours, projectHourly: t.projectHourly };
}
