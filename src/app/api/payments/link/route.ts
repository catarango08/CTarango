import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { loadPricing } from '@/lib/pricing';
import { payConfig } from '@/lib/payments/config';
import { planCharge } from '@/lib/payments/amounts';
import { issuePayLink } from '@/lib/payments/checkout';
import type { PayTarget } from '@/lib/payments/token';

export const dynamic = 'force-dynamic';

/**
 * INTERNAL: makes the customer pay link for a job (deposit, balance or a change order).
 * Behind the passcode (proxy). Refuses outright in production if no passcode is set.
 * Creates no Stripe objects; the amount is computed again when the customer pays.
 */
export async function POST(req: Request) {
  const c = payConfig();
  if (!c.ok) return NextResponse.json({ error: 'Card payments are not configured', missing: c.missing }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as Partial<PayTarget> & { amount?: unknown; baseCents?: unknown };
  if ('amount' in body || 'baseCents' in body || 'feeCents' in body) return NextResponse.json({ error: 'Amounts are computed on the server' }, { status: 400 });
  if (typeof body.jobId !== 'string' || !['deposit', 'balance', 'co'].includes(String(body.kind)) || (body.kind === 'co' && typeof body.coId !== 'string')) return NextResponse.json({ error: 'jobId and kind (deposit | balance | co + coId) required' }, { status: 400 });
  const t: PayTarget = { jobId: body.jobId, kind: body.kind as PayTarget['kind'], coId: body.kind === 'co' ? body.coId : undefined };
  const store = getStore();
  const job = await store.get('jobs', t.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const plan = planCharge(job, await store.list('quotes'), await loadPricing(), t);
  const link = await issuePayLink(store, c.cfg, t);
  if (!link.ok) return NextResponse.json({ error: link.error }, { status: link.status });
  return NextResponse.json({ url: link.url, plan });
}
