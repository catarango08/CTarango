import { NextResponse } from 'next/server';
import { loadAll } from '@/lib/data';
import { gateTown } from '@/lib/domain/gates';

export const dynamic = 'force-dynamic';

/** The town gate as an endpoint, so the intake screen can check before quoting. */
export async function GET(request: Request) {
  const town = new URL(request.url).searchParams.get('town') ?? '';
  const territory = await loadAll('territory');
  return NextResponse.json(gateTown(town, territory));
}
