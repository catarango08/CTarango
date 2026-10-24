/**
 * Toolbox math. Pure functions; every code value comes in as table rows from
 * data/*.ts — nothing here hard-codes an NEC number. Physics only (√3, Ohm's law).
 */
import type { AmpacityRow } from './data/t310-16';
import type { ResistanceRow } from './data/ch9-table8';
import type { SmallConductorRow } from './data/s240-4d';
import type { BoxVolumeRow, ConductorVolumeRow } from './data/t314-16';
import type { FillPercentRow, RacewayAreaRow, WireAreaRow, Raceway } from './data/ch9-fill';
import type { FlcRow, OcpdPercentRow, ConductorFactorRow } from './data/motors';
import type { EgcRow, GecRow } from './data/grounding';
import type { OptionalCalcRow } from './data/s220-82';

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

// ── Voltage drop ───────────────────────────────────────────────────
export interface VdIn { material: 'Cu' | 'Al'; phase: 1 | 3; lengthFt: number; amps: number; volts: number; size: string; targetPct?: number }
/** VD = 2·L·I·R/1000 (1ph) or √3·L·I·R/1000 (3ph), R in Ω/kft one-way length. */
export function voltageDrop(rows: ResistanceRow[], i: VdIn) {
  const r = (row: ResistanceRow) => (i.material === 'Cu' ? row.cuOhmsPerKft : row.alOhmsPerKft);
  const mult = i.phase === 3 ? SQRT3 : 2;
  const vd = (R: number) => (mult * i.lengthFt * i.amps * R) / 1000;
  const row = rows.find((x) => x.size === i.size);
  const R = row ? r(row) : null;
  const dropV = R != null ? vd(R) : null;
  const pct = dropV != null ? (dropV / i.volts) * 100 : null;
  const target = i.targetPct ?? null; // the user's own target; no code number assumed
  // Rows are smallest→largest, resistance falling; first one under target is the suggestion.
  const suggest = target == null ? null : rows.find((x) => { const rr = r(x); return rr != null && (vd(rr) / i.volts) * 100 <= target; }) ?? null;
  return { dropV: dropV == null ? null : round(dropV, 2), pct: pct == null ? null : round(pct, 2), suggest: suggest?.size ?? null, target };
}

// ── Ampacity / breaker ─────────────────────────────────────────────
export function ampacity(rows: AmpacityRow[], small: SmallConductorRow[], size: string, material: 'Cu' | 'Al', column: string) {
  const row = rows.find((r) => r.size === size && r.material === material && r.column === column);
  const limit = small.find((s) => s.size === size && s.material === material);
  return { amps: row?.amps ?? null, smallConductorMaxOcpd: limit?.maxOcpdAmps ?? null };
}
/** Smallest conductor in the chosen column whose ampacity ≥ load (rows in table order). */
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
export function boxFill(boxes: BoxVolumeRow[], per: ConductorVolumeRow[], box: string, counts: BoxCount[], customBoxIn?: number) {
  const vol = customBoxIn ?? boxes.find((b) => b.box === box)?.cubicIn ?? null;
  let need = 0; const missing: string[] = [];
  for (const c of counts) {
    if (!c.count) continue;
    const v = per.find((p) => p.size === c.size)?.cubicIn;
    if (v == null) missing.push(c.size); else need += v * c.count;
  }
  return { boxIn: vol, neededIn: round(need, 2), ok: vol == null ? null : need <= vol, missing };
}

// ── Conduit fill ───────────────────────────────────────────────────
export interface WireCount { insulation: WireAreaRow['insulation']; size: string; count: number }
export function conduitFill(t1: FillPercentRow[], t4: RacewayAreaRow[], t5: WireAreaRow[], raceway: Raceway, wires: WireCount[]) {
  const n = wires.reduce((s, w) => s + w.count, 0);
  const pctRow = t1.find((r) => n >= r.minConductors && (r.maxConductors == null || n <= r.maxConductors));
  let area = 0; const missing: string[] = [];
  for (const w of wires) { if (!w.count) continue; const a = t5.find((x) => x.insulation === w.insulation && x.size === w.size)?.areaSqIn; if (a == null) missing.push(`${w.insulation} ${w.size}`); else area += a * w.count; }
  const sizes = t4.filter((r) => r.raceway === raceway);
  const allowed = (r: RacewayAreaRow) => (pctRow ? (r.totalAreaSqIn * pctRow.percent) / 100 : null);
  const pick = pctRow ? sizes.find((r) => allowed(r)! >= area) ?? null : null;
  return { conductors: n, wireAreaSqIn: round(area, 4), fillPercent: pctRow?.percent ?? null, tradeSize: pick?.tradeSize ?? null, allowedSqIn: pick ? round(allowed(pick)!, 4) : null, missing };
}

// ── Motors ─────────────────────────────────────────────────────────
export function motor(flc: FlcRow[], ocpd: OcpdPercentRow[], cond: ConductorFactorRow[], hp: string, volts: number, motorType: string, device: string) {
  const row = flc.find((r) => r.hp === hp && r.volts === volts);
  if (!row) return null;
  const pct = ocpd.find((o) => o.motorType === motorType && o.device === device)?.percent ?? null;
  const cf = cond[0]?.percentOfFlc ?? null;
  return { flc: row.amps, maxOcpd: pct == null ? null : round((row.amps * pct) / 100, 1), ocpdPercent: pct, conductorAmps: cf == null ? null : round((row.amps * cf) / 100, 1) };
}

// ── Grounding ──────────────────────────────────────────────────────
/** Rows in table order; pick the first row whose printed upper bound matches the chosen service size label. */
export const gecFor = (rows: GecRow[], idx: number) => rows[idx] ?? null;
export function egcFor(rows: EgcRow[], ocpdAmps: number) {
  return [...rows].sort((a, b) => a.ocpdAmps - b.ocpdAmps).find((r) => r.ocpdAmps >= ocpdAmps) ?? null;
}

// ── 220.82 optional dwelling calc ──────────────────────────────────
export interface DwellingIn { sqft: number; smallApplianceCircuits: number; laundryCircuits: number; fixedAppliancesVa: number; hvacVa: number[]; volts: number }
export function dwelling(rows: OptionalCalcRow[], i: DwellingIn) {
  const get = (k: OptionalCalcRow['kind']) => rows.find((r) => r.kind === k)?.value;
  const vaSqft = get('general-va-per-sqft'), sa = get('small-appliance-va-per-circuit'), ld = get('laundry-va-per-circuit');
  const first = get('general-first-va'), rem = get('general-remainder-pct');
  if ([vaSqft, sa, ld, first, rem].some((v) => v == null)) return null;
  const general = i.sqft * vaSqft! + i.smallApplianceCircuits * sa! + i.laundryCircuits * ld! + i.fixedAppliancesVa;
  const generalDemand = Math.min(general, first!) + Math.max(0, general - first!) * (rem! / 100);
  const hvacPcts = rows.filter((r) => r.kind === 'hvac-option-pct');
  const hvac = Math.max(0, ...i.hvacVa.map((va, k) => va * ((hvacPcts[k]?.value ?? 0) / 100)));
  const total = generalDemand + hvac;
  return { generalVa: round(general, 0), generalDemandVa: round(generalDemand, 0), hvacVa: round(hvac, 0), totalVa: round(total, 0), amps: round(total / i.volts, 1) };
}
