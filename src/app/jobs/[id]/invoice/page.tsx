import { cardFeeCents, computeInvoice } from '@/lib/domain/invoice';
import { payConfig } from '@/lib/payments/config';
import { signPayToken } from '@/lib/payments/token';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll } from '@/lib/data';
import { loadPricing } from '@/lib/pricing';
import { relationIds } from '@/lib/calc';
import { parseStored } from '@/lib/domain/options';
import { isChangeOrder } from '@/lib/domain/change-order';
import { firstName } from '@/lib/domain/pipeline';
import { BUSINESS } from '@/lib/domain/rules';
import { CLOSE } from '@/config/close';
import { INVOICE_STATUSES } from '@/lib/schema';
import { InvoiceControls, PrintButton } from './controls';

export const dynamic = 'force-dynamic';

const money = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Printable / shareable invoice. Town only — never a street address. */
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ co?: string; card?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const job = await findById('jobs', id);
  if (!job) notFound();
  const [quotes, customers, pricing] = await Promise.all([loadAll('quotes'), loadAll('customers'), loadPricing()]);
  const accepted = quotes.filter((q) => relationIds(q.job).includes(id) && String(q.status) === 'Accepted' && !isChangeOrder(q)).sort((a, b) => Number(b.version) - Number(a.version))[0];
  const stored = accepted ? parseStored(accepted.data) : null;
  const cust = customers.find((c) => relationIds(job.customer).includes(c.id));

  // One calculation shared with card checkout (src/lib/domain/invoice.ts), so the page and Stripe can't disagree.
  const inv = computeInvoice(job, quotes, pricing, { coId: sp.co });
  const lines = inv.lines;
  const total = inv.totalCents / 100;
  const coOnly = inv.coOnly;
  const separateCOs = inv.separateCOs.map((c) => ({ id: c.id, co: { n: c.n }, total: c.totalCents / 100 }));
  const deposit = coOnly ? 0 : inv.depositCents / 100;
  const depositPaid = inv.depositCreditCents > 0;
  const paidOnline = inv.paidOnlineCents / 100;
  const subtotal = inv.balanceCents / 100;
  const byCard = sp.card === '1' || String(job.paymentMethod) === 'Card';
  const fee = byCard ? cardFeeCents(inv.balanceCents) / 100 : 0;
  const due = Math.round((subtotal + fee) * 100) / 100;
  // Card pay link for exactly this balance (old fixed Stripe links are not used for job invoices).
  const pc = payConfig();
  const target = coOnly ? { jobId: id, kind: 'co' as const, coId: coOnly.id } : { jobId: id, kind: 'balance' as const };
  const payUrl = pc.ok && inv.blockers.length === 0 && inv.balanceCents > 0 ? `${pc.cfg.baseUrl}/pay/${signPayToken(target, pc.cfg.linkSecret)}` : '';
  const payLink = payUrl;
  const status = String(job.invoiceStatus ?? 'Draft');

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link className="underline" href={`/jobs/${id}`}>← Back to job</Link>
        <PrintButton />
      </div>
      <div className="no-print mb-4">
        <InvoiceControls jobId={id} jobStatus={String(job.status ?? '')} due={due} byCard={byCard} coLinks={separateCOs.map((c) => ({ id: c.id, label: `Change order ${c.co.n} invoice (${money(c.total)})` }))} status={status} statuses={[...INVOICE_STATUSES]} payLink={payLink} linkLabel={CLOSE.payment.linkLabel} blockers={inv.blockers} repriceNote={inv.repriceNote ?? ''} configMissing={pc.ok ? [] : pc.missing} />
      </div>
      <article className="invoice mx-auto max-w-2xl bg-white p-6 text-neutral-900 shadow print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-4 border-[#f2b705] pb-4">
          <div>
            <p className="text-2xl font-bold">{BUSINESS.name}</p>
            <p className="text-sm italic">{BUSINESS.tagline}</p>
            <p className="mt-1 text-sm">{BUSINESS.phone} · {BUSINESS.email}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-xl font-semibold">Invoice {String(job.jobNumber ?? '')}</p>
            <p>{new Date().toLocaleDateString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium' })}</p>
            <p className="mt-1 inline-block rounded bg-neutral-100 px-2 font-semibold">{status}</p>
          </div>
        </header>
        <section className="mt-4 text-sm">
          <p className="text-neutral-500">Bill to</p>
          <p className="font-semibold">{firstName(cust?.name) || 'Customer'}{job.town ? ` · ${String(job.town)}` : ''}</p>
          {stored?.doc.scope && <p className="mt-2">{stored.doc.scope}</p>}
        </section>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-neutral-100">
                <td className={`py-1.5 ${Number.isNaN(l.amount) ? 'font-semibold' : ''}`}>{l.label}</td>
                <td className="py-1.5 text-right tabular-nums">{Number.isNaN(l.amount) ? '' : money(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr><td className="pt-3 font-semibold">Total</td><td className="pt-3 text-right font-semibold tabular-nums">{money(total)}</td></tr>
            {paidOnline > 0 && <tr><td>Paid by card online</td><td className="text-right tabular-nums">{money(-paidOnline)}</td></tr>}
            {deposit > 0 && <tr><td>Deposit {depositPaid ? 'received — credited in full' : '(not yet received)'}</td><td className="text-right tabular-nums">{depositPaid ? money(-deposit) : money(0)}</td></tr>}
            {fee > 0 && <tr><td>Card processing fee (2.5%)</td><td className="text-right tabular-nums">{money(fee)}</td></tr>}
            <tr><td className="pt-2 text-base font-bold">Balance due</td><td className="pt-2 text-right text-base font-bold tabular-nums">{status === 'Paid' ? money(0) : money(due)}</td></tr>
          </tfoot>
        </table>
        {status !== 'Paid' && (
          <section className="mt-6 text-center">
            {payLink ? (
              <a href={payLink} className="inline-block rounded bg-neutral-900 px-6 py-3 font-semibold text-white">{CLOSE.payment.button}</a>
            ) : (
              <p className="text-sm text-neutral-500">Pay by check, cash or card. Call {BUSINESS.phone}.</p>
            )}
            {payLink && <p className="mt-1 text-xs text-neutral-500">Secure card payment through Stripe (2.5% card fee added at checkout). {payLink}</p>}
          </section>
        )}
        {!coOnly && separateCOs.length > 0 && <p className="mt-3 text-xs text-neutral-500">Billed separately: {separateCOs.map((c) => `change order ${c.co.n} (${money(c.total)})`).join(', ')}.</p>}
        <footer className="mt-6 border-t pt-3 text-center text-xs text-neutral-500">Thank you for your business. {BUSINESS.tagline}</footer>
      </article>
    </>
  );
}
