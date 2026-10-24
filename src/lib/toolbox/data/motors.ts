import { live, same, type Verifiable } from '../types';
import { rawFile, rawTable } from './raw';
export interface FlcRow extends Verifiable { hp: string; volts: number; amps: number }
export interface OcpdPercentRow extends Verifiable { motorType: string; device: string; percent: number }
export interface ConductorFactorRow extends Verifiable { rule: string; percentOfFlc: number }
const flc = (id: string) => { const t = rawTable(id); const out: FlcRow[] = []; for (const r of t.rows) t.headers.slice(1).forEach((h, k) => { if (r[k + 1] !== '—') out.push({ hp: r[0], volts: Number(h.replace(' V', '')), amps: Number(r[k + 1]) }); }); return out; };
const FLC_NOTE = 'Per 430.6(A)(1), use table FLC, not nameplate, to size conductors and OCPD.';
export const T430_248 = live<FlcRow>(same('Table 430.248'), flc('10'), rawFile('10'), [FLC_NOTE]);
export const T430_250 = live<FlcRow>(same('Table 430.250'), flc('11'), rawFile('11'), [FLC_NOTE, 'Use the 460 V column for 440–480 V and the 230 V column for 220–240 V.']);
const t = rawTable('12');
/** Corey's decision (Oct 24): one label for the Design B energy-efficient row in every edition. Percentages unchanged. */
export const DESIGN_B = 'Design B (incl. energy-efficient/premium)';
const motorLabel = (l: string) => (l.startsWith('Design B energy-efficient') ? DESIGN_B : l);
export const T430_52 = live<OcpdPercentRow>({ '2023': 'Table 430.52(C)(1)', '2017': 'Table 430.52', '2011': 'Table 430.52' },
  t.rows.flatMap((r) => t.headers.slice(1).map((d, k) => ({ motorType: motorLabel(r[0]), device: d, percent: Number(r[k + 1]) }))), rawFile('12'),
  ['Not a standard size: next higher standard size permitted (Exc. 1).', 'Exc. 2 if the motor will not start: non-time-delay ≤600 A and Class CC up to 400%; time-delay up to 225%; inverse-time CB up to 400% (≤100 A FLC) or 300% (>100 A); instantaneous up to 1300%, 1700% for Design B energy-efficient.']);
export const S430_22 = live<ConductorFactorRow>(same('430.22'), [{ rule: 'Single motor: conductor ampacity at least 125% of table FLC', percentOfFlc: 125 }], 'docs/toolbox-data/13-430-22-motor-conductor-125.md',
  ['Several motors (430.24): 125% of the largest FLC plus the other FLCs plus other loads.', 'Non-continuous duty uses different percentages (see 430.22).']);

/** 430.52 Exc. 2 (motor will not start) maximums, transcribed from Sparky's file 12. `verify` = condition wording unclear. */
export interface Exc2Row { device: string; percent: number; when?: 'flc<=100' | 'flc>100' | 'designB' | 'notDesignB'; condition: string; verify?: string }
export const T430_52_EXC2: Exc2Row[] = [
  { device: 'Non-time-delay fuse', percent: 400, condition: 'Non-time-delay fuses ≤600 A and Class CC fuses', verify: 'UNVERIFIED: whether "≤600 A" is the fuse rating, and how Class CC applies, is not spelled out in Sparky\'s file.' },
  { device: 'Dual-element (TD) fuse', percent: 225, condition: 'Time-delay fuses' },
  { device: 'Inverse-time CB', percent: 400, when: 'flc<=100', condition: 'Inverse-time CB, FLC ≤100 A' },
  { device: 'Inverse-time CB', percent: 300, when: 'flc>100', condition: 'Inverse-time CB, FLC above 100 A' },
  { device: 'Instantaneous-trip CB', percent: 1300, when: 'notDesignB', condition: 'Instantaneous trip' },
  { device: 'Instantaneous-trip CB', percent: 1700, when: 'designB', condition: 'Instantaneous trip, Design B energy-efficient (430.52(C)(3))' },
];
