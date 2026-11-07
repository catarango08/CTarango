import type Stripe from 'stripe';
import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { computeInvoice, fromCents } from '../domain/invoice';
import { creditedCents, parseLedger, serializeLedger, sumCredited, type LedgerEntry, type PayKind } from './ledger';

/**
 * Applies a signature-verified Stripe event to the job in Notion.
 * - Paid only on checkout.session.completed with payment_status "paid", or async_payment_succeeded.
 *   The return page never marks anything paid.
 * - completed + "unpaid" (delayed method) => processing, not paid.
 * - async_payment_failed => failed, no credit. expired => session pointer cleared.
 * - charge.refunded => refunded cents set to Stripe's cumulative figure (replay-safe).
 * - Idempotent: entries keyed by PaymentIntent; totals recomputed from entries; events seen are skipped.
 * - The write is read back; if Notion dropped the field (schema gap) we throw so Stripe retries.
 */
export type Outcome = { handled: boolean; note: string };
const APP = 'tarango-field-desk';

const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(k: string, f: () => Promise<T>): Promise<T> {
  const prev = locks.get(k) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(f);
  locks.set(k, run);
  try { return await run; } finally { if (locks.get(k) === run) locks.delete(k); }
}

const piId = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id) ?? null;

export async function applyStripeEvent(deps: { store: Store; pricing: Pricing; now?: () => Date }, event: Stripe.Event): Promise<Outcome> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const s = event.data.object as Stripe.Checkout.Session;
      const m = s.metadata ?? {};
      if (m.app !== APP || !m.job_id) return { handled: false, note: 'not ours' };
      return withLock(m.job_id, () => applySession(deps, event, s, now));
    }
    case 'charge.refunded': {
      const c = event.data.object as Stripe.Charge;
      const m = c.metadata ?? {};
      if (m.app !== APP || !m.job_id) return { handled: false, note: 'not ours' };
      return withLock(m.job_id, () => applyRefund(deps, event, c, now));
    }
    default:
      return { handled: false, note: `ignored ${event.type}` };
  }
}

async function applySession(deps: { store: Store; pricing: Pricing }, event: Stripe.Event, s: Stripe.Checkout.Session, now: string): Promise<Outcome> {
  const m = s.metadata!;
  const job = await deps.store.get('jobs', m.job_id);
  if (!job) throw new Error('job not found'); // retry; Notion may be briefly unavailable
  const ledger = parseLedger(job.paymentLedger);
  const ptrs = (() => { try { return JSON.parse(String(job.checkoutSessions || '{}')); } catch { return {}; } })() as Record<string, { id: string }>;
  const kind = m.kind as PayKind;
  if (!['deposit', 'balance', 'co'].includes(kind)) return { handled: false, note: 'bad kind' };

  if (event.type === 'checkout.session.expired') {
    let changed = false;
    for (const k of Object.keys(ptrs)) if (ptrs[k].id === s.id) { delete ptrs[k]; changed = true; }
    if (changed) await deps.store.update('jobs', job.id, { checkoutSessions: JSON.stringify(ptrs) });
    return { handled: true, note: 'expired' };
  }

  const key = piId(s.payment_intent) ?? s.id;
  let e = ledger.find((x) => x.key === key || x.session === s.id);
  if (e?.events.includes(event.id)) return { handled: true, note: 'duplicate event' };
  const base = Number(m.base_cents), fee = Number(m.fee_cents);
  const status: LedgerEntry['status'] =
    event.type === 'checkout.session.async_payment_failed' ? 'failed'
      : event.type === 'checkout.session.async_payment_succeeded' || s.payment_status === 'paid' ? 'paid'
        : s.payment_status === 'unpaid' ? 'processing' : 'review';
  if (!e) { e = { key, session: s.id, kind, coId: m.co_id, status, baseCents: base, feeCents: fee, paidCents: 0, refundedCents: 0, events: [], at: now }; ledger.push(e); }
  // Never downgrade a paid entry because an older "processing" event arrived late.
  if (!(e.status === 'paid' && status === 'processing')) e.status = status;
  e.key = key;
  if (status === 'paid') {
    e.paidCents = s.amount_total ?? 0;
    const ok = s.currency === 'usd' && Number.isInteger(base) && Number.isInteger(fee) && s.amount_total === base + fee;
    if (!ok) { e.status = 'review'; e.note = `Amount check failed: Stripe ${s.amount_total} ${s.currency}, expected ${base + fee} usd. Not credited; review in Stripe.`; }
  }
  e.events = [...e.events, event.id].slice(-20);

  const patch: Record<string, unknown> = { paymentLedger: serializeLedger(ledger) };
  if (e.status === 'paid' && kind === 'deposit' && job.depositIn !== true) {
    // Deposit credited once: through "Deposit in", never also through the ledger.
    if (e.baseCents >= Math.round((Number(job.deposit) || 0) * 100)) { patch.depositIn = true; e.setDepositIn = true; patch.paymentLedger = serializeLedger(ledger); }
    else e.note = 'Deposit payment smaller than the deposit on the job; Deposit in left unchecked for review.';
  }
  Object.assign(patch, await invoiceTotals(deps, { ...job, ...patch }, ledger));
  patch.paymentLedger = serializeLedger(ledger);
  if (e.status !== 'processing') for (const k of Object.keys(ptrs)) if (ptrs[k].id === s.id) { delete ptrs[k]; patch.checkoutSessions = JSON.stringify(ptrs); }
  await writeVerified(deps.store, job.id, patch, key);
  return { handled: true, note: `${kind} ${e.status}` };
}

async function applyRefund(deps: { store: Store; pricing: Pricing }, event: Stripe.Event, c: Stripe.Charge, now: string): Promise<Outcome> {
  const job = await deps.store.get('jobs', c.metadata.job_id);
  if (!job) throw new Error('job not found');
  const ledger = parseLedger(job.paymentLedger);
  const key = piId(c.payment_intent);
  const e = ledger.find((x) => x.key === key);
  if (!e) throw new Error('refund for a payment not in the ledger yet'); // retry until the payment event lands
  if (e.events.includes(event.id)) return { handled: true, note: 'duplicate event' };
  e.refundedCents = Math.max(e.refundedCents, c.amount_refunded); // cumulative from Stripe: replay-safe
  e.events = [...e.events, event.id].slice(-20);
  e.note = `Refunded ${c.amount_refunded} cents ${c.refunded ? '(full)' : '(partial)'} at ${now}`;
  const patch: Record<string, unknown> = {};
  if (e.kind === 'deposit' && e.setDepositIn && job.depositIn === true) { patch.depositIn = false; e.note += '; deposit credit removed, review'; }
  Object.assign(patch, await invoiceTotals(deps, { ...job, ...patch }, ledger));
  patch.paymentLedger = serializeLedger(ledger);
  await writeVerified(deps.store, job.id, patch, e.key);
  return { handled: true, note: `refund ${c.amount_refunded}` };
}

/** Recomputed (never incremented) totals and status from the full ledger. */
async function invoiceTotals(deps: { store: Store; pricing: Pricing }, job: Record<string, unknown> & { id: string }, ledger: LedgerEntry[]) {
  const online = ledger.reduce((sum, x) => sum + creditedCents(x), 0);
  const out: Record<string, unknown> = { amountPaid: fromCents(online) };
  const quotes = await deps.store.list('quotes');
  const inv = computeInvoice({ ...job, paymentLedger: serializeLedger(ledger), invoiceStatus: 'Sent', paid: false } as never, quotes, deps.pricing);
  const balancePaid = sumCredited(ledger, 'balance');
  if (inv.totalCents > 0 && inv.balanceCents === 0 && balancePaid > 0) { out.invoiceStatus = 'Paid'; out.paid = true; }
  else if (balancePaid > 0) { out.invoiceStatus = 'Partial'; out.paid = false; }
  else if (ledger.some((x) => x.kind === 'balance' && x.refundedCents > 0) && String(job.invoiceStatus) === 'Paid') { out.invoiceStatus = 'Sent'; out.paid = false; }
  return out;
}

async function writeVerified(store: Store, id: string, patch: Record<string, unknown>, key: string) {
  await store.update('jobs', id, patch);
  const back = await store.get('jobs', id);
  if (!back || !parseLedger(back.paymentLedger).some((x) => x.key === key)) throw new Error('payment ledger did not persist (Notion field missing?)');
}
