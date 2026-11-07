import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import { payConfig } from '@/lib/payments/config';
import { verifyPayToken } from '@/lib/payments/token';
import { parseLedger } from '@/lib/payments/ledger';
import { BUSINESS } from '@/lib/domain/rules';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/**
 * Return page after Stripe Checkout. READ-ONLY: it never marks anything paid.
 * Payment is confirmed only by the signature-verified webhook.
 */
export default async function PayReturn({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { token } = await params; const { session_id } = await searchParams;
  const c = payConfig();
  const t = c.ok ? verifyPayToken(token, c.cfg.linkSecret) : null;
  if (!t) notFound();
  const job = await getStore().get('jobs', t.jobId);
  if (!job) notFound();
  const e = session_id ? parseLedger(job.paymentLedger).find((x) => x.session === session_id) : undefined;
  const msg = e?.status === 'paid' ? 'Payment confirmed. Thank you!'
    : e?.status === 'failed' ? `The payment did not go through. Call ${BUSINESS.phone} or try the link again.`
      : 'Thank you! We are confirming your payment with the card processor. Stripe will email your receipt.';
  return <main className="mx-auto max-w-md p-6 text-neutral-900"><p className="mb-4 text-lg font-bold">{BUSINESS.name}</p><div className="rounded-lg bg-white p-5 shadow" data-testid="pay-return"><p>{msg}</p></div></main>;
}
