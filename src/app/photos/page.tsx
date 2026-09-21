import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { PHOTO_STAGES, REQUIRED_PHOTO_STAGES } from '@/lib/schema';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { PhotoTile } from '@/components/photo-strip';
import { PhotoUploader } from '@/components/photo-uploader';
import { dateTime } from '@/lib/format';
import { relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; stage?: string }>;
}) {
  const { job, stage } = await searchParams;

  const [all, jobs] = await Promise.all([
    loadHydrated('jobPhotos', {
      where: stage ? [{ key: 'stage', op: 'equals', value: stage }] : [],
      sorts: [{ key: 'takenAt', direction: 'descending' }],
    }),
    loadAll('jobs'),
  ]);

  const photos = job ? all.filter((p) => relationIds(p.job).includes(job)) : all;
  const jobName = new Map(jobs.map((j) => [j.id, String(j.name ?? '')]));

  // Which open jobs are still short of the three stages closeout requires.
  const shortJobs = jobs
    .filter((j) => !['Closed', 'Declined', 'No-go', 'Lost'].includes(String(j.status)))
    .map((j) => {
      const stages = new Set(all.filter((p) => relationIds(p.job).includes(j.id)).map((p) => String(p.stage)));
      return { job: j, missing: REQUIRED_PHOTO_STAGES.filter((s) => !stages.has(s)) };
    })
    .filter((row) => row.missing.length > 0);

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ job, stage, ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/photos${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader
        title="Photos"
        subtitle={job ? `Filtered to ${jobName.get(job) ?? 'one job'}` : 'Cover off, cover on. Four minimum on every job.'}
        actions={job ? <Link href={`/jobs/${job}`} className="btn">Back to the ticket</Link> : null}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Photos" value={String(photos.length)} />
        <Stat label="Jobs documented" value={String(new Set(all.flatMap((p) => relationIds(p.job))).size)} />
        <Stat label="Customer OK" value={String(photos.filter((p) => p.customerOk).length)} />
        <Stat label="Jobs short of photos" value={String(shortJobs.length)} tone={shortJobs.length ? 'warn' : 'good'} />
      </section>

      {shortJobs.length > 0 && !job && (
        <Card title="Still owed" className="mb-5">
          <ul className="divide-y divide-[color:var(--line)]">
            {shortJobs.map(({ job: j, missing }) => (
              <li key={j.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <Link href={`/photos?job=${j.id}`} className="text-sm font-medium hover:text-[color:var(--accent-ink)]">
                  {String(j.name)}
                </Link>
                <span className="text-xs text-[color:var(--hazard)]">needs {missing.join(', ')}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Add photos" className="mb-5">
        <PhotoUploader jobId={job} />
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="label mr-1">Stage</span>
        <Link href={href({ stage: undefined })} className={`chip min-h-8 ${!stage ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`}>All</Link>
        {PHOTO_STAGES.map((s) => (
          <Link key={s} href={href({ stage: s })} className={`chip min-h-8 ${stage === s ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`}>
            {s}
          </Link>
        ))}
        {job && <Link href="/photos" className="chip min-h-8 border-[color:var(--hazard)] text-[color:var(--hazard)]">Clear job filter</Link>}
      </div>

      {photos.length === 0 ? (
        <Empty title="No photos match" hint="Add one above, or clear the filter." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => {
            const jobId = relationIds(photo.job)[0];
            return (
              <div key={photo.id} className="space-y-1.5">
                <PhotoTile photo={photo} href={jobId ? `/jobs/${jobId}` : undefined} />
                <div className="px-0.5 text-xs text-[color:var(--ink-muted)]">
                  <div className="truncate">
                    {jobId ? (
                      <Link href={`/jobs/${jobId}`} className="hover:text-[color:var(--accent-ink)]">
                        {jobName.get(jobId) ?? 'Job'}
                      </Link>
                    ) : (
                      'Not linked to a job'
                    )}
                  </div>
                  {photo.location ? <div className="truncate">{String(photo.location)}</div> : null}
                  <div>{dateTime(photo.takenAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
