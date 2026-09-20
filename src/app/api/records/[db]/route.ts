import { NextResponse } from 'next/server';
import { getStore, type Condition, type Query } from '@/lib/store';
import { tryGetDb, type DbKey } from '@/lib/schema';
import { validateRecord } from '@/lib/schema/validate';
import { hydrate } from '@/lib/data';
import { applyDerived } from '@/lib/domain';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/records/:db?search=&limit=&field=value
 * POST /api/records/:db
 */
export async function GET(request: Request, ctx: { params: Promise<{ db: string }> }) {
  const { db } = await ctx.params;
  const def = tryGetDb(db);
  if (!def) return NextResponse.json({ error: `Unknown database "${db}"` }, { status: 404 });

  const url = new URL(request.url);
  const where: Condition[] = [];
  for (const [key, value] of url.searchParams.entries()) {
    if (['search', 'limit', 'sort', 'direction', 'hydrate'].includes(key)) continue;
    if (!def.fields.some((f) => f.key === key)) continue;
    where.push({ key, op: 'equals', value });
  }

  const query: Query = {
    where,
    search: url.searchParams.get('search') ?? undefined,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined,
  };
  const sort = url.searchParams.get('sort');
  if (sort) {
    query.sorts = [{ key: sort, direction: url.searchParams.get('direction') === 'asc' ? 'ascending' : 'descending' }];
  }

  try {
    const rows = await getStore().list(db as DbKey, query);
    const results = url.searchParams.get('hydrate') === 'false' ? rows : await hydrate(db as DbKey, rows);
    return NextResponse.json({ database: db, count: results.length, results });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 502 });
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ db: string }> }) {
  const { db } = await ctx.params;
  const def = tryGetDb(db);
  if (!def) return NextResponse.json({ error: `Unknown database "${db}"` }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  const result = validateRecord(def, body);
  if (!result.ok) return NextResponse.json({ error: 'Validation failed', issues: result.errors }, { status: 422 });

  try {
    const values = await applyDerived(db as DbKey, result.values ?? {});
    const created = await getStore().create(db as DbKey, values);
    return NextResponse.json({ record: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 502 });
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error talking to the data store';
}
