import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { loadPricing } from '@/lib/pricing';
import { payConfig } from '@/lib/payments/config';
import { stripeClient } from '@/lib/payments/server';
import { startCheckout } from '@/lib/payments/checkout';
import { verifyPayToken } from '@/lib/payments/token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST only (link previews and prefetch can't open sessions). Amount computed here, never from the client. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = payConfig();
  if (!c.ok) return NextResponse.json({ error: 'Card payments are not set up yet' }, { status: 503 });
  const t = verifyPayToken(token, c.cfg.linkSecret);
  if (!t) return NextResponse.json({ error: 'This pay link is not valid' }, { status: 404 });
  const r = await startCheckout({ stripe: stripeClient(c.cfg), store: getStore(), pricing: await loadPricing(), cfg: c.cfg }, t).catch(() => ({ ok: false as const, status: 502, error: 'Could not reach the card processor. Try again in a minute.' }));
  if (r.ok) return NextResponse.redirect(r.url, 303);
  const back = new URL(`${c.cfg.baseUrl}/pay/${token}`);
  back.searchParams.set('e', r.status === 409 ? 'busy' : 'err'); // codes only: no reflected text
  return NextResponse.redirect(back, 303);
}
