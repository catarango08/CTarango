import { isChangeOrder } from '@/lib/domain/change-order';
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { relationIds } from '@/lib/calc';
import { loadPricing } from '@/lib/pricing';
import { parseDoc, priceOption } from '@/lib/domain/options';

export const dynamic = 'force-dynamic';

/**
 * Save a new quote revision. Versions count up per job (v1, v2…); older
 * unaccepted versions are marked Superseded, never deleted.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { jobId?: string; data?: string } | null;
  if (!body?.jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
  const doc = parseDoc(body.data);
  if (!doc) return NextResponse.json({ error: 'Quote data is not valid' }, { status: 400 });

  const store = getStore();
  const job = await store.get('jobs', body.jobId);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const existing = (await store.list('quotes')).filter((q) => relationIds(q.job).includes(body.jobId!) && !isChangeOrder(q));
  const version = existing.reduce((m, q) => Math.max(m, Number(q.version) || 0), 0) + 1;
  const pricing = await loadPricing();
  const rec = doc.options.find((o) => o.recommended) ?? doc.options[0];
  const priced = rec ? priceOption(doc, rec, pricing, doc.addOns.filter((a) => a.recommended).map((a) => a.id)) : null;

  try {
    for (const q of existing) {
      if (String(q.status) !== 'Accepted' && String(q.status) !== 'Superseded') await store.update('quotes', q.id, { status: 'Superseded' });
    }
    const quote = await store.create('quotes', {
      name: `${String(job.name ?? 'Job')} — v${version}`,
      job: [{ id: body.jobId }],
      version,
      status: 'Sent',
      total: priced?.total ?? 0,
      deposit: priced?.deposit ?? 0,
      data: JSON.stringify({ doc }),
    });
    return NextResponse.json({ quote });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the quote' }, { status: 502 });
  }
}
