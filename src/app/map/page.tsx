import { loadAll } from '@/lib/data';
import { PageHeader } from '@/components/ui';
import { buildPins } from '@/lib/geo/pins';
import { DEFAULT_ZONES, HOME, zonesFromRateBook } from '@/lib/geo/territory';
import counties from '@/lib/geo/counties.json';
import places from '@/lib/geo/places.json';
import { MapClient } from './map-client';

export const dynamic = 'force-dynamic';

/**
 * Territory map. Internal and passcode-protected: addresses and pins never
 * appear on anything a customer sees.
 */
export default async function MapPage() {
  const [jobs, customers, referrals, permits, rates] = await Promise.all([
    loadAll('jobs'), loadAll('customers'), loadAll('referrals'), loadAll('permits'), loadAll('rateBook'),
  ]);
  const pins = await buildPins(jobs, customers, referrals);
  const zones = zonesFromRateBook(rates);
  const fromRateBook = zones.some((z, i) => z.fee !== DEFAULT_ZONES[i].fee || z.note !== DEFAULT_ZONES[i].note);

  return (
    <>
      <PageHeader
        title="Territory map"
        subtitle={`Trip zones from Elkland, the service area, and every job and customer. Click the map or search an address for the area panel. Zone fees ${fromRateBook ? 'from the Rate Book' : 'from the default card (Rate Book rows not found)'}.`}
      />
      <MapClient
        home={HOME}
        zones={zones}
        pins={pins}
        permits={permits.map((p) => ({ id: p.id, name: String(p.name ?? ''), office: String(p.office ?? ''), contact: String(p.contact ?? ''), trigger: String(p.permitTrigger ?? '') }))}
        counties={counties as unknown as GeoJSON.FeatureCollection}
        places={places as unknown as GeoJSON.FeatureCollection}
      />
    </>
  );
}
