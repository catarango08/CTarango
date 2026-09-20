import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Bar, Card, Chips, PageHeader, Stat, StatusPill } from '@/components/ui';
import { date, daysUntil, money, number, percent } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const [technicians, timeEntries, jobs] = await Promise.all([
    loadHydrated('technicians'),
    loadAll('timeEntries'),
    loadAll('jobs'),
  ]);

  const window = 14;
  const recent = timeEntries.filter((e) => (daysUntil(e.startedAt) ?? -99) >= -window);

  const stats = technicians.map((tech) => {
    const mine = recent.filter((e) => relationIds(e.technician).includes(tech.id));
    const hours = mine.reduce((sum, e) => sum + num(e.hours), 0);
    const billable = mine.filter((e) => e.billable).reduce((sum, e) => sum + num(e.hours), 0);
    const warranty = mine.filter((e) => String(e.kind) === 'Warranty').reduce((sum, e) => sum + num(e.hours), 0);
    const assigned = jobs.filter((j) => relationIds(j.assignedTo).includes(tech.id));
    const closed = assigned.filter((j) => ['Closed', 'Invoiced'].includes(String(j.status)));
    const revenue = closed.reduce((sum, j) => sum + num(j.revenue) / Math.max(1, relationIds(j.assignedTo).length), 0);
    const callbacks = assigned.filter((j) => j.warranty === true || String(j.jobType) === 'Warranty Callback').length;
    return { tech, hours, billable, warranty, assigned: assigned.length, closed: closed.length, revenue, callbacks };
  });

  const maxHours = Math.max(1, ...stats.map((s) => s.hours));
  const licenseWatch = technicians.filter((t) => t.licenseExpires && (daysUntil(t.licenseExpires) ?? 999) <= 90);
  const certWatch = technicians.filter((t) => t.certExpires && (daysUntil(t.certExpires) ?? 999) <= 90);
  const totalHours = stats.reduce((s, r) => s + r.hours, 0);
  const totalBillable = stats.reduce((s, r) => s + r.billable, 0);

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`Licenses, certifications and where the last ${window} days of labor actually went.`}
        actions={<Link href="/records/technicians/new" className="btn-primary">+ Add team member</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active crew" value={String(technicians.filter((t) => String(t.status ?? 'Active') === 'Active').length)} />
        <Stat label="Billable utilization" value={percent(totalHours ? totalBillable / totalHours : 0)} tone={totalBillable / (totalHours || 1) >= 0.7 ? 'good' : 'warn'} hint={`${number(totalHours)} hours logged`} />
        <Stat label="Licenses expiring ≤ 90d" value={String(licenseWatch.length)} tone={licenseWatch.length ? 'warn' : 'good'} />
        <Stat label="Certs expiring ≤ 90d" value={String(certWatch.length)} tone={certWatch.length ? 'warn' : 'good'} />
      </section>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ tech, hours, billable, warranty, assigned, closed, revenue, callbacks }) => {
          const licenseDays = daysUntil(tech.licenseExpires);
          const certDays = daysUntil(tech.certExpires);
          return (
            <Card key={tech.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{String(tech.name)}</h3>
                  <p className="text-xs text-[color:var(--muted)]">{String(tech.role ?? '')}</p>
                </div>
                <StatusPill value={tech.status ?? 'Active'} />
              </div>

              <dl className="mt-3 space-y-1.5 text-sm">
                <Row label="License" value={tech.licenseNumber ? String(tech.licenseNumber) : '—'} />
                <Row
                  label="Expires"
                  value={tech.licenseExpires ? date(tech.licenseExpires) : '—'}
                  tone={licenseDays !== null && licenseDays < 0 ? 'bad' : licenseDays !== null && licenseDays <= 60 ? 'warn' : undefined}
                />
                <Row
                  label="Next cert due"
                  value={tech.certExpires ? date(tech.certExpires) : '—'}
                  tone={certDays !== null && certDays < 0 ? 'bad' : certDays !== null && certDays <= 45 ? 'warn' : undefined}
                />
                <Row label="Cost / bill rate" value={`${money(tech.hourlyCost)} → ${money(tech.billableRate)}`} />
              </dl>

              <div className="mt-3">
                <div className="mb-1 flex items-baseline justify-between text-xs text-[color:var(--muted)]">
                  <span>Last {window} days</span>
                  <span className="tabular-nums">{number(billable)} billable / {number(hours)} h</span>
                </div>
                <Bar value={billable} max={maxHours} tone={billable / (hours || 1) >= 0.7 ? 'emerald' : 'volt'} />
                {warranty > 0 && <p className="mt-1 text-xs text-rose-300">{number(warranty)} h unbilled warranty time</p>}
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Mini label="Jobs" value={String(assigned)} />
                <Mini label="Closed" value={String(closed)} />
                <Mini label="Revenue" value={money(revenue, true)} />
              </dl>
              {callbacks > 0 && <p className="mt-2 text-xs text-rose-300">{callbacks} warranty callback{callbacks === 1 ? '' : 's'} linked to this tech.</p>}

              <div className="mt-3 space-y-1.5">
                <div><span className="label">Skills</span><div className="mt-1"><Chips values={tech.skills} max={5} /></div></div>
                <div><span className="label">Certifications</span><div className="mt-1"><Chips values={tech.certifications} max={5} /></div></div>
              </div>

              {tech.notes ? <p className="mt-3 text-xs text-[color:var(--muted)]">{String(tech.notes)}</p> : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'warn' }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[color:var(--muted)]">{label}</dt>
      <dd className={tone === 'bad' ? 'text-rose-300' : tone === 'warn' ? 'text-volt-300' : ''}>{value}</dd>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-2 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-[color:var(--muted)]">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
