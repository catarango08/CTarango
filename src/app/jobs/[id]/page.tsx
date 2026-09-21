import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { REQUIRED_PHOTO_STAGES, type RecordValue } from '@/lib/schema';
import { Card, Field, PageHeader, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { PlayButton } from './play-button';
import { closeoutStatus, depositRequired, gateTown } from '@/lib/domain/gates';
import { diagnosticFor, nextMove } from '@/lib/domain/playbook';
import { LICENSE } from '@/lib/domain/rules';
import { date, money, number } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function JobTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();

  const [photos, hourEntries, territory] = await Promise.all([
    relatedTo('jobPhotos', 'job', id),
    relatedTo('hourLedger', 'job', id),
    loadAll('territory'),
  ]);

  const customerId = relationIds(job.customer)[0];
  const customer = customerId ? await findById('customers', customerId) : null;

  const verdict = gateTown(String(job.town ?? ''), territory);
  const move = nextMove(job);
  const closeout = closeoutStatus(job, photos);
  const deposit = depositRequired(job.amount);
  const diagnostic = diagnosticFor(job.type);
  const notionPlay = String(job.play ?? '');

  const stages = new Set(photos.map((p) => String(p.stage ?? '')));
  const missingStages = REQUIRED_PHOTO_STAGES.filter((s) => !stages.has(s));
  const photosByStage = groupByStage(photos);

  const tel = String(job.phone ?? customer?.phone ?? '').replace(/[^\d+]/g, '');
  const address = String(job.address ?? customer?.address ?? '');

  return (
    <>
      <PageHeader
        title={String(job.name)}
        subtitle={[job.jobNumber, job.type, job.window].filter(Boolean).join(' · ')}
        actions={
          <>
            <StatusPill value={job.status} />
            <Link href="/jobs" className="btn">Board</Link>
          </>
        }
      />

      {/* The town gate sits above everything — it decides whether there is a quote at all. */}
      <div
        className={`mb-4 rounded border p-3 ${
          verdict.gate === 'GO'
            ? 'border-[color:var(--go)] bg-[color:var(--go-bg)]'
            : verdict.gate === 'VERIFY'
              ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
              : 'border-[color:var(--hazard)] bg-[color:var(--hazard-bg)]'
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={`display text-xl ${
              verdict.gate === 'GO'
                ? 'text-[color:var(--go)]'
                : verdict.gate === 'VERIFY'
                  ? 'text-[color:var(--accent-ink)]'
                  : 'text-[color:var(--hazard)]'
            }`}
          >
            {verdict.gate}
          </span>
          <span className="text-sm font-medium">{String(job.town ?? 'No town on the ticket')}</span>
          <span className="text-sm text-[color:var(--ink-muted)]">{verdict.instruction}</span>
        </div>
        {verdict.licenseNote && <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{verdict.licenseNote}</p>}
      </div>

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
          <p className="mt-1.5 text-sm text-[color:var(--ink-muted)]">
            Next action should read change-order signed or change-order declined.
          </p>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Next move">
            <p className="text-base">{move.instruction}</p>
            {notionPlay && notionPlay !== move.action && (
              <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Notion’s Play says: {notionPlay}</p>
            )}
            <div className="mt-3">
              <PlayButton jobId={job.id} action={move.action} advanceTo={move.advanceTo} terminal={move.terminal} />
            </div>
          </Card>

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
          </Card>

          <Card title={`Photos — ${photos.length}`}>
            {missingStages.length > 0 && (
              <p className="mb-3 text-sm text-[color:var(--hazard)]">
                Still needed: {missingStages.join(', ')}
              </p>
            )}
            <div className="space-y-4">
              {photosByStage.map(([stage, list]) => (
                <div key={stage}>
                  <div className="label mb-1.5">{stage} · {list.length}</div>
                  <PhotoStrip photos={list} />
                </div>
              ))}
              <PhotoUploader jobId={job.id} stage={missingStages[0] ?? 'Completed work'} />
            </div>
          </Card>

          <Card title="The call">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What is dead">{String(job.notes ?? '—')}</Field>
              <Field label="Next action">{String(job.nextAction ?? '—')}</Field>
              <Field label="Window">{String(job.window ?? '—')}</Field>
              <Field label="Permit">{String(job.permit ?? 'None')}</Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tel && <a href={`tel:${tel}`} className="btn min-h-11">Call {String(job.phone ?? customer?.phone)}</a>}
              {address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn min-h-11"
                >
                  {address}
                </a>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Money">
            <dl className="space-y-2 text-sm">
              <Row label="Amount" value={verdict.blockQuote ? 'Not quoted' : money(job.amount)} />
              <Row label="Diagnostic" value={`$${diagnostic.fee}`} />
              <p className="text-xs text-[color:var(--ink-muted)]">{diagnostic.note}</p>
              {deposit.required && (
                <Row
                  label="Deposit (50%)"
                  value={money(deposit.amount)}
                  tone={job.depositIn ? 'go' : 'hazard'}
                  note={job.depositIn ? 'In' : 'Not collected — due before the work starts'}
                />
              )}
              <div className="flex gap-2 pt-1">
                <StatusPill value={job.signed ? 'Signed' : 'Not signed'} tone={job.signed ? 'done' : 'neutral'} />
                <StatusPill value={job.paid ? 'Paid' : 'Unpaid'} tone={job.paid ? 'done' : 'hazard'} />
              </div>
            </dl>
            {String(job.type) !== 'Commercial' && (
              <p className="mt-3 border-t border-[color:var(--line)] pt-2 text-xs text-[color:var(--ink-muted)]">
                Residential is quoted off the flat card. Never quote the hour on the porch.
              </p>
            )}
            <Link href="/rates" className="btn mt-3 w-full justify-center">Open the rate book</Link>
          </Card>

          <Card title="Hours">
            <dl className="space-y-2 text-sm">
              <Row label="Install" value={`${number(job.installHours)} h`} note="Counts toward the license" />
              <Row label="Drive" value={`${number(job.driveHours)} h`} note="Never counts" />
              <Row label="In the ledger" value={`${number(job.hoursLogged ?? 0)} h`} />
            </dl>
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

          {customer && (
            <Card title="Customer">
              <Link href={`/customers/${customer.id}`} className="text-sm font-semibold hover:text-[color:var(--accent-ink)]">
                {String(customer.name)}
              </Link>
              <div className="mt-1 text-sm text-[color:var(--ink-muted)]">
                {[customer.kind, customer.stage].filter(Boolean).join(' · ')}
              </div>
              {customer.notes ? (
                <p className="mt-2 rounded bg-[color:var(--surface-2)] p-2 text-sm">{String(customer.notes)}</p>
              ) : null}
              {customer.phone ? (
                <a href={`tel:${String(customer.phone).replace(/[^\d+]/g, '')}`} className="btn mt-3 min-h-11 w-full justify-center">
                  Call {String(customer.phone)}
                </a>
              ) : null}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'go' | 'hazard' }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[color:var(--ink-muted)]">{label}</dt>
        <dd className={`tabular-nums ${tone === 'hazard' ? 'text-[color:var(--hazard)]' : tone === 'go' ? 'text-[color:var(--go)]' : ''}`}>
          {value}
        </dd>
      </div>
      {note && <p className="text-xs text-[color:var(--ink-muted)]">{note}</p>}
    </div>
  );
}

function groupByStage(photos: RecordValue[]): [string, RecordValue[]][] {
  const order = ['Before', 'Panel / nameplate', 'Completed work', 'Torque / labeling', 'Hidden damage', 'Meter / service', 'Permit', 'Other'];
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
