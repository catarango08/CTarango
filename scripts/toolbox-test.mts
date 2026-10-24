// Toolbox tests: (1) data modules match Sparky's .md files row for row, (2) UNVERIFIED cells are
// flagged, (3) a sanity calc per tool. Expected numbers are read from the .md files, not typed here,
// except worked arithmetic on those values.
import assert from 'node:assert/strict';
import fs from 'node:fs';
// @ts-expect-error plain JS helper
import { load } from './toolbox-import.mjs';
import raw from '../src/lib/toolbox/data/sparky-raw.json' with { type: 'json' };
import { EDITIONS } from '../src/lib/toolbox/types.ts';
import { CH9_TABLE8 } from '../src/lib/toolbox/data/ch9-table8.ts';
import { T310_16 } from '../src/lib/toolbox/data/t310-16.ts';
import { S240_4D } from '../src/lib/toolbox/data/s240-4d.ts';
import { T314_16A, T314_16B, S314_16B_RULES } from '../src/lib/toolbox/data/t314-16.ts';
import { CH9_TABLE1, CH9_TABLE4, CH9_TABLE5, NIPPLE_PERCENT } from '../src/lib/toolbox/data/ch9-fill.ts';
import { T430_248, T430_250, T430_52, S430_22 } from '../src/lib/toolbox/data/motors.ts';
import { T300_5 } from '../src/lib/toolbox/data/t300-5.ts';
import { T250_66, T250_122 } from '../src/lib/toolbox/data/grounding.ts';
import { S220_82 } from '../src/lib/toolbox/data/s220-82.ts';
import { ampacity, boxFill, conduitFill, dwelling, egcFor, motor, ohms, sizeForLoad, voltageDrop } from '../src/lib/toolbox/calc.ts';

let n = 0; const ok = (name: string, f: () => void) => { f(); n++; console.log('  ✓', name); };
const md = load() as Record<string, { tables: { headers: string[]; rows: string[][] }[] }>;
const T = (id: string) => md[id].tables[0];
const text = (id: string) => fs.readFileSync(`docs/toolbox-data/${fs.readdirSync('docs/toolbox-data').find((f) => f.startsWith(id))}`, 'utf8');
const N = (c: string) => (c === '—' ? null : Number(c));

console.log('Data matches Sparky files');
ok('generated JSON is current with the .md files', () => assert.deepEqual(raw, md));
ok('all tables reviewed, non-empty, three editions only (no 2020)', () => {
  assert.deepEqual([...EDITIONS].sort(), ['2011', '2017', '2023']);
  for (const t of [CH9_TABLE8, T310_16, S240_4D, T314_16A, T314_16B, S314_16B_RULES, CH9_TABLE1, CH9_TABLE4, CH9_TABLE5, T430_248, T430_250, T430_52, S430_22, T300_5, T250_66, T250_122, S220_82])
    { assert.deepEqual(Object.keys(t).sort(), ['2011', '2017', '2023']); for (const e of EDITIONS) { assert.equal(t[e].status, 'reviewed'); assert.ok(t[e].rows.length > 0); } }
});
ok('Ch.9 Table 8 row for row', () => { for (const e of EDITIONS) { const r = CH9_TABLE8[e].rows; assert.equal(r.length, T('01').rows.length); T('01').rows.forEach((m, k) => assert.deepEqual([r[k].size, r[k].strands, r[k].cuOhmsPerKft, r[k].alOhmsPerKft], [m[0], m[1], N(m[2]), N(m[3])])); } });
ok('Ampacity row for row (every size × 6 columns)', () => {
  for (const e of EDITIONS) for (const m of T('02').rows) ['Cu 60', 'Cu 75', 'Cu 90', 'Al 60', 'Al 75', 'Al 90'].forEach((h, k) => {
    const [mat, c] = h.split(' '); const row = T310_16[e].rows.find((x) => x.size === m[0] && x.material === mat && x.column === `${c}°C`);
    assert.equal(row?.amps ?? null, N(m[k + 1]), `${e} ${m[0]} ${h}`);
  });
  assert.equal(T310_16['2023'].label, 'Table 310.16'); assert.equal(T310_16['2017'].label, 'Table 310.15(B)(16)'); assert.equal(T310_16['2011'].label, 'Table 310.15(B)(16)');
});
ok('240.4(D) row for row', () => T('03').rows.forEach((m, k) => { const r = S240_4D['2023'].rows[k]; assert.ok(m[0].startsWith(`${r.size} AWG`)); assert.ok(m[1].startsWith(`${r.maxOcpdAmps} A`)); }));
ok('Table 314.16(A) row for row incl. max counts', () => T('04').rows.forEach((m, k) => { const r = T314_16A['2023'].rows[k]; assert.equal(r.box, m[0]); assert.equal(r.cubicIn, Number(m[1])); T('04').headers.slice(2).forEach((h, j) => assert.equal(r.maxConductors[h], N(m[j + 2]))); }));
ok('Table 314.16(B) row for row', () => T('05').rows.forEach((m, k) => assert.deepEqual([T314_16B['2017'].rows[k].size, T314_16B['2017'].rows[k].cubicIn], [m[0], Number(m[1])])));
ok('Ch.9 Tables 1/4/5 row for row', () => {
  T('07').rows.forEach((m, k) => assert.equal(`${CH9_TABLE1['2023'].rows[k].percent}%`, m[1]));
  assert.ok(text('07').includes(`${NIPPLE_PERCENT}%`));
  const rw = ['EMT', 'PVC 40', 'PVC 80', 'RMC'];
  for (const m of T('08').rows) rw.forEach((w, j) => assert.equal(CH9_TABLE4['2023'].rows.find((x) => x.raceway === w && x.tradeSize === m[0])?.totalAreaSqIn, Number(m[j + 1]), `${w} ${m[0]}`));
  for (const m of T('09').rows) T('09').headers.slice(1).forEach((h, j) => assert.equal(CH9_TABLE5['2023'].rows.find((x) => x.insulation === h && x.size === m[0])?.areaSqIn, Number(m[j + 1])));
});
ok('Motor tables row for row; 430.52 labels per edition', () => {
  for (const [id, t] of [['10', T430_248], ['11', T430_250]] as const) for (const m of T(id).rows) T(id).headers.slice(1).forEach((h, j) => assert.equal(t['2023'].rows.find((x) => x.hp === m[0] && x.volts === Number(h.replace(' V', '')))?.amps ?? null, N(m[j + 1]), `${id} ${m[0]} ${h}`));
  for (const m of T('12').rows) T('12').headers.slice(1).forEach((d, j) => assert.equal(T430_52['2011'].rows.find((x) => x.motorType === m[0] && x.device === d)?.percent, Number(m[j + 1])));
  assert.equal(T430_52['2023'].label, 'Table 430.52(C)(1)'); assert.equal(T430_52['2017'].label, 'Table 430.52'); assert.equal(T430_52['2011'].label, 'Table 430.52');
  assert.ok(text('13').includes(`${S430_22['2023'].rows[0].percentOfFlc}%`));
});
ok('Table 300.5 same depths all editions; EMT only in 2023 col 3', () => {
  for (const e of EDITIONS) T('14').rows.forEach((m) => m.slice(1).forEach((c, k) => assert.equal(T300_5[e].rows.find((x) => x.location === m[0] && x.column === k + 1)?.cover, c)));
  assert.ok(T300_5['2023'].rows.find((x) => x.column === 3)!.wiringMethod.includes('EMT'));
  for (const e of ['2011', '2017'] as const) assert.ok(!T300_5[e].rows.find((x) => x.column === 3)!.wiringMethod.includes('EMT'));
});
ok('250.66 / 250.122 row for row', () => {
  T('15').rows.forEach((m, k) => { const r = T250_66['2023'].rows[k]; assert.deepEqual([r.serviceCu, r.serviceAl, r.gecCu, r.gecAl], m); });
  T('16').rows.forEach((m, k) => { const r = T250_122['2023'].rows[k]; assert.deepEqual([String(r.ocpdAmps), r.egcCu, r.egcAl], m); });
});
ok('220.82 values appear in Sparky file 17', () => {
  const s = text('17');
  for (const r of S220_82['2023'].rows) if (r.kind !== 'general-first-va') assert.ok(s.includes(`${r.value}${r.kind === 'general-va-per-sqft' ? ' VA per sq ft' : r.kind.includes('circuit') ? ' VA' : '%'}`), r.label);
  assert.ok(s.includes('first 10 kVA at 100%'));
});

console.log('UNVERIFIED cells flagged');
ok('PVC Sch 40 2-1/2..4 flagged, others not', () => { for (const r of CH9_TABLE4['2023'].rows) assert.equal(!!r.verify, r.raceway === 'PVC 40' && ['2-1/2', '3', '3-1/2', '4'].includes(r.tradeSize), `${r.raceway} ${r.tradeSize}`); });
ok('250.122 2500–6000 A flagged, others not', () => { for (const r of T250_122['2017'].rows) assert.equal(!!r.verify, r.ocpdAmps >= 2500); });
ok('314.16(B) loop/wide-device/iso-EGC flagged only in 2011', () => {
  for (const e of EDITIONS) for (const r of S314_16B_RULES[e].rows) assert.equal(!!r.verify, e === '2011' && ['loop', 'wide-device', 'iso-egc'].includes(r.id), `${e} ${r.id}`);
});

console.log('Sanity calcs (one per tool)');
ok("Ohm's law: 3ϕ 480 V 20 A PF .85", () => { const o = ohms({ system: 'ac3', volts: 480, amps: 20, pf: 0.85 }) as { watts: number; va: number }; assert.equal(o.va, 16627.69); assert.equal(o.watts, 14133.54); });
ok('Voltage drop: 12 AWG 7-strand Cu, 100 ft, 16 A, 120 V 1ϕ = 2·100·16·1.98/1000', () => {
  const v = voltageDrop(CH9_TABLE8['2023'].rows, { material: 'Cu', phase: 1, lengthFt: 100, amps: 16, volts: 120, key: '12|7', targetPct: 3 });
  assert.equal(v.dropV, 6.34); assert.equal(v.pct, 5.28); assert.equal(v.suggest, '8 (solid)') // 10 solid = 3.23%, 8 solid = 2.04%; assert.deepEqual(v.verify, []);
});
ok('Ampacity: 10 Cu 75°C → 35 A, 240.4(D) 30 A; 40 A load → 8 AWG', () => {
  const a = ampacity(T310_16['2011'].rows, S240_4D['2011'].rows, '10', 'Cu', '75°C'); assert.equal(a.amps, 35); assert.equal(a.smallConductorMaxOcpd, 30);
  assert.equal(sizeForLoad(T310_16['2023'].rows, S240_4D['2023'].rows, 40, 'Cu', '75°C'), '8');
  assert.equal(sizeForLoad(T310_16['2023'].rows, S240_4D['2023'].rows, 25, 'Cu', '75°C'), '10'); // 12 Cu = 25 A but 240.4(D) caps at 20
});
ok('Box fill: 4x1-1/2 sq (21.0) with 6×12 + device + clamps + EGC = 10×2.25 = 22.5 → over', () => {
  const r = boxFill(T314_16A['2023'].rows, T314_16B['2023'].rows, S314_16B_RULES['2023'].rows, { box: '4 x 1-1/2 square', conductors: [{ size: '12', count: 6 }], items: { device: 1, clamps: 1, egc: 1 }, largestSize: '12', deviceSize: '12', egcSize: '12' });
  assert.equal(r.neededIn, 22.5); assert.equal(r.boxIn, 21); assert.equal(r.ok, false); assert.deepEqual(r.verify, []);
  const r11 = boxFill(T314_16A['2011'].rows, T314_16B['2011'].rows, S314_16B_RULES['2011'].rows, { box: '4 x 2-1/8 square', conductors: [{ size: '12', count: 4 }], items: { loop: 1 }, largestSize: '12' });
  assert.equal(r11.neededIn, 13.5); assert.equal(r11.verify.length, 1); // 2011 loop rule → verify
});
ok('Conduit fill: 4×12 THHN in EMT → 1/2 (0.0532 ≤ 0.1216); PVC 40 big fill hits verify rows', () => {
  const c = conduitFill(CH9_TABLE1['2023'].rows, CH9_TABLE4['2023'].rows, CH9_TABLE5['2023'].rows, 'EMT', [{ insulation: 'THHN/THWN/THWN-2', size: '12', count: 4 }]);
  assert.equal(c.fillPercent, 40); assert.equal(c.wireAreaSqIn, 0.0532); assert.equal(c.tradeSize, '1/2'); assert.deepEqual(c.verify, []);
  const p = conduitFill(CH9_TABLE1['2023'].rows, CH9_TABLE4['2023'].rows, CH9_TABLE5['2023'].rows, 'PVC 40', [{ insulation: 'THHN/THWN/THWN-2', size: '500', count: 4 }]);
  assert.equal(p.wireAreaSqIn, 2.8292); assert.equal(p.tradeSize, '3'); assert.equal(p.verify.length, 1); // 7.268×.40 = 2.9072
  assert.equal(conduitFill(CH9_TABLE1['2023'].rows, CH9_TABLE4['2023'].rows, CH9_TABLE5['2023'].rows, 'EMT', [{ insulation: 'XHHW/XHHW-2', size: '6', count: 1 }]).fillPercent, 53);
});
ok('Motor: 10 HP 460 V 3ϕ → 14 A, conductor 17.5 A (file 13 example), inverse-time 250% → 35 A', () => {
  const m = motor(T430_250['2023'].rows, T430_52['2023'].rows, S430_22['2023'].rows, '10', 460, T('12').rows[1][0], 'Inverse-time CB')!;
  assert.equal(m.flc, 14); assert.equal(m.conductorAmps, 17.5); assert.ok(text('13').includes('17.5 A')); assert.equal(m.maxOcpd, 35);
  assert.equal(motor(T430_248['2023'].rows, [], S430_22['2023'].rows, '1-1/2', 115, '', '')!.flc, 20);
});
ok('Burial: dwelling driveway Col 1 = 18; 2023 EMT label', () => {
  assert.equal(T300_5['2023'].rows.find((r) => r.location.startsWith('One- and two-family') && r.column === 1)?.cover, '18');
  assert.ok(T300_5['2023'].rows.filter((r) => r.location.startsWith('Under min. 4 in.') && r.column >= 4).every((r) => r.verify));
});
ok('GEC/EGC: 3/0 Cu row → 4 Cu; 100 A → 8 Cu; 45 A → 10 Cu; 4000 A → verify', () => {
  assert.equal(T250_66['2023'].rows[2].gecCu, '4');
  assert.equal(egcFor(T250_122['2023'].rows, 100)?.egcCu, '8'); assert.equal(egcFor(T250_122['2023'].rows, 45)?.egcCu, '10');
  assert.ok(egcFor(T250_122['2023'].rows, 4000)?.verify); assert.equal(egcFor(T250_122['2023'].rows, 7000), null);
});
ok('220.82: 2000 ft², 2 SA, 1 laundry, 20000 VA fixed, 5000 AC, 4 heat units 10000 → 23200 VA', () => {
  // general = 6000+3000+1500+20000 = 30500; demand = 10000 + 20500×.40 = 18200; HVAC max(5000, 10000×.40=4000) = 5000
  const d = dwelling(S220_82['2023'].rows, { sqft: 2000, smallApplianceCircuits: 2, laundryCircuits: 1, fixedAppliancesVa: 20000, hvac: { ac: 5000, spaceHeat: 10000 }, heatUnits: 4, compressorLockedOut: false, volts: 240 })!;
  assert.equal(d.generalVa, 30500); assert.equal(d.generalDemandVa, 18200); assert.equal(d.hvacVa, 5000); assert.equal(d.totalVa, 23200); assert.equal(d.amps, 96.7);
  const h = dwelling(S220_82['2023'].rows, { sqft: 1000, smallApplianceCircuits: 2, laundryCircuits: 1, fixedAppliancesVa: 0, hvac: { hpCompressor: 4000, supplemental: 10000 }, heatUnits: 0, compressorLockedOut: true, volts: 240 })!;
  assert.equal(h.hvacVa, 6500);
});
console.log(`toolbox tests: ${n} passed`);
