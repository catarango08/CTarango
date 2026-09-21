import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { Card, Field, MoneyStat, PageHeader, Stat, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { date, money, number } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

/** Everything about one customer on one screen — built for the phone ringing. */
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await findById('customers', id);
  if (!customer) notFound();

  const [jobs, allPhotos] = await Promise.all([
    relatedTo('jobs', 'customer', id),
    loadAll('jobPhotos'),
  ]);

  const sortedJobs = [...jobs].sort((a, b) => Date.parse(String(b.onSite ?? b.callIn ?? 0)) - Date.parse(String(a.onSite ?? a.callIn ?? 0)));

  const jobIds = new Set(jobs.map((j) => j.id));
  const photos = allPhotos.filter((p) => relationIds(p.job).some((jid) => jobIds.has(jid)));

  const lifetime = jobs.reduce((sum, j) => sum + num(j.amount), 0);
  const unpaid = jobs
    .filter((j) => String(j.status) === 'Invoiced' && !j.paid)
    .reduce((sum, j) => sum + num(j.amount), 0);
  const installHours = jobs.reduce((sum, j) => sum + num(j.installHours), 0);

  const blocked = String(customer.stage) === 'Do not serve';
  const phoneHref = customer.phone ? `tel:${String(customer.phone).replace(/[^\d+]/g, '')}` : null;
  const mailHref = customer.email ? `mailto:${String(customer.email)}` : null;
  const mapsHref = customer.address ? `https://maps.google.com/?q=${encodeURIComponent(String(customer.address))}` : null;

  return (
    <>
      <PageHeader
        title={String(customer.name)}
        subtitle={[customer.kind, customer.town].filter(Boolean).join(' · ')}
        actions={
          <>
            {blocked && (
              <span className="rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] px-2.5 py-1 text-xs font-semibold text-[color:var(--hazard)]">
                Do not serve
              </span>
            )}
            <StatusPill value={customer.stage} tone={blocked ? 'hazard' : undefined} />
          </>
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jobs" value={String(jobs.length)} />
        <MoneyStat label="Lifetime amount" amount={lifetime} />
        <MoneyStat label="Unpaid" amount={unpaid} tone={unpaid > 0 ? 'bad' : 'good'} />
        <Stat label="Install hours worked" value={number(installHours)} hint="On this property" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={`Jobs — ${jobs.length}`}>
            {sortedJobs.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-muted)]">No jobs yet.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--line)]">
                {sortedJobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/jobs/${job.id}`} className="font-medium hover:text-[color:var(--accent-ink)]">
                        {String(job.name)}
                      </Link>
                      <div className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
                        {String(job.jobNumber ?? '')} {job.onSite ? `· ${date(job.onSite)}` : ''}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill value={job.status} />
                      <span className="tabular-nums text-sm">{money(job.amount, true)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Photos — ${photos.length}`}>
            <PhotoStrip photos={photos} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Contact">
            <div className="space-y-3">
              <Field label="Phone">
                {phoneHref ? (
                  <a href={phoneHref} className="text-[color:var(--accent-ink)] underline-offset-2 hover:underline">
                    {String(customer.phone)}
                  </a>
                ) : '—'}
              </Field>
              <Field label="Email">
                {mailHref ? (
                  <a href={mailHref} className="text-[color:var(--accent-ink)] underline-offset-2 hover:underline">
                    {String(customer.email)}
                  </a>
                ) : '—'}
              </Field>
              <Field label="Address">
                {mapsHref ? (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className="text-[color:var(--accent-ink)] underline-offset-2 hover:underline">
                    {String(customer.address)}
                  </a>
                ) : '—'}
              </Field>
              <Field label="Town">{String(customer.town ?? '—')}</Field>
              <Field label="How they found us">{String(customer.foundUs ?? '—')}</Field>
            </div>
          </Card>

          <Card title="Notes">
            {customer.notes ? (
              <p className="whitespace-pre-wrap text-sm">{String(customer.notes)}</p>
            ) : (
              <p className="text-sm text-[color:var(--ink-muted)]">Nothing on file. Gate codes, dog warnings — write it here.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
