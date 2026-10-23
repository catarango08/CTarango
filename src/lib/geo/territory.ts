import type { RecordValue } from '../schema';
import { num } from '../calc';

/**
 * Territory geometry for the /map page and the Goals dashboard's trips-by-zone
 * numbers. Everything is measured straight-line from the shop at Elkland. The
 * Rate Book quotes one-way road miles, so treat a point near a ring as a call.
 *
 * Internal only: addresses and coordinates never leave the passcode screens.
 */

export interface LatLng { lat: number; lng: number }

export const HOME: LatLng & { name: string } = { name: 'Elkland', lat: 37.4456, lng: -93.0274 };

/** Fallback when the Rate Book has no "Travel Zone N" rows (demo data). */
export const DEFAULT_ZONES = [
  { zone: 1, maxMiles: 16, fee: 70, note: 'Elkland, Fair Grove, Marshfield, Strafford, Pleasant Hope' },
  { zone: 2, maxMiles: 32, fee: 115, note: 'Buffalo, Bolivar, Niangua, Long Lane, Louisburg, Seymour, Rogersville' },
  { zone: 3, maxMiles: 50, fee: 155, note: 'Urbana, Walnut Grove, Ash Grove, Humansville, county edges' },
];

export type TripZone = (typeof DEFAULT_ZONES)[number];

/** Reads "Travel Zone 1/2/3" off the live Rate Book; falls back to the defaults. */
export function zonesFromRateBook(rates: RecordValue[]): TripZone[] {
  return DEFAULT_ZONES.map((z) => {
    const row = rates.find((r) => new RegExp(`^Travel Zone ${z.zone}\\b`, 'i').test(String(r.name ?? '')));
    if (!row) return z;
    const assumes = String(row.assumes ?? '');
    return { ...z, fee: num(row.price, z.fee), note: assumes || z.note };
  });
}

export function milesBetween(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function zoneFor(point: LatLng, zones: TripZone[] = DEFAULT_ZONES): { miles: number; zone: TripZone | null } {
  const miles = milesBetween(HOME, point);
  return { miles, zone: zones.find((z) => miles <= z.maxMiles) ?? null };
}

/** Town and county centroids, used when an address will not geocode. */
export const PLACES: Record<string, LatLng> = {
  Elkland: { lat: 37.4456, lng: -93.0274 },
  Bolivar: { lat: 37.6145, lng: -93.4105 },
  Buffalo: { lat: 37.6439, lng: -93.0924 },
  Marshfield: { lat: 37.3387, lng: -92.9071 },
  'Fair Grove': { lat: 37.3837, lng: -93.1513 },
  Springfield: { lat: 37.209, lng: -93.2923 },
  Strafford: { lat: 37.2684, lng: -93.1171 },
  'Pleasant Hope': { lat: 37.4614, lng: -93.2735 },
  'Long Lane': { lat: 37.5795, lng: -92.9035 },
  Niangua: { lat: 37.3881, lng: -92.8327 },
  Louisburg: { lat: 37.757, lng: -93.1366 },
  Seymour: { lat: 37.1467, lng: -92.7688 },
  Conway: { lat: 37.5017, lng: -92.8213 },
  Halfway: { lat: 37.4878, lng: -93.2477 },
  Brighton: { lat: 37.4786, lng: -93.361 },
  Morrisville: { lat: 37.4787, lng: -93.4291 },
  Phillipsburg: { lat: 37.5559, lng: -92.7818 },
  Fordland: { lat: 37.1578, lng: -92.9399 },
  Rogersville: { lat: 37.117, lng: -93.0558 },
  Urbana: { lat: 37.8456, lng: -93.1655 },
  'Walnut Grove': { lat: 37.4114, lng: -93.5466 },
  'Ash Grove': { lat: 37.3153, lng: -93.5852 },
  Humansville: { lat: 37.7945, lng: -93.578 },
  'Dallas Co': { lat: 37.68, lng: -93.02 },
  'Polk Co': { lat: 37.62, lng: -93.4 },
  'Webster Co': { lat: 37.28, lng: -92.88 },
  'Greene Co': { lat: 37.26, lng: -93.34 },
  'Laclede Co': { lat: 37.66, lng: -92.59 },
  'Christian Co': { lat: 36.97, lng: -93.19 },
};

export function placeFor(town: unknown): LatLng | null {
  const t = String(town ?? '').trim();
  if (!t) return null;
  if (PLACES[t]) return PLACES[t];
  const hit = Object.keys(PLACES).find((k) => k.toLowerCase() === t.toLowerCase() || t.toLowerCase().startsWith(k.toLowerCase()));
  return hit ? PLACES[hit] : null;
}

/** Nearest named town to a point — used to pick the permit office. */
export function nearestTown(point: LatLng): { name: string; miles: number } {
  let best = { name: 'Elkland', miles: Infinity };
  for (const [name, p] of Object.entries(PLACES)) {
    if (name.endsWith(' Co')) continue;
    const m = milesBetween(point, p);
    if (m < best.miles) best = { name, miles: m };
  }
  return best;
}

/**
 * County a point sits in, by nearest county seat / centroid. Good enough to
 * pick a permit office; it is not a boundary test.
 */
export function countyFor(point: LatLng): string {
  const counties = ['Dallas Co', 'Polk Co', 'Webster Co', 'Greene Co', 'Laclede Co', 'Christian Co'];
  return counties.reduce((best, c) => (milesBetween(point, PLACES[c]) < milesBetween(point, PLACES[best]) ? c : best), counties[0]);
}

/** Permit offices on file, keyed the way Permits & Inspectors → Office is. */
export function permitOfficeKey(town: string, county: string): string[] {
  const cityOffices = ['Bolivar', 'Buffalo', 'Marshfield'];
  return cityOffices.includes(town) ? [town, county] : [county];
}
