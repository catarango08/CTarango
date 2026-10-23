'use client';

import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import type { Pin } from '@/lib/geo/pins';
import { countyFor, milesBetween, nearestTown, permitOfficeKey, zoneFor, type LatLng, type TripZone } from '@/lib/geo/territory';
import { money } from '@/lib/format';

interface PermitRow { id: string; name: string; office: string; contact: string; trigger: string }

const MILE = 1609.344;
const RADII = [5, 10, 15, 25, 50];
const OPEN_LEAD = new Set(['Lead', 'New call', 'Qualify']);
const SERVICE_COUNTIES = ['Dallas', 'Polk', 'Webster', 'Greene'];
const SERVICE_TOWNS = ['Bolivar', 'Buffalo', 'Marshfield', 'Fair Grove'];

// The four locked brand colours, plus the field green the app already uses.
const C = { charcoal: '#222426', paper: '#F5F1E8', gold: '#B8871F', oxide: '#8E382F', go: '#3F6B4A' };
const PIN_COLOR: Record<Pin['kind'], string> = { job: C.gold, customer: C.charcoal, referral: C.go };

export function MapClient(props: {
  home: LatLng & { name: string };
  zones: TripZone[];
  pins: Pin[];
  permits: PermitRow[];
  counties: GeoJSON.FeatureCollection;
  places: GeoJSON.FeatureCollection;
}) {
  const { home, zones, pins, permits } = props;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const LRef = useRef<typeof Leaflet | null>(null);
  const selRef = useRef<{ marker: Leaflet.Marker; circle: Leaflet.Circle } | null>(null);
  const [point, setPoint] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(10);
  const [query, setQuery] = useState('');
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [show, setShow] = useState({ job: true, customer: true, referral: true });
  const pinLayers = useRef<Record<Pin['kind'], Leaflet.LayerGroup | null>>({ job: null, customer: null, referral: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, { zoomControl: true }).setView([home.lat, home.lng], 9);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Service area: the four counties, then the towns on top.
      L.geoJSON(props.counties, {
        filter: (f) => SERVICE_COUNTIES.includes(String(f.properties?.BASENAME)),
        style: { color: C.go, weight: 1.5, fillColor: C.go, fillOpacity: 0.08, dashArray: '4 4' },
        onEachFeature: (f, layer) => layer.bindTooltip(`${f.properties?.BASENAME} County · service area`),
      }).addTo(map);
      L.geoJSON(props.places, {
        filter: (f) => SERVICE_TOWNS.includes(String(f.properties?.BASENAME)),
        style: { color: C.go, weight: 1, fillColor: C.go, fillOpacity: 0.25 },
        onEachFeature: (f, layer) => layer.bindTooltip(String(f.properties?.BASENAME)),
      }).addTo(map);
      L.circle([home.lat, home.lng], { radius: 1.2 * MILE, color: C.go, weight: 1, fillColor: C.go, fillOpacity: 0.25 })
        .bindTooltip('Elkland · the shop').addTo(map);
      // Springfield: NO-GO.
      L.geoJSON(props.places, {
        filter: (f) => String(f.properties?.BASENAME) === 'Springfield',
        style: { color: C.oxide, weight: 2, fillColor: C.oxide, fillOpacity: 0.35 },
        onEachFeature: (_f, layer) => layer.bindTooltip('Springfield · NO-GO. Do not quote.', { permanent: true, direction: 'center', className: 'te-nogo' }),
      }).addTo(map);

      // Trip zones, outermost first so the inner ones stay clickable on top.
      [...zones].reverse().forEach((z) => {
        L.circle([home.lat, home.lng], { radius: z.maxMiles * MILE, color: C.gold, weight: 2, fill: false, dashArray: z.zone === 3 ? '6 6' : undefined, interactive: false })
          .addTo(map);
        const labelAt = L.latLng(home.lat + (z.maxMiles - 1.5) / 69, home.lng);
        L.marker(labelAt, { interactive: false, icon: L.divIcon({ className: 'te-zone-label', html: `Zone ${z.zone} · $${z.fee}`, iconSize: [96, 18], iconAnchor: [48, 9] }) }).addTo(map);
      });
      L.circleMarker([home.lat, home.lng], { radius: 7, color: C.paper, weight: 2, fillColor: C.charcoal, fillOpacity: 1 }).bindTooltip('Elkland shop').addTo(map);

      (['job', 'customer', 'referral'] as const).forEach((kind) => {
        const group = L.layerGroup();
        pins.filter((p) => p.kind === kind).forEach((p) => {
          L.circleMarker([p.lat, p.lng], {
            radius: kind === 'job' ? 7 : 6,
            color: C.paper, weight: 1.5, fillColor: PIN_COLOR[kind], fillOpacity: p.approx ? 0.55 : 0.95,
          })
            .bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml([p.status, p.type, p.amount ? `$${p.amount.toLocaleString()}` : ''].filter(Boolean).join(' · '))}${p.address ? `<br>${escapeHtml(p.address)}` : ''}${p.approx ? '<br><em>Placed on the town, address did not geocode</em>' : ''}<br><a href="${p.href}">Open</a>`)
            .addTo(group);
        });
        group.addTo(map);
        pinLayers.current[kind] = group;
      });

      map.on('click', (e: Leaflet.LeafletMouseEvent) => setPoint({ lat: e.latlng.lat, lng: e.latlng.lng }));
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle pin layers.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (Object.keys(show) as Pin['kind'][]).forEach((k) => {
      const layer = pinLayers.current[k];
      if (!layer) return;
      if (show[k] && !map.hasLayer(layer)) layer.addTo(map);
      if (!show[k] && map.hasLayer(layer)) map.removeLayer(layer);
    });
  }, [show]);

  // Selection pin + radius ring.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!point) {
      selRef.current?.marker.remove();
      selRef.current?.circle.remove();
      selRef.current = null;
      return;
    }
    if (!selRef.current) {
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: L.divIcon({ className: 'te-drop', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
      }).addTo(map);
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        setPoint({ lat: ll.lat, lng: ll.lng });
      });
      const circle = L.circle([point.lat, point.lng], { radius: radius * MILE, color: C.charcoal, weight: 1.5, fillColor: C.gold, fillOpacity: 0.08, interactive: false }).addTo(map);
      selRef.current = { marker, circle };
    } else {
      selRef.current.marker.setLatLng([point.lat, point.lng]);
      selRef.current.circle.setLatLng([point.lat, point.lng]);
      selRef.current.circle.setRadius(radius * MILE);
    }
  }, [point, radius]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearchMsg('Looking it up…');
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const body = (await res.json()) as { lat?: number; lng?: number; label?: string; approx?: boolean; error?: string };
    if (!res.ok || body.lat === undefined || body.lng === undefined) {
      setSearchMsg(body.error ?? 'No match');
      return;
    }
    setSearchMsg(body.approx ? `Town only: ${body.label}` : body.label ?? null);
    const p = { lat: body.lat, lng: body.lng };
    setPoint(p);
    mapRef.current?.setView([p.lat, p.lng], 11);
  }

  const area = useMemo(() => {
    if (!point) return null;
    const { miles, zone } = zoneFor(point, zones);
    const near = pins.map((p) => ({ ...p, d: milesBetween(point, p) })).filter((p) => p.d <= radius).sort((a, b) => a.d - b.d);
    const jobs = near.filter((p) => p.kind === 'job');
    const town = nearestTown(point);
    const county = countyFor(point);
    const offices = permitOfficeKey(town.name, county);
    const springfield = milesBetween(point, { lat: 37.209, lng: -93.2923 }) < 7;
    return {
      miles, zone, town, county, springfield,
      jobs,
      customers: near.filter((p) => p.kind === 'customer'),
      partners: near.filter((p) => p.kind === 'referral'),
      open: jobs.filter((j) => OPEN_LEAD.has(j.status ?? '') || j.status === 'Quoted'),
      revenue: jobs.filter((j) => j.completed).reduce((s, j) => s + (j.amount ?? 0), 0),
      permits: permits.filter((p) => offices.includes(p.office)),
      offices,
    };
  }, [point, radius, pins, zones, permits]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-2">
        <form onSubmit={search} className="flex flex-wrap gap-2">
          <input className="input min-w-0 flex-1" placeholder="Search an address, e.g. 318 E Jackson St, Bolivar" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn btn-primary" type="submit">Find</button>
        </form>
        {searchMsg && <p className="text-xs text-[color:var(--ink-muted)]">{searchMsg}</p>}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {(['job', 'customer', 'referral'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5">
              <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} />
              <span className="inline-block h-3 w-3 rounded-full border border-[color:var(--line)]" style={{ background: PIN_COLOR[k] }} />
              {k === 'job' ? 'Jobs' : k === 'customer' ? 'Customers' : 'Referral partners'} ({pins.filter((p) => p.kind === k).length})
            </label>
          ))}
          <span className="text-[color:var(--ink-muted)]">Faded pin = placed on the town.</span>
        </div>
        <div ref={el} className="panel h-[70vh] min-h-[420px] w-full overflow-hidden" />
      </div>

      <aside className="panel max-h-[80vh] overflow-y-auto p-4">
        {!area ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold">Pick a spot</p>
            <p className="text-[color:var(--ink-muted)]">Click anywhere on the map, drag the pin, or search an address.</p>
            <ul className="space-y-1">
              {zones.map((z) => (
                <li key={z.zone}><span className="font-medium">Zone {z.zone}</span> · ${z.fee} · up to {z.maxMiles} mi<br /><span className="text-xs text-[color:var(--ink-muted)]">{z.note}</span></li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="label">Radius</span>
              <select className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADII.map((r) => <option key={r} value={r}>{r} miles</option>)}
              </select>
            </div>

            <div>
              {area.springfield ? (
                <p className="display text-2xl text-[color:var(--hazard)]">NO-GO · Springfield</p>
              ) : area.zone ? (
                <p className="display text-2xl">Zone {area.zone.zone} · {money(area.zone.fee)} trip</p>
              ) : (
                <p className="display text-2xl text-[color:var(--hazard)]">Outside the zones</p>
              )}
              <p className="text-xs text-[color:var(--ink-muted)]">
                {area.miles.toFixed(1)} mi straight-line from Elkland. Near {area.town.name}, {area.county}. Road miles run longer.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Tile label="Revenue in area" value={money(area.revenue)} />
              <Tile label="Jobs" value={String(area.jobs.length)} />
              <Tile label="Open leads + quotes" value={String(area.open.length)} />
              <Tile label="Customers" value={String(area.customers.length)} />
            </div>

            <Section title="Nearby jobs">
              {area.jobs.length === 0 ? <None /> : area.jobs.map((j) => (
                <li key={j.id} className="py-1.5">
                  <Link href={j.href} className="font-medium hover:underline">{j.name}</Link>
                  <div className="text-xs text-[color:var(--ink-muted)]">{[j.status, money(j.amount ?? 0), j.type, j.date?.slice(0, 10), `${j.d.toFixed(1)} mi`].filter(Boolean).join(' · ')}</div>
                </li>
              ))}
            </Section>

            <Section title="Open leads and quotes">
              {area.open.length === 0 ? <None /> : area.open.map((j) => (
                <li key={j.id} className="py-1.5"><Link href={j.href} className="hover:underline">{j.name}</Link> <span className="text-xs text-[color:var(--ink-muted)]">· {j.status} · {money(j.amount ?? 0)}</span></li>
              ))}
            </Section>

            <Section title="Customers">
              {area.customers.length === 0 ? <None /> : area.customers.map((c) => (
                <li key={c.id} className="py-1.5"><Link href={c.href} className="hover:underline">{c.name}</Link> <span className="text-xs text-[color:var(--ink-muted)]">· {c.status} · {c.d.toFixed(1)} mi</span></li>
              ))}
            </Section>

            <Section title="Referral partners">
              {area.partners.length === 0 ? <None /> : area.partners.map((r) => (
                <li key={r.id} className="py-1.5">{r.name} <span className="text-xs text-[color:var(--ink-muted)]">· {r.type} · {r.status}</span></li>
              ))}
            </Section>

            <Section title={`Permit office · ${area.offices.join(' / ')}`}>
              {area.permits.length === 0 ? <li className="py-1.5 text-xs text-[color:var(--ink-muted)]">None on file for {area.offices.join(' or ')}. Call the clerk before the first job.</li> : area.permits.map((p) => (
                <li key={p.id} className="py-1.5"><span className="font-medium">{p.name}</span><div className="text-xs text-[color:var(--ink-muted)]">{p.contact}{p.trigger ? ` · ${p.trigger}` : ''}</div></li>
              ))}
            </Section>

            <button type="button" className="btn w-full" onClick={() => setPoint(null)}>Clear the pin</button>
          </div>
        )}
      </aside>

      <style>{`
        .te-zone-label { color: ${C.charcoal}; font: 600 11px/18px system-ui, sans-serif; text-align: center; background: ${C.paper}cc; border: 1px solid ${C.gold}; border-radius: 3px; white-space: nowrap; }
        .te-drop span { display: block; width: 22px; height: 22px; border-radius: 50%; background: ${C.gold}; border: 3px solid ${C.charcoal}; box-shadow: 0 1px 4px #0006; }
        .leaflet-tooltip.te-nogo { background: ${C.oxide}; color: ${C.paper}; border: 0; font-weight: 700; }
        .leaflet-container { font: inherit; background: ${C.paper}; }
      `}</style>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-[color:var(--line)] p-2"><div className="label">{label}</div><div className="mt-0.5 font-semibold tabular-nums">{value}</div></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="label mb-1">{title}</div><ul className="divide-y divide-[color:var(--line)]">{children}</ul></div>;
}

function None() {
  return <li className="py-1.5 text-xs text-[color:var(--ink-muted)]">None in range.</li>;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
