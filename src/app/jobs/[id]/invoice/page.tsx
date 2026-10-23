import { CO_DUE_ON_APPROVAL, coTotal, isChangeOrder, parseCO } from '@/lib/domain/change-order';
import { cardFee } from '@/lib/domain/deposit';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll } from '@/lib/data';
import { loadPricing } from '@/lib/pricing';
import { num, relationIds } from '@/lib/calc';
import { parseStored, priceOption } from '@/lib/domain/options';
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

  let lines: { label: string; amount: number }[] = [];
  let total = num(job.amount);
  const signedCOs = quotes.filter((q) => relationIds(q.job).includes(id) && String(q.status) === 'Accepted').map((q) => ({ q, co: parseCO(q.data) })).filter((x) => x.co).map((x) => ({ id: x.q.id, co: x.co!, total: coTotal(x.co!) }));
  const coOnly = sp.co ? signedCOs.find((c) => c.id === sp.co) : undefined;
  const separateCOs = signedCOs.filter((c) => c.total > CO_DUE_ON_APPROVAL);
  if (coOnly) {
    lines = [{ label: `Change order ${coOnly.co.n} — due on approval`, amount: NaN }, ...coOnly.co.lines.map((l) => ({ label: `${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`, amount: l.price * l.qty }))];
    total = coOnly.total;
  } else {
    if (stored) {
      const opt = stored.doc.options.find((o) => o.id === stored.accepted?.optionId) ?? stored.doc.options[0];
      const p = priceOption(stored.doc, opt, pricing, stored.accepted?.addOns ?? []);
      // Customer invoice shows work lines only, no labor/material split.
      lines = [{ label: `${opt.label}${opt.summary ? ` — ${opt.summary}` : ''}`, amount: p.total }];
      total = p.total;
    } else if (total) {
      lines = [{ label: String(job.name ?? 'Electrical work'), amount: total }];
    }
    for (const c of signedCOs.filter((c) => c.total <= CO_DUE_ON_APPROVAL)) {
      lines.push({ label: `Change order ${c.co.n}: ${c.co.lines.map((l) => l.name).join(', ')}`, amount: c.total });
      total += c.total;
    }
  }
  const deposit = coOnly ? 0 : num(job.deposit);
  const depositPaid = deposit > 0 && job.depositIn === true;
  const subtotal = Math.max(0, total - (depositPaid ? deposit : 0));
  const byCard = sp.card === '1' || String(job.paymentMethod) === 'Card';
  const fee = byCard ? cardFee(subtotal) : 0;
  const due = Math.round((subtotal + fee) * 100) / 100;
  const payLink = String(job.payLink ?? '');
  const status = String(job.invoiceStatus ?? 'Draft');

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3 text-sm">
        <Link className="underline" href={`/jobs/${id}`}>← Back to job</Link>
        <PrintButton />
      </div>
      <div className="no-print mb-4">
        <InvoiceControls jobId={id} jobStatus={String(job.status ?? '')} due={due} byCard={byCard} coLinks={separateCOs.map((c) => ({ id: c.id, label: `Change order ${c.co.n} invoice (${money(c.total)})` }))} status={status} statuses={[...INVOICE_STATUSES]} payLink={payLink} linkLabel={CLOSE.payment.linkLabel} />
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
            {payLink && <p className="mt-1 text-xs text-neutral-500">Secure card payment through Stripe.</p>}
          </section>
        )}
        {!coOnly && separateCOs.length > 0 && <p className="mt-3 text-xs text-neutral-500">Billed separately: {separateCOs.map((c) => `change order ${c.co.n} (${money(c.total)})`).join(', ')}.</p>}
        <footer className="mt-6 border-t pt-3 text-center text-xs text-neutral-500">Thank you for your business. {BUSINESS.tagline}</footer>
      </article>
    </>
  );
}
