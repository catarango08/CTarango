import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { firstName, todayCentral } from '@/lib/domain/pipeline';

export const dynamic = 'force-dynamic';

/** Corey sent (or copied) the review text himself. Tick Review asked and log it. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { method?: string };
  const store = getStore();
  const job = await store.get('jobs', id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  try {
    const activity = await store.create('activityLog', {
      name: `Review request: ${String(job.name ?? 'job')}`,
      date: todayCentral(),
      type: 'Review Request',
      count: 1,
      contact: firstName(job.name),
      outcome: body.method === 'copy' ? 'Text copied' : 'Text opened on phone',
      notes: '',
      job: [{ id }],
    });
    const updated = await store.update('jobs', id, { reviewAsked: true });
    return NextResponse.json({ activity, job: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not log the review request' }, { status: 502 });
  }
}
