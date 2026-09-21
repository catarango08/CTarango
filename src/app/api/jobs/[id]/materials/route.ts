import { NextResponse } from 'next/server';
import { useMaterial } from '@/lib/domain/materials';

export const dynamic = 'force-dynamic';

/** Add a material line to a job, pulling it off the van when it is truck stock. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: { itemId?: string; name?: string; quantity?: number; unitCost?: number; source?: string; billable?: boolean; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  if (!body.name?.trim()) return NextResponse.json({ error: 'A line needs a name' }, { status: 422 });
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be more than zero' }, { status: 422 });
  }

  try {
    const line = await useMaterial({
      jobId: id,
      itemId: body.itemId,
      name: body.name.trim(),
      quantity,
      unitCost: body.unitCost,
      source: body.source,
      billable: body.billable,
      notes: body.notes,
    });
    return NextResponse.json({ line }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not add the line' }, { status: 502 });
  }
}
