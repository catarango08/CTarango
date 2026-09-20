import Link from 'next/link';
import { loadHydrated } from '@/lib/data';
import { Card, Chips, Empty, PageHeader, RelationLinks, Stat, StatusPill } from '@/components/ui';
import { date, daysUntil } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SafetyPage() {
  const records = await loadHydrated('safety', { sorts: [{ key: 'date', direction: 'descending' }] });

  const incidents = records.filter((r) => ['Incident', 'Vehicle Incident'].includes(String(r.kind)));
  const nearMisses = records.filter((r) => String(r.kind) === 'Near Miss');
  const recordables = records.filter((r) => ['Recordable', 'Lost Time'].includes(String(r.severity)));
  const last90 = records.filter((r) => (daysUntil(r.date) ?? -999) >= -90);
  const daysSinceIncident = incidents.length
    ? Math.min(...incidents.map((r) => Math.abs(daysUntil(r.date) ?? 9999)))
    : null;

  return (
    <>
      <PageHeader
        title="Safety"
        subtitle="Job hazard analyses, LOTO records, energized work permits and incidents. NFPA 70E documentation lives here."
        actions={<Link href="/records/safety/new" className="btn-primary">+ New record</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Days since last incident"
          value={daysSinceIncident === null ? '—' : String(daysSinceIncident)}
          tone={daysSinceIncident !== null && daysSinceIncident < 30 ? 'warn' : 'good'}
        />
        <Stat label="OSHA recordables" value={String(recordables.length)} tone={recordables.length ? 'bad' : 'good'} />
        <Stat label="Near misses logged" value={String(nearMisses.length)} hint="Reporting these is the point" />
        <Stat label="Records in last 90 days" value={String(last90.length)} />
      </section>

      {records.length === 0 ? (
        <Empty title="Nothing logged" hint="A JHA before the first energized task is the cheapest insurance you will ever buy." />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card key={record.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold">{String(record.title)}</h3>
                    <span className="chip">{String(record.kind)}</span>
                    {record.severity && String(record.severity) !== 'None' ? <StatusPill value={record.severity} /> : null}
                    {record.reportedToOsha ? <span className="chip border-rose-500/40 text-rose-300">OSHA reportable</span> : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                    <span>{date(record.date)}</span>
                    <RelationLinks refs={record.job} href={(id) => `/jobs/${id}`} max={1} />
                    <RelationLinks refs={record.crew} max={3} />
                    {record.voltageLevel ? <span>· {String(record.voltageLevel)}</span> : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="label">Hazards identified</div>
                  <div className="mt-1"><Chips values={record.hazards} max={8} /></div>
                </div>
                <div>
                  <div className="label">PPE required</div>
                  <div className="mt-1"><Chips values={record.ppe} max={8} /></div>
                </div>
              </div>

              {record.controls ? (
                <div className="mt-3">
                  <div className="label">Controls</div>
                  <p className="mt-1 text-sm">{String(record.controls)}</p>
                </div>
              ) : null}
              {record.correctiveAction ? (
                <div className="mt-3 rounded-lg border border-volt-500/30 bg-volt-500/10 p-2.5">
                  <div className="label text-volt-200">Corrective action</div>
                  <p className="mt-1 text-sm">{String(record.correctiveAction)}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
