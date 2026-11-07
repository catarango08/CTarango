/**
 * Online payment ledger, stored as JSON on the job ("Payment Ledger").
 * Keyed by Stripe PaymentIntent (or Checkout Session when there is none), so a
 * replayed or duplicated webhook event can never add a payment twice. Totals are
 * always recomputed from the entries (set semantics), never incremented.
 * All money is integer cents.
 */
export type PayKind = 'deposit' | 'balance' | 'co';
export type EntryStatus = 'processing' | 'paid' | 'failed' | 'review';

export interface LedgerEntry {
  key: string; // payment_intent id, else checkout session id
  session: string;
  kind: PayKind;
  coId?: string;
  status: EntryStatus;
  baseCents: number; // what is credited toward the invoice / deposit
  feeCents: number; // 2.5% card fee, never credited
  paidCents: number; // amount Stripe reports collected
  refundedCents: number; // cumulative, as Stripe reports (absolute, so replays are harmless)
  /** True when this entry is what turned "Deposit in" on (so a refund may turn it off). */
  setDepositIn?: boolean;
  note?: string;
  events: string[]; // last processed Stripe event ids
  at: string;
}

export function parseLedger(raw: unknown): LedgerEntry[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? (v as LedgerEntry[]) : []; } catch { return []; }
}
export const serializeLedger = (l: LedgerEntry[]) => JSON.stringify(l);

/** Credit toward the invoice from one entry, net of refunds (refunds reduce credit pro rata with the fee). */
export function creditedCents(e: LedgerEntry): number {
  if (e.status !== 'paid' || e.paidCents <= 0) return 0;
  const refundedShare = Math.min(1, Math.max(0, e.refundedCents) / e.paidCents);
  return Math.max(0, Math.round(e.baseCents * (1 - refundedShare)));
}

export function sumCredited(l: LedgerEntry[], kind: PayKind, coId?: string): number {
  return l.filter((e) => e.kind === kind && (kind !== 'co' || e.coId === coId)).reduce((s, e) => s + creditedCents(e), 0);
}
export const hasProcessing = (l: LedgerEntry[], kind: PayKind, coId?: string) => l.some((e) => e.kind === kind && (kind !== 'co' || e.coId === coId) && (e.status === 'processing' || e.status === 'review'));
