import { num, round2 } from '../calc';
import { MONEY, TRAVEL_ZONES, type TravelZone } from './rules';

/**
 * Quote math off the Rate Book, applying the rate card rules in the order the
 * page states them: flats, then materials at cost + 35%, then the modifiers.
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
  travelZone?: TravelZone;
  /** Known old condition flagged on the first look. Not hidden damage. */
  oldWork?: boolean;
  afterHours?: boolean;
  holiday?: boolean;
  /** Diagnostic already collected and credited against the repair. */
  creditDiagnostic?: number;
}

export interface QuoteResult {
  flats: number;
  materialsCost: number;
  materialsCharged: number;
  travel: number;
  subtotal: number;
  oldWorkAdd: number;
  afterHoursAdd: number;
  holidayAdd: number;
  diagnosticCredit: number;
  total: number;
  depositDue: number;
  /** Plain-language notes to read out loud. */
  notes: string[];
}

export function buildQuote(input: QuoteInput): QuoteResult {
  const notes: string[] = [];

  const flats = round2(
    input.lines
      .filter((l) => l.kind !== 'material')
      .reduce((sum, l) => sum + num(l.price) * num(l.quantity, 1), 0),
  );

  const materialsCost = round2(
    input.lines
      .filter((l) => l.kind === 'material')
      .reduce((sum, l) => sum + num(l.price) * num(l.quantity, 1), 0),
  );
  const materialsCharged = round2(materialsCost * (1 + MONEY.materialsMarkup));
  if (materialsCost > 0) notes.push(`Materials at cost + ${MONEY.materialsMarkup * 100}%.`);

  const zone = TRAVEL_ZONES.find((z) => z.zone === (input.travelZone ?? 'A'));
  const travel = zone?.fee ?? 0;
  if (travel > 0) notes.push(`Travel Zone ${zone?.zone}: ${zone?.label}.`);

  const subtotal = round2(flats + materialsCharged + travel);

  // Modifiers stack on the work, not on travel.
  const base = round2(flats + materialsCharged);
  const oldWorkAdd = input.oldWork ? round2(base * MONEY.oldWorkSurcharge) : 0;
  if (oldWorkAdd) notes.push('Old work +25% — a known condition, flagged on the first look.');

  const afterHoursAdd = input.afterHours ? round2(base * (MONEY.afterHoursMultiplier - 1)) : 0;
  if (afterHoursAdd) notes.push('After hours 1.5×.');

  const holidayAdd = input.holiday ? round2(base * (MONEY.holidayMultiplier - 1)) : 0;
  if (holidayAdd) notes.push('Holiday 2× — only because the call was answered.');

  const diagnosticCredit = round2(num(input.creditDiagnostic));
  if (diagnosticCredit) notes.push(`Diagnostic $${diagnosticCredit} credited — repaired the same visit.`);

  const total = round2(Math.max(0, subtotal + oldWorkAdd + afterHoursAdd + holidayAdd - diagnosticCredit));
  const depositDue = total > MONEY.depositThreshold ? round2(total * MONEY.depositRate) : 0;
  if (depositDue) notes.push(`Deposit $${depositDue.toLocaleString()} (50%) before the work starts.`);

  return {
    flats,
    materialsCost,
    materialsCharged,
    travel,
    subtotal,
    oldWorkAdd,
    afterHoursAdd,
    holidayAdd,
    diagnosticCredit,
    total,
    depositDue,
    notes,
  };
}
