import { num, round2 } from '../calc';
import { MONEY } from './rules';
import { buildQuote, tripLabel, type QuoteLine, type QuoteResult } from './quote';
import type { Pricing, Tier, TripKind, ZoneNumber } from './pricing';

/**
 * Good / better / best (and named scenarios) on top of buildQuote().
 * Every price is a Rate Book row; the only free number is materials at cost,
 * which buildQuote marks up. The discount is applied once, after the option
 * and add-ons are totaled, and always shows as its own line.
 */

export interface PickedRate { rateId: string; name: string; price: number; quantity: number; kind: 'flat' | 'labor' }

export interface QuoteOptionDef {
  id: string;
  /** "Good", "Better", "Best", or a scenario name like "If the run is bad". */
  label: string;
  summary: string;
  recommended?: boolean;
  lines: PickedRate[];
  trip: TripKind;
  extraHours: number;
  materialsCost: number;
}

export interface AddOnDef extends PickedRate { id: string; recommended?: boolean }

export interface QuoteDoc {
  tier: Tier;
  zone: ZoneNumber;
  oldWork: boolean;
  options: QuoteOptionDef[];
  addOns: AddOnDef[];
  discount: { label: string; amount: number } | null;
  scope: string;
}

export interface PricedLine { label: string; amount: number; kind: 'work' | 'trip' | 'zone' | 'labor' | 'materials' | 'oldwork' | 'addon' | 'discount' }

export interface PricedOption {
  option: QuoteOptionDef;
  quote: QuoteResult;
  lines: PricedLine[];
  discount: number;
  total: number;
  deposit: number;
}

export function emptyDoc(tier: Tier = 'residential', zone: ZoneNumber = 1): QuoteDoc {
  const blank = (id: string, label: string, recommended = false): QuoteOptionDef => ({
    id, label, summary: '', recommended, lines: [], trip: 'none', extraHours: 0, materialsCost: 0,
  });
  return { tier, zone, oldWork: false, options: [blank('good', 'Good'), blank('better', 'Better', true), blank('best', 'Best')], addOns: [], discount: null, scope: '' };
}

export function depositFor(total: number): number {
  return total > MONEY.depositThreshold ? round2(total * MONEY.depositRate) : 0;
}

export function priceOption(doc: QuoteDoc, option: QuoteOptionDef, pricing: Pricing, selectedAddOns: string[] = []): PricedOption {
  const addOns = doc.addOns.filter((a) => selectedAddOns.includes(a.id));
  const quoteLines: QuoteLine[] = [
    ...option.lines.map((l, i) => ({ id: `${l.rateId}-${i}`, name: l.name, price: num(l.price), quantity: num(l.quantity, 1), kind: l.kind })),
    ...addOns.map((a) => ({ id: `addon-${a.id}`, name: a.name, price: num(a.price), quantity: num(a.quantity, 1), kind: a.kind })),
  ];
  if (num(option.materialsCost) > 0) quoteLines.push({ id: 'mat', name: 'Materials', price: num(option.materialsCost), quantity: 1, kind: 'material' });

  const quote = buildQuote({ lines: quoteLines, pricing, tier: doc.tier, zone: doc.zone, trip: option.trip, extraHours: option.extraHours, oldWork: doc.oldWork });

  const lines: PricedLine[] = [];
  for (const l of option.lines) lines.push({ label: l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name, amount: round2(num(l.price) * num(l.quantity, 1)), kind: 'work' });
  for (const a of addOns) lines.push({ label: `Add-on: ${a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name}`, amount: round2(num(a.price) * num(a.quantity, 1)), kind: 'addon' });
  if (quote.trip) lines.push({ label: option.trip === 'none' ? 'Trip' : `${tripLabel(option.trip)} (includes first hour)`, amount: quote.trip, kind: 'trip' });
  if (quote.zoneAdd) lines.push({ label: quote.trip ? `Zone ${doc.zone} travel, over Zone 1` : `Zone ${doc.zone} travel`, amount: quote.zoneAdd, kind: 'zone' });
  if (quote.laborCharged) lines.push({ label: `${quote.hours} more hour${quote.hours === 1 ? '' : 's'} at ${quote.hourlyRate}/hr`, amount: quote.laborCharged, kind: 'labor' });
  if (quote.materialsCharged) lines.push({ label: 'Materials', amount: quote.materialsCharged, kind: 'materials' });
  if (quote.oldWorkAdd) lines.push({ label: 'Older wiring condition', amount: quote.oldWorkAdd, kind: 'oldwork' });

  const discount = doc.discount && num(doc.discount.amount) > 0 ? Math.min(round2(num(doc.discount.amount)), quote.total) : 0;
  if (discount) lines.push({ label: doc.discount!.label || 'Discount', amount: -discount, kind: 'discount' });

  const total = round2(Math.max(0, quote.total - discount));
  return { option, quote, lines, discount, total, deposit: depositFor(total) };
}

export function parseDoc(raw: unknown): QuoteDoc | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const d = JSON.parse(raw) as QuoteDoc;
    return Array.isArray(d.options) ? { ...emptyDoc(), ...d } : null;
  } catch {
    return null;
  }
}

/** What Data holds once accepted: the doc plus what the customer picked. */
export interface StoredQuote { doc: QuoteDoc; accepted?: { optionId: string; addOns: string[] } }

export function parseStored(raw: unknown): StoredQuote | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const v = JSON.parse(raw) as StoredQuote | QuoteDoc;
    if ('doc' in v) return { doc: { ...emptyDoc(), ...v.doc }, accepted: v.accepted };
    const doc = parseDoc(raw);
    return doc ? { doc } : null;
  } catch {
    return null;
  }
}
