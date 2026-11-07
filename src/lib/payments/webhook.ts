import type Stripe from 'stripe';
import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { dbQuery, withJob } from './db';
import { PaymentRejected, PaymentRetry } from './errors';
import { paymentsReady } from './ready';
import { allocateRefund, readExplicitRefund } from './refunds';
import { projectPending, repairProjection } from './project';
import {
  currentObligation,
  enqueueDisplay,
  findAttemptById,
  findAttemptBySession,
  findReceiptByIntent,
  jobWithLedger,
  loadLedger,
  type AttemptRow,
  type ReceiptRow,
} from './money';
import { planCharge } from './amounts';
import type { PayKind } from './ledger';

/**
 * Applies one Stripe event to the payment database, then projects the result to the job record.
 * The return page never marks anything paid. A valid signature is not enough: livemode, account,
 * currency, and amount are checked against the checkout row stored before Stripe was called.
 */
export type Outcome = { handled: boolean; note: string };
const APP = 'tarango-field-desk';

type Expectation = { livemode: boolean; accountId: string };
type Deps = { store: Store; pricing: Pricing; expected: Expectation; now?: () => Date };

const piId = (x: string | { id: string } | null | undefined) => (typeof x === 'string' ? x : x?.id) ?? null;

async function reject(event: Stripe.Event, reason: string, jobId?: string): Promise<PaymentRejected> {
  await dbQuery(
    `INSERT INTO stripe_events (event_id, event_type, livemode, account_id, job_id, applied, projection_ok, reject_reason)
     VALUES ($1,$2,$3,$4,$5,false,false,$6) ON CONFLICT (event_id) DO NOTHING`,
    [event.id, event.type, event.livemode ?? null, event.account ?? null, jobId ?? null, reason],
  );
  return new PaymentRejected(reason);
}

export async function applyStripeEvent(deps: Deps, event: Stripe.Event): Promise<Outcome> {
  const ready = await paymentsReady(deps.store);
  if (!ready.ok) throw new PaymentRetry(ready.error);
  if (!event.id || !event.type) throw new PaymentRejected('missing event id or type');
  if (typeof event.livemode !== 'boolean') throw await reject(event, 'missing livemode');
  if (event.livemode !== deps.expected.livemode) throw await reject(event, 'livemode does not match the configured Stripe key');
  if (event.account && event.account !== deps.expected.accountId) throw await reject(event, 'Stripe account does not match');

  const existing = await dbQuery<{ applied: boolean; projection_ok: boolean; reject_reason: string | null; job_id: string | null }>(
    'SELECT applied, projection_ok, reject_reason, job_id FROM stripe_events WHERE event_id = $1',
    [event.id],
  );
  const prior = existing[0];
  if (prior?.reject_reason) throw new PaymentRejected(prior.reject_reason);
  if (prior?.projection_ok) return { handled: true, note: 'duplicate event' };
  if (prior?.applied && prior.job_id) {
    await repairProjection(deps.store, deps.pricing, prior.job_id);
    await dbQuery('UPDATE stripe_events SET projection_ok = true WHERE event_id = $1', [event.id]);
    return { handled: true, note: 'projection repaired' };
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      return applySession(deps, event, event.data.object as Stripe.Checkout.Session);
    case 'charge.refunded':
      return applyRefund(deps, event, event.data.object as Stripe.Charge);
    default:
      return { handled: false, note: `ignored ${event.type}` };
  }
}

async function finish(deps: Deps, event: Stripe.Event, jobId: string, note: string): Promise<Outcome> {
  try {
    await projectPending(deps.store, jobId);
  } catch (err) {
    throw err instanceof PaymentRetry ? err : new PaymentRetry(err instanceof Error ? err.message : 'projection failed');
  }
  await dbQuery('UPDATE stripe_events SET projection_ok = true WHERE event_id = $1', [event.id]);
  return { handled: true, note };
}

async function applySession(deps: Deps, event: Stripe.Event, session: Stripe.Checkout.Session): Promise<Outcome> {
  const meta = (session.metadata ?? {}) as Record<string, string>;
  if (meta.app && meta.app !== APP) return { handled: false, note: 'not ours' };
  if (!session.id) throw await reject(event, 'missing checkout session id');
  if (!session.currency && event.type !== 'checkout.session.expired') throw await reject(event, 'missing currency');

  const located = await withJob(meta.job_id || attemptLock(session.id), async (client) => {
    const byId = meta.attempt_id ? await findAttemptById(client, meta.attempt_id) : null;
    const bySession = await findAttemptBySession(client, session.id);
    return byId ?? bySession;
  });

  // The lock above used a guessed job id. Re-read under the attempt's job lock below.
  const attemptPreview = located;
  if (!attemptPreview) {
    if (meta.app === APP) throw await reject(event, 'no persisted checkout for this event');
    return { handled: false, note: 'not ours' };
  }
  if (meta.job_id && meta.job_id !== attemptPreview.job_id) throw await reject(event, 'metadata job does not match the stored checkout', attemptPreview.job_id);
  if (meta.kind && meta.kind !== slotKind(attemptPreview.slot)) throw await reject(event, 'metadata kind does not match the stored checkout', attemptPreview.job_id);

  const note = await withJob(attemptPreview.job_id, async (client) => {
    const attempt = (meta.attempt_id ? await findAttemptById(client, meta.attempt_id) : null) ?? (await findAttemptBySession(client, session.id));
    if (!attempt) throw new PaymentRetry('checkout attempt disappeared');
    const job = await deps.store.get('jobs', attempt.job_id);
    if (!job) throw new PaymentRetry('job not found');
    const quotes = await deps.store.list('quotes');
    if (event.type === 'checkout.session.expired') {
      await client.query(`UPDATE checkout_attempts SET status = 'expired' WHERE id = $1 AND status IN ('reserved','open')`, [attempt.id]);
      await client.query(
        `INSERT INTO stripe_events (event_id, event_type, livemode, account_id, job_id, applied, projection_ok) VALUES ($1,$2,$3,$4,$5,true,false)
         ON CONFLICT (event_id) DO NOTHING`,
        [event.id, event.type, event.livemode, event.account ?? null, attempt.job_id],
      );
      await enqueueDisplay(client, job, quotes, deps.pricing);
      return 'expired';
    }
    if (session.currency !== 'usd' || session.currency !== attempt.currency) {
      await recordReview(client, deps, event, attempt, job, quotes, 'Currency does not match the stored checkout.');
      return 'review currency';
    }
    if (typeof session.amount_total !== 'number' || !Number.isInteger(session.amount_total)) {
      throw await reject(event, 'missing amount', attempt.job_id);
    }
    const key = piId(session.payment_intent) ?? session.id;
    const existing = await findReceiptByIntent(client, key);
    const next = nextStatus(event, session);
    const obligation = await currentObligation(client, attempt.job_id, attempt.slot);
    const ledger = await loadLedger(client, attempt.job_id);
    const plan = planCharge(jobWithLedger(job, ledger), quotes, deps.pricing, targetFromSlot(attempt));
    const stale = attempt.status === 'superseded' || attempt.status === 'expired' || !obligation || obligation.id !== attempt.obligation_id;
    const amountMismatch = session.amount_total !== Number(attempt.total_cents);
    const excess = Number(attempt.base_cents) > plan.baseCents;
    const reviewReason = amountMismatch
      ? `Amount check failed: Stripe ${session.amount_total} ${session.currency}, stored checkout ${attempt.total_cents} usd.`
      : stale
        ? 'Payment is for an older invoice revision or a closed checkout.'
        : excess
          ? 'Payment is more than the balance still open.'
          : null;

    const late = existing && existing.status === 'paid' && (next === 'failed' || next === 'processing');
    const status = late ? 'paid' : (reviewReason ? 'review' : next);
    const applied = status === 'paid' && !reviewReason ? attempt.base_cents : (existing ? Number(existing.applied_principal_cents) : 0);
    const review = reviewReason ? true : status === 'paid' ? false : Boolean(existing?.needs_review);
    const events = Array.from(new Set([...(existing?.events ?? []), event.id])).slice(-20);
    if (existing?.events?.includes(event.id) && !reviewReason) {
      await enqueueDisplay(client, job, quotes, deps.pricing);
      return 'duplicate inside lock';
    }
    if (late && existing) {
      await client.query(`UPDATE receipts SET events = $2, note = COALESCE(note, '') || $3, updated_at = now() WHERE id = $1`, [existing.id, events, ' Late failure ignored after paid.']);
    } else if (!existing) {
      await client.query(
        `INSERT INTO receipts (id, job_id, slot, kind, co_id, source, principal_cents, fee_cents, paid_cents, status, needs_review, applied_principal_cents,
           stripe_payment_intent, stripe_session, obligation_id, note, events)
         VALUES ($1,$2,$3,$4,$5,'stripe',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [key, attempt.job_id, attempt.slot, slotKind(attempt.slot), coIdOf(attempt.slot), Number(attempt.base_cents), Number(attempt.fee_cents), session.amount_total,
          status, review, status === 'paid' && !review ? attempt.base_cents : 0, key.startsWith('pi_') ? key : null, session.id, attempt.obligation_id, reviewReason, events],
      );
    } else {
      await client.query(
        `UPDATE receipts SET status = $2, needs_review = $3, applied_principal_cents = $4, paid_cents = $5, note = COALESCE($6, note), events = $7, updated_at = now(), stripe_session = $8
         WHERE id = $1`,
        [existing.id, status, review, review ? Number(existing.applied_principal_cents) : applied, session.amount_total, reviewReason, events, session.id],
      );
    }
    if (status === 'paid' && !review) await client.query(`UPDATE checkout_attempts SET status = 'complete' WHERE id = $1`, [attempt.id]);
    if (status === 'failed') await client.query(`UPDATE checkout_attempts SET status = 'failed' WHERE id = $1 AND status IN ('reserved','open')`, [attempt.id]);
    await client.query(
      `INSERT INTO stripe_events (event_id, event_type, livemode, account_id, job_id, applied, projection_ok) VALUES ($1,$2,$3,$4,$5,true,false)
       ON CONFLICT (event_id) DO UPDATE SET applied = true, job_id = EXCLUDED.job_id`,
      [event.id, event.type, event.livemode, event.account ?? null, attempt.job_id],
    );
    const fresh = await deps.store.get('jobs', attempt.job_id);
    await enqueueDisplay(client, fresh ?? job, quotes, deps.pricing);
    return reviewReason ? `review ${reviewReason}` : `${slotKind(attempt.slot)} ${status}`;
  });
  return finish(deps, event, attemptPreview.job_id, note);
}

function nextStatus(event: Stripe.Event, session: Stripe.Checkout.Session): 'paid' | 'processing' | 'failed' | 'review' {
  if (event.type === 'checkout.session.async_payment_failed') return 'failed';
  if (event.type === 'checkout.session.async_payment_succeeded' || session.payment_status === 'paid') return 'paid';
  if (session.payment_status === 'unpaid') return 'processing';
  return 'review';
}

async function recordReview(client: Parameters<typeof enqueueDisplay>[0], deps: Deps, event: Stripe.Event, attempt: AttemptRow, job: Record<string, unknown> & { id: string }, quotes: Record<string, unknown>[], reason: string) {
  const key = `review-${event.id}`;
  await client.query(
    `INSERT INTO receipts (id, job_id, slot, kind, co_id, source, principal_cents, fee_cents, paid_cents, status, needs_review, applied_principal_cents, stripe_session, obligation_id, note, events)
     VALUES ($1,$2,$3,$4,$5,'stripe',$6,$7,0,'review',true,0,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
    [key, attempt.job_id, attempt.slot, slotKind(attempt.slot), coIdOf(attempt.slot), attempt.base_cents, attempt.fee_cents, attempt.stripe_session_id, attempt.obligation_id, reason, [event.id]],
  );
  await client.query(
    `INSERT INTO stripe_events (event_id, event_type, livemode, account_id, job_id, applied, projection_ok) VALUES ($1,$2,$3,$4,$5,true,false)
     ON CONFLICT (event_id) DO NOTHING`,
    [event.id, event.type, event.livemode, event.account ?? null, attempt.job_id],
  );
  await enqueueDisplay(client, job, quotes as never, deps.pricing);
}

async function applyRefund(deps: Deps, event: Stripe.Event, charge: Stripe.Charge): Promise<Outcome> {
  const meta = (charge.metadata ?? {}) as Record<string, string>;
  if (meta.app && meta.app !== APP) return { handled: false, note: 'not ours' };
  if (!charge.currency) throw await reject(event, 'missing currency');
  if (charge.currency !== 'usd') throw await reject(event, 'refund currency is not usd');
  if (typeof charge.amount_refunded !== 'number' || !Number.isInteger(charge.amount_refunded)) throw await reject(event, 'missing refund amount');
  const intent = piId(charge.payment_intent);
  if (!intent) throw await reject(event, 'missing payment intent');
  const preview = await dbQuery<ReceiptRow>('SELECT * FROM receipts WHERE stripe_payment_intent = $1', [intent]);
  const receipt = preview[0];
  if (!receipt) {
    if (meta.app === APP) throw new PaymentRetry('refund for a payment not in the ledger yet');
    return { handled: false, note: 'not ours' };
  }
  const explicit = explicitSplit(charge);
  if (explicit === 'invalid') throw await reject(event, 'refund metadata is missing principal or fee', receipt.job_id);

  const note = await withJob(receipt.job_id, async (client) => {
    const row = await findReceiptByIntent(client, intent);
    if (!row) throw new PaymentRetry('refund for a payment not in the ledger yet');
    const job = await deps.store.get('jobs', row.job_id);
    if (!job) throw new PaymentRetry('job not found');
    const quotes = await deps.store.list('quotes');
    if (typeof charge.amount === 'number' && charge.amount !== Number(row.paid_cents)) {
      await client.query(`UPDATE receipts SET needs_review = true, note = $2, events = $3, updated_at = now() WHERE id = $1`, [
        row.id, 'Charge amount does not match the stored payment.', Array.from(new Set([...(row.events ?? []), event.id])).slice(-20),
      ]);
    } else {
      const alloc = allocateRefund({
        baseCents: Number(row.principal_cents),
        feeCents: Number(row.fee_cents),
        paidCents: Number(row.paid_cents),
        priorRefundedCents: Number(row.refunded_cents),
        priorPrincipalRefunded: Number(row.refunded_principal_cents),
        priorFeeRefunded: Number(row.refunded_fee_cents),
        cumulativeRefundedCents: charge.amount_refunded,
        explicitCumulative: explicit,
      });
      const events = Array.from(new Set([...(row.events ?? []), event.id])).slice(-20);
      if (alloc.kind === 'replay') {
        /* already recorded */
      } else if (alloc.kind === 'applied') {
        const applied = Math.max(0, Number(row.principal_cents) - alloc.principalRefunded);
        await client.query(
          `UPDATE receipts SET refunded_cents = $2, refunded_principal_cents = $3, refunded_fee_cents = $4, applied_principal_cents = $5,
             needs_review = false, note = $6, events = $7, updated_at = now() WHERE id = $1`,
          [row.id, charge.amount_refunded, alloc.principalRefunded, alloc.feeRefunded, applied, `Refund allocated at ${(deps.now ?? (() => new Date()))().toISOString()}`, events],
        );
      } else {
        await client.query(
          `UPDATE receipts SET refunded_cents = $2, needs_review = true, status = CASE WHEN status = 'paid' THEN 'paid' ELSE status END, note = $3, events = $4, updated_at = now() WHERE id = $1`,
          [row.id, charge.amount_refunded, alloc.reason, events],
        );
      }
    }
    await client.query(
      `INSERT INTO stripe_events (event_id, event_type, livemode, account_id, job_id, applied, projection_ok) VALUES ($1,$2,$3,$4,$5,true,false)
       ON CONFLICT (event_id) DO UPDATE SET applied = true`,
      [event.id, event.type, event.livemode, event.account ?? null, row.job_id],
    );
    const fresh = await deps.store.get('jobs', row.job_id);
    await enqueueDisplay(client, fresh ?? job, quotes, deps.pricing);
    return `refund ${charge.amount_refunded}`;
  });
  return finish(deps, event, receipt.job_id, note);
}

function explicitSplit(charge: Stripe.Charge): { principalCents: number; feeCents: number } | null | 'invalid' {
  const fromCharge = readExplicitRefund((charge.metadata ?? {}) as Record<string, string>);
  if (fromCharge) return fromCharge;
  const refunds = (charge as Stripe.Charge & { refunds?: { data?: { metadata?: Record<string, string> | null }[] } }).refunds?.data ?? [];
  for (const r of refunds) {
    const got = readExplicitRefund((r.metadata ?? undefined) as Record<string, string> | undefined);
    if (got) return got;
  }
  return null;
}

function slotKind(slot: string): PayKind {
  if (slot === 'deposit' || slot === 'balance') return slot;
  return 'co';
}
function coIdOf(slot: string): string | null {
  return slot.startsWith('co:') ? slot.slice(3) : null;
}
function targetFromSlot(a: AttemptRow) {
  const kind = slotKind(a.slot);
  return { jobId: a.job_id, kind, coId: coIdOf(a.slot) ?? undefined };
}

function attemptLock(sessionId: string): string {
  return `lookup:${sessionId}`;
}
