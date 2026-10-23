import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findById, loadAll } from '@/lib/data';
import { loadPricing } from '@/lib/pricing';
import { relationIds } from '@/lib/calc';
import { emptyDoc, parseStored } from '@/lib/domain/options';
import { QuoteBuilder, type RateOpt } from './builder';
import { diagnosticFor } from '@/lib/domain/playbook';

export const dynamic = 'force-dynamic';

export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findById('jobs', id);
  if (!job) notFound();
  const [allQuotes, rates, pricing] = await Promise.all([loadAll('quotes'), loadAll('rateBook'), loadPricing()]);
  const quotes = allQuotes.filter((q) => relationIds(q.job).includes(id)).sort((a, b) => Number(b.version) - Number(a.version));
  const latest = quotes[0] ? parseStored(quotes[0].data) : null;
  const commercial = /commercial|standby|farm/i.test(String(job.type ?? ''));
  const base = emptyDoc(commercial ? 'commercial' : 'residential');
  const doc = latest?.doc ?? { ...base, options: [{ ...base.options[0], label: 'Good', recommended: true, items: [] }] };
  const custId = relationIds(job.customer)[0];
  const cust = custId ? await findById('customers', custId) : null;
  const diag = diagnosticFor(job.type, pricing);

  // Only Rate Book flats are pickable; dispatch/labor rows are applied by the engine.
  const flats: RateOpt[] = rates
    .filter((r) => r.active !== false && Number(r.price) > 0 && !/labor|dispatch/i.test(String(r.book ?? '')))
    .map((r) => ({ id: r.id, name: String(r.name), price: Number(r.price), book: String(r.book ?? ''), assumes: String(r.assumes ?? '') }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h1 className="min-w-0 break-words text-lg font-semibold">Quote · {String(job.name ?? '')}</h1>
        <Link className="btn shrink-0" href={`/jobs/${id}/onsite`}>← Job</Link>
      </div>
      <QuoteBuilder jobId={id} initial={doc} pricing={pricing} rates={flats} customer={String(cust?.name ?? '')} diagnostic={diag.fee} foundDefault={String(job.diagnosis ?? job.siteConditions ?? '')} latestQuoteId={quotes[0]?.id} />
      <section className="panel mt-6 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Versions</h2>
        {quotes.length === 0 ? <p className="text-sm text-[color:var(--ink-muted)]">No versions saved yet.</p> : (
          <ul className="space-y-1 text-sm">
            {quotes.map((q) => (
              <li key={q.id} className="flex flex-wrap gap-x-3">
                <span className="font-semibold">v{String(q.version)}</span>
                <span>{String(q.status)}</span>
                <span className="tabular-nums">${Number(q.total || 0).toLocaleString()}</span>
                <span className="text-[color:var(--ink-muted)]">{fmt(q.createdTime)}</span>
                <Link className="underline" href={`/jobs/${id}/quote/${q.id}`}>Customer view</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function fmt(v: unknown) {
  const d = new Date(String(v ?? ''));
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' }) + ' CT';
}
