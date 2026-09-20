import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Card, Chips, Empty, PageHeader, Stat } from '@/components/ui';
import { PhotoTile } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { dateTime } from '@/lib/format';
import { relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

const STAGES = ['Before', 'During', 'After', 'Damage / Existing Condition', 'Code Violation', 'Thermal Scan', 'Equipment Label', 'Meter / Serial', 'Permit', 'Completion'];

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; customer?: string; stage?: string; tag?: string; report?: string }>;
}) {
  const { job, customer, stage, tag, report } = await searchParams;

  let photos = await loadHydrated('jobPhotos', {
    where: stage ? [{ key: 'stage', op: 'equals', value: stage }] : [],
    sorts: [{ key: 'takenAt', direction: 'descending' }],
  });

  if (job) photos = photos.filter((p) => relationIds(p.job).includes(job));
  if (customer) photos = photos.filter((p) => relationIds(p.customer).includes(customer));
  if (tag) photos = photos.filter((p) => (p.tags as string[] | undefined)?.includes(tag));
  if (report === 'true') photos = photos.filter((p) => p.includeInReport === true);

  const [jobs, customers] = await Promise.all([loadAll('jobs'), loadAll('customers')]);
  const jobName = new Map(jobs.map((j) => [j.id, String(j.title ?? '')]));
  const customerName = new Map(customers.map((c) => [c.id, String(c.name ?? '')]));

  const contextJob = job ? jobName.get(job) : null;
  const contextCustomer = customer ? customerName.get(customer) : null;
  const inReport = photos.filter((p) => p.includeInReport).length;
  const allTags = [...new Set(photos.flatMap((p) => (p.tags as string[] | undefined) ?? []))].sort();

  const base = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { job, customer, stage, tag, report, ...extra };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const qs = params.toString();
    return `/photos${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader
        title="Job photo library"
        subtitle={
          contextJob || contextCustomer
            ? `Filtered to ${contextJob ?? contextCustomer}`
            : 'Every before, during and after shot, tied to the job, the customer and the location.'
        }
        actions={job ? <Link href={`/jobs/${job}`} className="btn">← Back to job</Link> : null}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Photos shown" value={String(photos.length)} />
        <Stat label="Marked for customer report" value={String(inReport)} />
        <Stat label="Jobs documented" value={String(new Set(photos.flatMap((p) => relationIds(p.job))).size)} />
        <Stat label="Distinct tags" value={String(allTags.length)} />
      </section>

      <Card className="mb-5" title="Attach photos from the field">
        <PhotoUploader jobId={job} customerId={customer} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Link href={base({ stage: undefined })} className={`chip ${!stage ? 'border-volt-500/60 text-volt-200' : ''}`}>All stages</Link>
        {STAGES.map((s) => (
          <Link key={s} href={base({ stage: s })} className={`chip ${stage === s ? 'border-volt-500/60 text-volt-200' : ''}`}>{s}</Link>
        ))}
        <span className="mx-1 text-[color:var(--muted)]">|</span>
        <Link href={base({ report: report === 'true' ? undefined : 'true' })} className={`chip ${report === 'true' ? 'border-volt-500/60 text-volt-200' : ''}`}>
          Customer report only
        </Link>
        {(job || customer || tag) && (
          <Link href="/photos" className="chip border-rose-500/40 text-rose-300">Clear filters</Link>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1.5">
          <span className="label">Tags</span>
          {allTags.map((value) => (
            <Link key={value} href={base({ tag: tag === value ? undefined : value })} className={`chip ${tag === value ? 'border-volt-500/60 text-volt-200' : ''}`}>
              {value}
            </Link>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <Empty title="No photos match" hint="Upload one above, or clear the filters." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => {
            const jobId = relationIds(photo.job)[0];
            return (
              <div key={photo.id} className="space-y-1.5">
                <PhotoTile photo={photo} href={jobId ? `/jobs/${jobId}` : undefined} />
                <div className="px-0.5 text-xs text-[color:var(--muted)]">
                  <div className="truncate">
                    {jobId ? (
                      <Link href={`/jobs/${jobId}`} className="hover:text-volt-300">{jobName.get(jobId) ?? 'Job'}</Link>
                    ) : (
                      'Unlinked'
                    )}
                  </div>
                  <div className="truncate">{String(photo.location ?? '')}</div>
                  <div>{dateTime(photo.takenAt)}</div>
                  <div className="mt-1"><Chips values={photo.tags} max={3} /></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
