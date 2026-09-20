import Link from 'next/link';
import { loadHydrated } from '@/lib/data';
import { Card, Empty, PageHeader, RelationLinks, Stat, StatusPill } from '@/components/ui';
import { date, dateTime, daysUntil, money, relativeDays } from '@/lib/format';
import { relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function PermitsPage() {
  const permits = await loadHydrated('permits', { sorts: [{ key: 'inspectionDate', direction: 'ascending' }] });

  const failing = permits.filter((p) => ['Corrections Required', 'Failed'].includes(String(p.status)) || String(p.result) === 'Failed');
  const upcoming = permits.filter((p) => p.inspectionDate && (daysUntil(p.inspectionDate) ?? -99) >= 0);
  const notPulled = permits.filter((p) => String(p.status) === 'Not Started');
  const fees = permits.reduce((sum, p) => sum + Number(p.fee ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Permits & inspections"
        subtitle="The quiet schedule-killer. Corrections, re-inspections and expiring permits, all visible."
        actions={<Link href="/records/permits/new" className="btn-primary">+ New permit</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Failed / corrections" value={String(failing.length)} tone={failing.length ? 'bad' : 'good'} />
        <Stat label="Inspections booked" value={String(upcoming.length)} />
        <Stat label="Not yet applied for" value={String(notPulled.length)} tone={notPulled.length ? 'warn' : 'good'} />
        <Stat label="Permit fees" value={money(fees, true)} hint="Across all records" />
      </section>

      {failing.length > 0 && (
        <Card title="Corrections required" className="mb-4">
          <ul className="space-y-2">
            {failing.map((permit) => (
              <li key={permit.id} className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{String(permit.title)}</span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {String(permit.ahj ?? '')} · inspected {date(permit.inspectionDate)} by {String(permit.inspector ?? 'inspector')}
                  </span>
                </div>
                <p className="mt-1.5 text-sm">{String(permit.corrections ?? 'Corrections noted on site.')}</p>
                <div className="mt-2">
                  <RelationLinks refs={permit.job} href={(id) => `/jobs/${id}`} max={1} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {permits.length === 0 ? (
        <Empty title="No permits on file" hint="Pull one as soon as a job is sold — the AHJ sets your schedule, not you." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Permit</th>
                  <th className="th">AHJ</th>
                  <th className="th">Type</th>
                  <th className="th">Status</th>
                  <th className="th">Stage</th>
                  <th className="th">Inspection</th>
                  <th className="th">Result</th>
                  <th className="th">Job</th>
                  <th className="th text-right">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {permits.map((permit) => {
                  const jobId = relationIds(permit.job)[0];
                  const expiring = permit.expiresOn && (daysUntil(permit.expiresOn) ?? 999) <= 30;
                  return (
                    <tr key={permit.id} className="hover:bg-[color:var(--panel-2)]">
                      <td className="td">
                        <div className="font-medium">{String(permit.permitNumber ?? '—')}</div>
                        <div className="text-xs text-[color:var(--muted)]">{String(permit.title)}</div>
                        {expiring ? <div className="text-xs text-volt-300">expires {relativeDays(permit.expiresOn)}</div> : null}
                      </td>
                      <td className="td text-[color:var(--muted)]">{String(permit.ahj ?? '—')}</td>
                      <td className="td text-[color:var(--muted)]">{String(permit.permitType ?? '—')}</td>
                      <td className="td"><StatusPill value={permit.status} /></td>
                      <td className="td text-[color:var(--muted)]">{String(permit.inspectionType ?? '—')}</td>
                      <td className="td whitespace-nowrap text-[color:var(--muted)]">
                        {permit.inspectionDate ? dateTime(permit.inspectionDate) : '—'}
                      </td>
                      <td className="td"><StatusPill value={permit.result} /></td>
                      <td className="td">
                        {jobId ? <Link href={`/jobs/${jobId}`} className="chip hover:border-volt-500/60 hover:text-volt-200">open</Link> : '—'}
                      </td>
                      <td className="td text-right tabular-nums">{money(permit.fee, true)}</td>
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
