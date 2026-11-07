import type { Store } from '../store/types';
import { loadPricing } from '../pricing';
import { paymentsReady } from './ready';
import { withJob } from './db';
import { planCharge } from './amounts';
import { slotFor, type PayKind } from './ledger';
import {
  currentObligation,
  ensureContract,
  enqueueDisplay,
  jobWithLedger,
  loadLedger,
  revokeLinks,
  supersedeAttempt,
} from './money';
import { projectPending } from './project';
import { stripeClient } from './server';

/**
 * Invoice edits and new signed totals move the contract forward.
 * Open checkouts for a changed amount are superseded so a later webhook is stale, not a silent credit.
 */
export async function noteJobMoneyChanged(store: Store, jobId: string, reason: string): Promise<void> {
  const ready = await paymentsReady(store);
  if (!ready.ok) return;
  const pricing = await loadPricing();
  const expire: string[] = [];
  await withJob(jobId, async (client) => {
    const job = await store.get('jobs', jobId);
    if (!job) return;
    const quotes = await store.list('quotes');
    const ledger = await loadLedger(client, jobId);
    const view = jobWithLedger(job, ledger);
    await ensureContract(client, view, quotes, pricing, reason);
    const attempts = await client.query<{ id: string; slot: string; base_cents: number; fee_cents: number; obligation_id: string; stripe_session_id: string | null }>(
      `SELECT id, slot, base_cents, fee_cents, obligation_id, stripe_session_id FROM checkout_attempts WHERE job_id = $1 AND status IN ('open','reserved')`,
      [jobId],
    );
    for (const a of attempts.rows) {
      const kind = (a.slot === 'deposit' || a.slot === 'balance' ? a.slot : 'co') as PayKind;
      const coId = a.slot.startsWith('co:') ? a.slot.slice(3) : undefined;
      const obligation = await currentObligation(client, jobId, a.slot);
      const plan = planCharge(view, quotes, pricing, { jobId, kind, coId });
      const changed = !obligation || obligation.id !== a.obligation_id || plan.baseCents !== a.base_cents || plan.feeCents !== a.fee_cents;
      if (changed || plan.blockers.length) {
        await supersedeAttempt(client, a.id);
        await revokeLinks(client, jobId, slotFor(kind, coId));
        if (a.stripe_session_id) expire.push(a.stripe_session_id);
      }
    }
    await enqueueDisplay(client, job, quotes, pricing);
  });
  await projectPending(store, jobId).catch(() => undefined);
  if (expire.length) {
    const stripe = stripeClient(ready.cfg);
    for (const id of expire) await stripe.checkout.sessions.expire?.(id).catch(() => undefined);
  }
}
