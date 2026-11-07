/**
 * How a Stripe refund splits between principal (credited to the job) and the card fee.
 * A full refund of the charge is exact. Anything else needs an explicit principal/fee
 * split that adds up to Stripe's cumulative refund. A proportional guess is not used.
 */
export type RefundAllocation =
  | { kind: 'replay' }
  | { kind: 'applied'; principalRefunded: number; feeRefunded: number }
  | { kind: 'review'; reason: string };

export function allocateRefund(i: {
  baseCents: number;
  feeCents: number;
  paidCents: number;
  priorRefundedCents: number;
  priorPrincipalRefunded: number;
  priorFeeRefunded: number;
  cumulativeRefundedCents: number;
  explicitCumulative?: { principalCents: number; feeCents: number } | null;
}): RefundAllocation {
  const cum = i.cumulativeRefundedCents;
  if (!Number.isInteger(cum) || cum < 0) return { kind: 'review', reason: 'Refund amount is missing or not a whole number of cents.' };
  if (cum < i.priorRefundedCents) return { kind: 'review', reason: 'Refund total went backwards.' };
  if (cum === i.priorRefundedCents) return { kind: 'replay' };
  if (cum > i.paidCents) return { kind: 'review', reason: 'Refund is larger than the amount collected.' };
  if (cum === i.paidCents && i.paidCents === i.baseCents + i.feeCents) {
    return { kind: 'applied', principalRefunded: i.baseCents, feeRefunded: i.feeCents };
  }
  const ex = i.explicitCumulative;
  if (
    ex &&
    Number.isInteger(ex.principalCents) &&
    Number.isInteger(ex.feeCents) &&
    ex.principalCents >= 0 &&
    ex.feeCents >= 0 &&
    ex.principalCents + ex.feeCents === cum &&
    ex.principalCents <= i.baseCents &&
    ex.feeCents <= i.feeCents &&
    ex.principalCents >= i.priorPrincipalRefunded &&
    ex.feeCents >= i.priorFeeRefunded
  ) {
    return { kind: 'applied', principalRefunded: ex.principalCents, feeRefunded: ex.feeCents };
  }
  return { kind: 'review', reason: 'Refund does not say how it splits between the job amount and the card fee. It was not guessed.' };
}

/** Explicit cumulative split from charge or refund metadata. One field without the other is not a split. */
export function readExplicitRefund(metadata: Record<string, string> | null | undefined): { principalCents: number; feeCents: number } | null | 'invalid' {
  if (!metadata) return null;
  const hasP = metadata.principal_cents !== undefined && metadata.principal_cents !== '';
  const hasF = metadata.refund_fee_cents !== undefined && metadata.refund_fee_cents !== '';
  // Checkout metadata already carries fee_cents for the original charge. That is not a refund split.
  if (!hasP && !hasF) return null;
  if (hasP !== hasF) return 'invalid';
  const principalCents = Number(metadata.principal_cents);
  const feeCents = Number(metadata.refund_fee_cents);
  if (!Number.isInteger(principalCents) || !Number.isInteger(feeCents)) return 'invalid';
  return { principalCents, feeCents };
}
