import { randomUUID } from 'node:crypto';
import type Stripe from 'stripe';
import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { planCharge, type ChargePlan } from './amounts';
import { slotFor, serializeLedger } from './ledger';
import type { PayConfig } from './config';
import { PAY_LINK_TTL_SECONDS, signPayToken, type PayTarget } from './token';
import { paymentsReady } from './ready';
import { withJob } from './db';
import {
  checkoutIdempotencyKey,
  currentObligation,
  ensureContract,
  integrationIdentifier,
  jobWithLedger,
  latestAttempt,
  loadLedger,
  nextGeneration,
  revokeLinks,
  supersedeAttempt,
  type AttemptRow,
} from './money';
import { projectPending } from './project';

/** The slice of the Stripe SDK used here, so tests can pass a fake. */
export interface StripeLike {
  checkout: { sessions: {
    create(p: Stripe.Checkout.SessionCreateParams, o: { idempotencyKey: string }): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_status' | 'amount_total'>>;
    retrieve(id: string): Promise<Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_status' | 'amount_total'>>;
    expire?(id: string): Promise<unknown>;
  } };
}

export type CheckoutResult = { ok: true; url: string; reused: boolean; plan: ChargePlan } | { ok: false; status: number; error: string; plan?: ChargePlan };

const SESSION_SECONDS = 60 * 60;

function line(name: string, cents: number, prod?: string): Stripe.Checkout.SessionCreateParams.LineItem {
  return { quantity: 1, price_data: { currency: 'usd', unit_amount: cents, ...(prod ? { product: prod } : { product_data: { name } }) } };
}

/**
 * Idempotency key for one reserved generation. It does not include expires_at.
 * The exact create params, including expires_at, are stored before Stripe is called.
 */
export function checkoutKey(jobId: string, t: PayTarget, generation: number): string {
  return checkoutIdempotencyKey(jobId, slotFor(t.kind, t.coId), generation);
}

export async function startCheckout(
  deps: { stripe: StripeLike; store: Store; pricing: Pricing; cfg: PayConfig; now?: () => Date },
  t: PayTarget,
  depth = 0,
): Promise<CheckoutResult> {
  const ready = await paymentsReady(deps.store);
  if (!ready.ok) return { ok: false, status: ready.status, error: ready.error };
  if (depth > 2) return { ok: false, status: 409, error: 'Could not open a new checkout. Try again in a minute.' };
  const now = deps.now ?? (() => new Date());
  const slot = slotFor(t.kind, t.coId);

  const prepared = await withJob(t.jobId, async (client) => {
    const job = await deps.store.get('jobs', t.jobId);
    if (!job) return { kind: 'stop' as const, status: 404, error: 'Invoice not found' };
    const quotes = await deps.store.list('quotes');
    const ledger = await loadLedger(client, t.jobId);
    const view = jobWithLedger(job, ledger);
    await ensureContract(client, view, quotes, deps.pricing, 'checkout');
    const plan = planCharge(view, quotes, deps.pricing, t);
    if (plan.blockers.length) return { kind: 'stop' as const, status: 409, error: plan.blockers[0], plan };
    const obligation = await currentObligation(client, t.jobId, slot);
    if (!obligation) return { kind: 'stop' as const, status: 409, error: 'No payment obligation is recorded for this charge.', plan };
    let latest = await latestAttempt(client, t.jobId, slot);
    if (latest && latest.status === 'reserved') return { kind: 'go' as const, action: 'replay' as const, attempt: latest, plan };
    if (latest && latest.status === 'open') {
      const same = latest.base_cents === plan.baseCents && latest.fee_cents === plan.feeCents && latest.obligation_id === obligation.id && latest.currency === 'usd';
      if (same && latest.stripe_session_id) return { kind: 'go' as const, action: 'reuse' as const, attempt: latest, plan };
      if (!same) {
        await supersedeAttempt(client, latest.id);
        await revokeLinks(client, t.jobId, slot);
        return { kind: 'go' as const, action: 'replace' as const, expireId: latest.stripe_session_id, plan, obligationId: obligation.id };
      }
    }
    const generation = await nextGeneration(client, t.jobId, slot);
    const id = randomUUID();
    const linkId = randomUUID();
    const exp = Math.floor(now().getTime() / 1000) + SESSION_SECONDS;
    const linkExp = Math.floor(now().getTime() / 1000) + PAY_LINK_TTL_SECONDS;
    const token = signPayToken({ ...t, id: linkId, exp: linkExp }, deps.cfg.linkSecret);
    const product = t.kind === 'deposit' ? deps.cfg.products.deposit : t.kind === 'co' ? deps.cfg.products.changeOrder : deps.cfg.products.invoice;
    const meta: Record<string, string> = {
      app: 'tarango-field-desk', v: '2', job_id: t.jobId, kind: t.kind, attempt_id: id,
      obligation_id: obligation.id, generation: String(generation),
      base_cents: String(plan.baseCents), fee_cents: String(plan.feeCents), invoice: String(job.jobNumber ?? ''),
    };
    if (t.coId) meta.co_id = t.coId;
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      // Card fee is a card fee. This filters dynamic methods down to card; it is not payment_method_types.
      allowed_payment_method_types: ['card'],
      line_items: [line(plan.title, plan.baseCents, product), line('Card processing fee (2.5%)', plan.feeCents, deps.cfg.products.cardFee)].filter((l) => (l.price_data?.unit_amount ?? 0) > 0),
      client_reference_id: t.jobId,
      metadata: meta,
      payment_intent_data: { metadata: meta, description: plan.title },
      submit_type: 'pay',
      expires_at: exp,
      success_url: `${deps.cfg.baseUrl}/pay/${token}/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${deps.cfg.baseUrl}/pay/${token}`,
      integration_identifier: integrationIdentifier(),
    };
    const key = checkoutIdempotencyKey(t.jobId, slot, generation);
    await client.query(
      `INSERT INTO pay_links (id, job_id, slot, expires_at) VALUES ($1,$2,$3,to_timestamp($4))`,
      [linkId, t.jobId, slot, linkExp],
    );
    await client.query(
      `INSERT INTO checkout_attempts (id, job_id, slot, generation, obligation_id, idempotency_key, params_json, base_cents, fee_cents, total_cents, currency, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'usd','reserved')`,
      [id, t.jobId, slot, generation, obligation.id, key, JSON.stringify(params), plan.baseCents, plan.feeCents, plan.totalCents],
    );
    const attempt = await latestAttempt(client, t.jobId, slot);
    if (!attempt) return { kind: 'stop' as const, status: 500, error: 'Could not reserve the checkout.', plan };
    return { kind: 'go' as const, action: 'create' as const, attempt, plan };
  });

  if (prepared.kind === 'stop') return { ok: false, status: prepared.status, error: prepared.error, plan: prepared.plan };

  if (prepared.action === 'replace' && prepared.expireId && deps.stripe.checkout.sessions.expire) {
    await deps.stripe.checkout.sessions.expire(prepared.expireId).catch(() => undefined);
    return startCheckout(deps, t, depth + 1);
  }
  if (prepared.action === 'replace') return startCheckout(deps, t, depth + 1);

  if (prepared.action === 'reuse') {
    const s = await deps.stripe.checkout.sessions.retrieve(prepared.attempt.stripe_session_id!);
    if (s.status === 'complete') {
      return { ok: false, status: 409, error: s.payment_status === 'paid' ? 'This payment went through; confirming it now.' : 'A payment is processing. We will confirm it when the bank does.', plan: prepared.plan };
    }
    if (s.status === 'open' && (s.url || prepared.attempt.url)) return { ok: true, url: s.url || prepared.attempt.url!, reused: true, plan: prepared.plan };
    await withJob(t.jobId, async (client) => {
      await client.query(`UPDATE checkout_attempts SET status = 'expired' WHERE id = $1`, [prepared.attempt.id]);
    });
    return startCheckout(deps, t, depth + 1);
  }

  const attempt = prepared.attempt;
  const params = JSON.parse(attempt.params_json) as Stripe.Checkout.SessionCreateParams;
  let session: Pick<Stripe.Checkout.Session, 'id' | 'url' | 'status' | 'payment_status' | 'amount_total'>;
  try {
    session = await deps.stripe.checkout.sessions.create(params, { idempotencyKey: attempt.idempotency_key });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe did not open checkout';
    if (/idempotency parameters differ/i.test(message)) {
      await withJob(t.jobId, async (client) => {
        await client.query(`UPDATE checkout_attempts SET status = 'failed' WHERE id = $1 AND status = 'reserved'`, [attempt.id]);
      });
      return startCheckout(deps, t, depth + 1);
    }
    return { ok: false, status: 502, error: 'Could not reach the card processor. Try again in a minute.', plan: prepared.plan };
  }
  if (session.amount_total != null && session.amount_total !== attempt.total_cents) {
    return { ok: false, status: 500, error: 'Checkout amount mismatch; not opening it.', plan: prepared.plan };
  }
  if (!session.url) return { ok: false, status: 502, error: 'Stripe did not return a checkout link', plan: prepared.plan };
  await withJob(t.jobId, async (client) => {
    await client.query(
      `UPDATE checkout_attempts SET stripe_session_id = $2, url = $3, status = 'open' WHERE id = $1`,
      [attempt.id, session.id, session.url],
    );
    const job = await deps.store.get('jobs', t.jobId);
    if (job) {
      const quotes = await deps.store.list('quotes');
      const { enqueueDisplay } = await import('./money');
      await enqueueDisplay(client, job, quotes, deps.pricing);
    }
  });
  await projectPending(deps.store, t.jobId).catch(() => undefined);
  return { ok: true, url: session.url, reused: prepared.action === 'replay', plan: prepared.plan };
}

/** Staff and customer-quote links. No Stripe object is created. Amount is computed again at checkout. */
export async function issuePayLink(store: Store, cfg: PayConfig, t: PayTarget, now = new Date()): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const ready = await paymentsReady(store);
  if (!ready.ok) return { ok: false, status: ready.status, error: ready.error };
  const slot = slotFor(t.kind, t.coId);
  const row = await withJob(t.jobId, async (client) => {
    const existing = await client.query<{ id: string; expires_at: Date }>(
      `SELECT id, expires_at FROM pay_links WHERE job_id = $1 AND slot = $2 AND revoked_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1`,
      [t.jobId, slot],
    );
    if (existing.rows[0]) return existing.rows[0];
    const id = randomUUID();
    const exp = Math.floor(now.getTime() / 1000) + PAY_LINK_TTL_SECONDS;
    await client.query(`INSERT INTO pay_links (id, job_id, slot, expires_at) VALUES ($1,$2,$3,to_timestamp($4))`, [id, t.jobId, slot, exp]);
    return { id, expires_at: new Date(exp * 1000) };
  });
  const exp = Math.floor(new Date(row.expires_at).getTime() / 1000);
  const token = signPayToken({ ...t, id: row.id, exp }, cfg.linkSecret);
  return { ok: true, url: `${cfg.baseUrl}/pay/${token}` };
}

export async function linkIsActive(jobId: string, linkId: string): Promise<boolean> {
  const { dbQuery } = await import('./db');
  const rows = await dbQuery<{ ok: boolean }>(
    `SELECT (revoked_at IS NULL AND expires_at > now()) AS ok FROM pay_links WHERE id = $1 AND job_id = $2`,
    [linkId, jobId],
  );
  return rows[0]?.ok === true;
}

export type { AttemptRow };
