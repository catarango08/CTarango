import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { relationIds } from '@/lib/calc';
import { loadPricing } from '@/lib/pricing';
import { parseStored, priceOption } from '@/lib/domain/options';
import { statusSideEffects } from '@/lib/domain/pipeline';

export const dynamic = 'force-dynamic';

/**
 * Customer accepts an option on Corey's screen and signs. The total is
 * re-priced here from the Rate Book, never taken from the browser. The
 * signature PNG goes to the Quote and the Job as a file.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { optionId?: string; addOns?: string[]; signedBy?: string; signature?: string } | null;
  if (!body?.optionId) return NextResponse.json({ error: 'Pick an option' }, { status: 400 });
  if (!body.signedBy?.trim()) return NextResponse.json({ error: 'Print a name to sign' }, { status: 400 });
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.signature ?? '');
  if (!match) return NextResponse.json({ error: 'Signature is missing' }, { status: 400 });

  const store = getStore();
  const quote = await store.get('quotes', id);
  const stored = quote ? parseStored(quote.data) : null;
  if (!quote || !stored) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
  if (String(quote.status) === 'Accepted') return NextResponse.json({ error: 'This quote is already accepted' }, { status: 409 });
  const option = stored.doc.options.find((o) => o.id === body.optionId);
  if (!option) return NextResponse.json({ error: 'Unknown option' }, { status: 400 });
  const addOns = (body.addOns ?? []).filter((a) => stored.doc.addOns.some((x) => x.id === a));

  const priced = priceOption(stored.doc, option, await loadPricing(), addOns);
  const jobId = relationIds(quote.job)[0];

  try {
    const file = await store.upload({ name: `signature-${quote.name ?? id}.png`.replace(/[^\w.-]+/g, '-'), contentType: 'image/png', data: Buffer.from(match[1], 'base64') });
    const signedAt = new Date().toISOString();
    const updated = await store.update('quotes', id, {
      status: 'Accepted',
      acceptedOption: option.label,
      total: priced.total,
      deposit: priced.deposit,
      signature: [file],
      signedBy: body.signedBy.trim(),
      signedAt,
      data: JSON.stringify({ doc: stored.doc, accepted: { optionId: option.id, addOns } }),
    });
    if (jobId) {
      const job = await store.get('jobs', jobId);
      const patch: Record<string, unknown> = { status: 'Approved', amount: priced.total, deposit: priced.deposit, signed: true, signedBy: body.signedBy.trim(), signature: [file] };
      const fx = statusSideEffects(job, patch);
      await store.update('jobs', jobId, fx.ok ? { ...patch, ...fx.extra } : patch);
    }
    return NextResponse.json({ quote: updated, total: priced.total, deposit: priced.deposit });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the signature' }, { status: 502 });
  }
}
