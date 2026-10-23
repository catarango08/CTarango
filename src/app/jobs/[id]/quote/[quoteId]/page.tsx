import { notFound } from 'next/navigation';
import { findById, loadAll } from '@/lib/data';
import { loadPricing } from '@/lib/pricing';
import { relationIds } from '@/lib/calc';
import { parseStored } from '@/lib/domain/options';
import { firstName } from '@/lib/domain/pipeline';
import { BUSINESS } from '@/lib/domain/rules';
import { CustomerQuote } from './customer-quote';

export const dynamic = 'force-dynamic';

/** What the customer sees on Corey's phone. Town only — no street address. */
export default async function CustomerQuotePage({ params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { id, quoteId } = await params;
  const [job, quote] = await Promise.all([findById('jobs', id), findById('quotes', quoteId)]);
  if (!job || !quote || !relationIds(quote.job).includes(id)) notFound();
  const stored = parseStored(quote.data);
  if (!stored) notFound();
  const pricing = await loadPricing();
  const customers = await loadAll('customers');
  const cust = customers.find((c) => relationIds(job.customer).includes(c.id));

  return (
    <CustomerQuote
      quoteId={quoteId}
      jobId={id}
      version={Number(quote.version) || 1}
      status={String(quote.status ?? '')}
      first={firstName(cust?.name) || ''}
      town={String(job.town ?? '')}
      business={{ name: BUSINESS.name, phone: BUSINESS.phone, email: BUSINESS.email, tagline: BUSINESS.tagline }}
      doc={stored.doc}
      pricing={pricing}
      accepted={stored.accepted ?? null}
      signedBy={String(quote.signedBy ?? '')}
    />
  );
}
