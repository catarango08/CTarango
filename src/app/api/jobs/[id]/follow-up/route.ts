import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { firstName, nextOnTrack, todayCentral } from '@/lib/domain/pipeline';

export const dynamic = 'force-dynamic';

/**
 * "Done / log call" on the follow-up queue. Corey made the call himself; this
 * logs it to the Activity Log against the job and moves Next Follow-Up to the
 * next step on the +2/+5/+10 track. Nothing is sent to anyone.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { outcome?: string; notes?: string };
  const store = getStore();
  const job = await store.get('jobs', id);
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const today = todayCentral();
  const quotedOn = String(job.quotedOn ?? '').slice(0, 10) || today;
  const next = nextOnTrack(quotedOn, today);

  try {
    const activity = await store.create('activityLog', {
      name: `Follow-up call: ${String(job.name ?? 'job')}`,
      date: today,
      type: 'Call',
      count: 1,
      contact: firstName(job.name),
      outcome: body.outcome ?? 'Followed up on quote',
      notes: body.notes ?? '',
      job: [{ id }],
    });
    const updated = await store.update('jobs', id, { nextFollowUp: next });
    return NextResponse.json({ activity, job: updated, nextFollowUp: next });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not log the call' }, { status: 502 });
  }
}
