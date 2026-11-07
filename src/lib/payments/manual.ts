import { randomUUID } from 'node:crypto';
import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { planCharge } from './amounts';
import { paymentsReady } from './ready';
import { withJob } from './db';
import { slotFor, type PayKind } from './ledger';
import { ensureContract, enqueueDisplay, jobWithLedger, loadLedger, revokeLinks, supersedeAttempt } from './money';
import { projectPending } from './project';
import { stripeClient } from './server';

const METHODS = ['Cash', 'Check', 'Zelle', 'Card'] as const;
export type ManualMethod = (typeof METHODS)[number];

/**
 * Records a cash, check, Zelle, or in-person card receipt.
 * The amount is computed here. A client-supplied amount is refused by the route.
 */
export async function recordManualReceipt(
  deps: { store: Store; pricing: Pricing },
  input: { jobId: string; kind: PayKind; coId?: string; method: string },
): Promise<{ ok: true; principalCents: number } | { ok: false; status: number; error: string }> {
  if (!METHODS.includes(input.method as ManualMethod)) return { ok: false, status: 400, error: 'Method must be Cash, Check, Zelle, or Card' };
  const ready = await paymentsReady(deps.store);
  if (!ready.ok) return ready;
  const slot = slotFor(input.kind, input.coId);
  const method = input.method as ManualMethod;
  let expire: string[] = [];
  const result = await withJob(input.jobId, async (client) => {
    const job = await deps.store.get('jobs', input.jobId);
    if (!job) return { ok: false as const, status: 404, error: 'Job not found' };
    const quotes = await deps.store.list('quotes');
    const view = jobWithLedger(job, await loadLedger(client, input.jobId));
    await ensureContract(client, view, quotes, deps.pricing, 'manual receipt');
    const plan = planCharge(view, quotes, deps.pricing, { jobId: input.jobId, kind: input.kind, coId: input.coId });
    if (plan.blockers.length || plan.baseCents <= 0) return { ok: false as const, status: 409, error: plan.blockers[0] ?? 'Nothing is due' };
    const fee = method === 'Card' ? plan.feeCents : 0;
    await client.query(
      `INSERT INTO receipts (id, job_id, slot, kind, co_id, source, principal_cents, fee_cents, paid_cents, status, needs_review, applied_principal_cents, method, note, events)
       VALUES ($1,$2,$3,$4,$5,'manual',$6,$7,$8,'paid',false,$6,$9,$10,'{}')`,
      [randomUUID(), input.jobId, slot, input.kind, input.coId ?? null, plan.baseCents, fee, plan.baseCents + fee, method, `${method} receipt`],
    );
    const open = await client.query<{ id: string; stripe_session_id: string | null }>(
      `SELECT id, stripe_session_id FROM checkout_attempts WHERE job_id = $1 AND slot = $2 AND status IN ('open','reserved')`,
      [input.jobId, slot],
    );
    for (const row of open.rows) {
      await supersedeAttempt(client, row.id);
      if (row.stripe_session_id) expire.push(row.stripe_session_id);
    }
    await revokeLinks(client, input.jobId, slot);
    const fresh = await deps.store.get('jobs', input.jobId);
    await enqueueDisplay(client, fresh ?? job, quotes, deps.pricing);
    return { ok: true as const, principalCents: plan.baseCents };
  });
  if (!result.ok) return result;
  await projectPending(deps.store, input.jobId);
  if (expire.length) {
    const stripe = stripeClient(ready.cfg);
    for (const id of expire) await stripe.checkout.sessions.expire?.(id).catch(() => undefined);
  }
  return result;
}
