import { createHash } from 'node:crypto';
import type Stripe from 'stripe';
import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { planCharge, type ChargePlan } from './amounts';
import { parseLedger } from './ledger';
import type { PayConfig } from './config';
import { signPayToken, type PayTarget } from './token';

/** The slice of the Stripe SDK used here, so tests can pass a fake. */
export interface StripeLike {
  checkout: { sessions: {
    create(p: Stripe.Checkout.SessionCreateParams, o: { idempotencyKey: string }): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_status' | 'amount_total'>>;
    retrieve(id: string): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_status' | 'amount_total'>>;
    expire?(id: string): Promise<unknown>;
  } };
}

interface SessionPtr { id: string; key: string; totalCents: number; at: string }
type Ptrs = Record<string, SessionPtr>;
const slot = (t: PayTarget) => (t.kind === 'co' ? `co:${t.coId}` : t.kind);
const parsePtrs = (raw: unknown): Ptrs => { try { const v = typeof raw === 'string' && raw ? JSON.parse(raw) : {}; return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };

/**
 * Idempotency key: same job + target + amount + payment history => same Stripe session.
 * Double taps, retries and two open tabs collapse into one session (Stripe dedupes for 24 h).
 * The key changes only when what's owed changes, or after a session expired (`gen`).
 */
export function checkoutKey(jobId: string, t: PayTarget, plan: ChargePlan, ledgerRaw: unknown, depositIn: unknown, gen: string) {
  const h = createHash('sha256').update(JSON.stringify([jobId, slot(t), plan.baseCents, plan.feeCents, String(ledgerRaw ?? ''), depositIn === true, gen])).digest('hex').slice(0, 40);
  return `te-checkout-${h}`;
}

export type CheckoutResult = { ok: true; url: string; reused: boolean; plan: ChargePlan } | { ok: false; status: number; error: string; plan?: ChargePlan };

export async function startCheckout(deps: { stripe: StripeLike; store: Store; pricing: Pricing; cfg: PayConfig; now?: () => Date }, t: PayTarget): Promise<CheckoutResult> {
  const now = deps.now ?? (() => new Date());
  const job = await deps.store.get('jobs', t.jobId);
  if (!job) return { ok: false, status: 404, error: 'Invoice not found' };
  const quotes = await deps.store.list('quotes');
  const plan = planCharge(job, quotes, deps.pricing, t);
  if (plan.blockers.length) return { ok: false, status: 409, error: plan.blockers[0], plan };

  const ptrs = parsePtrs(job.checkoutSessions);
  const prev = ptrs[slot(t)];
  let gen = '0';
  const settled = prev && parseLedger(job.paymentLedger).some((e) => e.session === prev.id && (e.status === 'paid' || e.status === 'failed'));
  if (prev && settled) gen = prev.id;
  else if (prev) {
    const s = await deps.stripe.checkout.sessions.retrieve(prev.id);
    if (s.status === 'complete') {
      // Paid, or paid-but-delayed (bank). Either way: never open a second charge for it. The webhook settles it.
      return { ok: false, status: 409, error: s.payment_status === 'paid' ? 'This payment went through; confirming it now.' : 'A payment is processing. We will confirm it when the bank does.', plan };
    }
    if (s.status === 'open' && prev.totalCents === plan.totalCents && s.url) return { ok: true, url: s.url, reused: true, plan };
    if (s.status === 'open' && deps.stripe.checkout.sessions.expire) await deps.stripe.checkout.sessions.expire(prev.id); // amount changed: kill the stale one
    gen = prev.id; // new key after an expired/stale session
  }
  // Re-check the ledger right before charging (a webhook may have landed meanwhile).
  if (parseLedger(job.paymentLedger).some((e) => e.kind === t.kind && (t.kind !== 'co' || e.coId === t.coId) && e.status === 'processing')) return { ok: false, status: 409, error: 'A payment is processing.', plan };

  const key = checkoutKey(t.jobId, t, plan, job.paymentLedger, job.depositIn, gen);
  const token = signPayToken(t, deps.cfg.linkSecret);
  const meta: Record<string, string> = { app: 'tarango-field-desk', v: '1', job_id: t.jobId, kind: t.kind, base_cents: String(plan.baseCents), fee_cents: String(plan.feeCents), invoice: String(job.jobNumber ?? '') };
  if (t.coId) meta.co_id = t.coId;
  const product = t.kind === 'deposit' ? deps.cfg.products.deposit : t.kind === 'co' ? deps.cfg.products.changeOrder : deps.cfg.products.invoice;
  const item = (name: string, cents: number, prod?: string): Stripe.Checkout.SessionCreateParams.LineItem => ({ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, ...(prod ? { product: prod } : { product_data: { name } }) } });
  const session = await deps.stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'], // the 2.5% fee is a card fee; delayed methods aren't offered
    line_items: [item(plan.title, plan.baseCents, product), item('Card processing fee (2.5%)', plan.feeCents, deps.cfg.products.cardFee)].filter((l) => (l.price_data?.unit_amount ?? 0) > 0),
    client_reference_id: t.jobId,
    metadata: meta,
    payment_intent_data: { metadata: meta, description: plan.title },
    submit_type: 'pay',
    expires_at: Math.floor(now().getTime() / 1000) + 60 * 60, // 1 hour
    success_url: `${deps.cfg.baseUrl}/pay/${token}/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${deps.cfg.baseUrl}/pay/${token}`,
  }, { idempotencyKey: key });
  if (session.amount_total != null && session.amount_total !== plan.totalCents) return { ok: false, status: 500, error: 'Checkout amount mismatch; not opening it.', plan };
  if (!session.url) return { ok: false, status: 502, error: 'Stripe did not return a checkout link', plan };
  ptrs[slot(t)] = { id: session.id, key, totalCents: plan.totalCents, at: now().toISOString() };
  await deps.store.update('jobs', t.jobId, { checkoutSessions: JSON.stringify(ptrs) });
  return { ok: true, url: session.url, reused: false, plan };
}
