import { groupSum, loadAll } from '@/lib/data';
import { Bar, Card, MoneyStat, PageHeader, PercentStat, Stat } from '@/components/ui';
import { date, money, number, percent, toDate } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';
import type { RecordValue } from '@/lib/schema';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const [jobs, invoices, payments, estimates, customers, technicians, timeEntries, agreements] = await Promise.all([
    loadAll('jobs'), loadAll('invoices'), loadAll('payments'), loadAll('estimates'),
    loadAll('customers'), loadAll('technicians'), loadAll('timeEntries'), loadAll('agreements'),
  ]);

  const closed = jobs.filter((j) => ['Closed', 'Invoiced', 'Ready to Invoice'].includes(String(j.status)));
  const revenue = closed.reduce((sum, j) => sum + num(j.revenue), 0);
  const cost = closed.reduce((sum, j) => sum + num(j.laborCost) + num(j.materialsCost), 0);

  const byMonth = monthlySeries(invoices, 'issuedOn', (i) => num(i.total));
  const byType = groupSum(closed, (j) => String(j.jobType ?? 'Other'), (j) => num(j.revenue)).sort((a, b) => b.amount - a.amount);
  const marginByType = groupSum(closed, (j) => String(j.jobType ?? 'Other'), (j) => num(j.revenue) - num(j.laborCost) - num(j.materialsCost))
    .map((row) => {
      const typeRevenue = byType.find((t) => t.label === row.label)?.amount ?? 0;
      // No revenue means no margin to report — not a 0% margin.
      return { label: row.label, amount: typeRevenue ? row.amount / typeRevenue : null };
    })
    .sort((a, b) => (b.amount ?? -1) - (a.amount ?? -1));

  const customerName = new Map(customers.map((c) => [c.id, String(c.name ?? '')]));
  const byCustomer = groupSum(closed, (j) => customerName.get(relationIds(j.customer)[0] ?? '') ?? 'Unassigned', (j) => num(j.revenue))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);

  const bySource = groupSum(
    customers,
    (c) => String(c.source ?? 'Unknown'),
    (c) => num(c.lifetimeValue),
  ).sort((a, b) => b.amount - a.amount);

  const techName = new Map(technicians.map((t) => [t.id, String(t.name ?? '')]));
  const techRows = technicians
    .filter((t) => !['Dispatcher', 'Office Manager'].includes(String(t.role)))
    .map((tech) => {
      const entries = timeEntries.filter((e) => relationIds(e.technician).includes(tech.id));
      const hours = entries.reduce((sum, e) => sum + num(e.hours), 0);
      const billable = entries.filter((e) => e.billable).reduce((sum, e) => sum + num(e.hours), 0);
      const assigned = closed.filter((j) => relationIds(j.assignedTo).includes(tech.id));
      const rev = assigned.reduce((sum, j) => sum + num(j.revenue) / Math.max(1, relationIds(j.assignedTo).length), 0);
      return { name: String(tech.name), hours, billable, jobs: assigned.length, revenue: rev, perHour: hours ? rev / hours : 0 };
    })
    .sort((a, b) => b.revenue - a.revenue);
  void techName;

  const decided = estimates.filter((e) => ['Approved', 'Converted to Job', 'Declined', 'Expired'].includes(String(e.status)));
  const won = decided.filter((e) => ['Approved', 'Converted to Job'].includes(String(e.status)));
  const callbacks = jobs.filter((j) => j.warranty === true || String(j.jobType) === 'Warranty Callback');
  const collected = payments.reduce((sum, p) => sum + num(p.amount) * (p.kind === 'Refund' ? -1 : 1), 0);
  const recurring = agreements.filter((a) => String(a.status) === 'Active').reduce((sum, a) => sum + num(a.price), 0);

  const monthMax = Math.max(1, ...byMonth.map((m) => m.amount));
  const typeMax = Math.max(1, ...byType.map((m) => m.amount));
  const customerMax = Math.max(1, ...byCustomer.map((m) => m.amount));
  const sourceMax = Math.max(1, ...bySource.map((m) => m.amount));

  return (
    <>
      <PageHeader title="Reports" subtitle="The numbers that tell you whether the business is working, not just busy." />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MoneyStat label="Revenue (closed work)" amount={revenue} />
        <PercentStat label="Gross margin" value={revenue ? (revenue - cost) / revenue : 0} tone={revenue && (revenue - cost) / revenue >= 0.4 ? 'good' : 'warn'} />
        <MoneyStat label="Cash collected" amount={collected} tone="good" />
        <PercentStat label="Quote win rate" value={decided.length ? won.length / decided.length : 0} />
        <PercentStat
          label="Callback rate"
          value={closed.length ? callbacks.length / closed.length : 0}
          tone={closed.length && callbacks.length / closed.length > 0.05 ? 'bad' : 'good'}
        />
        <MoneyStat label="Contracted recurring" amount={recurring} hint="Active service agreements" />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Invoiced by month">
          <ul className="space-y-3">
            {byMonth.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">{money(row.amount, true)}</span>
                </div>
                <Bar value={row.amount} max={monthMax} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Revenue by job type">
          <ul className="space-y-3">
            {byType.slice(0, 9).map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">{money(row.amount, true)}</span>
                </div>
                <Bar value={row.amount} max={typeMax} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Margin by job type">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[color:var(--line)]">
                <th className="th">Type</th>
                <th className="th text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {marginByType.map((row) => (
                <tr key={row.label}>
                  <td className="td">{row.label}</td>
                  <td
                    className={`td text-right tabular-nums ${
                      row.amount === null ? 'text-[color:var(--muted)]' : row.amount < 0.35 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {row.amount === null ? 'no revenue' : percent(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            Anything under 35% is either mispriced or badly executed. Look at the jobs behind the row before you change the price book.
          </p>
        </Card>

        <Card title="Top customers by revenue">
          <ul className="space-y-3">
            {byCustomer.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">{money(row.amount, true)}</span>
                </div>
                <Bar value={row.amount} max={customerMax} tone="emerald" />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Lifetime value by lead source">
          <ul className="space-y-3">
            {bySource.map((row) => (
              <li key={row.label}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums text-[color:var(--muted)]">{money(row.amount, true)}</span>
                </div>
                <Bar value={row.amount} max={sourceMax} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[color:var(--muted)]">Spend your marketing dollars where the lifetime value already is.</p>
        </Card>

        <Card title="Technician scorecard">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Tech</th>
                  <th className="th text-right">Hours</th>
                  <th className="th text-right">Billable</th>
                  <th className="th text-right">Jobs</th>
                  <th className="th text-right">Revenue</th>
                  <th className="th text-right">$ / hour</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {techRows.map((row) => (
                  <tr key={row.name}>
                    <td className="td font-medium">{row.name}</td>
                    <td className="td text-right tabular-nums">{number(row.hours)}</td>
                    <td className="td text-right tabular-nums text-[color:var(--muted)]">{percent(row.hours ? row.billable / row.hours : 0)}</td>
                    <td className="td text-right tabular-nums">{row.jobs}</td>
                    <td className="td text-right tabular-nums">{money(row.revenue, true)}</td>
                    <td className="td text-right tabular-nums text-emerald-300">{money(row.perHour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Service agreement renewals" className="mt-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--line)]">
              <th className="th">Agreement</th>
              <th className="th">Plan</th>
              <th className="th">Frequency</th>
              <th className="th">Next service</th>
              <th className="th">Renews</th>
              <th className="th text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {agreements.map((agreement) => (
              <tr key={agreement.id}>
                <td className="td">{String(agreement.title)}</td>
                <td className="td text-[color:var(--muted)]">{String(agreement.plan ?? '')}</td>
                <td className="td text-[color:var(--muted)]">{String(agreement.frequency ?? '')}</td>
                <td className="td">{date(agreement.nextServiceDate)}</td>
                <td className="td">{date(agreement.renewalDate)}</td>
                <td className="td text-right tabular-nums">{money(agreement.price, true)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jobs closed" value={String(closed.length)} />
        <Stat label="Average ticket" value={money(closed.length ? revenue / closed.length : 0, true)} />
        <Stat label="Estimates issued" value={String(estimates.length)} />
        <Stat label="Warranty callbacks" value={String(callbacks.length)} tone={callbacks.length ? 'warn' : 'good'} />
      </div>
    </>
  );
}

function monthlySeries(rows: RecordValue[], dateKey: string, value: (row: RecordValue) => number) {
  const now = new Date();
  const months: { label: string; amount: number; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount: 0, key: `${d.getFullYear()}-${d.getMonth()}` });
  }
  const index = new Map(months.map((m) => [m.key, m]));
  for (const row of rows) {
    const d = toDate(row[dateKey]);
    if (!d) continue;
    const bucket = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.amount += value(row);
  }
  return months;
}
