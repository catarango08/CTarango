'use client';

import { useEffect, useState } from 'react';
import { locateByTown, type Located } from '@/lib/territory';

const tel = (s: string) => (s.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/) ?? [])[0];

function Call({ text }: { text: string }) {
  const n = tel(text);
  return n ? <a className="btn min-h-12" href={`tel:${n.replace(/\D/g, '')}`}>📞 {n}</a> : <span className="text-sm text-[color:var(--ink-muted)]">No number on file</span>;
}

/** Internal location cards: OUT OF AREA block, zone/trip, AHJ, utility. Never shown to customers. */
export function LocationCards({ town, address }: { town: string; address: string }) {
  const [loc, setLoc] = useState<Located | null>(null);
  const [note, setNote] = useState('');
  useEffect(() => {
    const fallback = () => { const l = locateByTown(town); setLoc(l); setNote(l ? 'Offline: using the town center and town zone table.' : ''); };
    if (!navigator.onLine) { fallback(); return; }
    fetch(`/api/territory?address=${encodeURIComponent(address)}&town=${encodeURIComponent(town)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((l: Located) => { setLoc(l); setNote(l.pointSource === 'town center' ? 'Address not matched: using the town center.' : ''); })
      .catch(fallback);
  }, [town, address]);
  if (!loc) return null;
  return (
    <section className="space-y-3" id="location">
      {loc.outOfArea && <div className="rounded-lg border-4 border-red-600 bg-red-50 p-4 text-lg font-bold text-red-800">OUT OF AREA — {loc.outReason}</div>}
      <div className="panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Trip zone</h2>
        <p className="mt-1 text-lg font-semibold">{loc.zone}{loc.fee != null ? ` · $${loc.fee} trip` : ''}</p>
        <p className="text-sm text-[color:var(--ink-muted)]">{loc.miles != null ? `${loc.miles} mi${loc.minutes ? ` · ${loc.minutes} min` : ''} from Elkland (${loc.milesSource})` : 'Drive miles unknown'}</p>
        {loc.nearLine && <p className="mt-1 rounded bg-amber-100 p-2 text-sm font-semibold text-amber-900">Near a zone line (within 2 mi of 16 or 32). Double-check the trip charge.</p>}
        {note && <p className="mt-1 text-xs text-[color:var(--ink-muted)]">{note}</p>}
      </div>
      {loc.ahj && (
        <div className="panel p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">Permits · {loc.ahj.jurisdiction}</h2>
          <p className="mt-1 text-sm">{loc.insideCity && !loc.ahj.jurisdiction.includes('County') ? `Inside ${loc.insideCity} city limits` : 'Outside city limits'}{loc.county ? ` · ${loc.county}` : ''}</p>
          {loc.ahj.confirm && <p className="mt-2 rounded bg-yellow-300 p-2 text-center font-bold text-black">CALL TO CONFIRM</p>}
          <p className="mt-2 text-base"><b>Permit:</b> {/^yes/i.test(loc.ahj.permit_required) ? 'Yes' : /^no/i.test(loc.ahj.permit_required) ? 'No' : 'Unverified'} <span className="text-sm text-[color:var(--ink-muted)]">({loc.ahj.permit_required})</span></p>
          <p className="text-sm"><b>Code:</b> {loc.ahj.code_edition || 'Unknown'}</p>
          {loc.ahj.notes && <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{loc.ahj.notes}</p>}
          <div className="mt-2"><Call text={loc.ahj.phone} /></div>
          <p className="mt-1 text-xs text-[color:var(--ink-muted)]">{loc.ahj.verified === 'Y' && !loc.ahj.confirm ? 'Verified' : 'Not verified'} · checked {loc.ahj.date_checked}</p>
        </div>
      )}
      <div className="panel p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Power company</h2>
        {loc.utilities.length === 0 ? <p className="mt-1 text-sm">No territory match. Ask for a bill.</p> : loc.utilities.map((u) => (
          <div key={u.name} className="mt-2">
            <p className="font-semibold">{u.name}{loc.utilities.length > 1 ? ' (overlap)' : ''}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-sm"><span className="self-center">New service:</span><Call text={u.newService} /><span className="self-center">Outage:</span><Call text={u.outage} /></div>
          </div>
        ))}
        <p className="mt-2 rounded bg-amber-100 p-2 text-sm font-semibold text-amber-900">Map is approximate — confirm from the customer’s bill.</p>
      </div>
    </section>
  );
}
