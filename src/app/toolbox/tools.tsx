'use client';

import { useState } from 'react';
import type { Edition } from '@/lib/toolbox/types';
import { KNOCKOUTS, KNOCKOUT_SOURCE } from '@/lib/toolbox/data/knockouts';
import { CH9_TABLE8 } from '@/lib/toolbox/data/ch9-table8';
import { T310_16 } from '@/lib/toolbox/data/t310-16';
import { S240_4D } from '@/lib/toolbox/data/s240-4d';
import { T314_16A, T314_16B, S314_16B_RULES } from '@/lib/toolbox/data/t314-16';
import { CH9_TABLE1, CH9_TABLE4, CH9_TABLE5, type Raceway } from '@/lib/toolbox/data/ch9-fill';
import { T430_248, T430_250, T430_52, S430_22 } from '@/lib/toolbox/data/motors';
import { T300_5 } from '@/lib/toolbox/data/t300-5';
import { T250_66, T250_122 } from '@/lib/toolbox/data/grounding';
import { S220_82 } from '@/lib/toolbox/data/s220-82';
import { ampacity, ampacityColumns, boxFill, conduitFill, dwelling, egcFor, motor, ohms, sizeForLoad, voltageDrop, type System } from '@/lib/toolbox/calc';
import { Ahj, Cite, Num, PendingGate, Pick, Result, Seg, n } from './shared';

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
  const [len, setLen] = useState(''); const [amps, setAmps] = useState(''); const [volts, setVolts] = useState(''); const [size, setSize] = useState(''); const [target, setTarget] = useState('');
  const ok = n(len) && n(amps) && n(volts);
  const r = ok ? voltageDrop(t.rows, { material: mat, phase: ph, lengthFt: n(len)!, amps: n(amps)!, volts: n(volts)!, size, targetPct: n(target) }) : null;
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
        <Pick label="Wire size" value={size} onChange={setSize} options={t.rows.map((x) => x.size)} />
        {r && <Result><p>Drop: <b>{r.dropV ?? '—'} V</b> ({r.pct ?? '—'}%)</p><p>{r.target == null ? 'Enter a target % for a size suggestion.' : `Smallest size at or under ${r.target}%: `}<b>{r.target == null ? '' : r.suggest ?? 'none in table'}</b></p></Result>}
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
  return (
    <div className="space-y-3">
      <Cite tables={[t, s]} edition={edition} />
      <Seg label="Conductor" value={mat} onChange={setMat} options={[{ v: 'Cu', l: 'Copper' }, { v: 'Al', l: 'Aluminum' }]} />
      <PendingGate tables={[t, s]} edition={edition}>
        <div className="grid grid-cols-2 gap-2">
          <Pick label="Temperature column" value={col} onChange={setCol} options={cols} />
          <Pick label="Wire size" value={size} onChange={setSize} options={[...new Set(t.rows.filter((r) => r.material === mat).map((r) => r.size))]} />
          <Num label="Or: load to size for" value={load} onChange={setLoad} suffix="A" />
        </div>
        <Result>
          {a && <p>{size} {mat} @ {col}: <b>{a.amps ?? '—'} A</b>{a.smallConductorMaxOcpd != null && <> · max OCPD per {s.label}: <b>{a.smallConductorMaxOcpd} A</b></>}</p>}
          {n(load) != null && <p>Smallest for {load} A: <b>{pick ?? 'none in table'}</b></p>}
          <p className="text-xs">Termination ratings, adjustment and correction factors still apply.</p>
        </Result>
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function BoxFill({ edition }: P) {
  const a = T314_16A[edition], b = T314_16B[edition], rules = S314_16B_RULES[edition];
  const [box, setBox] = useState(''); const [custom, setCustom] = useState(''); const [counts, setCounts] = useState<Record<string, string>>({});
  const r = boxFill(a.rows, b.rows, box, Object.entries(counts).map(([size, c]) => ({ size, count: Number(c) || 0 })), n(custom));
  return (
    <div className="space-y-3">
      <Cite tables={[a, b, rules]} edition={edition} />
      <PendingGate tables={[a, b, rules]} edition={edition}>
        <Pick label="Box" value={box} onChange={setBox} options={a.rows.map((x) => x.box)} />
        <Num label="Or marked box volume" value={custom} onChange={setCustom} suffix="in³" />
        <p className="text-xs font-semibold">Volume allowances per size (count conductors, plus allowances per {rules.label}):</p>
        <ul className="text-xs">{rules.rows.map((x) => <li key={x.item}>{x.item}: {x.volumeAllowances} — {x.basis}</li>)}</ul>
        <div className="grid grid-cols-3 gap-2">{b.rows.map((x) => <Num key={x.size} label={`${x.size}`} value={counts[x.size] ?? ''} onChange={(v) => setCounts((c) => ({ ...c, [x.size]: v }))} />)}</div>
        <Result><p>Needed <b>{r.neededIn} in³</b> of {r.boxIn ?? '—'} in³ — {r.ok == null ? 'pick a box' : r.ok ? '✓ fits' : '✕ over'}</p></Result>
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function ConduitFill({ edition }: P) {
  const t1 = CH9_TABLE1[edition], t4 = CH9_TABLE4[edition], t5 = CH9_TABLE5[edition];
  const [rw, setRw] = useState<Raceway>('EMT'); const [ins, setIns] = useState<'THHN/THWN-2' | 'XHHW-2'>('THHN/THWN-2'); const [counts, setCounts] = useState<Record<string, string>>({});
  const wires = Object.entries(counts).map(([k, c]) => { const [i, s] = k.split('|'); return { insulation: i as 'THHN/THWN-2', size: s, count: Number(c) || 0 }; });
  const r = conduitFill(t1.rows, t4.rows, t5.rows, rw, wires);
  return (
    <div className="space-y-3">
      <Cite tables={[t1, t4, t5]} edition={edition} />
      <Seg label="Raceway" value={rw} onChange={setRw} options={(['EMT', 'PVC 40', 'PVC 80', 'RMC'] as Raceway[]).map((v) => ({ v, l: v }))} />
      <Seg label="Insulation" value={ins} onChange={setIns} options={[{ v: 'THHN/THWN-2', l: 'THHN/THWN-2' }, { v: 'XHHW-2', l: 'XHHW-2' }]} />
      <PendingGate tables={[t1, t4, t5]} edition={edition}>
        <div className="grid grid-cols-3 gap-2">{t5.rows.filter((x) => x.insulation === ins).map((x) => <Num key={x.size} label={x.size} value={counts[`${ins}|${x.size}`] ?? ''} onChange={(v) => setCounts((c) => ({ ...c, [`${ins}|${x.size}`]: v }))} />)}</div>
        <Result><p>{r.conductors} conductors · {r.wireAreaSqIn} in² · fill {r.fillPercent ?? '—'}%</p><p>Smallest {rw}: <b>{r.tradeSize ?? '—'}</b></p></Result>
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function Motors({ edition }: P) {
  const t1 = T430_248[edition], t3 = T430_250[edition], t52 = T430_52[edition], c = S430_22[edition];
  const [ph, setPh] = useState<1 | 3>(1); const [hp, setHp] = useState(''); const [v, setV] = useState(''); const [type, setType] = useState(''); const [dev, setDev] = useState('');
  const flc = ph === 1 ? t1 : t3;
  const r = hp && v ? motor(flc.rows, t52.rows, c.rows, hp, Number(v), type, dev) : null;
  const tables = [flc, t52, c];
  return (
    <div className="space-y-3">
      <Cite tables={tables} edition={edition} />
      <Seg label="Phase" value={ph} onChange={setPh} options={[{ v: 1, l: `1ϕ (${t1.label})` }, { v: 3, l: `3ϕ (${t3.label})` }]} />
      <PendingGate tables={tables} edition={edition}>
        <div className="grid grid-cols-2 gap-2">
          <Pick label="HP" value={hp} onChange={setHp} options={[...new Set(flc.rows.map((x) => x.hp))]} />
          <Pick label="Volts" value={v} onChange={setV} options={[...new Set(flc.rows.map((x) => String(x.volts)))]} />
          <Pick label="Motor type" value={type} onChange={setType} options={[...new Set(t52.rows.map((x) => x.motorType))]} />
          <Pick label="Device" value={dev} onChange={setDev} options={[...new Set(t52.rows.map((x) => x.device))]} />
        </div>
        {r && <Result><p>FLC: <b>{r.flc} A</b></p><p>Max OCPD ({r.ocpdPercent ?? '—'}%): <b>{r.maxOcpd ?? '—'} A</b></p><p>Conductor at least: <b>{r.conductorAmps ?? '—'} A</b> → size it in Ampacity</p></Result>}
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
        {loc && <Result><ul>{t.rows.filter((r) => r.location === loc).map((r) => <li key={r.wiringMethod} className="flex justify-between gap-2 py-1"><span>{r.wiringMethod}</span><b>{r.inches ?? '—'}&quot;</b></li>)}</ul></Result>}
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
        <Result>{g && <p>GEC: <b>{g.gecCu} Cu</b> or <b>{g.gecAl} Al</b></p>}{e && <p>EGC: <b>{e.egcCu} Cu</b> or <b>{e.egcAl} Al</b> (row {e.ocpdAmps} A)</p>}</Result>
      </PendingGate>
      <Ahj />
    </div>
  );
}

export function ServiceLoad({ edition }: P) {
  const t = S220_82[edition];
  const [sqft, setSqft] = useState(''); const [sa, setSa] = useState(''); const [ld, setLd] = useState(''); const [fixed, setFixed] = useState(''); const [volts, setVolts] = useState('');
  const hvacOpts = t.rows.filter((r) => r.kind === 'hvac-option-pct');
  const [hvac, setHvac] = useState<string[]>([]);
  const r = n(sqft) && n(volts) ? dwelling(t.rows, { sqft: n(sqft)!, smallApplianceCircuits: n(sa) ?? 0, laundryCircuits: n(ld) ?? 0, fixedAppliancesVa: n(fixed) ?? 0, hvacVa: hvacOpts.map((_, k) => Number(hvac[k]) || 0), volts: n(volts)! }) : null;
  return (
    <div className="space-y-3">
      <Cite tables={[t]} edition={edition} />
      <PendingGate tables={[t]} edition={edition}>
        <div className="grid grid-cols-2 gap-2">
          <Num label="Living area" value={sqft} onChange={setSqft} suffix="ft²" />
          <Num label="Service volts" value={volts} onChange={setVolts} suffix="V" />
          <Num label="Small-appliance circuits" value={sa} onChange={setSa} />
          <Num label="Laundry circuits" value={ld} onChange={setLd} />
          <Num label="Fixed appliances (nameplate)" value={fixed} onChange={setFixed} suffix="VA" />
          {hvacOpts.map((o, k) => <Num key={o.label} label={o.label} value={hvac[k] ?? ''} onChange={(v) => setHvac((h) => { const x = [...h]; x[k] = v; return x; })} suffix="VA" />)}
        </div>
        {r && <Result><p>General {r.generalVa} VA → demand {r.generalDemandVa} VA</p><p>HVAC (largest) {r.hvacVa} VA</p><p>Total <b>{r.totalVa} VA ≈ {r.amps} A</b></p></Result>}
      </PendingGate>
      <Ahj />
    </div>
  );
}
