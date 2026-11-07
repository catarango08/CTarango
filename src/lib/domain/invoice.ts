import { CO_DUE_ON_APPROVAL, coTotal, isChangeOrder, parseCO } from './change-order';
import { num, relationIds } from '../calc';
import { parseStored, priceOption } from './options';
import type { Pricing } from './pricing';
import type { RecordValue } from '../schema';
import { DEPOSIT_POLICY } from '@/config/deposit-policy';
import { hasProcessing, parseLedger, sumCredited } from '../payments/ledger';

/**
 * The one invoice calculation. Used by the invoice page AND by card checkout,
 * so what the customer sees and what Stripe charges can't drift apart.
 * Money in cents internally.
 */
export const toCents = (d: number) => Math.round(d * 100);
export const fromCents = (c: number) => c / 100;
/** 2.5% card fee, rounded to the cent, on a base in cents. Applied once, never to a fee. */
export const cardFeeCents = (baseCents: number) => Math.round(baseCents * DEPOSIT_POLICY.cardFee);

export interface InvoiceCalc {
  lines: { label: string; amount: number }[];
  totalCents: number;
  /** Deposit credited once, only when "Deposit in" is checked. */
  depositCents: number;
  depositCreditCents: number;
  /** Confirmed online payments toward this invoice (net of refunds). */
  paidOnlineCents: number;
  balanceCents: number;
  /** Accepted (signed) total vs today's re-price, when they differ. */
  repriceNote?: string;
  separateCOs: { id: string; n: number; totalCents: number }[];
  coOnly?: { id: string; n: number };
  /** Reasons card checkout must not be offered. */
  blockers: string[];
}

export function computeInvoice(job: RecordValue, quotes: RecordValue[], pricing: Pricing, opts: { coId?: string } = {}): InvoiceCalc {
  const id = job.id;
  const blockers: string[] = [];
  const mine = quotes.filter((q) => relationIds(q.job).includes(id));
  const accepted = mine.filter((q) => String(q.status) === 'Accepted' && !isChangeOrder(q)).sort((a, b) => Number(b.version) - Number(a.version))[0];
  const stored = accepted ? parseStored(accepted.data) : null;
  const signedCOs = mine.filter((q) => String(q.status) === 'Accepted').map((q) => ({ q, co: parseCO(q.data) })).filter((x) => x.co).map((x) => ({ id: x.q.id, co: x.co!, total: coTotal(x.co!) }));
  const separate = signedCOs.filter((c) => c.total > CO_DUE_ON_APPROVAL);
  const ledger = parseLedger(job.paymentLedger);
  let lines: { label: string; amount: number }[] = [];
  let totalCents = 0;
  let repriceNote: string | undefined;

  if (opts.coId) {
    const c = signedCOs.find((x) => x.id === opts.coId);
    if (!c) return { lines: [], totalCents: 0, depositCents: 0, depositCreditCents: 0, paidOnlineCents: 0, balanceCents: 0, separateCOs: [], blockers: ['Change order not found or not signed'] };
    lines = [{ label: `Change order ${c.co.n} — due on approval`, amount: NaN }, ...c.co.lines.map((l) => ({ label: `${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`, amount: l.price * l.qty }))];
    totalCents = toCents(c.total);
    const paid = sumCredited(ledger, 'co', c.id);
    if (hasProcessing(ledger, 'co', c.id)) blockers.push('A card payment for this change order is still processing or under review');
    return { lines, totalCents, depositCents: 0, depositCreditCents: 0, paidOnlineCents: paid, balanceCents: Math.max(0, totalCents - paid), separateCOs: [], coOnly: { id: c.id, n: c.co.n }, blockers };
  }

  if (stored && accepted) {
    const opt = stored.doc.options.find((o) => o.id === stored.accepted?.optionId) ?? stored.doc.options[0];
    const signed = num(accepted.total);
    // Bill what the customer signed. Re-pricing with today's rates is shown, never charged.
    const live = priceOption(stored.doc, opt, pricing, stored.accepted?.addOns ?? []);
    const amount = signed > 0 ? signed : live.total;
    if (signed > 0 && Math.abs(live.total - signed) >= 0.01) repriceNote = `Signed total $${signed.toFixed(2)}; today's pricing would be $${live.total.toFixed(2)}. Billing the signed total.`;
    if (!(signed > 0)) blockers.push('Accepted quote has no signed total; check the quote before taking a card payment');
    lines = [{ label: `${opt.label}${opt.summary ? ` — ${opt.summary}` : ''}`, amount }];
    totalCents = toCents(amount);
  } else if (num(job.amount)) {
    lines = [{ label: String(job.name ?? 'Electrical work'), amount: num(job.amount) }];
    totalCents = toCents(num(job.amount));
  }
  for (const c of signedCOs.filter((c) => c.total <= CO_DUE_ON_APPROVAL)) {
    lines.push({ label: `Change order ${c.co.n}: ${c.co.lines.map((l) => l.name).join(', ')}`, amount: c.total });
    totalCents += toCents(c.total);
  }
  const depositCents = toCents(num(job.deposit));
  // "Deposit in" is the single source of truth for the deposit credit (set by hand or by a confirmed
  // deposit payment). Deposit ledger entries are NOT also subtracted, so the deposit can't be credited twice.
  const depositCreditCents = depositCents > 0 && job.depositIn === true ? Math.min(depositCents, totalCents) : 0;
  const paidOnlineCents = sumCredited(ledger, 'balance');
  if (hasProcessing(ledger, 'balance')) blockers.push('A card payment for this invoice is still processing or under review');
  if (hasProcessing(ledger, 'deposit')) blockers.push('A deposit card payment is still processing or under review');
  if (String(job.invoiceStatus) === 'Partial' && !ledger.some((e) => e.kind === 'balance' && e.status === 'paid')) blockers.push('Invoice is marked Partial but the amount paid is not recorded; record it before taking a card payment');
  if (String(job.invoiceStatus) === 'Paid' || job.paid === true) blockers.push('Invoice is marked Paid');
  if (totalCents <= 0) blockers.push('No invoice total yet');
  const balanceCents = Math.max(0, totalCents - depositCreditCents - paidOnlineCents);
  return { lines, totalCents, depositCents, depositCreditCents, paidOnlineCents, balanceCents, repriceNote, separateCOs: separate.map((c) => ({ id: c.id, n: c.co.n, totalCents: toCents(c.total) })), blockers };
}
