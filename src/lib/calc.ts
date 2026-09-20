import type { RecordValue } from './schema';

/**
 * Derived money and margin math.
 *
 * Notion stores the results as plain numbers rather than formulas, so the same
 * figures are correct whether you are looking at the app or at the database.
 */

export interface DocumentTotals {
  subtotal: number;
  taxableSubtotal: number;
  taxAmount: number;
  discount: number;
  retainage: number;
  total: number;
  cost: number;
  margin: number;
  marginPct: number;
}

export function lineTotal(item: RecordValue): number {
  const qty = num(item.quantity, 1);
  const price = num(item.unitPrice, 0);
  return round2(qty * price);
}

export function lineCost(item: RecordValue): number {
  return round2(num(item.quantity, 1) * num(item.unitCost, 0));
}

export function totalsFor(doc: RecordValue, items: RecordValue[]): DocumentTotals {
  let subtotal = 0;
  let taxableSubtotal = 0;
  let cost = 0;

  for (const item of items) {
    const value = lineTotal(item);
    subtotal += value;
    if (item.taxable) taxableSubtotal += value;
    cost += lineCost(item);
  }

  const discount = num(doc.discount, 0);
  const retainage = num(doc.retainage, 0);
  const taxRate = num(doc.taxRate, 0);
  const taxAmount = round2(Math.max(0, taxableSubtotal - discount) * taxRate);
  const total = round2(subtotal - discount + taxAmount - retainage);
  const margin = round2(subtotal - discount - cost);

  return {
    subtotal: round2(subtotal),
    taxableSubtotal: round2(taxableSubtotal),
    taxAmount,
    discount,
    retainage,
    total,
    cost: round2(cost),
    margin,
    marginPct: subtotal > 0 ? margin / (subtotal - discount || 1) : 0,
  };
}

export function jobCost(job: RecordValue, timeEntries: RecordValue[], usage: RecordValue[], technicians: RecordValue[]): { labor: number; materials: number; hours: number; total: number } {
  const rateById = new Map(technicians.map((t) => [t.id, num(t.hourlyCost, 0)]));
  let labor = 0;
  let hours = 0;

  for (const entry of timeEntries) {
    const h = num(entry.hours, 0);
    hours += h;
    const techId = firstRelationId(entry.technician);
    const rate = techId ? rateById.get(techId) ?? 0 : 0;
    labor += h * rate * (entry.overtime ? 1.5 : 1);
  }

  const materials = usage.reduce((sum, u) => sum + (num(u.extendedCost, 0) || num(u.quantity, 0) * num(u.unitCost, 0)), 0);

  void job;
  return { labor: round2(labor), materials: round2(materials), hours: round2(hours), total: round2(labor + materials) };
}

export function marginPct(revenue: number, cost: number): number {
  if (!revenue) return 0;
  return (revenue - cost) / revenue;
}

export function balanceDue(invoice: RecordValue, payments: RecordValue[]): number {
  const paid = payments.reduce((sum, p) => sum + num(p.amount, 0) * (p.kind === 'Refund' ? -1 : 1), 0);
  return round2(num(invoice.total, 0) - paid);
}

export function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function firstRelationId(value: unknown): string | null {
  if (Array.isArray(value) && value.length) {
    const first = value[0] as { id?: string };
    return first?.id ?? null;
  }
  return null;
}

export function relationIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (v as { id?: string })?.id).filter((v): v is string => Boolean(v));
}
