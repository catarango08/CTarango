import { num, round2 } from '../calc';
import { MONEY } from './rules';
import { NOV3_PRICING } from '@/config/pricing-2026-11-03';
import { NO_TRIP_FLATS, billableOvertime, fallbackPricing, zoneAddForTrip, type Pricing, type Tier, type TripKind, type ZoneNumber } from './pricing';

/**
 * Quote math off the Rate Book.
 *
 * - Trip (day / after-hours / emergency / holiday) includes the Zone 1 trip
 *   and the included hours (residential: 2, Nov 3 pricing). See pricing.ts for zones.
 * - Extra hours bill at the tier's hourly for that trip kind.
 * - After-hours, emergency and holiday change only the trip and the hour.
 *   They never multiply the zone fee, flats, or materials.
 * - Flats with no trip on the ticket carry the full zone fee.
 * - The LOTO add-on carries no trip or zone fee.
 */

export interface QuoteLine {
  id: string;
  name: string;
  /** Flat price from the Rate Book, or a materials cost. */
  price: number;
  quantity: number;
  kind: 'flat' | 'labor' | 'material';
  assumes?: string;
}

export interface QuoteInput {
  lines: QuoteLine[];
  pricing?: Pricing;
  tier?: Tier;
  zone?: ZoneNumber;
  /** Trip on the ticket. 'none' = flats only, which carry the full zone fee. */
  trip?: TripKind;
  /** Hours past the included hours (2 on residential calls). Bill only with the customer's OK. */
  extraHours?: number;
  /** Known old condition flagged on the first look. Not hidden damage. */
  oldWork?: boolean;
  /** Diagnostic already collected and credited against the repair. */
  creditDiagnostic?: number;
}

export interface QuoteResult {
  flats: number;
  materialsCost: number;
  materialsCharged: number;
  trip: number;
  zoneAdd: number;
  hours: number;
  hourlyRate: number;
  laborCharged: number;
  subtotal: number;
  oldWorkAdd: number;
  diagnosticCredit: number;
  total: number;
  depositDue: number;
  /** Plain-language notes to read out loud. */
  notes: string[];
  /** Pricing questions the app will not guess (e.g. zone supplement on special calls). Block card checkout. */
  unresolved: string[];
}

const TRIP_LABEL: Record<Exclude<TripKind, 'none'>, string> = {
  day: 'Day trip / diagnostic',
  afterHours: 'After-hours trip',
  emergency: 'Emergency trip',
  holiday: 'Holiday trip',
};

export function tripLabel(kind: Exclude<TripKind, 'none'>): string {
  return TRIP_LABEL[kind];
}

export function buildQuote(input: QuoteInput): QuoteResult {
  const notes: string[] = [];
  const pricing = input.pricing ?? fallbackPricing();
  const tier = input.tier ?? 'residential';
  const zone = input.zone ?? 1;
  const tripKind = input.trip ?? 'none';
  const rates = pricing[tier];

  const work = input.lines.filter((l) => l.kind !== 'material');
  const flats = round2(work.reduce((sum, l) => sum + num(l.price) * num(l.quantity, 1), 0));
  const tripFlats = work.filter((l) => !NO_TRIP_FLATS.includes(l.name));

  const materialsCost = round2(
    input.lines
      .filter((l) => l.kind === 'material')
      .reduce((sum, l) => sum + num(l.price) * num(l.quantity, 1), 0),
  );
  const materialsCharged = round2(materialsCost * (1 + MONEY.materialsMarkup));
  if (materialsCost > 0) notes.push(`Materials at cost + ${MONEY.materialsMarkup * 100}%.`);

  let trip = 0;
  let zoneAdd = 0;
  let hourlyRate = 0;
  const unresolved: string[] = [];
  let hours = Math.max(0, num(input.extraHours));
  if (tripKind !== 'none') {
    trip = rates.trip[tripKind];
    const z = zoneAddForTrip(pricing, tier, tripKind, zone);
    if (z == null) {
      unresolved.push(`Zone ${zone} supplement on a ${TRIP_LABEL[tripKind].toLowerCase()} is not decided (Nov 3 pricing). Nothing added; confirm with Corey.`);
      notes.push(`Zone ${zone} supplement for this call type: not decided. Nothing added.`);
    } else zoneAdd = z;
    hourlyRate = rates.hourly[tripKind];
    notes.push(`${TRIP_LABEL[tripKind]} includes the Zone 1 trip and up to ${rates.includedHours} hour${rates.includedHours === 1 ? '' : 's'}.`);
    if (zoneAdd) notes.push(`Zone ${zone} adds $${zoneAdd}.`);
    if (hours > 0) {
      const b = billableOvertime(tier, tripKind, hours);
      if (b.rounded) notes.push(`${hours} h rounds up to ${b.hours} h ($${round2(hourlyRate / 2)} per half-hour).`);
      if (b.incrementUnresolved) notes.push('Billing increment for this call type was not stated; hours bill as entered.');
      hours = b.hours;
      if (tier === 'residential') notes.push("Time past the included hours bills only with the customer's OK.");
    }
  } else if (tripFlats.length > 0) {
    zoneAdd = pricing.zones[zone];
    notes.push(`Flat rates are plus the Zone ${zone} fee.`);
  }
  if (tripKind === 'none' && hours > 0) hourlyRate = rates.projectHourly;
  const laborCharged = round2(hours * hourlyRate);
  if (laborCharged) notes.push(`${hours} more hour${hours === 1 ? '' : 's'} at $${hourlyRate}/hr.`);

  const subtotal = round2(flats + materialsCharged + trip + zoneAdd + laborCharged);

  // Old work stacks on the work, not on the trip or zone.
  const oldWorkAdd = input.oldWork ? round2((flats + materialsCharged + laborCharged) * MONEY.oldWorkSurcharge) : 0;
  if (oldWorkAdd) notes.push(`Old work +${MONEY.oldWorkSurcharge * 100}%: a known condition, flagged on the first look.`);

  // The service call is credited once, and never more than the service call itself.
  const creditCap = tier === 'residential' ? NOV3_PRICING.serviceCallCredit : rates.trip.day;
  const askedCredit = round2(num(input.creditDiagnostic));
  const diagnosticCredit = Math.min(askedCredit, creditCap);
  if (askedCredit > creditCap) notes.push(`Credit capped at $${creditCap} (the service call).`);
  if (diagnosticCredit) notes.push(`Service call $${diagnosticCredit} credited toward the approved repair (once).`);

  const total = round2(Math.max(0, subtotal + oldWorkAdd - diagnosticCredit));
  const depositDue = total > MONEY.depositThreshold ? round2(total * MONEY.depositRate) : 0;
  if (depositDue) notes.push(`Deposit $${depositDue.toLocaleString()} (${MONEY.depositRate * 100}%) before the work starts.`);

  return {
    flats,
    materialsCost,
    materialsCharged,
    trip,
    zoneAdd,
    hours,
    hourlyRate,
    laborCharged,
    subtotal,
    oldWorkAdd,
    diagnosticCredit,
    total,
    depositDue,
    notes,
    unresolved,
  };
}
