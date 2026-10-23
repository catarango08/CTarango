'use client';

import { useMemo, useState } from 'react';
import { buildQuote, tripLabel, type QuoteLine } from '@/lib/domain/quote';
import { MONEY, checkCopy } from '@/lib/domain/rules';
import { ZONE_LABELS, type Pricing, type Tier, type TripKind, type ZoneNumber } from '@/lib/domain/pricing';
import { Wordmark, Tagline } from '@/components/brand';
import { money } from '@/lib/format';

interface Rate { id: string; name: string; book: string; price: number; assumes: string }

/**
 * Builds a quote off the published card. All the arithmetic lives in
 * buildQuote() and all the percentages in MONEY — nothing is hardcoded here,
 * so changing a rule changes the quote everywhere at once.
 */
export function QuoteBuilder({ rates, pricing }: { rates: Rate[]; pricing: Pricing }) {
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [pick, setPick] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [zone, setZone] = useState<ZoneNumber>(1);
  const [tier, setTier] = useState<Tier>('residential');
  const [trip, setTrip] = useState<TripKind>('none');
  const [extraHours, setExtraHours] = useState('');
  const [oldWork, setOldWork] = useState(false);
  const [credit, setCredit] = useState('');
  const [scope, setScope] = useState('');

  const quote = useMemo(
    () =>
      buildQuote({
        lines,
        pricing,
        tier,
        zone,
        trip,
        extraHours: Number(extraHours) || 0,
        oldWork,
        creditDiagnostic: Number(credit) || 0,
      }),
    [lines, pricing, tier, zone, trip, extraHours, oldWork, credit],
  );

  const copyProblems = checkCopy(scope);

  function addRate() {
    const rate = rates.find((r) => r.id === pick);
    if (!rate) return;
    setLines((prev) => [
      ...prev,
      {
        id: `${rate.id}-${prev.length}`,
        name: rate.name,
        price: rate.price,
        quantity: 1,
        kind: rate.book === 'Labor / dispatch' ? 'labor' : 'flat',
        assumes: rate.assumes,
      },
    ]);
    setPick('');
  }

  function addMaterial() {
    const cost = Number(materialCost);
    if (!cost) return;
    setLines((prev) => [
      ...prev,
      { id: `mat-${prev.length}`, name: 'Materials', price: cost, quantity: 1, kind: 'material' },
    ]);
    setMaterialCost('');
  }

  // Trips, hours and zones are set with the controls below, so only flats are picked here.
  const flats = rates.filter((r) => r.book === (tier === 'commercial' ? 'Commercial / critical' : 'Residential flat'));
  const tripKinds: TripKind[] = ['none', 'day', 'afterHours', 'emergency', 'holiday'];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <label className="block">
          <span className="label">Add from the card</span>
          <div className="mt-1 flex gap-2">
            <select className="input" value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">Pick a line…</option>
              {flats.map((r) => (
                <option key={r.id} value={r.id}>{r.name} — {money(r.price)}</option>
              ))}
            </select>
            <button type="button" className="btn min-h-11 shrink-0" onClick={addRate} disabled={!pick}>Add</button>
          </div>
        </label>

        <label className="block">
          <span className="label">Materials at your cost</span>
          <div className="mt-1 flex gap-2">
            <input
              className="input"
              type="number"
              inputMode="decimal"
              value={materialCost}
              onChange={(e) => setMaterialCost(e.target.value)}
              placeholder="0.00"
            />
            <button type="button" className="btn min-h-11 shrink-0" onClick={addMaterial}>Add</button>
          </div>
          <span className="mt-1 block text-xs text-[color:var(--ink-muted)]">
            The builder adds the {MONEY.materialsMarkup * 100}% itself.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Tier</span>
            <select className="input mt-1" value={tier} onChange={(e) => { setTier(e.target.value as Tier); setLines([]); }}>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Zone (from Elkland)</span>
            <select className="input mt-1" value={zone} onChange={(e) => setZone(Number(e.target.value) as ZoneNumber)}>
              {([1, 2, 3] as ZoneNumber[]).map((z) => (
                <option key={z} value={z}>Zone {z} — {money(pricing.zones[z])} · {ZONE_LABELS[z]}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Trip</span>
            <select className="input mt-1" value={trip} onChange={(e) => setTrip(e.target.value as TripKind)}>
              {tripKinds.map((k) => (
                <option key={k} value={k}>
                  {k === 'none' ? 'No trip (flats + zone fee)' : `${tripLabel(k)} — ${money(pricing[tier].trip[k])}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Hours after the first</span>
            <input
              className="input mt-1"
              type="number"
              inputMode="decimal"
              value={extraHours}
              onChange={(e) => setExtraHours(e.target.value)}
              placeholder="0"
            />
            <span className="mt-1 block text-xs text-[color:var(--ink-muted)]">
              {money(pricing[tier].hourly[trip === 'none' ? 'day' : trip])}/hr
            </span>
          </label>
          <label className="block">
            <span className="label">Diagnostic credit</span>
            <input
              className="input mt-1"
              type="number"
              inputMode="decimal"
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
              placeholder={String(pricing[tier].trip.day)}
            />
          </label>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="label">Modifiers</legend>
          <Toggle checked={oldWork} onChange={setOldWork} label={`Old work +${MONEY.oldWorkSurcharge * 100}%`} hint="Known condition, flagged on the first look" />
        </fieldset>

        <label className="block">
          <span className="label">Scope, in your words</span>
          <textarea
            className="input mt-1 min-h-20"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Replace the well pump circuit from the panel to the pressure switch."
          />
        </label>
        {copyProblems.length > 0 && (
          <div className="rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-2.5">
            <p className="text-sm font-semibold text-[color:var(--hazard)]">Do not print that.</p>
            <ul className="mt-1 space-y-0.5 text-sm">
              {copyProblems.map((p) => (
                <li key={p.phrase}><strong>{p.phrase}</strong> — {p.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {lines.length > 0 && (
          <ul className="divide-y divide-[color:var(--line)] border-t border-[color:var(--line)] pt-1">
            {lines.map((line, i) => (
              <li key={line.id} className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{line.name}</span>
                <span className="tabular-nums">{money(line.price)}</span>
                <button
                  type="button"
                  className="shrink-0 px-1 text-[color:var(--hazard)]"
                  onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${line.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The estimate side reads like the printed page: wordmark and tagline, no badge. */}
      <div className="paper p-4">
        <Wordmark className="h-16 w-full max-w-[260px] text-charcoal" tagline={false} />
        <p className="mt-1 font-serif text-xs italic text-oxide">
          <Tagline className="!text-oxide" />
        </p>

        <div className="mt-4 space-y-1.5 text-sm text-charcoal">
          {lines.length === 0 && trip === 'none' ? (
            <p className="italic opacity-60">Add a line or pick a trip to start the quote.</p>
          ) : (
            <>
              {lines.filter((l) => l.kind !== 'material').map((l) => (
                <Line key={l.id} label={l.name} value={money(l.price)} sub={l.assumes} />
              ))}
              {quote.materialsCost > 0 && (
                <Line label={`Materials (cost ${money(quote.materialsCost)} + ${MONEY.materialsMarkup * 100}%)`} value={money(quote.materialsCharged)} />
              )}
              {quote.trip > 0 && trip !== 'none' && <Line label={tripLabel(trip)} value={money(quote.trip)} sub="Includes the Zone 1 trip and the first hour" />}
              {quote.zoneAdd > 0 && <Line label={trip === 'none' ? `Zone ${zone} trip` : `Zone ${zone} (over Zone 1)`} value={money(quote.zoneAdd)} />}
              {quote.laborCharged > 0 && <Line label={`${quote.hours} hr at ${money(quote.hourlyRate)}`} value={money(quote.laborCharged)} />}
              {quote.oldWorkAdd > 0 && <Line label="Old work" value={money(quote.oldWorkAdd)} />}
              {quote.diagnosticCredit > 0 && <Line label="Diagnostic credit" value={`− ${money(quote.diagnosticCredit)}`} />}

              <div className="mt-2 border-t-2 border-gold pt-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-xs uppercase tracking-[0.12em]">Total</span>
                  <span className="display text-2xl tabular-nums">{money(quote.total)}</span>
                </div>
              </div>

              {quote.depositDue > 0 && (
                <p className="mt-1 text-sm font-semibold text-oxide">
                  Deposit {money(quote.depositDue)} before the work starts.
                </p>
              )}
            </>
          )}
        </div>

        {scope && <p className="mt-4 border-t border-charcoal/15 pt-3 text-sm text-charcoal">{scope}</p>}

        {quote.notes.length > 0 && (
          <ul className="mt-4 space-y-0.5 border-t border-charcoal/15 pt-3 text-xs text-charcoal/70">
            {quote.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}

        <p className="mt-4 text-xs text-charcoal/70">
          Hidden damage will be quoted before extra work.
        </p>
      </div>
    </div>
  );
}

function Line({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      {sub && <span className="block text-xs opacity-60">{sub}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex min-h-9 items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1 accent-[color:var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="block text-xs text-[color:var(--ink-muted)]">{hint}</span>}
      </span>
    </label>
  );
}
