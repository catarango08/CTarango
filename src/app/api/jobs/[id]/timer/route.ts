import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * Arrived / Started / Done stamps. The client sends the time it was tapped
 * (it may arrive late through the offline queue). Done writes the install
 * hours to the job and adds a Self-performed Hour Ledger row.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string; at?: string };
  const at = body.at && !Number.isNaN(Date.parse(body.at)) ? body.at : new Date().toISOString();
  const store = getStore();
  try {
    const job = await store.get('jobs', id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (body.action === 'arrive') {
      const advance = ['Lead', 'New call', 'Qualify', 'Booked', 'Scheduled'].includes(String(job.status));
      const updated = await store.update('jobs', id, { arrived: job.arrived ? String(job.arrived) : at, ...(advance ? { status: 'On site' } : {}) });
      return NextResponse.json({ job: updated });
    }
    if (body.action === 'start') {
      const updated = await store.update('jobs', id, {
        startedAt: job.startedAt ? String(job.startedAt) : at,
        ...(job.arrived ? {} : { arrived: at }),
        ...(['Approved', 'Scheduled', 'On site', 'Booked'].includes(String(job.status)) ? { status: 'In Progress' } : {}),
      });
      return NextResponse.json({ job: updated });
    }
    if (body.action === 'done') {
      const start = String(job.startedAt ?? job.arrived ?? '');
      const hours = start ? Math.max(0.25, Math.round(((Date.parse(at) - Date.parse(start)) / 3600000) * 4) / 4) : 0;
      const prior = Number(job.installHours ?? 0) || 0;
      const updated = await store.update('jobs', id, { doneAt: at, departed: at, installHours: prior + hours });
      if (hours > 0) {
        await store.create('hourLedger', {
          name: `${String(job.jobNumber ?? job.name ?? 'Job')} — ${at.slice(0, 10)}`,
          job: [{ id }],
          source: 'Self-performed',
          installHours: hours,
          date: at.slice(0, 10),
        });
      }
      return NextResponse.json({ job: updated, hours });
    }
    return NextResponse.json({ error: 'action must be arrive, start or done' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Timer write failed' }, { status: 502 });
  }
}
