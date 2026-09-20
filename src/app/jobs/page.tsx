import Link from 'next/link';
import { loadHydrated } from '@/lib/data';
import { JOB_STATUSES } from '@/lib/schema';
import { Card, Empty, PageHeader, RelationLinks, StatusPill } from '@/components/ui';
import { dateTime, money, number, percent, truncate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const jobs = await loadHydrated('jobs', {
    where: status ? [{ key: 'status', op: 'equals', value: status }] : [],
    search: q,
    sorts: [{ key: 'scheduledStart', direction: 'descending' }],
  });

  const open = jobs.filter((j) => !['Closed', 'Cancelled'].includes(String(j.status)));
  const pipelineValue = open.reduce((sum, j) => sum + Number(j.revenue ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle={`${jobs.length} work order${jobs.length === 1 ? '' : 's'} · ${open.length} open · ${money(pipelineValue, true)} booked revenue on open work`}
        actions={<Link href="/records/jobs/new" className="btn-primary">+ New job</Link>}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Link href="/jobs" className={`chip ${!status ? 'border-volt-500/60 text-volt-200' : ''}`}>All</Link>
        {JOB_STATUSES.map((s) => {
          const count = jobs.filter((j) => String(j.status) === s).length;
          return (
            <Link
              key={s}
              href={`/jobs?status=${encodeURIComponent(s)}`}
              className={`chip ${status === s ? 'border-volt-500/60 text-volt-200' : ''}`}
            >
              {s}
              {!status && count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </Link>
          );
        })}
      </div>

      {jobs.length === 0 ? (
        <Empty title="No jobs match that filter" hint="Clear the filter or create a new work order." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Job</th>
                  <th className="th">Status</th>
                  <th className="th">Priority</th>
                  <th className="th">Customer</th>
                  <th className="th">Crew</th>
                  <th className="th">Scheduled</th>
                  <th className="th text-right">Hours</th>
                  <th className="th text-right">Revenue</th>
                  <th className="th text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-[color:var(--panel-2)]">
                    <td className="td">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-volt-200">{String(job.title)}</Link>
                      <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                        {String(job.jobNumber ?? '')} {job.jobType ? `· ${job.jobType}` : ''}
                      </div>
                      {job.problem ? (
                        <div className="mt-1 max-w-md text-xs text-[color:var(--muted)]">{truncate(job.problem, 90)}</div>
                      ) : null}
                    </td>
                    <td className="td"><StatusPill value={job.status} /></td>
                    <td className="td"><StatusPill value={job.priority} /></td>
                    <td className="td"><RelationLinks refs={job.customer} href={(id) => `/customers/${id}`} max={1} /></td>
                    <td className="td"><RelationLinks refs={job.assignedTo} max={2} /></td>
                    <td className="td whitespace-nowrap text-[color:var(--muted)]">{dateTime(job.scheduledStart)}</td>
                    <td className="td text-right tabular-nums text-[color:var(--muted)]">
                      {number(job.actualHours)} / {number(job.estimatedHours)}
                    </td>
                    <td className="td text-right tabular-nums">{money(job.revenue, true)}</td>
                    <td className={`td text-right tabular-nums ${Number(job.grossMargin ?? 0) < 0.35 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {job.grossMargin === null || job.grossMargin === undefined ? '—' : percent(job.grossMargin)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
