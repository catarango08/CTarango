import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { tryGetDb, type DbKey } from '@/lib/schema';
import { validateRecord } from '@/lib/schema/validate';
import { findById } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, ctx: { params: Promise<{ db: string; id: string }> }) {
  const { db, id } = await ctx.params;
  if (!tryGetDb(db)) return NextResponse.json({ error: `Unknown database "${db}"` }, { status: 404 });
  const record = await findById(db as DbKey, id);
  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(request: Request, ctx: { params: Promise<{ db: string; id: string }> }) {
  const { db, id } = await ctx.params;
  const def = tryGetDb(db);
  if (!def) return NextResponse.json({ error: `Unknown database "${db}"` }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const result = validateRecord(def, body, { partial: true });
  if (!result.ok) return NextResponse.json({ error: 'Validation failed', issues: result.errors }, { status: 422 });

  try {
    const record = await getStore().update(db as DbKey, id, result.values ?? {});
    return NextResponse.json({ record });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Update failed' }, { status: 502 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ db: string; id: string }> }) {
  const { db, id } = await ctx.params;
  if (!tryGetDb(db)) return NextResponse.json({ error: `Unknown database "${db}"` }, { status: 404 });
  try {
    await getStore().archive(db as DbKey, id);
    return NextResponse.json({ archived: id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Archive failed' }, { status: 502 });
  }
}
