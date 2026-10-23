import { NextResponse } from 'next/server';
import { ELKLAND, locate, locateByTown } from '@/lib/territory';

export const dynamic = 'force-dynamic';

/** Internal only (passcode-protected app). Geocode → city limits by polygon → OSRM drive miles. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const address = url.searchParams.get('address') ?? '';
  const town = url.searchParams.get('town') ?? '';
  let pt: { lat: number; lon: number } | null = null;
  if (address) {
    try {
      const q = encodeURIComponent(`${address}${town && !address.toLowerCase().includes(town.toLowerCase()) ? `, ${town}` : ''}, MO`);
      const r = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${q}&benchmark=Public_AR_Current&format=json`, { signal: AbortSignal.timeout(6000) });
      const m = (await r.json())?.result?.addressMatches?.[0]?.coordinates;
      if (m) pt = { lat: m.y, lon: m.x };
    } catch { /* fall through */ }
  }
  if (!pt) {
    const t = locateByTown(town);
    return t ? NextResponse.json(t) : NextResponse.json({ error: 'Could not find that address or town' }, { status: 404 });
  }
  let miles: number | null = null; let minutes: number | null = null;
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${ELKLAND.lon},${ELKLAND.lat};${pt.lon},${pt.lat}?overview=false`, { signal: AbortSignal.timeout(6000) });
    const route = (await r.json())?.routes?.[0];
    if (route) { miles = Math.round((route.distance / 1609.344) * 10) / 10; minutes = Math.round(route.duration / 60); }
  } catch { /* offline zone below */ }
  if (miles == null) {
    const t = locateByTown(town);
    return NextResponse.json({ ...locate(pt.lat, pt.lon, 'address', t?.miles ?? null, t?.minutes ?? null, t ? 'town table' : null) });
  }
  return NextResponse.json(locate(pt.lat, pt.lon, 'address', miles, minutes, 'drive route'));
}
