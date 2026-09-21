/**
 * The house rules, transcribed from the OS pages that define them:
 * "Rate card rules", "Closeout card", "New client process",
 * "Hidden damage protocol", "Dispatch", and the brand kit's do-not-print list.
 *
 * Numbers live here and nowhere else, so changing a price is one edit.
 */

export const BUSINESS = {
  name: 'Tarango Electric',
  owner: 'Corey Tarango',
  phone: '(417) 501-4752',
  tagline: 'Show up. Fix it right.',
  /** The only towns that may appear in customer-facing copy, per the brand kit. */
  advertisedTowns: ['Bolivar', 'Buffalo', 'Marshfield'],
  codeBasis: '2017 NEC',
} as const;

/* ------------------------------------------------------------------ *
 * Money — "Rate card rules"
 * ------------------------------------------------------------------ */

export const MONEY = {
  /** Residential first hour, credited if we repair the same visit. */
  residentialDiagnostic: 119,
  commercialDiagnostic: 149,
  /** Commercial, after the first hour. */
  commercialHourly: 125,
  /** Only if the work is not on the flat card. */
  residentialHourly: 100,
  materialsMarkup: 0.35,
  /** Deposit required once the job total passes this. */
  depositThreshold: 1500,
  depositRate: 0.5,
  /** Known old-work condition. Not hidden damage. */
  oldWorkSurcharge: 0.25,
  afterHoursMultiplier: 1.5,
  /** Only if you actually answer. */
  holidayMultiplier: 2,
} as const;

export const TRAVEL_ZONES = [
  { zone: 'A', label: 'Bolivar, Buffalo, Marshfield city', fee: 0, note: 'Included' },
  { zone: 'B', label: '25–40 miles from Bolivar', fee: 45, note: '' },
  { zone: 'C', label: 'Over 40 miles from Bolivar', fee: 85, note: '' },
] as const;

export type TravelZone = (typeof TRAVEL_ZONES)[number]['zone'];

/* ------------------------------------------------------------------ *
 * Hard lines — "Dispatch"
 * ------------------------------------------------------------------ */

export const HARD_LINES = [
  'No customer property before insurance binds',
  'No Springfield, Branson, Joplin, or KC metro until licensed',
  'Closeout on every job: hours, signed ticket, photos, review, two magnets',
  'Do not advertise licensed or 24/7',
  'Residential: quote flats. Never quote the hour on the porch',
  'Generator installs stay closed until testers are on the truck',
] as const;

/** Work that is not sold yet, and why. */
export const CLOSED_WORK = [
  { work: 'Generator installs', until: 'load-bank testers are on the truck', stillOpen: 'Service and annual inspections are open.' },
] as const;

/* ------------------------------------------------------------------ *
 * License file
 * ------------------------------------------------------------------ */

export const LICENSE = {
  /** Install hours the state wants on file. */
  targetHours: 12_000,
  note: 'Install hours only — tools on the work. Drive time never counts.',
} as const;

/* ------------------------------------------------------------------ *
 * Copy guard — brand kit "Do not print"
 * ------------------------------------------------------------------ */

export interface CopyViolation {
  phrase: string;
  reason: string;
}

const FORBIDDEN: { pattern: RegExp; phrase: string; reason: string }[] = [
  { pattern: /\blicen[sc]ed\b/i, phrase: 'licensed', reason: 'Not true yet. The kit forbids it until it is.' },
  { pattern: /\b24\s*\/?\s*7\b|\btwenty[- ]four seven\b/i, phrase: '24/7', reason: 'Do not advertise a response you cannot staff.' },
  { pattern: /\bbuilt ready\b/i, phrase: 'Built Ready', reason: 'Rejected name and slogan.' },
  { pattern: /\best\.?\s*(19|20)\d{2}\b/i, phrase: 'EST. [year]', reason: 'No founding-myth copy.' },
  { pattern: /\bsouth\s?west missouri\b/i, phrase: 'Southwest Missouri', reason: 'Too broad. Name the three towns instead.' },
  { pattern: /\bnew construction\b/i, phrase: 'new construction', reason: 'The company services existing buildings.' },
  { pattern: /\bemergenc(y|ies)\b/i, phrase: 'emergencies', reason: 'Implies a 24/7 promise.' },
  { pattern: /\bspringfield\b/i, phrase: 'Springfield', reason: 'Never the home base, and a NO-GO town until licensed.' },
  { pattern: /\b(joplin|branson)\b/i, phrase: 'Joplin / Branson', reason: 'NO-GO towns. Keep them out of service-area copy.' },
];

/**
 * Checks customer-facing text against the brand kit's do-not-print list.
 * Used on anything that leaves the truck: estimates, invoices, review asks.
 */
export function checkCopy(text: string): CopyViolation[] {
  if (!text) return [];
  const found: CopyViolation[] = [];
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(text) && !found.some((f) => f.phrase === rule.phrase)) {
      found.push({ phrase: rule.phrase, reason: rule.reason });
    }
  }
  return found;
}
