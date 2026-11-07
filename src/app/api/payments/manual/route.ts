import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { loadPricing } from '@/lib/pricing';
import { recordManualReceipt } from '@/lib/payments/manual';
import type { PayKind } from '@/lib/payments/ledger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Records a manual receipt. The body must not include an amount.
 * Principal is the balance or deposit the server calculates at this moment.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { jobId?: string; kind?: string; coId?: string; method?: string; amount?: unknown; baseCents?: unknown; deposit?: unknown };
  if ('amount' in body || 'baseCents' in body || 'deposit' in body || 'feeCents' in body) {
    return NextResponse.json({ error: 'Amounts are computed on the server' }, { status: 400 });
  }
  if (typeof body.jobId !== 'string' || !['deposit', 'balance', 'co'].includes(String(body.kind)) || typeof body.method !== 'string') {
    return NextResponse.json({ error: 'jobId, kind, and method are required' }, { status: 400 });
  }
  if (body.kind === 'co' && typeof body.coId !== 'string') return NextResponse.json({ error: 'coId is required' }, { status: 400 });
  const result = await recordManualReceipt(
    { store: getStore(), pricing: await loadPricing() },
    { jobId: body.jobId, kind: body.kind as PayKind, coId: body.coId, method: body.method },
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true, principalCents: result.principalCents });
}
