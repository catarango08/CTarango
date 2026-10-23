import type { RecordValue } from '../schema';
import { geocode, withState } from './geocode';
import { PLACES, placeFor, type LatLng } from './territory';

export interface Pin extends LatLng {
  id: string;
  kind: 'job' | 'customer' | 'referral';
  name: string;
  href: string;
  /** true when placed at the town centroid because the address did not geocode. */
  approx: boolean;
  address?: string;
  town?: string;
  status?: string;
  amount?: number;
  type?: string;
  date?: string;
  source?: string;
  completed?: boolean;
}

/** Stored coordinates win, if a future Lat/Lng property ever lands on the record. */
function stored(r: RecordValue): LatLng | null {
  const lat = Number(r.lat ?? r.latitude);
  const lng = Number(r.lng ?? r.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : null;
}

async function locate(r: RecordValue, town: string): Promise<{ at: LatLng; approx: boolean } | null> {
  const s = stored(r);
  if (s) return { at: s, approx: false };
  const address = String(r.address ?? '').trim();
  if (address && /\d/.test(address)) {
    const hit = await geocode(withState(address, town));
    if (hit) return { at: hit, approx: false };
  }
  // Address text often names the town even when Jobs.Town is a county.
  const fromAddress = Object.keys(PLACES).find((k) => !k.endsWith(' Co') && address.toLowerCase().includes(k.toLowerCase()));
  const p = (fromAddress && PLACES[fromAddress]) || placeFor(town);
  return p ? { at: p, approx: true } : null;
}

async function pool<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const n = i++;
      out[n] = await fn(items[n]);
    }
  }));
  return out;
}

export async function buildPins(jobs: RecordValue[], customers: RecordValue[], referrals: RecordValue[]): Promise<Pin[]> {
  const jobPins = await pool(jobs, 4, async (j): Promise<Pin | null> => {
    const town = String(j.town ?? '');
    const loc = await locate(j, town);
    if (!loc) return null;
    return {
      id: j.id, kind: 'job', name: String(j.name ?? 'Job'), href: `/jobs/${j.id}`, ...loc.at, approx: loc.approx,
      address: String(j.address ?? ''), town, status: String(j.status ?? ''), amount: Number(j.amount ?? 0) || 0,
      type: String(j.type ?? ''), date: String(j.onSite || j.callIn || ''), source: String(j.source ?? ''),
      completed: ['Invoiced', 'Closed'].includes(String(j.status)) || Boolean(j.paid),
    };
  });
  const custPins = await pool(customers, 4, async (c): Promise<Pin | null> => {
    const town = String(c.town ?? '');
    const loc = await locate(c, town);
    if (!loc) return null;
    return { id: c.id, kind: 'customer', name: String(c.name ?? 'Customer'), href: `/customers/${c.id}`, ...loc.at, approx: loc.approx,
      address: String(c.address ?? ''), town, status: String(c.stage ?? ''), type: String(c.kind ?? '') };
  });
  // Referrals carry no address, only notes. Place them on the town their notes name.
  const refPins = referrals.map((r): Pin | null => {
    const text = `${r.name ?? ''} ${r.notes ?? ''}`;
    const hit = Object.keys(PLACES).find((k) => !k.endsWith(' Co') && new RegExp(`\\b${k}\\b`, 'i').test(text));
    if (!hit) return null;
    return { id: r.id, kind: 'referral', name: String(r.name ?? 'Partner'), href: '/referrals', ...PLACES[hit], approx: true,
      town: hit, status: String(r.status ?? ''), type: String(r.kind ?? '') };
  });
  return [...jobPins, ...custPins, ...refPins].filter((p): p is Pin => p !== null);
}
