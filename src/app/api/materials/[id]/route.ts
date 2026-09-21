import { NextResponse } from 'next/server';
import { returnMaterial } from '@/lib/domain/materials';

export const dynamic = 'force-dynamic';

/** Remove a material line, putting truck stock back on the van. */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await returnMaterial(id);
    return NextResponse.json({ removed: id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not remove the line' }, { status: 502 });
  }
}
