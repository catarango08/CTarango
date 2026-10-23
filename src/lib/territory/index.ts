import places from '@/data/territory/places.json';
import counties from '@/data/territory/counties.json';
import utilities from '@/data/territory/utilities.json';
import towns from '@/data/territory/towns.json';
import zones from '@/data/territory/zones.json';

/** Territory intelligence from /workspace/territory-map (static, no customer data). */
type Geom = { type: string; coordinates: unknown };
type Feat = { p: Record<string, unknown>; g: Geom };
export interface Ahj { jurisdiction: string; type: string; permit_required: string; office: string; phone: string; website: string; code_edition: string; notes: string; verified: string; date_checked: string }
export interface Town { town: string; county: string; lat: number; lon: number; miles: number; minutes: number; zone: string; served: boolean }

export const ELKLAND = { lat: 37.4431, lon: -93.031 };
export const ZONES = zones as { factor: number; zones: { zone: string; road: number; fee: number }[] };
/** Jurisdictions the team asked to always show as CALL TO CONFIRM, whatever the source says. */
const FORCE_UNVERIFIED = ['Fair Grove', 'Polk County', 'Dallas County'];

function inRing(x: number, y: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInGeom(lon: number, lat: number, g: Geom): boolean {
  const polys = (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []) as number[][][][];
  return polys.some((poly) => inRing(lon, lat, poly[0]) && !poly.slice(1).some((h) => inRing(lon, lat, h)));
}
const hit = (list: unknown, lon: number, lat: number) => (list as Feat[]).filter((f) => pointInGeom(lon, lat, f.g));

export function zoneForMiles(miles: number) {
  const z = ZONES.zones.find((x) => miles <= x.road);
  const nearLine = ZONES.zones.slice(0, 2).some((x) => Math.abs(miles - x.road) <= 2);
  return { zone: z?.zone ?? 'OUT OF AREA', fee: z?.fee ?? null, nearLine };
}

export function townRow(name: string): Town | undefined {
  const n = name.trim().toLowerCase();
  return (towns as Town[]).find((t) => t.town.toLowerCase() === n);
}

export interface Located {
  lat: number; lon: number; pointSource: 'address' | 'town center';
  outOfArea: boolean; outReason?: string;
  insideCity: string | null; county: string | null;
  ahj: (Ahj & { confirm: boolean }) | null;
  utilities: { name: string; newService: string; outage: string; verified: string }[];
  miles: number | null; minutes: number | null; milesSource: 'drive route' | 'town table' | null;
  zone: string; fee: number | null; nearLine: boolean;
}

/** Everything but the drive miles (those come from OSRM online, or the town table offline). */
export function locate(lat: number, lon: number, pointSource: Located['pointSource'], miles: number | null, minutes: number | null, milesSource: Located['milesSource']): Located {
  const place = hit(places, lon, lat)[0];
  const county = hit(counties, lon, lat)[0];
  const utils = hit(utilities, lon, lat).filter((u) => !u.p.out_of_area);
  const role = String(place?.p.role ?? '');
  let outOfArea = false; let outReason: string | undefined;
  if (role === 'out') { outOfArea = true; outReason = `Inside ${String(place!.p.name)} city limits — OUT OF AREA, no work.`; }
  else if (county && county.p.service === false) { outOfArea = true; outReason = `${String(county.p.name)} is outside the service area.`; }
  const raw = ((place?.p.ahj as Ahj | null) ?? (county?.p.ahj as Ahj | undefined)) || null;
  const ahj = raw ? { ...raw, confirm: raw.verified !== 'Y' || FORCE_UNVERIFIED.some((f) => raw.jurisdiction.startsWith(f)) } : null;
  const z = miles == null ? { zone: 'Unknown', fee: null, nearLine: false } : zoneForMiles(miles);
  if (!outOfArea && z.zone === 'OUT OF AREA') { outOfArea = true; outReason = `${miles} drive miles from Elkland — past Zone 3.`; }
  return {
    lat, lon, pointSource, outOfArea, outReason,
    insideCity: place && role !== 'neighbor' ? String(place.p.name) : place ? String(place.p.name) : null,
    county: county ? String(county.p.name) : null, ahj,
    utilities: utils.map((u) => ({ name: String(u.p.name), newService: String(u.p.new_service ?? ''), outage: String(u.p.outage ?? ''), verified: String(u.p.verified ?? '') })),
    miles, minutes, milesSource, zone: z.zone, fee: z.fee, nearLine: z.nearLine,
  };
}

/** Offline fallback: town center from towns.csv, zone from the town table. */
export function locateByTown(town: string): Located | null {
  const t = townRow(town);
  if (!t) return null;
  const l = locate(t.lat, t.lon, 'town center', t.miles, t.minutes, 'town table');
  if (!t.served) { l.outOfArea = true; l.outReason = l.outReason ?? `${t.town} is marked never served.`; }
  return l;
}
