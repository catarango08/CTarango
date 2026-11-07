import { notFound } from 'next/navigation';
import { payConfig } from '@/lib/payments/config';
import { verifyPayToken } from '@/lib/payments/token';
import { dbQuery } from '@/lib/payments/db';
import { BUSINESS } from '@/lib/domain/rules';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

/**
 * Return page after Stripe Checkout. READ-ONLY: it never marks anything paid.
 * It only reads the payment database. A valid signature is not a payment.
 */
export default async function PayReturn({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { token } = await params; const { session_id } = await searchParams;
  const c = payConfig();
  const t = c.ok ? verifyPayToken(token, c.cfg.linkSecret) : null;
  if (!t) notFound();
  const rows = session_id
    ? await dbQuery<{ status: string; needs_review: boolean; job_id: string }>('SELECT status, needs_review, job_id FROM receipts WHERE stripe_session = $1 AND job_id = $2', [session_id, t.jobId]).catch(() => [])
    : [];
  const e = rows[0];
  const msg = e?.needs_review ? `We received the card notice and are reviewing it. Call ${BUSINESS.phone} if you have a question.`
    : e?.status === 'paid' ? 'Payment confirmed. Thank you!'
    : e?.status === 'failed' ? `The payment did not go through. Call ${BUSINESS.phone} or try the link again.`
      : 'Thank you! We are confirming your payment with the card processor. Stripe will email your receipt.';
  return <main className="mx-auto max-w-md p-6 text-neutral-900"><p className="mb-4 text-lg font-bold">{BUSINESS.name}</p><div className="rounded-lg bg-white p-5 shadow" data-testid="pay-return"><p>{msg}</p></div></main>;
}
