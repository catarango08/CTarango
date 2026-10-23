import fs from 'node:fs';
import path from 'node:path';
import type { LatLng } from './territory';

/**
 * Server-side geocoding with the free US Census geocoder. No API key. Results
 * are cached on disk (and in memory) so each address is looked up once.
 */

const CACHE_FILE = process.env.GEOCODE_CACHE_FILE
  ?? (process.env.NODE_ENV === 'production' ? path.join('/tmp', 'tarango-geocode-cache.json') : path.join(process.cwd(), '.geocode-cache.json'));

type Entry = (LatLng & { matched: string }) | null;
let memory: Record<string, Entry> | null = null;

function load(): Record<string, Entry> {
  if (memory) return memory;
  try {
    memory = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as Record<string, Entry>;
  } catch {
    memory = {};
  }
  return memory;
}

function save(): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(memory ?? {}, null, 1));
  } catch {
    // Read-only filesystem: the in-memory cache still saves repeat lookups.
  }
}

function key(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Adds ", MO" when an address carries no state, since every job is in Missouri. */
export function withState(address: string, town?: string): string {
  let a = address.trim();
  if (town && !a.toLowerCase().includes(town.toLowerCase()) && !/ co$/i.test(town) && !/stop/i.test(town)) a += `, ${town}`;
  if (!/\b(MO|Missouri)\b/i.test(a)) a += ', MO';
  return a;
}

export async function geocode(address: string): Promise<Entry> {
  const k = key(address);
  if (!k) return null;
  const cache = load();
  if (k in cache) return cache[k];

  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('format', 'json');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) return null; // transient: do not cache
    const body = (await res.json()) as { result?: { addressMatches?: { coordinates: { x: number; y: number }; matchedAddress: string }[] } };
    const hit = body.result?.addressMatches?.[0];
    cache[k] = hit ? { lat: hit.coordinates.y, lng: hit.coordinates.x, matched: hit.matchedAddress } : null;
    save();
    return cache[k];
  } catch {
    return null;
  }
}
