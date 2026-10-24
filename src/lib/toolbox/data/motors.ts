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
export const T430_52 = live<OcpdPercentRow>({ '2023': 'Table 430.52(C)(1)', '2017': 'Table 430.52', '2011': 'Table 430.52' },
  t.rows.flatMap((r) => t.headers.slice(1).map((d, k) => ({ motorType: r[0], device: d, percent: Number(r[k + 1]) }))), rawFile('12'),
  ['Not a standard size: next higher standard size permitted (Exc. 1).', 'Exc. 2 if the motor will not start: non-time-delay ≤600 A and Class CC up to 400%; time-delay up to 225%; inverse-time CB up to 400% (≤100 A FLC) or 300% (>100 A); instantaneous up to 1300%, 1700% for Design B energy-efficient.', 'Row labels are as Sparky supplied them; exact wording per edition is UNVERIFIED.']);
export const S430_22 = live<ConductorFactorRow>(same('430.22'), [{ rule: 'Single motor: conductor ampacity at least 125% of table FLC', percentOfFlc: 125 }], 'docs/toolbox-data/13-430-22-motor-conductor-125.md',
  ['Several motors (430.24): 125% of the largest FLC plus the other FLCs plus other loads.', 'Non-continuous duty: 430.22(E). Subsection lettering per edition is UNVERIFIED.']);
