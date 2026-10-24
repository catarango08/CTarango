/**
 * Toolbox math. Pure functions; every code value comes in as table rows from
 * data/*.ts — nothing here hard-codes an NEC number. Physics only (√3, Ohm's law).
 */
import type { AmpacityRow } from './data/t310-16';
import type { ResistanceRow } from './data/ch9-table8';
import type { SmallConductorRow } from './data/s240-4d';
import type { BoxVolumeRow, ConductorVolumeRow, BoxAllowanceRow, RuleId } from './data/t314-16';
import type { FillPercentRow, RacewayAreaRow, WireAreaRow, Raceway, Insulation } from './data/ch9-fill';
import type { FlcRow, OcpdPercentRow, ConductorFactorRow } from './data/motors';
import type { EgcRow, GecRow } from './data/grounding';
import type { OptionalCalcRow } from './data/s220-82';
import type { StdRow } from './data/s240-6a';
import type { Exc2Row } from './data/motors';


const SQRT3 = Math.sqrt(3);
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

// ── Ohm's law / power ──────────────────────────────────────────────
export type System = 'dc' | 'ac1' | 'ac3';
export interface OhmsIn { system: System; volts?: number; amps?: number; ohms?: number; watts?: number; pf?: number }
export interface OhmsOut { volts: number; amps: number; ohms: number | null; watts: number; va: number; error?: string }

/** Give any two of V, I, R, P. AC uses P = V·I·PF (1ph) or √3·V·I·PF (3ph, V line-to-line). */
export function ohms(i: OhmsIn): OhmsOut | { error: string } {
  const pf = i.system === 'dc' ? 1 : i.pf ?? 1;
  if (!(pf > 0 && pf <= 1)) return { error: 'Power factor must be between 0 and 1' };
  const k = i.system === 'ac3' ? SQRT3 : 1; // P = k·V·I·pf
  const has = (x?: number) => typeof x === 'number' && Number.isFinite(x) && x > 0;
  let { volts: V, amps: I, ohms: R, watts: P } = i;
  const given = [V, I, R, P].filter(has).length;
  if (given < 2) return { error: 'Enter any two values' };
  if (i.system === 'ac3' && has(R) && !(has(V) && has(I))) {
    // Per-phase impedance on a 3ph system is ambiguous without a connection; keep it simple.
    if (!(has(V) || has(I))) return { error: 'For three-phase, enter volts or amps with R' };
  }
  if (has(V) && has(I)) { /* done */ }
  else if (has(V) && has(R)) I = V! / R! / (i.system === 'ac3' ? SQRT3 : 1);
  else if (has(I) && has(R)) V = I! * R! * (i.system === 'ac3' ? SQRT3 : 1);
  else if (has(P) && has(V)) I = P! / (k * V! * pf);
  else if (has(P) && has(I)) V = P! / (k * I! * pf);
  else if (has(P) && has(R)) {
    // P = I²·R·pf-adjusted only cleanly for DC / 1ph resistive; use per-phase: P = k·I²·R·... keep DC/1ph
    if (i.system === 'ac3') return { error: 'For three-phase, enter volts or amps' };
    I = Math.sqrt(P! / (R! * pf)); V = I * R!;
  }
  const out: OhmsOut = { volts: round(V!, 3), amps: round(I!, 3), ohms: null, watts: 0, va: 0 };
  out.va = round(k * V! * I!, 2);
  out.watts = round(out.va * pf, 2);
  out.ohms = round(i.system === 'ac3' ? V! / (SQRT3 * I!) : V! / I!, 4); // 3ph: per-phase (wye-equivalent)
  return out;
}

/** Collect distinct UNVERIFIED notes from rows a result relied on. */
const flags = (...rows: ({ verify?: string } | null | undefined)[]) => [...new Set(rows.map((r) => r?.verify).filter((v): v is string => !!v))];

// ── Voltage drop ───────────────────────────────────────────────────
export const vdKey = (r: ResistanceRow) => `${r.size}|${r.strands}`;
export const vdLabel = (r: ResistanceRow) => `${r.size} (${r.strands === 'solid' ? 'solid' : `${r.strands} strand`})`;
export interface VdIn { material: 'Cu' | 'Al'; phase: 1 | 3; lengthFt: number; amps: number; volts: number; key: string; targetPct?: number }
/** VD = 2·L·I·R/1000 (1ph) or √3·L·I·R/1000 (3ph), R in Ω/kft, L one-way ft. */
export function voltageDrop(rows: ResistanceRow[], i: VdIn) {
  const r = (row: ResistanceRow) => (i.material === 'Cu' ? row.cuOhmsPerKft : row.alOhmsPerKft);
  const mult = i.phase === 3 ? SQRT3 : 2;
  const vd = (R: number) => (mult * i.lengthFt * i.amps * R) / 1000;
  const row = rows.find((x) => vdKey(x) === i.key);
  const R = row ? r(row) : null;
  const dropV = R != null ? vd(R) : null;
  const pct = dropV != null ? (dropV / i.volts) * 100 : null;
  const target = i.targetPct ?? null; // the user's own target; no code number assumed
  const suggest = target == null ? null : rows.find((x) => { const rr = r(x); return rr != null && (vd(rr) / i.volts) * 100 <= target; }) ?? null;
  return { ohmsPerKft: R, dropV: dropV == null ? null : round(dropV, 2), pct: pct == null ? null : round(pct, 2), suggest: suggest ? vdLabel(suggest) : null, target, verify: flags(row, suggest) };
}

// ── Ampacity / breaker ─────────────────────────────────────────────
export function ampacity(rows: AmpacityRow[], small: SmallConductorRow[], size: string, material: 'Cu' | 'Al', column: string) {
  const row = rows.find((r) => r.size === size && r.material === material && r.column === column);
  const limit = small.find((s) => s.size === size && s.material === material);
  return { amps: row?.amps ?? null, smallConductorMaxOcpd: limit?.maxOcpdAmps ?? null, verify: flags(row, limit) };
}
/** Smallest conductor in the chosen column whose ampacity (and any 240.4(D) limit) ≥ load. */
export function sizeForLoad(rows: AmpacityRow[], small: SmallConductorRow[], loadAmps: number, material: 'Cu' | 'Al', column: string) {
  const hit = rows.filter((r) => r.material === material && r.column === column).find((r) => {
    const lim = small.find((s) => s.size === r.size && s.material === material)?.maxOcpdAmps;
    return r.amps >= loadAmps && (lim == null || lim >= loadAmps);
  });
  return hit?.size ?? null;
}
export const ampacityColumns = (rows: AmpacityRow[], material: 'Cu' | 'Al') => [...new Set(rows.filter((r) => r.material === material).map((r) => r.column))];

// ── Box fill ───────────────────────────────────────────────────────
export interface BoxCount { size: string; count: number }
export interface BoxFillIn {
  box?: string; customBoxIn?: number;
  conductors: BoxCount[];
  /** Counts for each rule by id (loops, support types, yokes, extra gangs); booleans as 0/1 for clamps/EGC/iso. */
  items: Partial<Record<Exclude<RuleId, 'conductor'>, number>>;
  largestSize?: string; deviceSize?: string; egcSize?: string; isoEgcSize?: string;
}
export function boxFill(boxes: BoxVolumeRow[], per: ConductorVolumeRow[], rules: BoxAllowanceRow[], i: BoxFillIn) {
  const boxRow = i.box ? boxes.find((b) => b.box === i.box) ?? null : null;
  const vol = i.customBoxIn ?? boxRow?.cubicIn ?? null;
  const vOf = (size?: string) => (size ? per.find((p) => p.size === size)?.cubicIn ?? null : null);
  const lines: { item: string; units: number; size: string; cubicIn: number; verify?: string }[] = [];
  const missing: string[] = []; const used: BoxAllowanceRow[] = [];
  const conductor = rules.find((r) => r.id === 'conductor');
  for (const c of i.conductors) {
    if (!c.count || !conductor) continue;
    const v = vOf(c.size); if (v == null) { missing.push(c.size); continue; }
    lines.push({ item: `${c.count} × ${c.size} AWG conductor`, units: c.count * conductor.units, size: c.size, cubicIn: c.count * conductor.units * v });
    used.push(conductor);
  }
  const sizeFor = (r: BoxAllowanceRow) => (r.basis === 'largest device conductor' ? i.deviceSize ?? i.largestSize : r.basis === 'largest EGC' ? i.egcSize : r.basis === 'largest isolated EGC' ? i.isoEgcSize : i.largestSize);
  for (const r of rules) {
    if (r.id === 'conductor') continue;
    const n = i.items[r.id] ?? 0; if (!n) continue;
    const size = sizeFor(r); const v = vOf(size);
    if (v == null || !size) { missing.push(`${r.item}: pick a size`); continue; }
    lines.push({ item: r.item, units: n * r.units, size, cubicIn: n * r.units * v, verify: r.verify });
    used.push(r);
  }
  const need = lines.reduce((s, l) => s + l.cubicIn, 0);
  return { boxIn: vol, neededIn: round(need, 2), ok: vol == null ? null : round(need, 4) <= vol, lines, missing, verify: flags(boxRow, ...used, ...per.filter((p) => lines.some((l) => l.size === p.size))) };
}

// ── Conduit fill ───────────────────────────────────────────────────
export interface WireCount { insulation: Insulation; size: string; count: number }
export function conduitFill(t1: FillPercentRow[], t4: RacewayAreaRow[], t5: WireAreaRow[], raceway: Raceway, wires: WireCount[], nipplePercent?: number) {
  const n = wires.reduce((s, w) => s + w.count, 0);
  const pctRow = t1.find((r) => n >= r.minConductors && (r.maxConductors == null || n <= r.maxConductors)) ?? null;
  const percent = nipplePercent ?? pctRow?.percent ?? null;
  let area = 0; const missing: string[] = []; const wireRows: WireAreaRow[] = [];
  for (const w of wires) { if (!w.count) continue; const a = t5.find((x) => x.insulation === w.insulation && x.size === w.size); if (!a) missing.push(`${w.insulation} ${w.size}`); else { area += a.areaSqIn * w.count; wireRows.push(a); } }
  const sizes = t4.filter((r) => r.raceway === raceway);
  const allowed = (r: RacewayAreaRow) => (percent == null ? null : (r.totalAreaSqIn * percent) / 100);
  const idx = percent == null || n === 0 ? -1 : sizes.findIndex((r) => allowed(r)! >= area);
  const pick = idx >= 0 ? sizes[idx] : null;
  // Every raceway row compared up to the pick (or all rows if none fit) shaped the answer.
  const consulted = n === 0 ? [] : idx >= 0 ? sizes.slice(0, idx + 1) : sizes;
  return { conductors: n, wireAreaSqIn: round(area, 4), fillPercent: percent, tradeSize: pick?.tradeSize ?? null, allowedSqIn: pick ? round(allowed(pick)!, 4) : null, fillOfPick: pick ? round((area / pick.totalAreaSqIn) * 100, 1) : null, missing, verify: flags(pctRow, ...wireRows, ...consulted) };
}

// ── Motors ─────────────────────────────────────────────────────────
export function motor(flc: FlcRow[], ocpd: OcpdPercentRow[], cond: ConductorFactorRow[], hp: string, volts: number, motorType: string, device: string) {
  const row = flc.find((r) => r.hp === hp && r.volts === volts);
  if (!row) return null;
  const o = ocpd.find((x) => x.motorType === motorType && x.device === device) ?? null;
  const c = cond[0] ?? null;
  return { flc: row.amps, ocpdPercent: o?.percent ?? null, maxOcpd: o ? round((row.amps * o.percent) / 100, 1) : null, conductorPercent: c?.percentOfFlc ?? null, conductorAmps: c ? round((row.amps * c.percentOfFlc) / 100, 2) : null, verify: flags(row, o, c) };
}

// ── Grounding ──────────────────────────────────────────────────────
export const gecFor = (rows: GecRow[], idx: number) => rows[idx] ?? null;
/** Table 250.122 is "not exceeding": first row whose rating ≥ the OCPD. */
export function egcFor(rows: EgcRow[], ocpdAmps: number) {
  return [...rows].sort((a, b) => a.ocpdAmps - b.ocpdAmps).find((r) => r.ocpdAmps >= ocpdAmps) ?? null;
}

// ── 220.82 optional dwelling calc ──────────────────────────────────
export type HvacInputs = Partial<Record<'ac' | 'hp' | 'hpCompressor' | 'supplemental' | 'spaceHeat' | 'storage', number>>;
export interface DwellingIn { sqft: number; smallApplianceCircuits: number; laundryCircuits: number; fixedAppliancesVa: number; hvac: HvacInputs; heatUnits: number; compressorLockedOut: boolean; volts: number }
export function dwelling(rows: OptionalCalcRow[], i: DwellingIn) {
  const get = (k: OptionalCalcRow['kind']) => rows.find((r) => r.kind === k)?.value;
  const vaSqft = get('general-va-per-sqft'), sa = get('small-appliance-va-per-circuit'), ld = get('laundry-va-per-circuit');
  const first = get('general-first-va'), firstPct = get('general-first-pct'), rem = get('general-remainder-pct');
  if ([vaSqft, sa, ld, first, firstPct, rem].some((v) => v == null)) return null;
  const general = i.sqft * vaSqft! + i.smallApplianceCircuits * sa! + i.laundryCircuits * ld! + i.fixedAppliancesVa;
  const generalDemand = Math.min(general, first!) * (firstPct! / 100) + Math.max(0, general - first!) * (rem! / 100);
  const options = rows.filter((r) => r.kind === 'hvac' && r.hvac).map((r) => {
    const h = r.hvac!;
    const applies = h.when === 'units<4' ? i.heatUnits < 4 : h.when === 'units>=4' ? i.heatUnits >= 4 : true;
    const va = h.parts.reduce((s, p) => (p.input === 'hpCompressor' && i.compressorLockedOut ? s : s + (i.hvac[p.input] ?? 0) * (p.pct / 100)), 0);
    return { id: h.id, label: r.label, va: applies ? round(va, 0) : 0, applies };
  });
  const best = options.reduce<(typeof options)[number] | null>((b, o) => (o.applies && (!b || o.va > b.va) ? o : b), null);
  const hvac = best?.va ?? 0;
  const total = generalDemand + hvac;
  return { generalVa: round(general, 0), generalDemandVa: round(generalDemand, 0), hvacVa: hvac, hvacOption: best && best.va > 0 ? best.label : null, options, totalVa: round(total, 0), amps: round(total / i.volts, 1), verify: flags(...rows) };
}

// ── 240.6(A) standard sizes and rounding ───────────────────────────
export type DeviceKind = 'fuse' | 'breaker';
const stdList = (std: StdRow[], kind: DeviceKind) => std.filter((s) => kind === 'fuse' || !s.fuseOnly).map((s) => s.amps).sort((a, b) => a - b);
export const nextStdUp = (std: StdRow[], x: number, kind: DeviceKind = 'breaker') => stdList(std, kind).find((s) => s >= x) ?? null;
export const nextStdDown = (std: StdRow[], x: number, kind: DeviceKind = 'breaker') => [...stdList(std, kind)].reverse().find((s) => s <= x) ?? null;

export interface Rounded { amps: number | null; mode: 'up' | 'down' | 'exact' | 'cap'; rule: string; verify?: string }

/**
 * Conductor OCPD. 240.4(D) small-conductor limits are hard caps. Otherwise the result is "do not exceed"
 * the next standard size DOWN. 240.4(B) next-size-up is shown only as a VERIFY option, because its
 * conditions are not in Sparky's files.
 */
export function conductorOcpd(std: StdRow[], ampacityAmps: number, smallLimit: number | null) {
  const main: Rounded = smallLimit != null
    ? { amps: smallLimit, mode: 'cap', rule: `240.4(D): do not exceed ${smallLimit} A` }
    : std.some((s) => !s.fuseOnly && s.amps === ampacityAmps)
      ? { amps: ampacityAmps, mode: 'exact', rule: `240.6(A): ${ampacityAmps} A is a standard size; do not exceed` }
      : { amps: nextStdDown(std, ampacityAmps), mode: 'down', rule: `240.6(A): next standard size down from ${ampacityAmps} A; do not exceed` };
  const up = smallLimit == null && main.mode === 'down' ? nextStdUp(std, ampacityAmps) : null;
  const nextUp: Rounded | null = up == null ? null : { amps: up, mode: 'up', rule: '240.4(B) next standard size up, only where its conditions are met', verify: "UNVERIFIED: the 240.4(B) conditions are not in Sparky's files. Check the codebook before using the next size up." };
  return { main, nextUp };
}

/** Motor branch SC/GF. 430.52(C)(1) Exc. 1 allows the next higher standard size; Exc. 2 caps are "do not exceed". */
export function motorOcpd(std: StdRow[], exc2: Exc2Row[], flc: number, percent: number, device: string, motorType: string) {
  const kind: DeviceKind | null = /fuse/i.test(device) ? 'fuse' : /inverse-time/i.test(device) ? 'breaker' : null;
  const raw = round((flc * percent) / 100, 2);
  let main: Rounded;
  if (kind == null) main = { amps: raw, mode: 'cap', rule: `${percent}% of FLC; do not exceed`, verify: "UNVERIFIED: 240.6(A) in Sparky's file lists fuse and inverse-time breaker ratings only, so no standard size is applied to instantaneous-trip breakers." };
  else {
    const up = nextStdUp(std, raw, kind);
    main = up === raw ? { amps: up, mode: 'exact', rule: `${percent}% of FLC = standard size` }
      : up == null ? { amps: raw, mode: 'cap', rule: `${percent}% of FLC; above the largest standard size, do not exceed`, verify: 'UNVERIFIED: no standard size above this value in 240.6(A).' }
      : { amps: up, mode: 'up', rule: `430.52(C)(1) Exc. 1: ${raw} A is not a standard size; next higher standard ${kind} size permitted` };
  }
  const designB = motorType.startsWith('Design B');
  const e = exc2.find((x) => x.device === device && (!x.when || (x.when === 'flc<=100' ? flc <= 100 : x.when === 'flc>100' ? flc > 100 : x.when === 'designB' ? designB : !designB)));
  let exc: (Rounded & { percent: number; condition: string; rawAmps: number }) | null = null;
  if (e) {
    const cap = round((flc * e.percent) / 100, 2);
    const down = kind ? nextStdDown(std, cap, kind) : null;
    exc = kind
      ? { amps: down, mode: down === cap ? 'exact' : 'down', rule: `430.52(C)(1) Exc. 2 (motor will not start): ${e.percent}% = ${cap} A; do not exceed; next standard ${kind} size down`, verify: e.verify, percent: e.percent, condition: e.condition, rawAmps: cap }
      : { amps: cap, mode: 'cap', rule: `Exc. 2 (motor will not start): ${e.percent}%; do not exceed`, verify: e.verify ?? main.verify, percent: e.percent, condition: e.condition, rawAmps: cap };
  }
  return { rawAmps: raw, main, exc2: exc };
}
