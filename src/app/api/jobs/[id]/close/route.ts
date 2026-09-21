import { NextResponse } from 'next/server';
import { advanceStatus } from '@/lib/domain/writes';

export const dynamic = 'force-dynamic';

/**
 * Closing a job is the one status change that is gated.
 *
 * "Nothing is Closed until closeout is checked. Hours copy to the ledger."
 * A 422 here is not an error condition — it is the checklist telling the field
 * what is still missing, so the blocking list comes back in the body.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  try {
    const result = await advanceStatus(id, 'Closed');
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Closeout is not finished', blocking: result.blocking },
        { status: 422 },
      );
    }
    return NextResponse.json({ job: result.job });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not close the job' },
      { status: 502 },
    );
  }
}
