import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { JOB_STATUSES, type RecordValue } from '@/lib/schema';
import { Card, Chips, Field, PageHeader, RelationLinks, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { StatusControl } from '@/components/status-control';
import { date, dateTime, money, number, percent, time } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();

  const [photos, timeEntries, usage, permits, safety, invoices, estimates, interactions, technicians, materials, docs] =
    await Promise.all([
      relatedTo('jobPhotos', 'job', id),
      relatedTo('timeEntries', 'job', id),
      relatedTo('materialUsage', 'job', id),
      relatedTo('permits', 'job', id),
      relatedTo('safety', 'job', id),
      relatedTo('invoices', 'job', id),
      relatedTo('estimates', 'job', id),
      relatedTo('interactions', 'job', id),
      loadAll('technicians'),
      loadAll('materials'),
      relatedTo('documents', 'job', id),
    ]);

  const customerId = relationIds(job.customer)[0];
  const propertyId = relationIds(job.property)[0];
  const property = propertyId ? await findById('properties', propertyId) : null;

  const rate = new Map(technicians.map((t) => [t.id, num(t.hourlyCost)]));
  const laborCost = timeEntries.reduce((sum, e) => {
    const techId = relationIds(e.technician)[0] ?? '';
    return sum + num(e.hours) * (rate.get(techId) ?? 0) * (e.overtime ? 1.5 : 1);
  }, 0);
  const materialCost = usage.reduce((sum, u) => sum + num(u.extendedCost), 0);
  const hours = timeEntries.reduce((sum, e) => sum + num(e.hours), 0);
  const revenue = invoices.reduce((sum, i) => sum + num(i.total), 0) || num(job.revenue);
  const cost = laborCost + materialCost || num(job.laborCost) + num(job.materialsCost);
  const margin = revenue > 0 ? (revenue - cost) / revenue : 0;

  const materialName = new Map(materials.map((m) => [m.id, String(m.name ?? '')]));
  const byStage = groupPhotos(photos);

  return (
    <>
      <PageHeader
        title={String(job.title)}
        subtitle={[job.jobNumber, job.jobType, property?.name].filter(Boolean).join(' · ')}
        actions={
          <>
            <StatusPill value={job.priority} />
            <StatusControl db="jobs" id={job.id} value={String(job.status ?? 'Unscheduled')} options={JOB_STATUSES} />
            {job.url ? <a href={String(job.url)} target="_blank" rel="noreferrer" className="btn">Open in Notion ↗</a> : null}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="The call">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Reported problem">{String(job.problem ?? '—')}</Field>
              <Field label="Diagnosis">{String(job.diagnosis ?? '—')}</Field>
              <Field label="Work performed">{String(job.workPerformed ?? '—')}</Field>
              <Field label="Circuits affected">{String(job.circuitsAffected ?? '—')}</Field>
            </div>
            {job.recommendations ? (
              <div className="mt-4 rounded-lg border border-volt-500/30 bg-volt-500/10 p-3">
                <div className="label text-volt-200">Recommended follow-up work</div>
                <p className="mt-1 text-sm">{String(job.recommendations)}</p>
                <Link href="/records/estimates/new" className="mt-2 inline-block text-xs text-volt-200 underline-offset-2 hover:underline">
                  Turn this into an estimate →
                </Link>
              </div>
            ) : null}
          </Card>

          <Card
            title={`Photos — ${photos.length}`}
            action={<Link href={`/photos?job=${job.id}`} className="text-xs text-[color:var(--muted)] hover:text-volt-300">Open in library →</Link>}
          >
            <div className="space-y-4">
              {byStage.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">
                  No photos on this job yet. Before / after documentation is what wins the dispute and sells the next job.
                </p>
              ) : (
                byStage.map(([stage, list]) => (
                  <div key={stage}>
                    <div className="label mb-1.5">{stage} · {list.length}</div>
                    <PhotoStrip photos={list} />
                  </div>
                ))
              )}
              <PhotoUploader jobId={job.id} customerId={customerId} propertyId={propertyId} />
            </div>
          </Card>

          <Card title={`Time on the job — ${number(hours)} h`}>
            {timeEntries.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No time logged.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--line)]">
                    <th className="th">Technician</th>
                    <th className="th">Kind</th>
                    <th className="th">Start</th>
                    <th className="th text-right">Hours</th>
                    <th className="th text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {timeEntries.map((entry) => {
                    const techId = relationIds(entry.technician)[0] ?? '';
                    const entryCost = num(entry.hours) * (rate.get(techId) ?? 0) * (entry.overtime ? 1.5 : 1);
                    return (
                      <tr key={entry.id}>
                        <td className="td"><RelationLinks refs={entry.technician} max={1} /></td>
                        <td className="td">
                          <Chips values={[String(entry.kind ?? 'Labor'), ...(entry.overtime ? ['OT'] : [])]} />
                        </td>
                        <td className="td text-[color:var(--muted)]">{dateTime(entry.startedAt)}</td>
                        <td className="td text-right tabular-nums">{number(entry.hours)}</td>
                        <td className="td text-right tabular-nums text-[color:var(--muted)]">{money(entryCost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={`Materials used — ${money(materialCost)}`}>
            {usage.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Nothing consumed yet.</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--line)]">
                    <th className="th">Item</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Unit cost</th>
                    <th className="th text-right">Extended</th>
                    <th className="th">Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--line)]">
                  {usage.map((row) => (
                    <tr key={row.id}>
                      <td className="td">{materialName.get(relationIds(row.material)[0] ?? '') || String(row.label)}</td>
                      <td className="td text-right tabular-nums">{number(row.quantity)}</td>
                      <td className="td text-right tabular-nums">{money(row.unitCost)}</td>
                      <td className="td text-right tabular-nums">{money(row.extendedCost)}</td>
                      <td className="td text-[color:var(--muted)]">{date(row.usedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Job economics">
            <dl className="space-y-2 text-sm">
              <Row label="Revenue" value={money(revenue)} />
              <Row label="Labor cost" value={money(laborCost)} muted />
              <Row label="Material cost" value={money(materialCost)} muted />
              <Row label="Total cost" value={money(cost)} muted />
              <div className="my-2 border-t border-[color:var(--line)]" />
              <Row label="Gross profit" value={money(revenue - cost)} />
              <Row label="Gross margin" value={percent(margin)} tone={margin < 0.35 ? 'bad' : 'good'} />
              <Row label="Hours (actual / est.)" value={`${number(hours)} / ${number(job.estimatedHours)}`} muted />
            </dl>
          </Card>

          <Card title="Where and who">
            <div className="space-y-3">
              <Field label="Customer"><RelationLinks refs={job.customer} href={(cid) => `/customers/${cid}`} /></Field>
              <Field label="Service location">{property ? String(property.name) : '—'}</Field>
              {property ? (
                <>
                  <Field label="Service">{[property.serviceSize, property.serviceVoltage].filter(Boolean).join(' · ') || '—'}</Field>
                  <Field label="Panel">{String(property.panelMake ?? '—')}</Field>
                  <Field label="Access"><span className="text-[color:var(--muted)]">{String(property.accessNotes ?? '—')}</span></Field>
                  <Field label="Known hazards"><Chips values={property.hazards} max={6} /></Field>
                </>
              ) : null}
              <Field label="Site contact"><RelationLinks refs={job.contact} /></Field>
              <Field label="Crew"><RelationLinks refs={job.assignedTo} max={4} /></Field>
              <Field label="Scheduled">
                {job.scheduledStart ? `${date(job.scheduledStart)} · ${time(job.scheduledStart)}–${time(job.scheduledEnd)}` : 'Not scheduled'}
                {job.arrivalWindow ? <span className="ml-1 text-[color:var(--muted)]">({String(job.arrivalWindow)})</span> : null}
              </Field>
              <Field label="Tags"><Chips values={job.tags} max={6} /></Field>
            </div>
          </Card>

          <Card title="Permits & inspections">
            {permits.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">{job.permitRequired ? 'Permit required — none pulled yet.' : 'No permit required.'}</p>
            ) : (
              <ul className="space-y-2">
                {permits.map((permit) => (
                  <li key={permit.id} className="panel-2 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{String(permit.permitNumber ?? permit.title)}</span>
                      <StatusPill value={permit.status} />
                    </div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">
                      {String(permit.ahj ?? '')} · {String(permit.inspectionType ?? '')} {permit.inspectionDate ? `· ${dateTime(permit.inspectionDate)}` : ''}
                    </div>
                    {permit.corrections ? <p className="mt-1 text-xs text-rose-300">{String(permit.corrections)}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Safety">
            {safety.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No JHA or LOTO record on this job.</p>
            ) : (
              <ul className="space-y-2">
                {safety.map((record) => (
                  <li key={record.id} className="panel-2 p-2.5">
                    <div className="text-sm font-medium">{String(record.title)}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{String(record.kind)} · {date(record.date)}</div>
                    <div className="mt-1.5"><Chips values={record.ppe} max={4} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Money documents">
            <div className="space-y-2">
              {[...estimates, ...invoices].length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">No estimate or invoice attached.</p>
              ) : (
                [...estimates, ...invoices].map((doc) => (
                  <div key={doc.id} className="panel-2 flex items-center justify-between gap-2 p-2.5">
                    <span className="text-sm">{String(doc.estimateNumber ?? doc.invoiceNumber ?? doc.title)}</span>
                    <span className="flex items-center gap-2">
                      <StatusPill value={doc.status} />
                      <span className="tabular-nums text-sm">{money(doc.total, true)}</span>
                    </span>
                  </div>
                ))
              )}
              {docs.length > 0 && (
                <div className="pt-2">
                  <div className="label mb-1">Documents</div>
                  <ul className="space-y-1 text-sm">
                    {docs.map((doc) => (
                      <li key={doc.id} className="text-[color:var(--muted)]">{String(doc.title)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {interactions.length > 0 && (
            <Card title="Customer conversations">
              <ul className="space-y-2">
                {interactions.map((item) => (
                  <li key={item.id} className="panel-2 p-2.5">
                    <div className="text-sm">{String(item.summary)}</div>
                    <div className="mt-1 text-xs text-[color:var(--muted)]">{String(item.channel)} · {dateTime(item.occurredAt)}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, muted, tone }: { label: string; value: string; muted?: boolean; tone?: 'good' | 'bad' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? 'text-[color:var(--muted)]' : ''}>{label}</dt>
      <dd className={`tabular-nums ${tone === 'bad' ? 'text-rose-300' : tone === 'good' ? 'text-emerald-300' : ''}`}>{value}</dd>
    </div>
  );
}

function groupPhotos(photos: RecordValue[]): [string, RecordValue[]][] {
  const order = ['Before', 'During', 'After', 'Damage / Existing Condition', 'Code Violation', 'Thermal Scan', 'Equipment Label', 'Meter / Serial', 'Permit', 'Completion'];
  const groups = new Map<string, RecordValue[]>();
  for (const photo of photos) {
    const stage = String(photo.stage ?? 'Other');
    groups.set(stage, [...(groups.get(stage) ?? []), photo]);
  }
  return [...groups.entries()].sort((a, b) => {
    const ia = order.indexOf(a[0]);
    const ib = order.indexOf(b[0]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}
