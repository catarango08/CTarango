import { ESTIMATE } from '@/config/assemblies';

/** A change order lives in the Quotes database with `changeOrder: true` in its data. */
export interface COLine { name: string; price: number; qty: number }
export interface ChangeOrder { changeOrder: true; n: number; lines: COLine[]; note?: string }
export const CO_DUE_ON_APPROVAL = 300;

export function parseCO(raw: unknown): ChangeOrder | null {
  if (typeof raw !== 'string') return null;
  try { const v = JSON.parse(raw); return v && v.changeOrder === true ? (v as ChangeOrder) : null; } catch { return null; }
}
export const isChangeOrder = (q: Record<string, unknown>) => parseCO(q.data) !== null;
export const coTotal = (co: ChangeOrder) => Math.round(co.lines.reduce((s, l) => s + l.price * (l.qty || 1), 0) * 100) / 100;
/** Assembly price on a change order: same math as the estimator (labor × buffer × rate + material × markup). */
export function assemblyPrice(hours: number, material: number, rate: number, laborOnly = false) {
  return Math.round((hours * ESTIMATE.laborBuffer * rate + (laborOnly ? 0 : material * (1 + ESTIMATE.materialMarkup))) * 100) / 100;
}
