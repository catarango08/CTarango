import Link from 'next/link';
import { agingBuckets, loadAll, loadHydrated } from '@/lib/data';
import { Bar, Card, Empty, MoneyStat, PageHeader, RelationLinks, Stat, StatusPill } from '@/components/ui';
import { date, daysUntil, money, relativeDays } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [invoices, payments] = await Promise.all([
    loadHydrated('invoices', { where: status ? [{ key: 'status', op: 'equals', value: status }] : [] }),
    loadAll('payments'),
  ]);

  const aging = agingBuckets(invoices);
  const agingMax = Math.max(1, ...aging.map((b) => b.amount));
  const outstanding = invoices.reduce((sum, i) => sum + num(i.balanceDue), 0);
  const collected30 = payments
    .filter((p) => (daysUntil(p.receivedOn) ?? -99) >= -30)
    .reduce((sum, p) => sum + num(p.amount) * (p.kind === 'Refund' ? -1 : 1), 0);
  const overdue = invoices.filter((i) => num(i.balanceDue) > 0 && (daysUntil(i.dueOn) ?? 1) < 0);
  const lienRisk = invoices.filter((i) => i.lienDeadline && num(i.balanceDue) > 0);

  const dso = (() => {
    const paid = invoices.filter((i) => i.paidOn && i.issuedOn);
    if (!paid.length) return 0;
    const total = paid.reduce((sum, i) => sum + (Date.parse(String(i.paidOn)) - Date.parse(String(i.issuedOn))) / 86_400_000, 0);
    return Math.round(total / paid.length);
  })();

  const statuses = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'In Collections', 'Written Off'];

  return (
    <>
      <PageHeader
        title="Invoices & collections"
        subtitle="Cash is the job. Aging, lien deadlines and days-sales-outstanding in one place."
        actions={<Link href="/records/invoices/new" className="btn-primary">+ New invoice</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MoneyStat label="Outstanding" amount={outstanding} tone={outstanding > 0 ? 'warn' : 'good'} />
        <MoneyStat label="Collected (30 days)" amount={collected30} tone="good" />
        <Stat label="Overdue invoices" value={String(overdue.length)} tone={overdue.length ? 'bad' : 'good'} />
        <Stat label="Days sales outstanding" value={dso ? `${dso}d` : '—'} hint="Issued → paid, average" />
        <Stat label="Lien clocks running" value={String(lienRisk.length)} tone={lienRisk.length ? 'warn' : 'default'} />
      </section>

      <div className="mb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title="A/R aging">
          <ul className="space-y-3">
            {aging.map((bucket) => (
              <li key={bucket.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className={bucket.label === 'Current' ? '' : 'text-[color:var(--muted)]'}>{bucket.label} days</span>
                  <span className="tabular-nums">{money(bucket.amount)}</span>
                </div>
                <Bar value={bucket.amount} max={agingMax} tone={bucket.label === 'Current' ? 'emerald' : bucket.label === '90+' ? 'rose' : 'volt'} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent payments">
          {payments.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {[...payments]
                .sort((a, b) => Date.parse(String(b.receivedOn ?? 0)) - Date.parse(String(a.receivedOn ?? 0)))
                .slice(0, 6)
                .map((payment) => (
                  <li key={payment.id} className="flex items-baseline justify-between gap-2 py-2 text-sm">
                    <span className="min-w-0 truncate">{String(payment.reference)}</span>
                    <span className="shrink-0 text-right">
                      <span className="tabular-nums text-emerald-300">{money(payment.amount)}</span>
                      <span className="ml-2 text-xs text-[color:var(--muted)]">{date(payment.receivedOn)}</span>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/invoices" className={`chip ${!status ? 'border-volt-500/60 text-volt-200' : ''}`}>All</Link>
        {statuses.map((s) => (
          <Link key={s} href={`/invoices?status=${encodeURIComponent(s)}`} className={`chip ${status === s ? 'border-volt-500/60 text-volt-200' : ''}`}>{s}</Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <Empty title="No invoices match" hint="Jobs marked Ready to Invoice are waiting for you." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Invoice</th>
                  <th className="th">Customer</th>
                  <th className="th">Job</th>
                  <th className="th">Issued</th>
                  <th className="th">Due</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Paid</th>
                  <th className="th text-right">Balance</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {invoices.map((invoice) => {
                  const days = daysUntil(invoice.dueOn);
                  const late = num(invoice.balanceDue) > 0 && days !== null && days < 0;
                  const jobId = relationIds(invoice.job)[0];
                  return (
                    <tr key={invoice.id} className="hover:bg-[color:var(--panel-2)]">
                      <td className="td">
                        <div className="font-medium">{String(invoice.invoiceNumber ?? invoice.title)}</div>
                        <div className="text-xs text-[color:var(--muted)]">{String(invoice.title)}</div>
                        {invoice.lienDeadline && num(invoice.balanceDue) > 0 ? (
                          <div className="mt-0.5 text-xs text-rose-300">lien deadline {relativeDays(invoice.lienDeadline)}</div>
                        ) : null}
                      </td>
                      <td className="td"><RelationLinks refs={invoice.customer} href={(id) => `/customers/${id}`} max={1} /></td>
                      <td className="td">
                        {jobId ? <Link href={`/jobs/${jobId}`} className="chip hover:border-volt-500/60 hover:text-volt-200">open job</Link> : '—'}
                      </td>
                      <td className="td whitespace-nowrap text-[color:var(--muted)]">{date(invoice.issuedOn)}</td>
                      <td className={`td whitespace-nowrap ${late ? 'text-rose-300' : 'text-[color:var(--muted)]'}`}>
                        {date(invoice.dueOn)}
                        {late ? <div className="text-xs">{relativeDays(invoice.dueOn)}</div> : null}
                      </td>
                      <td className="td text-right tabular-nums">{money(invoice.total)}</td>
                      <td className="td text-right tabular-nums text-emerald-300">{money(invoice.amountPaid)}</td>
                      <td className={`td text-right tabular-nums ${num(invoice.balanceDue) > 0 ? 'text-volt-300' : 'text-[color:var(--muted)]'}`}>
                        {money(invoice.balanceDue)}
                      </td>
                      <td className="td"><StatusPill value={invoice.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
