import Link from 'next/link';
import { loadDashboard, hydrate } from '@/lib/data';
import { Bar, Card, Chips, PageHeader, PercentStat, RelationLinks, Stat, StatusPill, MoneyStat, Empty } from '@/components/ui';
import { dateShort, money, percent, relativeDays, time, truncate } from '@/lib/format';
import { PhotoStrip } from '@/components/photo-strip';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const dash = await loadDashboard();
  const [todays, active, photos, estimates, overdue] = await Promise.all([
    hydrate('jobs', dash.todaysJobs),
    hydrate('jobs', dash.activeJobs),
    hydrate('jobPhotos', dash.recentPhotos),
    hydrate('estimates', dash.openEstimates),
    hydrate('invoices', dash.overdueInvoices),
  ]);
  const tasks = await hydrate('tasks', dash.followUps);
  const m = dash.metrics;
  const agingMax = Math.max(1, ...dash.aging.map((b) => b.amount));
  const typeMax = Math.max(1, ...dash.revenueByType.map((b) => b.amount));

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        actions={
          <>
            <Link href="/dispatch" className="btn">Dispatch board</Link>
            <Link href="/records/jobs/new" className="btn-primary">+ New job</Link>
          </>
        }
      />

      {dash.alerts.length > 0 && (
        <section className="mb-6 grid gap-2">
          {dash.alerts.slice(0, 5).map((alert, i) => (
            <Link
              key={`${alert.title}-${i}`}
              href={alert.href ?? '#'}
              className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-sm transition hover:brightness-110 ${
                alert.severity === 'critical'
                  ? 'border-rose-500/40 bg-rose-500/10'
                  : alert.severity === 'warning'
                    ? 'border-volt-500/40 bg-volt-500/10'
                    : 'border-[color:var(--line)] bg-[color:var(--panel)]'
              }`}
            >
              <span className="font-medium">{alert.title}</span>
              <span className="text-xs text-[color:var(--muted)]">{truncate(alert.detail, 130)}</span>
            </Link>
          ))}
          {dash.alerts.length > 5 && (
            <p className="px-1 text-xs text-[color:var(--muted)]">+{dash.alerts.length - 5} more alerts across the business.</p>
          )}
        </section>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MoneyStat label="Invoiced MTD" amount={m.revenueMtd} hint={`${money(m.collectedMtd, true)} collected`} />
        <MoneyStat label="A/R outstanding" amount={m.arTotal} tone={m.arOver30 > 0 ? 'bad' : 'default'} hint={`${money(m.arOver30, true)} over 30 days`} />
        <MoneyStat label="Open estimates" amount={m.openEstimateValue} hint={`${estimates.length} awaiting a decision`} />
        <PercentStat label="Win rate" value={m.winRate} tone={m.winRate >= 0.5 ? 'good' : 'warn'} hint="Approved ÷ decided" />
        <PercentStat label="Billable utilization" value={m.utilization} tone={m.utilization >= 0.7 ? 'good' : 'warn'} hint="Last 14 days" />
        <PercentStat label="First-time fix" value={m.firstTimeFix} tone={m.firstTimeFix >= 0.9 ? 'good' : 'warn'} hint="Jobs closed without a callback" />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title={`On the board today — ${todays.length} job${todays.length === 1 ? '' : 's'}`}
          action={<Link href="/dispatch" className="text-xs text-[color:var(--muted)] hover:text-volt-300">Dispatch →</Link>}
          className="xl:col-span-2"
        >
          {todays.length === 0 ? (
            <Empty title="Nothing scheduled today" hint="Pull something off the unscheduled list to fill the day." />
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {todays.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
                  <span className="w-14 shrink-0 text-sm tabular-nums text-[color:var(--muted)]">{time(job.scheduledStart)}</span>
                  <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-volt-200">
                    {String(job.title)}
                  </Link>
                  <StatusPill value={job.status} />
                  <StatusPill value={job.priority} />
                  <RelationLinks refs={job.assignedTo} max={2} />
                  <RelationLinks refs={job.customer} href={(id) => `/customers/${id}`} max={1} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs a decision from you">
          <ul className="space-y-2.5">
            <li className="panel-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm">Unscheduled jobs</span>
              <Link href="/jobs?status=Unscheduled" className="text-sm font-semibold text-volt-300">{m.unscheduledCount}</Link>
            </li>
            <li className="panel-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm">Jobs in progress right now</span>
              <Link href="/jobs" className="text-sm font-semibold text-volt-300">{active.length}</Link>
            </li>
            <li className="panel-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm">Overdue invoices</span>
              <Link href="/invoices" className="text-sm font-semibold text-rose-300">{overdue.length}</Link>
            </li>
            <li className="panel-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm">Follow-ups due this week</span>
              <Link href="/records/tasks" className="text-sm font-semibold text-volt-300">{tasks.length}</Link>
            </li>
            <li className="panel-2 flex items-center justify-between px-3 py-2">
              <span className="text-sm">Average ticket</span>
              <span className="text-sm font-semibold tabular-nums">{money(m.avgTicket, true)}</span>
            </li>
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="A/R aging">
          <ul className="space-y-3">
            {dash.aging.map((bucket) => (
              <li key={bucket.label}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className={bucket.label === 'Current' ? '' : 'text-[color:var(--muted)]'}>{bucket.label} days</span>
                  <span className="tabular-nums">{money(bucket.amount, true)}</span>
                </div>
                <Bar value={bucket.amount} max={agingMax} tone={bucket.label === 'Current' ? 'emerald' : bucket.label === '90+' ? 'rose' : 'volt'} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Revenue by job type" action={<Link href="/reports" className="text-xs text-[color:var(--muted)] hover:text-volt-300">Reports →</Link>}>
          {dash.revenueByType.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No closed jobs yet.</p>
          ) : (
            <ul className="space-y-3">
              {dash.revenueByType.map((row) => (
                <li key={row.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate">{row.label}</span>
                    <span className="tabular-nums text-[color:var(--muted)]">{money(row.amount, true)}</span>
                  </div>
                  <Bar value={row.amount} max={typeMax} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Follow-ups" action={<Link href="/records/tasks" className="text-xs text-[color:var(--muted)] hover:text-volt-300">All tasks →</Link>}>
          {tasks.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Nothing due this week.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {tasks.slice(0, 7).map((task) => (
                <li key={task.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">{String(task.title)}</span>
                    <span className={`shrink-0 text-xs ${(String(task.priority) === 'High') ? 'text-rose-300' : 'text-[color:var(--muted)]'}`}>
                      {relativeDays(task.dueDate)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <RelationLinks refs={task.assignee} max={1} />
                    <Chips values={task.category ? [task.category] : []} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card
          title="Latest job photos"
          className="xl:col-span-2"
          action={<Link href="/photos" className="text-xs text-[color:var(--muted)] hover:text-volt-300">Photo library →</Link>}
        >
          <PhotoStrip photos={photos} />
        </Card>

        <Card title="Estimates awaiting a decision">
          {estimates.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Nothing outstanding.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {estimates.slice(0, 6).map((est) => (
                <li key={est.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={`/estimates`} className="truncate text-sm font-medium hover:text-volt-200">{String(est.title)}</Link>
                    <span className="shrink-0 tabular-nums text-sm">{money(est.total, true)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[color:var(--muted)]">
                    <StatusPill value={est.status} />
                    <RelationLinks refs={est.customer} href={(id) => `/customers/${id}`} max={1} />
                    <span>expires {dateShort(est.expiresOn)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Past due" action={<Link href="/invoices" className="text-xs text-[color:var(--muted)] hover:text-volt-300">All invoices →</Link>}>
          {overdue.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Nothing past due. Enjoy it.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--line)]">
                    <th className="th">Invoice</th>
                    <th className="th">Customer</th>
                    <th className="th">Due</th>
                    <th className="th text-right">Balance</th>
                    <th className="th">Status</th>
                    <th className="th">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {overdue.map((inv) => (
                    <tr key={inv.id}>
                      <td className="td font-medium">{String(inv.invoiceNumber ?? inv.title)}</td>
                      <td className="td"><RelationLinks refs={inv.customer} href={(id) => `/customers/${id}`} max={1} /></td>
                      <td className="td text-[color:var(--muted)]">{dateShort(inv.dueOn)} · {relativeDays(inv.dueOn)}</td>
                      <td className="td text-right tabular-nums text-rose-300">{money(inv.balanceDue)}</td>
                      <td className="td"><StatusPill value={inv.status} /></td>
                      <td className="td text-xs text-[color:var(--muted)]">{truncate(inv.notes, 80)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-[color:var(--muted)]">
        Utilization {percent(m.utilization)} · {m.jobsThisWeek} jobs booked in the next 7 days
      </p>
    </>
  );
}
