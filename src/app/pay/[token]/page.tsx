import { notFound } from 'next/navigation';
import { getStore } from '@/lib/store';
import { loadPricing } from '@/lib/pricing';
import { payConfig } from '@/lib/payments/config';
import { planCharge } from '@/lib/payments/amounts';
import { verifyPayToken } from '@/lib/payments/token';
import { paymentsReady } from '@/lib/payments/ready';
import { linkIsActive } from '@/lib/payments/checkout';
import { serializeLedger } from '@/lib/payments/ledger';
import { loadLedger } from '@/lib/payments/money';
import { withJob } from '@/lib/payments/db';
import { firstName } from '@/lib/domain/pipeline';
import { relationIds } from '@/lib/calc';
import { BUSINESS } from '@/lib/domain/rules';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Customer-facing pay page. First name and invoice number only: never an address. */
export default async function PayPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ e?: string }> }) {
  const { token } = await params; const { e } = await searchParams;
  const store = getStore();
  const ready = await paymentsReady(store);
  const c = payConfig();
  if (!ready.ok || !c.ok) return <Shell><p>Card payments are not set up yet. Call {BUSINESS.phone}.</p></Shell>;
  const t = verifyPayToken(token, c.cfg.linkSecret);
  if (!t || !(await linkIsActive(t.jobId, t.id))) notFound();
  const job = await store.get('jobs', t.jobId);
  if (!job) notFound();
  const customers = await store.list('customers');
  const cust = customers.find((x) => relationIds(job.customer).includes(x.id));
  const ledger = await withJob(t.jobId, (client) => loadLedger(client, t.jobId));
  const plan = planCharge({ ...job, paymentLedger: serializeLedger(ledger) }, await store.list('quotes'), await loadPricing(), t);
  return (
    <Shell>
      <p className="text-sm text-neutral-500">{firstName(cust?.name) ? `For ${firstName(cust?.name)}` : 'Payment'}</p>
      <h1 className="text-xl font-bold">{plan.title}</h1>
      {plan.blockers.length ? (
        <p className="mt-4 rounded bg-neutral-100 p-3" data-testid="pay-blocked">{plan.blockers[0]}. Questions? Call {BUSINESS.phone}.</p>
      ) : (
        <>
          <table className="mt-4 w-full text-sm" data-testid="pay-summary"><tbody>
            <tr><td>Amount due</td><td className="text-right tabular-nums">{money(plan.baseCents)}</td></tr>
            <tr><td>Card processing fee (2.5%)</td><td className="text-right tabular-nums">{money(plan.feeCents)}</td></tr>
            <tr className="border-t font-bold"><td className="pt-2">Total by card</td><td className="pt-2 text-right tabular-nums">{money(plan.totalCents)}</td></tr>
          </tbody></table>
          {e && <p className="mt-3 text-sm text-red-700">{e === 'busy' ? 'A payment for this is already in progress. If you just paid, you are all set: we will confirm it shortly.' : 'Could not open the card page. Try again in a minute.'}</p>}
          <form method="post" action={`/pay/${token}/checkout`} className="mt-5">
            <button type="submit" className="min-h-12 w-full rounded bg-neutral-900 px-6 py-3 font-semibold text-white">Pay {money(plan.totalCents)} by card</button>
          </form>
          <p className="mt-2 text-center text-xs text-neutral-500">Secure card payment through Stripe. Prefer check or cash? Call {BUSINESS.phone}.</p>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md p-6 text-neutral-900"><p className="mb-4 text-lg font-bold">{BUSINESS.name}</p><div className="rounded-lg bg-white p-5 shadow">{children}</div></main>;
}
