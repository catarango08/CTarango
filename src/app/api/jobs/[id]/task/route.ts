import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

const KINDS: Record<string, { status?: string; assignee: string; label: string }> = {
  'needs-quote': { assignee: 'Estimator', label: 'Needs quote' },
  'schedule-return': { assignee: 'Office Manager', label: 'Schedule return visit' },
  'ready-to-invoice': { assignee: 'Office Manager', label: 'Ready to invoice', status: 'Invoiced' },
  'follow-up-48h': { assignee: 'Corey', label: 'Follow-up call (48 hr)' },
};

/** After Done: one tap creates a task row in the Activity Log with an assignee. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { kind?: string; notes?: string; due?: string };
  const k = KINDS[body.kind ?? ''];
  if (!k) return NextResponse.json({ error: 'Unknown task kind' }, { status: 400 });
  const store = getStore();
  try {
    const job = await store.get('jobs', id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    const task = await store.create('activityLog', {
      name: `${k.label} — ${String(job.jobNumber ?? '')} ${String(job.name ?? '')}`.trim(),
      date: (body.due ?? new Date().toISOString()).slice(0, 10),
      type: 'Task',
      assignee: k.assignee,
      taskDone: false,
      job: [{ id }],
      notes: body.notes ?? '',
    });
    const extra: Record<string, unknown> = { nextAction: k.label };
    if (body.kind === 'follow-up-48h') { extra.followUpFlag = true; extra.nextFollowUp = (body.due ?? '').slice(0, 10) || null; }
    await store.update('jobs', id, extra);
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Task write failed' }, { status: 502 });
  }
}
