import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStore } from '@/lib/store';
import { loadPricing } from '@/lib/pricing';
import { payConfig } from '@/lib/payments/config';
import { stripeClient } from '@/lib/payments/server';
import { applyStripeEvent } from '@/lib/payments/webhook';
import { PaymentRejected } from '@/lib/payments/errors';
import { paymentsReady } from '@/lib/payments/ready';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Stripe webhook. Public (excluded from the passcode proxy), so the ONLY trust is the
 * Stripe-Signature header, checked against STRIPE_WEBHOOK_SECRET with the raw body
 * (default 5-minute tolerance blocks old replays). Errors return 500 so Stripe retries;
 * nothing secret or customer-identifying is logged.
 */
export async function POST(req: Request) {
  const c = payConfig();
  if (!c.ok) return NextResponse.json({ error: 'not configured' }, { status: 503 });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'missing signature' }, { status: 400 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripeClient(c.cfg).webhooks.constructEventAsync(raw, sig, c.cfg.webhookSecret);
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }
  const store = getStore();
  const ready = await paymentsReady(store);
  if (!ready.ok) return NextResponse.json({ error: ready.error }, { status: ready.status });
  try {
    const out = await applyStripeEvent({ store, pricing: await loadPricing(), expected: { livemode: c.cfg.livemode, accountId: c.cfg.accountId } }, event);
    return NextResponse.json({ received: true, ...out });
  } catch (err) {
    if (err instanceof PaymentRejected) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error('[stripe-webhook] retry', event.type, event.id, err instanceof Error ? err.message : 'error');
    return NextResponse.json({ error: 'not applied; retry' }, { status: 500 });
  }
}
