import type { RecordValue } from '../schema';
import type { Pricing } from '../domain/pricing';
import { cardFeeCents, computeInvoice, toCents } from '../domain/invoice';
import { hasProcessing, parseLedger, type PayKind } from './ledger';
import type { PayTarget } from './token';

export interface ChargePlan {
  kind: PayKind; coId?: string;
  baseCents: number; feeCents: number; totalCents: number;
  /** Shown to the customer and on Stripe. Invoice number only; never an address. */
  title: string;
  blockers: string[];
}

/** Stripe's minimum USD charge. */
export const STRIPE_MIN_CENTS = 50;

/** What a pay link would charge right now. Everything server-side from Notion records. */
export function planCharge(job: RecordValue, quotes: RecordValue[], pricing: Pricing, t: PayTarget): ChargePlan {
  const inv = String(job.jobNumber ?? '').trim() || 'job';
  let base = 0; let title = ''; const blockers: string[] = [];
  if (t.kind === 'deposit') {
    const dep = toCents(Number(job.deposit) || 0);
    title = `Deposit, invoice ${inv}`;
    if (job.depositIn === true) blockers.push('Deposit already received');
    if (hasProcessing(parseLedger(job.paymentLedger), 'deposit')) blockers.push('A deposit card payment is still processing or under review');
    if (dep <= 0) blockers.push('No deposit set on this job');
    base = dep;
  } else {
    const c = computeInvoice(job, quotes, pricing, { coId: t.kind === 'co' ? t.coId : undefined });
    blockers.push(...c.blockers);
    base = c.balanceCents;
    title = t.kind === 'co' ? `Change order ${c.coOnly?.n ?? ''}, invoice ${inv}` : `Invoice ${inv} balance`;
    if (t.kind === 'balance' && job.depositIn !== true && c.depositCents > 0) blockers.push('Deposit not recorded as received; mark "Deposit in" or collect the deposit first so it is credited correctly');
  }
  if (base > 0 && base < STRIPE_MIN_CENTS) blockers.push('Amount is below the card minimum');
  if (base <= 0 && !blockers.length) blockers.push('Nothing is due');
  const fee = cardFeeCents(base);
  return { kind: t.kind, coId: t.coId, baseCents: base, feeCents: fee, totalCents: base + fee, title, blockers };
}
