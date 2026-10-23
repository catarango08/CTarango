import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { relationIds } from '@/lib/calc';
import { coTotal, parseCO, type COLine } from '@/lib/domain/change-order';
import { checkCopy } from '@/lib/domain/rules';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { lines?: COLine[]; note?: string };
  const lines = (body.lines ?? []).filter((l) => l.name?.trim() && Number(l.price) > 0).map((l) => ({ name: l.name.trim(), price: Number(l.price), qty: Math.max(1, Number(l.qty) || 1) }));
  if (!lines.length) return NextResponse.json({ error: 'Add at least one line with a price' }, { status: 400 });
  const issues = checkCopy(lines.map((l) => l.name).join(' ') + ' ' + (body.note ?? '')).map((v) => v.phrase);
  if (issues.length) return NextResponse.json({ error: `Change the wording: ${issues.join(', ')}` }, { status: 400 });
  const store = getStore();
  const job = await store.get('jobs', id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  const existing = (await store.list('quotes')).filter((q) => relationIds(q.job).includes(id) && parseCO(q.data));
  const n = existing.length + 1;
  const co = { changeOrder: true as const, n, lines, note: body.note ?? '' };
  const total = coTotal(co);
  const quote = await store.create('quotes', {
    name: `${String(job.jobNumber ?? job.name ?? 'Job')} — Change order ${n}`, job: [{ id }], version: 0, status: 'Sent', total, deposit: 0, data: JSON.stringify(co),
  });
  return NextResponse.json({ changeOrder: quote, total });
}
