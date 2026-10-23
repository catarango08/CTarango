import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll, relatedTo } from '@/lib/data';
import { Card, MoneyStat, PageHeader, Stat, StatusPill } from '@/components/ui';
import { PhotoStrip } from '@/components/photo-strip';
import { ContactButtons } from '@/components/contact-buttons';
import { InlineEditor } from '@/components/inline-editor';
import { CUSTOMER_MAIN, CUSTOMER_MORE, editFields } from '@/lib/edit-fields';
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
  const mailHref = customer.email ? `mailto:${String(customer.email)}` : null;

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

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title={`Jobs — ${jobs.length}`}>
            {sortedJobs.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-muted)]">No jobs yet.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--line)]">
                {sortedJobs.map((job) => (
                  <li key={job.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link href={`/jobs/${job.id}/onsite`} className="flex min-h-11 items-center font-medium hover:text-[color:var(--accent-ink)]">
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

        <div className="order-first space-y-4 lg:order-none">
          <Card title="Customer card — tap a field to edit">
            <div className="mb-3"><ContactButtons phone={String(customer.phone ?? '')} address={String(customer.address ?? '')} /></div>
            {mailHref && <a href={mailHref} className="btn mb-3 w-full justify-center">✉️ Email</a>}
            <InlineEditor db="customers" id={customer.id} fields={editFields('customers', CUSTOMER_MAIN)} values={customer} more={editFields('customers', CUSTOMER_MORE)} />
          </Card>
        </div>
      </div>
    </>
  );
}
