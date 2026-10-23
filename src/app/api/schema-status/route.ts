import { NextResponse } from 'next/server';
import { schemaGaps } from '@/lib/store/notion-store';

export const dynamic = 'force-dynamic';

/** Which app fields were skipped because the Notion database doesn't have them yet. */
export function GET() {
  const gaps = Object.fromEntries([...schemaGaps].map(([k, v]) => [k, [...v]]));
  return NextResponse.json({ gaps, pending: Object.keys(gaps).length > 0 });
}
