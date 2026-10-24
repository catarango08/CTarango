import { live, same, type Verifiable } from '../types';
import { rawFile, rawTable } from './raw';
export interface FillPercentRow extends Verifiable { minConductors: number; maxConductors: number | null; percent: number; label: string }
export type Raceway = 'EMT' | 'PVC 40' | 'PVC 80' | 'RMC';
export interface RacewayAreaRow extends Verifiable { raceway: Raceway; tradeSize: string; totalAreaSqIn: number }
export type Insulation = 'THHN/THWN/THWN-2' | 'XHHW/XHHW-2';
export interface WireAreaRow extends Verifiable { insulation: Insulation; size: string; areaSqIn: number }
const t1 = rawTable('07');
const range = (l: string) => (l === 'Over 2' ? [3, null] : [Number(l), Number(l)]) as [number, number | null];
export const CH9_TABLE1 = live<FillPercentRow>(same('Chapter 9, Table 1'), t1.rows.map(([l, p]) => { const [mn, mx] = range(l); return { label: l, minConductors: mn, maxConductors: mx, percent: Number(p.replace('%', '')) }; }), rawFile('07'),
  ['Note 7 (round up at .8 when all conductors are the same size) is not applied by this tool.', 'Note 9: a multiconductor cable counts as one conductor.']);
/** Note 4 of file 07: nipples 24 in. or shorter. */
export const NIPPLE_PERCENT = 60;
const t4 = rawTable('08');
const RW: Record<string, Raceway> = { EMT: 'EMT', 'PVC Sch 40': 'PVC 40', 'PVC Sch 80': 'PVC 80', RMC: 'RMC' };
const PVC40_UNVERIFIED = ['2-1/2', '3', '3-1/2', '4'];
const V4 = 'UNVERIFIED: PVC Sch 40 2-1/2 to 4 in. areas came from a search synthesis of the NECA reprint.';
export const CH9_TABLE4 = live<RacewayAreaRow>(same('Chapter 9, Table 4'), t4.headers.slice(1).flatMap((h, k) => t4.rows.map((r) => {
  const row: RacewayAreaRow = { raceway: RW[h], tradeSize: r[0], totalAreaSqIn: Number(r[k + 1]) };
  return RW[h] === 'PVC 40' && PVC40_UNVERIFIED.includes(r[0]) ? { ...row, verify: V4 } : row;
})), rawFile('08'), ['Total internal area at 100%.']);
const t5 = rawTable('09');
export const CH9_TABLE5 = live<WireAreaRow>(same('Chapter 9, Table 5'), t5.headers.slice(1).flatMap((h, k) => t5.rows.map((r) => ({ insulation: h as Insulation, size: r[0], areaSqIn: Number(r[k + 1]) }))), rawFile('09'));
