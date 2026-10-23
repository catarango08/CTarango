import { NextResponse } from 'next/server';
import { geocode, withState } from '@/lib/geo/geocode';
import { placeFor } from '@/lib/geo/territory';

export const dynamic = 'force-dynamic';

/** GET /api/geocode?q=address — Census geocoder, cached. Behind the passcode. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ error: 'Type an address' }, { status: 400 });
  const hit = await geocode(withState(q));
  if (hit) return NextResponse.json({ lat: hit.lat, lng: hit.lng, label: hit.matched, approx: false });
  const town = placeFor(q.replace(/,?\s*(MO|Missouri)\s*$/i, ''));
  if (town) return NextResponse.json({ ...town, label: q, approx: true });
  return NextResponse.json({ error: 'No match. Try street, town.' }, { status: 404 });
}
