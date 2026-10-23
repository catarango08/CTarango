import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, relatedTo } from '@/lib/data';
import { loadPricing } from '@/lib/pricing';
import { ASSEMBLIES } from '@/config/assemblies';
import { assemblyPrice, coTotal, parseCO } from '@/lib/domain/change-order';
import { BUSINESS } from '@/lib/domain/rules';
import { ChangeOrderForm } from './form';

export const dynamic = 'force-dynamic';

/** Change order: tap lines in, customer signs. Town only, no street address. */
export default async function ChangeOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();
  const pricing = await loadPricing();
  const tier = /commercial/i.test(String(job.kind ?? job.type ?? '')) ? 'commercial' : 'residential';
  const rate = pricing[tier].hourly.day;
  const presets = ASSEMBLIES.map((a) => ({ name: a.name, price: assemblyPrice(a.hours, a.material, rate) }));
  const past = (await relatedTo('quotes', 'job', id)).map((q) => ({ q, co: parseCO(q.data) })).filter((x) => x.co);
  return (
    <div className="mx-auto max-w-md">
      <Link href={`/jobs/${id}/onsite`} className="mb-3 inline-flex min-h-12 items-center underline">← Back to job</Link>
      <ChangeOrderForm jobId={id} presets={presets} business={{ name: BUSINESS.name, phone: BUSINESS.phone }} town={String(job.town ?? '')} />
      {past.length > 0 && (
        <section className="panel mt-6 p-4 text-sm">
          <h2 className="mb-2 font-semibold uppercase tracking-wider">Change orders on this job</h2>
          <ul className="space-y-1">{past.map(({ q, co }) => <li key={q.id}>#{co!.n} · ${coTotal(co!).toLocaleString()} · {String(q.status) === 'Accepted' ? `signed by ${String(q.signedBy ?? '')}` : 'not signed'}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
