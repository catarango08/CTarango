import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { relationIds } from '@/lib/calc';
import { addDays, todayCentral } from '@/lib/domain/pipeline';

export const dynamic = 'force-dynamic';

const NOT_TODAY_REASONS = ['Price', 'Spouse', 'Timing', 'Other quotes', 'Other'] as const;

/** "Not today." A reason is required; a 48-hour follow-up call is created for Corey. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string; note?: string };
  if (!body.reason || !(NOT_TODAY_REASONS as readonly string[]).includes(body.reason)) return NextResponse.json({ error: 'Pick a reason' }, { status: 400 });
  const store = getStore();
  try {
    const quote = await store.get('quotes', id);
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    const jobId = relationIds(quote.job)[0];
    const due = addDays(todayCentral(), 2);
    if (jobId) {
      const job = await store.get('jobs', jobId);
      await store.create('activityLog', {
        name: `Follow-up call (48 hr) — ${String(job?.jobNumber ?? '')} — not today: ${body.reason}`,
        date: due, type: 'Task', assignee: 'Corey', taskDone: false, job: [{ id: jobId }], notes: body.note ?? '',
      });
      const patch: Record<string, unknown> = { nextFollowUp: due, followUpFlag: true, nextAction: `Call back ${due} (${body.reason})` };
      if (!['Quoted'].includes(String(job?.status))) patch.status = 'Quoted';
      await store.update('jobs', jobId, patch).catch(() => store.update('jobs', jobId, { nextFollowUp: due, followUpFlag: true }));
    }
    return NextResponse.json({ ok: true, followUp: due });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save' }, { status: 502 });
  }
}
