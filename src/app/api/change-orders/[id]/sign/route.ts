import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { relationIds } from '@/lib/calc';
import { CO_DUE_ON_APPROVAL, coTotal, parseCO } from '@/lib/domain/change-order';

export const dynamic = 'force-dynamic';

/** Customer signs a change order. Over $300 it is due on approval and billed on its own invoice. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { signedBy?: string; signature?: string } | null;
  if (!body?.signedBy?.trim()) return NextResponse.json({ error: 'Print a name to sign' }, { status: 400 });
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body.signature ?? '');
  if (!match) return NextResponse.json({ error: 'Signature is missing' }, { status: 400 });
  const store = getStore();
  const q = await store.get('quotes', id);
  const co = q ? parseCO(q.data) : null;
  if (!q || !co) return NextResponse.json({ error: 'Change order not found' }, { status: 404 });
  if (String(q.status) === 'Accepted') return NextResponse.json({ error: 'Already signed' }, { status: 409 });
  try {
    const file = await store.upload({ name: `co-signature-${id}.png`.replace(/[^\w.-]+/g, '-'), contentType: 'image/png', data: Buffer.from(match[1], 'base64') });
    const updated = await store.update('quotes', id, { status: 'Accepted', total: coTotal(co), signature: [file], signedBy: body.signedBy.trim(), signedAt: new Date().toISOString() });
    const jobId = relationIds(q.job)[0];
    const total = coTotal(co);
    if (jobId && total > CO_DUE_ON_APPROVAL) {
      await store.create('activityLog', { name: `Invoice change order ${co.n} ($${total}) — due on approval`, date: new Date().toISOString().slice(0, 10), type: 'Task', assignee: 'Office Manager', taskDone: false, job: [{ id: jobId }] }).catch(() => null);
    }
    return NextResponse.json({ changeOrder: updated, total, dueOnApproval: total > CO_DUE_ON_APPROVAL });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save' }, { status: 502 });
  }
}
