"""Copy Corey's territory-map static data into the app as JSON (no customer data).
Run: python3 scripts/territory-data.py /workspace/territory-map  (output committed in src/data/territory)."""
import csv, json, sys, os
src = sys.argv[1] if len(sys.argv) > 1 else '/workspace/territory-map'
out = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'territory')
os.makedirs(out, exist_ok=True)
def rnd(c):
    return [rnd(x) for x in c] if isinstance(c[0], list) else [round(c[0], 5), round(c[1], 5)]
def geo(name, keep):
    d = json.load(open(os.path.join(src, 'data', name)))
    feats = [{'p': {k: f['properties'].get(k) for k in keep}, 'g': {'type': f['geometry']['type'], 'coordinates': rnd(f['geometry']['coordinates'])}} for f in d['features'] if f.get('geometry')]
    return feats
json.dump(geo('places.geojson', ['name', 'county', 'role', 'ahj']), open(f'{out}/places.json', 'w'), separators=(',', ':'))
json.dump(geo('counties.geojson', ['name', 'base', 'service', 'ahj']), open(f'{out}/counties.json', 'w'), separators=(',', ':'))
json.dump(geo('utility-territories.geojson', ['name', 'new_service', 'outage', 'verified', 'out_of_area', 'geom_note']), open(f'{out}/utilities.json', 'w'), separators=(',', ':'))
towns = [{'town': r['town'], 'county': r['county'], 'lat': float(r['lat']), 'lon': float(r['lon']), 'miles': float(r['drive_miles_from_elkland'] or 0), 'minutes': float(r['drive_minutes_from_elkland'] or 0), 'zone': r['trip_zone'], 'served': r['served'] == 'yes'} for r in csv.DictReader(open(os.path.join(src, 'towns.csv'))) if r['lat']]
json.dump(towns, open(f'{out}/towns.json', 'w'), separators=(',', ':'))
json.dump(json.load(open(os.path.join(src, 'data', 'trip-zones-meta.json'))), open(f'{out}/zones.json', 'w'))
print('ok', len(towns))
