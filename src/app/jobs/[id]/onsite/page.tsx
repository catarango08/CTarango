import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { ARRIVAL_PHOTO_STAGES, REQUIRED_PHOTO_STAGES } from '@/lib/schema';
import { Card, PageHeader } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { gateTown } from '@/lib/domain/gates';
import { formatMinutes } from '@/lib/domain/forecast';
import { dateTime } from '@/lib/format';
import { relationIds } from '@/lib/calc';
import { ArriveButton } from './arrive-button';
import { SiteNotes } from './site-notes';

export const dynamic = 'force-dynamic';

const GROUP_PROMPTS: Record<(typeof ARRIVAL_PHOTO_STAGES)[number], string> = {
  'Before': 'The condition you are walking into. Yard, exterior, anything already broken.',
  'Service entry': 'Weatherhead, meter, mast, drop.',
  'Panel': 'The panel, the nameplate, the breaker layout.',
  'Other': 'Anything that does not fit above.',
};

export default async function OnsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();

  const [photos, territory] = await Promise.all([
    relatedTo('jobPhotos', 'job', id),
    loadAll('territory'),
  ]);

  const customerId = relationIds(job.customer)[0];
  const customer = customerId ? await findById('customers', customerId) : null;

  const verdict = gateTown(String(job.town ?? ''), territory);
  const stages = new Set(photos.map((p) => String(p.stage ?? '')));
  const missingRequired = REQUIRED_PHOTO_STAGES.filter((s) => !stages.has(s));

  const tel = String(job.phone ?? customer?.phone ?? '').replace(/[^\d+]/g, '');
  const telDisplay = String(job.phone ?? customer?.phone ?? '');
  const address = String(job.address ?? customer?.address ?? '');

  const arrivedAt = job.arrived ? new Date(String(job.arrived)) : null;
  const elapsedMin = arrivedAt ? Math.max(0, Math.round((Date.now() - arrivedAt.getTime()) / 60000)) : null;

  return (
    <>
      <PageHeader
        title={`Onsite — ${String(job.name)}`}
        subtitle={[job.jobNumber, job.type, job.window].filter(Boolean).join(' · ')}
        actions={<Link href={`/jobs/${job.id}`} className="btn">Ticket</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card title="Arrival">
            {arrivedAt ? (
              <div>
                <p className="text-base font-medium">On site since {dateTime(arrivedAt)}</p>
                <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
                  {elapsedMin !== null ? `About ${formatMinutes(elapsedMin)} so far.` : ''}
                </p>
              </div>
            ) : (
              <ArriveButton jobId={job.id} />
            )}
          </Card>

          <Card title="Photos on arrival">
            {missingRequired.length > 0 && (
              <p className="mb-3 text-sm text-[color:var(--ink-muted)]">
                Still needed before this job can close: {missingRequired.join(', ')}.
              </p>
            )}
            <div className="space-y-4">
              {ARRIVAL_PHOTO_STAGES.map((stage) => {
                const list = photos.filter((p) => String(p.stage ?? '') === stage);
                return (
                  <div key={stage} className="panel-2 p-3">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="label">{stage} · {list.length}</span>
                      <span className="text-xs text-[color:var(--ink-muted)]">{GROUP_PROMPTS[stage]}</span>
                    </div>
                    <div className="mb-3">
                      <PhotoStrip photos={list} />
                    </div>
                    <PhotoUploader jobId={job.id} stage={stage} compact />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Site conditions">
            <p className="mb-2 text-sm text-[color:var(--ink-muted)]">
              Access, hazards, what the panel actually is, where the dog is.
            </p>
            <SiteNotes jobId={job.id} initialValue={String(job.siteConditions ?? '')} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="What you need to know">
            <p className="text-base font-semibold">{customer?.name ? String(customer.name) : String(job.name)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tel && <a href={`tel:${tel}`} className="btn min-h-11">Call {telDisplay}</a>}
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

            {verdict.gate !== 'GO' && (
              <div className="mt-3 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-2.5">
                <p className="text-sm font-semibold text-[color:var(--hazard)]">{verdict.gate} — {verdict.town || 'town unknown'}</p>
                <p className="mt-0.5 text-sm">{verdict.instruction}</p>
              </div>
            )}

            <div className="mt-3">
              <div className="label mb-1">What they said on the phone</div>
              <p className="whitespace-pre-wrap text-sm">{String(job.notes ?? '—')}</p>
            </div>

            {customer?.notes ? (
              <div className="mt-3 border-t border-[color:var(--line)] pt-3">
                <div className="label mb-1">Customer notes</div>
                <p className="whitespace-pre-wrap rounded bg-[color:var(--surface-2)] p-2 text-sm">{String(customer.notes)}</p>
              </div>
            ) : null}
          </Card>

          <Link href={`/jobs/${job.id}`} className="btn-primary flex min-h-12 w-full items-center justify-center text-base">
            Diagnose and quote
          </Link>
        </div>
      </div>
    </>
  );
}
