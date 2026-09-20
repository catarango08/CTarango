import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Card, Chips, Empty, MoneyStat, PageHeader, Stat, StatusPill } from '@/components/ui';
import { date, money, relativeDays } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';
import type { RecordValue } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; stage?: string; segment?: string }> }) {
  const { q, stage, segment } = await searchParams;
  const where = [
    ...(stage ? [{ key: 'stage', op: 'equals' as const, value: stage }] : []),
    ...(segment ? [{ key: 'segment', op: 'equals' as const, value: segment }] : []),
  ];

  const [customers, jobs, invoices, properties] = await Promise.all([
    loadHydrated('customers', { where, search: q }),
    loadAll('jobs'),
    loadAll('invoices'),
    loadAll('properties'),
  ]);

  const jobCount = countBy(jobs, 'customer');
  const siteCount = countBy(properties, 'customer');
  const openBalance = sumBy(invoices, 'customer', (i) => num(i.balanceDue));

  const lifetime = customers.reduce((sum, c) => sum + num(c.lifetimeValue), 0);
  const receivable = [...openBalance.values()].reduce((a, b) => a + b, 0);
  const onAgreement = customers.filter((c) => String(c.stage) === 'Service Agreement').length;

  const stages = ['Lead', 'Estimate Sent', 'Active Customer', 'Repeat Customer', 'Service Agreement', 'Dormant', 'Lost'];

  return (
    <>
      <PageHeader
        title="CRM"
        subtitle="Every account, what they are worth, what they owe, and when you last stood on their property."
        actions={<Link href="/records/customers/new" className="btn-primary">+ New customer</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts" value={String(customers.length)} hint={`${onAgreement} on a service agreement`} />
        <MoneyStat label="Lifetime value" amount={lifetime} hint="Across all accounts shown" />
        <MoneyStat label="Owed to you" amount={receivable} tone={receivable > 0 ? 'warn' : 'good'} />
        <Stat label="Service locations" value={String(properties.length)} hint="Sites you have records for" />
      </section>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/customers">
        <input name="q" defaultValue={q ?? ''} placeholder="Search customers…" className="input max-w-xs" />
        {segment ? <input type="hidden" name="segment" value={segment} /> : null}
        <button className="btn" type="submit">Search</button>
        <span className="mx-1 text-[color:var(--muted)]">|</span>
        <Link href="/customers" className={`chip ${!stage ? 'border-volt-500/60 text-volt-200' : ''}`}>All stages</Link>
        {stages.map((s) => (
          <Link key={s} href={`/customers?stage=${encodeURIComponent(s)}`} className={`chip ${stage === s ? 'border-volt-500/60 text-volt-200' : ''}`}>
            {s}
          </Link>
        ))}
      </form>

      {customers.length === 0 ? (
        <Empty title="No customers match" hint="Try clearing the filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Customer</th>
                  <th className="th">Stage</th>
                  <th className="th">Segment</th>
                  <th className="th">Contact</th>
                  <th className="th text-right">Jobs</th>
                  <th className="th text-right">Sites</th>
                  <th className="th text-right">Lifetime</th>
                  <th className="th text-right">Balance</th>
                  <th className="th">Last service</th>
                  <th className="th">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {customers.map((customer) => {
                  const balance = openBalance.get(customer.id) ?? 0;
                  return (
                    <tr key={customer.id} className="hover:bg-[color:var(--panel-2)]">
                      <td className="td">
                        <Link href={`/customers/${customer.id}`} className="font-medium hover:text-volt-200">{String(customer.name)}</Link>
                        <div className="text-xs text-[color:var(--muted)]">{String(customer.source ?? '')}</div>
                      </td>
                      <td className="td"><StatusPill value={customer.stage} /></td>
                      <td className="td text-[color:var(--muted)]">{String(customer.segment ?? '—')}</td>
                      <td className="td">
                        <div>{String(customer.phone ?? '—')}</div>
                        <div className="text-xs text-[color:var(--muted)]">{String(customer.email ?? '')}</div>
                      </td>
                      <td className="td text-right tabular-nums">{jobCount.get(customer.id) ?? 0}</td>
                      <td className="td text-right tabular-nums">{siteCount.get(customer.id) ?? 0}</td>
                      <td className="td text-right tabular-nums">{money(customer.lifetimeValue, true)}</td>
                      <td className={`td text-right tabular-nums ${balance > 0 ? 'text-volt-300' : 'text-[color:var(--muted)]'}`}>
                        {money(balance, true)}
                      </td>
                      <td className="td whitespace-nowrap text-[color:var(--muted)]">
                        {customer.lastServiceDate ? `${date(customer.lastServiceDate)} · ${relativeDays(customer.lastServiceDate)}` : '—'}
                      </td>
                      <td className="td"><Chips values={customer.tags} max={2} /></td>
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

function countBy(rows: RecordValue[], field: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const id of relationIds(row[field])) map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

function sumBy(rows: RecordValue[], field: string, value: (row: RecordValue) => number): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    for (const id of relationIds(row[field])) map.set(id, (map.get(id) ?? 0) + value(row));
  }
  return map;
}
