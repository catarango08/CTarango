/**
 * Display shape of a payment. The source of truth is the payment database.
 * The JSON on the job is a projection so a person can read it in Notion.
 * All money is integer cents. Credit is explicit principal, never a guessed fee split.
 */
export type PayKind = 'deposit' | 'balance' | 'co';
export type EntryStatus = 'processing' | 'paid' | 'failed' | 'review';

export interface LedgerEntry {
  key: string; // payment_intent id, manual receipt id, or checkout session id
  session: string;
  kind: PayKind;
  coId?: string;
  status: EntryStatus;
  baseCents: number; // principal collected
  feeCents: number; // card fee, never credited
  paidCents: number; // principal + fee collected
  refundedCents: number; // cumulative Stripe refund in cents (principal + fee)
  /** Unambiguous principal refunded. Absent means "not stated", which is not a guess. */
  refundedPrincipalCents?: number;
  refundedFeeCents?: number;
  /** Credit that stays in force while an ambiguous refund is in review. */
  appliedPrincipalCents?: number;
  needsReview?: boolean;
  source?: 'stripe' | 'manual';
  note?: string;
  events: string[];
  at: string;
}

export function parseLedger(raw: unknown): LedgerEntry[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? (v as LedgerEntry[]) : []; } catch { return []; }
}
export const serializeLedger = (l: LedgerEntry[]) => JSON.stringify(l);

/**
 * Principal credited from one entry.
 * A partial refund with no explicit principal/fee split does not change this number.
 */
export function creditedCents(e: LedgerEntry): number {
  if (e.status !== 'paid' && e.status !== 'review') return 0;
  if (e.needsReview || e.status === 'review') return Math.max(0, e.appliedPrincipalCents ?? e.baseCents);
  if (typeof e.refundedPrincipalCents === 'number') return Math.max(0, e.baseCents - e.refundedPrincipalCents);
  if ((e.refundedCents ?? 0) <= 0) return Math.max(0, e.baseCents);
  if (e.paidCents > 0 && e.refundedCents >= e.paidCents) return 0;
  return Math.max(0, e.appliedPrincipalCents ?? e.baseCents);
}

export function sumCredited(l: LedgerEntry[], kind: PayKind, coId?: string): number {
  return l.filter((e) => e.kind === kind && (kind !== 'co' || e.coId === coId)).reduce((s, e) => s + creditedCents(e), 0);
}
export const hasProcessing = (l: LedgerEntry[], kind: PayKind, coId?: string) =>
  l.some((e) => e.kind === kind && (kind !== 'co' || e.coId === coId) && (e.status === 'processing' || e.status === 'review' || e.needsReview === true));

export function slotFor(kind: PayKind, coId?: string): string {
  return kind === 'co' ? `co:${coId ?? ''}` : kind;
}
