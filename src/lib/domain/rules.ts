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
  phone: '417-501-4752',
  email: 'tarangoelectric417@gmail.com',
  /** Home base. Trip zones are measured from here. */
  base: 'Elkland',
  tagline: 'We Show Up. We Do It Right. We Charge Fair.',
  /** The service area for customer-facing copy. Never Springfield. */
  advertisedTowns: ['Bolivar', 'Buffalo', 'Marshfield', 'Fair Grove', 'Elkland'],
  advertisedCounties: ['Dallas', 'Polk', 'Webster', 'Greene'],
  /** One line for copy: towns, then counties. */
  serviceArea: 'Bolivar, Buffalo, Marshfield, Fair Grove, Elkland, and Dallas, Polk, Webster and Greene counties',
  codeBasis: '2017 NEC',
} as const;

/* ------------------------------------------------------------------ *
 * Money — "Rate card rules"
 * ------------------------------------------------------------------ */

export const MONEY = {
  materialsMarkup: 0.35,
  /** Deposit required once the job total passes this. */
  depositThreshold: 1500,
  depositRate: 0.5,
  /** Known old-work condition. Not hidden damage. */
  oldWorkSurcharge: 0.25,
} as const;

/*
 * Trip, hour and zone prices live in ./pricing.ts and are read from the
 * Notion Rate Book, with matching fallbacks.
 */

/* ------------------------------------------------------------------ *
 * Hard lines — "Dispatch"
 * ------------------------------------------------------------------ */

export const HARD_LINES = [
  'No Springfield work. Stay inside the service area',
  'Closeout on every job: hours, signed ticket, photos, review, two magnets',
  'Do not advertise 24/7',
  'Residential: quote flats plus the zone fee. Never quote the hour on the porch',
  'Say the trip number before you roll',
] as const;

/** Work that is not sold yet, and why. Generator installs opened Oct 22, 2026. */
export const CLOSED_WORK: readonly { work: string; until: string; stillOpen: string }[] = [];

/** Current promotion, from /workspace/generator-push (Oct 26 – Nov 22, 2026). */
export const PROMO = {
  title: 'Generator push',
  text: 'Generator hookups starting at $750. $50 off if booked by Nov 22.',
  endsOn: '2026-11-22',
} as const;

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
  { pattern: /\blicen[sc]ed\b/i, phrase: 'licensed', reason: 'Never print it.' },
  { pattern: /\binsured\b|\binsurance\b/i, phrase: 'insured', reason: 'No liability policy is bound. Never print it.' },
  { pattern: /\b24\s*\/?\s*7\b|\btwenty[- ]four seven\b/i, phrase: '24/7', reason: 'Do not advertise a response you cannot staff.' },
  { pattern: /\bbuilt ready\b/i, phrase: 'Built Ready', reason: 'Rejected name and slogan.' },
  { pattern: /\best\.?\s*(19|20)\d{2}\b/i, phrase: 'EST. [year]', reason: 'No founding-myth copy.' },
  { pattern: /\bsouth\s?west missouri\b/i, phrase: 'Southwest Missouri', reason: 'Too broad. Name the towns and counties instead.' },
  { pattern: /\bnew construction\b/i, phrase: 'new construction', reason: 'The company services existing buildings.' },
  { pattern: /\bemergenc(y|ies)\b/i, phrase: 'emergencies', reason: 'Implies a 24/7 promise.' },
  { pattern: /\bspringfield\b/i, phrase: 'Springfield', reason: 'Not in the service area. Never print it.' },
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
