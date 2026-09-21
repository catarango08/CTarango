import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * "I'm on site." Stamps arrival and moves the ticket, so the clock on the job
 * starts from a real timestamp rather than whatever gets remembered later.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();

  try {
    const job = await store.get('jobs', id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const now = new Date().toISOString();
    const advance = ['Lead', 'New call', 'Qualify', 'Booked', 'Scheduled'].includes(String(job.status));

    const updated = await store.update('jobs', id, {
      arrived: job.arrived ? String(job.arrived) : now,
      ...(advance ? { status: 'On site' } : {}),
    });
    return NextResponse.json({ job: updated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not stamp arrival' }, { status: 502 });
  }
}
