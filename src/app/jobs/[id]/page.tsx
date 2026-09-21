import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { REQUIRED_PHOTO_STAGES, type RecordValue } from '@/lib/schema';
import { Card, PageHeader, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { PlayButton } from './play-button';
import { JobField, JobNotes } from './job-notes';
import { MaterialsPanel } from './materials-panel';
import { closeoutStatus, depositRequired, gateTown } from '@/lib/domain/gates';
import { diagnosticFor, nextMove } from '@/lib/domain/playbook';
import { LICENSE, MONEY } from '@/lib/domain/rules';
import { forecastAccuracy, formatMinutes, planJob } from '@/lib/domain/forecast';
import { materialTotals } from '@/lib/domain/materials';
import { date, dateTime, money, number, time } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function JobTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();

  const [photos, hourEntries, materials, territory, allJobs, stock] = await Promise.all([
    relatedTo('jobPhotos', 'job', id),
    relatedTo('hourLedger', 'job', id),
    relatedTo('jobMaterials', 'job', id),
    loadAll('territory'),
    loadAll('jobs'),
    loadAll('truckInventory'),
  ]);

  const customerId = relationIds(job.customer)[0];
  const customer = customerId ? await findById('customers', customerId) : null;

  const verdict = gateTown(String(job.town ?? ''), territory);
  const move = nextMove(job);
  const closeout = closeoutStatus(job, photos);
  const deposit = depositRequired(job.amount);
  const diagnostic = diagnosticFor(job.type);
  const plan = planJob(job, allJobs);
  const accuracy = forecastAccuracy(job);
  const totals = materialTotals(materials);

  const stages = new Set(photos.map((p) => String(p.stage ?? '')));
  const missingStages = REQUIRED_PHOTO_STAGES.filter((s) => !stages.has(s));

  const tel = String(job.phone ?? customer?.phone ?? '').replace(/[^\d+]/g, '');
  const address = String(job.address ?? customer?.address ?? '');
  const notionPlay = String(job.play ?? '');

  return (
    <>
      <PageHeader
        title={String(job.name)}
        subtitle={[job.jobNumber, job.type, job.window].filter(Boolean).join(' · ')}
        actions={
          <>
            <StatusPill value={job.status} />
            <Link href={`/jobs/${id}/onsite`} className="btn">On-site intake</Link>
            <Link href="/jobs" className="btn">Board</Link>
          </>
        }
      />

      {/* 1 — Who and where. First thing on the screen, because it is the first
          thing you need whether the phone is ringing or you are in the drive. */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            {customer ? (
              <Link href={`/customers/${customer.id}`} className="display text-xl hover:text-[color:var(--accent-ink)]">
                {String(customer.name)}
              </Link>
            ) : (
              <span className="display text-xl text-[color:var(--ink-muted)]">No customer on this ticket</span>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[color:var(--ink-muted)]">
              {customer?.kind ? <span className="chip">{String(customer.kind)}</span> : null}
              {customer?.stage ? <span className="chip">{String(customer.stage)}</span> : null}
              {customer?.jobCount ? <span>{String(customer.jobCount)} jobs with you</span> : <span>First job</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {tel && <a href={`tel:${tel}`} className="btn-primary min-h-11">Call {String(job.phone ?? customer?.phone)}</a>}
            {address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="btn min-h-11">
                Directions
              </a>
            )}
          </div>
        </div>

        <div className="mt-3 grid gap-3 border-t border-[color:var(--line)] pt-3 sm:grid-cols-2">
          <div>
            <div className="label">Address</div>
            <div className="mt-0.5 text-sm">{address || '—'}</div>
          </div>
          <div>
            <div className="label">Town</div>
            <div className="mt-0.5 flex items-center gap-2 text-sm">
              <span>{String(job.town ?? '—')}</span>
              <span
                className={`chip ${
                  verdict.gate === 'GO'
                    ? 'border-[color:var(--go)] text-[color:var(--go)]'
                    : verdict.gate === 'VERIFY'
                      ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]'
                      : 'border-[color:var(--hazard)] text-[color:var(--hazard)]'
                }`}
              >
                {verdict.gate}
              </span>
            </div>
          </div>
          {customer?.notes ? (
            <div className="sm:col-span-2">
              <div className="label">What you need to know before you knock</div>
              <p className="mt-1 rounded bg-[color:var(--surface-2)] p-2.5 text-sm">{String(customer.notes)}</p>
            </div>
          ) : null}
        </div>

        {verdict.gate !== 'GO' && (
          <p className="mt-3 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-2.5 text-sm">
            <strong className="text-[color:var(--hazard)]">{verdict.gate}.</strong> {verdict.instruction}
            {verdict.licenseNote ? ` ${verdict.licenseNote}` : ''}
          </p>
        )}
      </Card>

      {Boolean(job.hiddenDamage) && (
        <div className="mb-4 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3">
          <p className="display text-base text-[color:var(--hazard)]">Hidden damage on this job</p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-sm">
            <li>Stop. Do not cut, pull, or order material for the extra scope.</li>
            <li>Show them. Photo on their phone and yours.</li>
            <li>Write a change line: what you found, what you will do, the dollar amount.</li>
            <li>They sign, or you button the original scope back up and invoice only what was authorized.</li>
            <li>Not on site? Text the photo and the number. Do not resume until they reply yes.</li>
          </ol>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {/* 2 — The next move. */}
          <Card title="Next move">
            <p className="text-base">{move.instruction}</p>
            {notionPlay && notionPlay !== move.action && (
              <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Notion’s Play says: {notionPlay}</p>
            )}
            <div className="mt-3">
              <PlayButton jobId={job.id} action={move.action} advanceTo={move.advanceTo} terminal={move.terminal} />
            </div>
          </Card>

          {/* 3 — The call, in their words, then everything you learn after. */}
          <Card title="The call">
            <div className="space-y-4">
              <JobNotes
                jobId={job.id}
                field="notes"
                label="What they said on the phone"
                help="In their words. Do not tidy it up — the original complaint is what you check against at the end."
                placeholder="Well pump quit. No power at the pressure switch."
                initial={String(job.notes ?? '')}
                rows={4}
              />
              <JobNotes
                jobId={job.id}
                field="siteConditions"
                label="Site conditions"
                help="What you found on arrival: access, hazards, what the panel actually is."
                initial={String(job.siteConditions ?? '')}
                rows={5}
              />
              <JobNotes
                jobId={job.id}
                field="diagnosis"
                label="Diagnosis"
                help="What is actually wrong, and how you know."
                initial={String(job.diagnosis ?? '')}
                rows={6}
              />
              <JobNotes
                jobId={job.id}
                field="workPerformed"
                label="Work performed"
                help="This goes on the invoice and the customer copy."
                initial={String(job.workPerformed ?? '')}
                rows={6}
              />
              <JobNotes
                jobId={job.id}
                field="testResults"
                label="Test results"
                help="Readings, torque values, megger results. The record you would want if anyone ever asks."
                placeholder="Phase A 241V, phase B 240V. Torqued 275 in-lb. Megger 500V, >100 MΩ."
                initial={String(job.testResults ?? '')}
                rows={4}
              />
              <JobNotes
                jobId={job.id}
                field="recommendations"
                label="Recommendations"
                help="Future work you spotted. This is the best lead source you have."
                initial={String(job.recommendations ?? '')}
                rows={4}
              />
              <JobField jobId={job.id} field="nextAction" label="Next action" initial={String(job.nextAction ?? '')} />
            </div>
          </Card>

          {/* 4 — Materials. */}
          <Card title={`Materials — ${money(totals.cost)} cost, ${money(totals.billed)} billed`}>
            <MaterialsPanel
              jobId={job.id}
              markup={MONEY.materialsMarkup}
              lines={materials.map((m) => ({
                id: m.id,
                name: String(m.name ?? ''),
                quantity: num(m.quantity),
                unitCost: num(m.unitCost),
                extendedCost: num(m.extendedCost),
                source: String(m.source ?? 'Supply house'),
                billable: m.billable !== false,
                pulledFromTruck: Boolean(m.pulledFromTruck),
              }))}
              stock={stock.map((s) => ({
                id: s.id,
                name: String(s.name ?? ''),
                category: String(s.category ?? 'Other'),
                onTruck: num(s.onTruck),
                unit: String(s.unit ?? 'ea'),
                cost: num(s.cost),
                bin: String(s.bin ?? ''),
              }))}
            />
          </Card>

          {/* 5 — Photos. */}
          <Card
            title={`Photos — ${photos.length}`}
            action={<Link href={`/jobs/${id}/onsite`} className="text-xs text-[color:var(--ink-muted)] hover:text-[color:var(--accent-ink)]">On-site intake →</Link>}
          >
            {missingStages.length > 0 && (
              <p className="mb-3 text-sm text-[color:var(--hazard)]">Still needed for closeout: {missingStages.join(', ')}</p>
            )}
            <div className="space-y-4">
              {groupByStage(photos).map(([stage, list]) => (
                <div key={stage}>
                  <div className="label mb-1.5">{stage} · {list.length}</div>
                  <PhotoStrip photos={list} />
                </div>
              ))}
              <PhotoUploader jobId={job.id} stage={missingStages[0] ?? 'Completed work'} />
            </div>
          </Card>

          {/* 6 — Closeout. */}
          <Card title={`Closeout — ${closeout.done} of ${closeout.total}`}>
            {!closeout.canClose && (
              <p className="mb-3 text-sm text-[color:var(--hazard)]">
                This job cannot close yet. Nothing is Closed until closeout is checked.
              </p>
            )}
            <ul className="space-y-2">
              {closeout.items.map((item) => (
                <li key={item.key} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${
                      item.done
                        ? 'border-[color:var(--go)] bg-[color:var(--go-bg)] text-[color:var(--go)]'
                        : 'border-[color:var(--line-strong)] text-[color:var(--ink-muted)]'
                    }`}
                  >
                    {item.done ? '✓' : ''}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm ${item.done ? '' : 'font-medium'}`}>{item.label}</span>
                    {item.detail && <span className="block text-xs text-[color:var(--ink-muted)]">{item.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 border-t border-[color:var(--line)] pt-3 sm:grid-cols-2">
              <JobField jobId={job.id} field="signedBy" label="Signed by" initial={String(job.signedBy ?? '')} placeholder="Name on the ticket" />
              <JobField
                jobId={job.id}
                field="paymentMethod"
                label="Paid how"
                initial={String(job.paymentMethod ?? '')}
                options={['Cash', 'Check', 'Card', 'ACH', 'Net 15', 'Financing']}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Forecast — how long, and how far. */}
          <Card title="How long this should take">
            <dl className="space-y-2.5 text-sm">
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[color:var(--ink-muted)]">On site</dt>
                  <dd className="tabular-nums font-semibold">{formatMinutes(plan.onSite.minutes)}</dd>
                </div>
                <p className="text-xs text-[color:var(--ink-muted)]">{plan.onSite.basis}</p>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[color:var(--ink-muted)]">Drive, each way</dt>
                  <dd className="tabular-nums">{formatMinutes(plan.travelOneWay.minutes)}</dd>
                </div>
                <p className="text-xs text-[color:var(--ink-muted)]">{plan.travelOneWay.basis}</p>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-[color:var(--line)] pt-2">
                <dt>Door to door</dt>
                <dd className="tabular-nums font-semibold">{formatMinutes(plan.totalMinutes)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-[color:var(--ink-muted)]">Tell them</dt>
                <dd>{plan.arrivalWindow}</dd>
              </div>
              {plan.travelFee > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-[color:var(--ink-muted)]">Travel charge</dt>
                  <dd className="tabular-nums">{money(plan.travelFee)}</dd>
                </div>
              )}
            </dl>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--line)] pt-3">
              <JobField jobId={job.id} field="estHours" label="Est hours" type="number" initial={job.estHours ? String(job.estHours) : ''} />
              <JobField jobId={job.id} field="estTravelMin" label="Est travel min" type="number" initial={job.estTravelMin ? String(job.estTravelMin) : ''} />
            </div>

            {accuracy && (
              <p className={`mt-2 text-xs ${accuracy.deltaHours > 0 ? 'text-[color:var(--hazard)]' : 'text-[color:var(--go)]'}`}>
                Ran {accuracy.deltaHours > 0 ? 'long' : 'short'} by {number(Math.abs(accuracy.deltaHours))} h
                {' '}({Math.abs(Math.round(accuracy.pct * 100))}% off the estimate).
              </p>
            )}
          </Card>

          <Card title="Timeline">
            <dl className="space-y-1.5 text-sm">
              <Row label="Called in" value={date(job.callIn)} />
              <Row label="On site" value={job.onSite ? date(job.onSite) : 'not scheduled'} />
              <Row label="Arrived" value={job.arrived ? dateTime(job.arrived) : '—'} />
              <Row label="Departed" value={job.departed ? time(job.departed) : '—'} />
            </dl>
            {!job.arrived && (
              <Link href={`/jobs/${id}/onsite`} className="btn mt-3 min-h-11 w-full justify-center">I’m on site</Link>
            )}
          </Card>

          <Card title="Money">
            <dl className="space-y-2 text-sm">
              <Row label="Amount" value={verdict.blockQuote ? 'Not quoted' : money(job.amount)} />
              <Row label="Diagnostic" value={`$${diagnostic.fee}`} />
              <p className="text-xs text-[color:var(--ink-muted)]">{diagnostic.note}</p>
              <Row label="Material cost" value={money(totals.cost)} muted />
              <Row label="Material billed" value={money(totals.billed)} muted />
              {deposit.required && (
                <Row
                  label="Deposit (50%)"
                  value={money(deposit.amount)}
                  tone={job.depositIn ? 'go' : 'hazard'}
                  note={job.depositIn ? 'In' : 'Due before the work starts'}
                />
              )}
              <div className="flex gap-2 pt-1">
                <StatusPill value={job.signed ? 'Signed' : 'Not signed'} tone={job.signed ? 'done' : 'neutral'} />
                <StatusPill value={job.paid ? 'Paid' : 'Unpaid'} tone={job.paid ? 'done' : 'hazard'} />
              </div>
            </dl>
            <Link href="/rates" className="btn mt-3 w-full justify-center">Open the rate book</Link>
          </Card>

          <Card title="Hours">
            <dl className="space-y-2 text-sm">
              <Row label="Install" value={`${number(job.installHours)} h`} note="Counts toward the license" />
              <Row label="Drive" value={`${number(job.driveHours)} h`} note="Never counts" />
              <Row label="In the ledger" value={`${number(job.hoursLogged ?? 0)} h`} />
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[color:var(--line)] pt-3">
              <JobField jobId={job.id} field="installHours" label="Install hours" type="number" initial={job.installHours ? String(job.installHours) : ''} />
              <JobField jobId={job.id} field="driveHours" label="Drive hours" type="number" initial={job.driveHours ? String(job.driveHours) : ''} />
            </div>
            <p className="mt-2 text-xs text-[color:var(--ink-muted)]">{LICENSE.note}</p>
            {hourEntries.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-[color:var(--line)] pt-2 text-xs text-[color:var(--ink-muted)]">
                {hourEntries.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate">{date(e.date)}</span>
                    <span className="tabular-nums">{number(e.installHours)} h</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value, note, tone, muted }: { label: string; value: string; note?: string; tone?: 'go' | 'hazard'; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[color:var(--ink-muted)]">{label}</dt>
        <dd className={`tabular-nums ${tone === 'hazard' ? 'text-[color:var(--hazard)]' : tone === 'go' ? 'text-[color:var(--go)]' : muted ? 'text-[color:var(--ink-muted)]' : ''}`}>
          {value}
        </dd>
      </div>
      {note && <p className="text-xs text-[color:var(--ink-muted)]">{note}</p>}
    </div>
  );
}

function groupByStage(photos: RecordValue[]): [string, RecordValue[]][] {
  const order = ['Before', 'Service entry', 'Panel', 'Completed work', 'Torque / labeling', 'Hidden damage', 'Permit', 'Other'];
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
