import { NextResponse } from 'next/server';
import { receiveStock } from '@/lib/domain/materials';

export const dynamic = 'force-dynamic';

/** Restock the van after a supply run. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: { quantity?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity === 0) {
    return NextResponse.json({ error: 'Quantity must be a number' }, { status: 422 });
  }

  try {
    const item = await receiveStock(id, quantity);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not restock' }, { status: 502 });
  }
}
