'use client';

import { useState } from 'react';
import type { Edition } from '@/lib/toolbox/types';
import { KNOCKOUTS, KNOCKOUT_SOURCE } from '@/lib/toolbox/data/knockouts';
import { CH9_TABLE8 } from '@/lib/toolbox/data/ch9-table8';
import { T310_16 } from '@/lib/toolbox/data/t310-16';
import { S240_4D } from '@/lib/toolbox/data/s240-4d';
import { T314_16A, T314_16B, S314_16B_RULES } from '@/lib/toolbox/data/t314-16';
import { CH9_TABLE1, CH9_TABLE4, CH9_TABLE5, NIPPLE_PERCENT, type Insulation, type Raceway } from '@/lib/toolbox/data/ch9-fill';
import { T430_248, T430_250, T430_52, S430_22 } from '@/lib/toolbox/data/motors';
import { T300_5 } from '@/lib/toolbox/data/t300-5';
import { T250_66, T250_122 } from '@/lib/toolbox/data/grounding';
import { S220_82 } from '@/lib/toolbox/data/s220-82';
import { ampacity, ampacityColumns, boxFill, conduitFill, dwelling, egcFor, motor, ohms, sizeForLoad, vdKey, vdLabel, voltageDrop, type HvacInputs, type System } from '@/lib/toolbox/calc';
import { Ahj, Cite, Notes, Num, PendingGate, Pick, Result, Seg, VerifyBadge, VerifyNotes, n } from './shared';

type P = { edition: Edition };

export function Knockouts() {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-xs text-[color:var(--ink-muted)]">Not an NEC table. Source: <a className="underline" href={KNOCKOUT_SOURCE.url}>{KNOCKOUT_SOURCE.name}</a></p>
      <table className="w-full text-left text-base" data-testid="knockout-table">
        <thead><tr className="text-xs uppercase text-[color:var(--ink-muted)]"><th className="py-1">Trade</th><th>Hole saw</th><th>Punch dia</th></tr></thead>
        <tbody>
          {KNOCKOUTS.map((k) => (
            <tr key={k.trade} onClick={() => setSel(k.trade)} className={`h-12 border-t border-[color:var(--line)] ${sel === k.trade ? 'bg-[color:var(--surface-2)] font-semibold' : ''}`}>
              <td>{k.trade}&quot;</td><td>{k.holeSaw}</td><td>{k.punchIn} / {k.punchMm}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[color:var(--ink-muted)]">Check the fitting maker&apos;s spec when it differs.</p>
    </div>
  );
}

export function OhmsLaw() {
  const [sys, setSys] = useState<System>('ac1');
  const [v, setV] = useState(''); const [i, setI] = useState(''); const [r, setR] = useState(''); const [p, setP] = useState(''); const [pf, setPf] = useState('1');
  const out = ohms({ system: sys, volts: n(v), amps: n(i), ohms: n(r), watts: n(p), pf: n(pf) });
  return (
    <div className="space-y-3">
      <Seg label="System" value={sys} onChange={setSys} options={[{ v: 'dc', l: 'DC' }, { v: 'ac1', l: 'AC 1ϕ' }, { v: 'ac3', l: 'AC 3ϕ' }]} />
      <p className="text-xs text-[color:var(--ink-muted)]">Enter any two. {sys === 'ac3' ? 'Volts are line-to-line; P = √3·V·I·PF.' : sys === 'ac1' ? 'P = V·I·PF.' : 'P = V·I, V = I·R.'}</p>
      <div className="grid grid-cols-2 gap-2">
        <Num label="Volts" value={v} onChange={setV} suffix="V" />
        <Num label="Amps" value={i} onChange={setI} suffix="A" />
        <Num label={sys === 'ac3' ? 'Ohms (per phase)' : 'Ohms'} value={r} onChange={setR} suffix="Ω" />
        <Num label="Watts" value={p} onChange={setP} suffix="W" />
        {sys !== 'dc' && <Num label="Power factor" value={pf} onChange={setPf} step="0.01" />}
      </div>
      <Result>{'error' in out && out.error ? <span className="text-sm">{out.error}</span> : !('error' in out) || !out.error ? (() => { const o = out as Exclude<typeof out, { error: string }>; return (
        <dl className="grid grid-cols-2 gap-1"><dt>Volts</dt><dd className="font-semibold">{o.volts} V</dd><dt>Amps</dt><dd className="font-semibold">{o.amps} A</dd><dt>Ohms</dt><dd className="font-semibold">{o.ohms} Ω</dd><dt>Watts</dt><dd className="font-semibold">{o.watts} W</dd>{sys !== 'dc' && <><dt>VA</dt><dd className="font-semibold">{o.va} VA</dd></>}</dl>); })() : null}</Result>
    </div>
  );
}

export function Torque() {
  return (
    <div className="space-y-2 text-base">
      <p className="font-semibold">Use the manufacturer&apos;s label torque value.</p>
      <p>Torque values are on the equipment label or in the install instructions for that breaker, lug, or terminal. Tighten with a calibrated torque tool and note it on the job.</p>
      <p className="text-sm text-[color:var(--ink-muted)]">No values are listed here on purpose.</p>
    </div>
  );
}

export function VoltageDrop({ edition }: P) {
  const t = CH9_TABLE8[edition];
  const [mat, setMat] = useState<'Cu' | 'Al'>('Cu'); const [ph, setPh] = useState<1 | 3>(1);
  const [len, setLen] = useState(''); const [amps, setAmps] = useState(''); const [volts, setVolts] = useState(''); const [key, setKey] = useState(''); const [target, setTarget] = useState('');
  const ok = n(len) && n(amps) && n(volts);
  const r = ok ? voltageDrop(t.rows, { material: mat, phase: ph, lengthFt: n(len)!, amps: n(amps)!, volts: n(volts)!, key, targetPct: n(target) }) : null;
  return (
    <div className="space-y-3">
      <Cite tables={[t]} edition={edition} />
      <div className="grid grid-cols-2 gap-2">
        <Seg label="Conductor" value={mat} onChange={setMat} options={[{ v: 'Cu', l: 'Copper' }, { v: 'Al', l: 'Alum.' }]} />
        <Seg label="Phase" value={ph} onChange={setPh} options={[{ v: 1, l: '1ϕ' }, { v: 3, l: '3ϕ' }]} />
        <Num label="One-way length" value={len} onChange={setLen} suffix="ft" />
        <Num label="Load" value={amps} onChange={setAmps} suffix="A" />
        <Num label="Source volts" value={volts} onChange={setVolts} suffix="V" />
        <Num label="Your target drop" value={target} onChange={setTarget} suffix="%" />
      </div>
      <PendingGate tables={[t]} edition={edition}>
        <label className="block text-xs font-semibold">Wire size
          <select aria-label="Wire size" value={key} onChange={(e) => setKey(e.target.value)} className="input mt-1 min-h-12 w-full text-base">
            <option value="">—</option>{t.rows.map((x) => <option key={vdKey(x)} value={vdKey(x)}>{vdLabel(x)}</option>)}
          </select>
        </label>
        {r && <Result>
          {key && <p>R = {r.ohmsPerKft ?? '—'} Ω/kft (75°C) · Drop <b>{r.dropV ?? '—'} V</b> (<b>{r.pct ?? '—'}%</b>)</p>}
          <p>{r.target == null ? 'Enter a target % for a size suggestion.' : <>Smallest size at or under {r.target}%: <b>{r.suggest ?? 'none in table'}</b></>}</p>
          <p className="text-xs">{ph === 3 ? 'VD = √3·L·I·R/1000' : 'VD = 2·L·I·R/1000'}, DC resistance; AC reactance not included.</p>
          <VerifyNotes notes={r.verify} />
        </Result>}
        <Notes tables={[t]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function Ampacity({ edition }: P) {
  const t = T310_16[edition], s = S240_4D[edition];
  const [mat, setMat] = useState<'Cu' | 'Al'>('Cu'); const [col, setCol] = useState(''); const [size, setSize] = useState(''); const [load, setLoad] = useState('');
  const cols = ampacityColumns(t.rows, mat);
  const a = size && col ? ampacity(t.rows, s.rows, size, mat, col) : null;
  const pick = n(load) && col ? sizeForLoad(t.rows, s.rows, n(load)!, mat, col) : null;
  const cond = a ? s.rows.find((x) => x.size === size && x.material === mat)?.condition : undefined;
  return (
    <div className="space-y-3">
      <Cite tables={[t, s]} edition={edition} />
      <Seg label="Conductor" value={mat} onChange={(m) => { setMat(m); setSize(''); }} options={[{ v: 'Cu', l: 'Copper' }, { v: 'Al', l: 'Al / CCA' }]} />
      <PendingGate tables={[t, s]} edition={edition}>
        <div className="grid grid-cols-2 gap-2">
          <Pick label="Temperature column" value={col} onChange={setCol} options={cols} />
          <Pick label="Wire size" value={size} onChange={setSize} options={[...new Set(t.rows.filter((r) => r.material === mat).map((r) => r.size))]} />
          <Num label="Or: load to size for" value={load} onChange={setLoad} suffix="A" />
        </div>
        {(a || pick || n(load) != null) && <Result>
          {a && <p>{size} {mat} @ {col}: <b>{a.amps ?? '—'} A</b>{a.smallConductorMaxOcpd != null && <> · max OCPD per {s.label}: <b>{a.smallConductorMaxOcpd} A</b>{cond && ` (${cond})`}</>}</p>}
          {n(load) != null && col && <p>Smallest for {load} A @ {col}: <b>{pick ?? 'none in table'}</b></p>}
          <p className="text-xs">Termination ratings, adjustment and correction factors still apply.</p>
          {a && <VerifyNotes notes={a.verify} />}
        </Result>}
        <Notes tables={[t, s]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function BoxFill({ edition }: P) {
  const a = T314_16A[edition], b = T314_16B[edition], rules = S314_16B_RULES[edition];
  const [box, setBox] = useState(''); const [custom, setCustom] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [items, setItems] = useState<Record<string, string>>({});
  const [devSize, setDevSize] = useState(''); const [egcSize, setEgcSize] = useState(''); const [isoSize, setIsoSize] = useState('');
  const sizes = b.rows.map((x) => x.size);
  const conductors = Object.entries(counts).map(([size, c]) => ({ size, count: Number(c) || 0 })).filter((c) => c.count > 0);
  // Table 314.16(B) rows run 18 → 6 AWG, so the last one present is the largest conductor.
  const largestSize = [...sizes].reverse().find((s) => conductors.some((c) => c.size === s));
  const r = boxFill(a.rows, b.rows, rules.rows, { box, customBoxIn: n(custom), conductors, items: Object.fromEntries(Object.entries(items).map(([k, v]) => [k, Number(v) || 0])), largestSize, deviceSize: devSize || undefined, egcSize: egcSize || undefined, isoEgcSize: isoSize || undefined });
  const boxRow = a.rows.find((x) => x.box === box);
  const any = conductors.length > 0 || Object.values(items).some((v) => Number(v) > 0);
  return (
    <div className="space-y-3">
      <Cite tables={[a, b, rules]} edition={edition} />
      <PendingGate tables={[a, b, rules]} edition={edition}>
        <Pick label="Metal box (Table 314.16(A))" value={box} onChange={setBox} options={a.rows.map((x) => x.box)} />
        <Num label="Or marked box volume" value={custom} onChange={setCustom} suffix="in³" />
        <p className="text-xs font-semibold">Conductors by size (AWG)</p>
        <div className="grid grid-cols-4 gap-2">{b.rows.map((x) => <Num key={x.size} label={`${x.size} (${x.cubicIn})`} value={counts[x.size] ?? ''} onChange={(v) => setCounts((c) => ({ ...c, [x.size]: v }))} />)}</div>
        <p className="text-xs font-semibold">Allowances ({rules.label})</p>
        <div className="space-y-2">{rules.rows.filter((x) => x.id !== 'conductor').map((x) => (
          <Num key={x.id} label={`${x.item} — ${x.units} per ${x.per}, by ${x.basis}`} value={items[x.id] ?? ''} onChange={(v) => setItems((c) => ({ ...c, [x.id]: v }))} />
        ))}</div>
        <ul className="text-xs">{rules.rows.filter((x) => x.verify).map((x) => <li key={x.id}>{x.item} <VerifyBadge title={x.verify} /></li>)}</ul>
        <div className="grid grid-cols-3 gap-2">
          <Pick label="Device conductor" value={devSize} onChange={setDevSize} options={sizes} />
          <Pick label="Largest EGC" value={egcSize} onChange={setEgcSize} options={sizes} />
          <Pick label="Largest isolated EGC" value={isoSize} onChange={setIsoSize} options={sizes} />
        </div>
        {any && <Result>
          <ul className="text-sm">{r.lines.map((l) => <li key={l.item} className="flex justify-between gap-2"><span>{l.item} ({l.units} × {l.size}){l.verify && <VerifyBadge title={l.verify} />}</span><span>{round2(l.cubicIn)} in³</span></li>)}</ul>
          {r.missing.map((m) => <p key={m} className="text-sm text-orange-700">{m}</p>)}
          <p className="mt-1">Needed <b>{r.neededIn} in³</b> of {r.boxIn ?? '—'} in³ — <b>{r.ok == null ? 'pick a box' : r.ok ? '✓ fits' : '✕ over'}</b></p>
          {boxRow && largestSize && <p className="text-xs">Table max for this box, all {largestSize} AWG, no allowances: {boxRow.maxConductors[largestSize] ?? '—'}</p>}
          <VerifyNotes notes={r.verify} />
        </Result>}
        <Notes tables={[a, b, rules]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}
const round2 = (x: number) => Math.round(x * 100) / 100;

export function ConduitFill({ edition }: P) {
  const t1 = CH9_TABLE1[edition], t4 = CH9_TABLE4[edition], t5 = CH9_TABLE5[edition];
  const insOpts = [...new Set(t5.rows.map((x) => x.insulation))];
  const [rw, setRw] = useState<Raceway>('EMT'); const [ins, setIns] = useState<Insulation>('THHN/THWN/THWN-2'); const [counts, setCounts] = useState<Record<string, string>>({}); const [nipple, setNipple] = useState(false);
  const wires = Object.entries(counts).map(([k, c]) => { const [i, s] = k.split('|'); return { insulation: i as Insulation, size: s, count: Number(c) || 0 }; });
  const r = conduitFill(t1.rows, t4.rows, t5.rows, rw, wires, nipple ? NIPPLE_PERCENT : undefined);
  return (
    <div className="space-y-3">
      <Cite tables={[t1, t4, t5]} edition={edition} />
      <Seg label="Raceway" value={rw} onChange={setRw} options={(['EMT', 'PVC 40', 'PVC 80', 'RMC'] as Raceway[]).map((v) => ({ v, l: v }))} />
      <Seg label="Insulation" value={ins} onChange={setIns} options={insOpts.map((v) => ({ v, l: v }))} />
      <PendingGate tables={[t1, t4, t5]} edition={edition}>
        <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="h-6 w-6" checked={nipple} onChange={(e) => setNipple(e.target.checked)} />Nipple 24 in. or shorter ({NIPPLE_PERCENT}%, Table 1 Note 4)</label>
        <div className="grid grid-cols-3 gap-2">{t5.rows.filter((x) => x.insulation === ins).map((x) => <Num key={x.size} label={x.size} value={counts[`${ins}|${x.size}`] ?? ''} onChange={(v) => setCounts((c) => ({ ...c, [`${ins}|${x.size}`]: v }))} />)}</div>
        {r.conductors > 0 && <Result>
          <p>{r.conductors} conductors · {r.wireAreaSqIn} in² · max fill {r.fillPercent ?? '—'}%</p>
          <p>Smallest {rw}: <b>{r.tradeSize ? `${r.tradeSize}"` : 'none in table'}</b>{r.tradeSize && <> ({r.fillOfPick}% full, {r.allowedSqIn} in² allowed)</>}</p>
          <VerifyNotes notes={r.verify} />
        </Result>}
        <details className="text-xs"><summary className="min-h-12 cursor-pointer py-3 font-semibold">{rw} areas (100%)</summary>
          <ul>{t4.rows.filter((x) => x.raceway === rw).map((x) => <li key={x.tradeSize} className="flex justify-between py-1"><span>{x.tradeSize}&quot;</span><span>{x.totalAreaSqIn} in²{x.verify && <VerifyBadge title={x.verify} />}</span></li>)}</ul>
        </details>
        <Notes tables={[t1, t4, t5]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function Motors({ edition }: P) {
  const t1 = T430_248[edition], t3 = T430_250[edition], t52 = T430_52[edition], c = S430_22[edition];
  const [ph, setPh] = useState<1 | 3>(3); const [hp, setHp] = useState(''); const [v, setV] = useState(''); const [type, setType] = useState(''); const [dev, setDev] = useState('');
  const flc = ph === 1 ? t1 : t3;
  const r = hp && v ? motor(flc.rows, t52.rows, c.rows, hp, Number(v), type, dev) : null;
  const tables = [flc, t52, c];
  const hps = [...new Set(flc.rows.map((x) => x.hp))];
  const volts = [...new Set(flc.rows.filter((x) => !hp || x.hp === hp).map((x) => String(x.volts)))];
  return (
    <div className="space-y-3">
      <Cite tables={tables} edition={edition} />
      <Seg label="Phase" value={ph} onChange={(p) => { setPh(p); setHp(''); setV(''); }} options={[{ v: 1, l: `1ϕ (${t1.label})` }, { v: 3, l: `3ϕ (${t3.label})` }]} />
      <PendingGate tables={tables} edition={edition}>
        <div className="grid grid-cols-2 gap-2">
          <Pick label="HP" value={hp} onChange={setHp} options={hps} />
          <Pick label="Volts" value={v} onChange={setV} options={volts} />
        </div>
        <Pick label={`Motor type (${t52.label})`} value={type} onChange={setType} options={[...new Set(t52.rows.map((x) => x.motorType))]} />
        <Pick label="Protective device" value={dev} onChange={setDev} options={[...new Set(t52.rows.map((x) => x.device))]} />
        {r && <Result>
          <p>FLC ({flc.label}): <b>{r.flc} A</b></p>
          <p>Conductor ≥ {r.conductorPercent}% ({c.label}): <b>{r.conductorAmps} A</b> → size it in Ampacity</p>
          <p>Max SC/GF device{r.ocpdPercent != null ? ` (${r.ocpdPercent}%)` : ''}: <b>{r.maxOcpd != null ? `${r.maxOcpd} A` : 'pick type and device'}</b></p>
          {r.maxOcpd != null && <p className="text-xs">Not a standard size: next higher standard size permitted.</p>}
          <VerifyNotes notes={r.verify} />
        </Result>}
        <Notes tables={tables} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function Burial({ edition }: P) {
  const t = T300_5[edition];
  const [loc, setLoc] = useState('');
  return (
    <div className="space-y-3">
      <Cite tables={[t]} edition={edition} />
      <PendingGate tables={[t]} edition={edition}>
        <Pick label="Location" value={loc} onChange={setLoc} options={[...new Set(t.rows.map((r) => r.location))]} />
        {loc && <Result><p className="text-xs">Minimum cover, inches</p><ul>{t.rows.filter((r) => r.location === loc).map((r) => (
          <li key={r.column} className="flex justify-between gap-3 border-t border-[color:var(--line)] py-2 text-sm"><span>Col {r.column}: {r.wiringMethod}</span><b className="shrink-0 text-right">{r.cover}{r.verify && <VerifyBadge title={r.verify} />}</b></li>
        ))}</ul><VerifyNotes notes={[...new Set(t.rows.filter((r) => r.location === loc && r.verify).map((r) => r.verify!))]} /></Result>}
        <Notes tables={[t]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function Grounding({ edition }: P) {
  const gec = T250_66[edition], egc = T250_122[edition];
  const [row, setRow] = useState(''); const [ocpd, setOcpd] = useState('');
  const g = row !== '' ? gec.rows[Number(row)] : null; const e = n(ocpd) ? egcFor(egc.rows, n(ocpd)!) : null;
  return (
    <div className="space-y-3">
      <Cite tables={[gec, egc]} edition={edition} />
      <PendingGate tables={[gec, egc]} edition={edition}>
        <label className="block text-xs font-semibold">Largest service conductor (GEC)
          <select className="input mt-1 min-h-12 w-full text-base" value={row} onChange={(x) => setRow(x.target.value)}>
            <option value="">—</option>{gec.rows.map((r, k) => <option key={k} value={k}>Cu {r.serviceCu} / Al {r.serviceAl}</option>)}
          </select>
        </label>
        <Num label="OCPD rating (EGC)" value={ocpd} onChange={setOcpd} suffix="A" />
        {(g || n(ocpd) != null) && <Result>
          {g && <p>GEC ({gec.label}): <b>{g.gecCu} Cu</b> or <b>{g.gecAl} Al/CCA</b></p>}
          {n(ocpd) != null && (e ? <p>EGC ({egc.label}): <b>{e.egcCu} Cu</b> or <b>{e.egcAl} Al/CCA</b> (row ≤{e.ocpdAmps} A){e.verify && <VerifyBadge title={e.verify} />}</p> : <p>Over the largest row in {egc.label}.</p>)}
          <VerifyNotes notes={[g?.verify, e?.verify].filter((x): x is string => !!x)} />
        </Result>}
        <Notes tables={[gec, egc]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function ServiceLoad({ edition }: P) {
  const t = S220_82[edition];
  const [f, setF] = useState<Record<string, string>>({ volts: '240' }); const [lock, setLock] = useState(false);
  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const g = (k: string) => n(f[k] ?? '');
  const hvac: HvacInputs = { ac: g('ac'), hp: g('hp'), hpCompressor: g('hpCompressor'), supplemental: g('supplemental'), spaceHeat: g('spaceHeat'), storage: g('storage') };
  const r = g('sqft') && g('volts') ? dwelling(t.rows, { sqft: g('sqft')!, smallApplianceCircuits: g('sa') ?? 0, laundryCircuits: g('ld') ?? 0, fixedAppliancesVa: g('fixed') ?? 0, hvac, heatUnits: g('units') ?? 0, compressorLockedOut: lock, volts: g('volts')! }) : null;
  const v = (k: string) => t.rows.find((x) => x.kind === k)?.value;
  return (
    <div className="space-y-3">
      <Cite tables={[t]} edition={edition} />
      <PendingGate tables={[t]} edition={edition}>
        <p className="text-xs font-semibold">(B) General loads — {v('general-va-per-sqft')} VA/ft², {v('small-appliance-va-per-circuit')} VA per small-appliance and laundry circuit</p>
        <div className="grid grid-cols-2 gap-2">
          <Num label="Floor area (outside dims)" value={f.sqft ?? ''} onChange={set('sqft')} suffix="ft²" />
          <Num label="Service volts" value={f.volts ?? ''} onChange={set('volts')} suffix="V" />
          <Num label="20 A small-appliance circuits" value={f.sa ?? ''} onChange={set('sa')} />
          <Num label="Laundry circuits" value={f.ld ?? ''} onChange={set('ld')} />
        </div>
        <Num label="Fixed appliances + motors (nameplate)" value={f.fixed ?? ''} onChange={set('fixed')} suffix="VA" />
        <p className="text-xs font-semibold">(C) Heating / AC — largest applies</p>
        <div className="grid grid-cols-2 gap-2">
          <Num label="AC / cooling" value={f.ac ?? ''} onChange={set('ac')} suffix="VA" />
          <Num label="Heat pump (no supp. heat)" value={f.hp ?? ''} onChange={set('hp')} suffix="VA" />
          <Num label="Heat pump compressor" value={f.hpCompressor ?? ''} onChange={set('hpCompressor')} suffix="VA" />
          <Num label="Supplemental heat" value={f.supplemental ?? ''} onChange={set('supplemental')} suffix="VA" />
          <Num label="Electric space heat" value={f.spaceHeat ?? ''} onChange={set('spaceHeat')} suffix="VA" />
          <Num label="Separately controlled units" value={f.units ?? ''} onChange={set('units')} />
          <Num label="Thermal storage / continuous" value={f.storage ?? ''} onChange={set('storage')} suffix="VA" />
        </div>
        <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" className="h-6 w-6" checked={lock} onChange={(e) => setLock(e.target.checked)} />Compressor can&apos;t run with supplemental heat</label>
        {r && <Result>
          <p>General {r.generalVa} VA → demand <b>{r.generalDemandVa} VA</b> <span className="text-xs">(first {v('general-first-va')} VA at {v('general-first-pct')}%, rest at {v('general-remainder-pct')}%)</span></p>
          <p>HVAC: <b>{r.hvacVa} VA</b>{r.hvacOption && <span className="text-xs"> — {r.hvacOption}</span>}</p>
          <p>Total <b>{r.totalVa} VA ≈ {r.amps} A</b> at {f.volts} V</p>
          <VerifyNotes notes={r.verify} />
        </Result>}
        <Notes tables={[t]} />
      </PendingGate>
      <Ahj />
    </div>
  );
}
