import { live, same, type Edition, type Verifiable } from '../types';
import { num, rawFile, rawTable } from './raw';
export interface BoxVolumeRow extends Verifiable { box: string; cubicIn: number; maxConductors: Record<string, number | null> }
export interface ConductorVolumeRow extends Verifiable { size: string; cubicIn: number }
/** Counting rules (314.16(B)(1)–(5)) transcribed from Sparky's file 06. `units` = volume allowances. */
export type RuleId = 'conductor' | 'loop' | 'clamps' | 'support' | 'device' | 'wide-device' | 'egc' | 'iso-egc';
export interface BoxAllowanceRow extends Verifiable { id: RuleId; item: string; units: number; per: string; basis: 'each conductor' | 'largest conductor' | 'largest device conductor' | 'largest EGC' | 'largest isolated EGC' }
const a = rawTable('04');
export const T314_16A = live<BoxVolumeRow>(same('Table 314.16(A)'), a.rows.map((r) => ({ box: r[0], cubicIn: Number(r[1]), maxConductors: Object.fromEntries(a.headers.slice(2).map((h, k) => [h, num(r[k + 2])])) })), rawFile('04'),
  ['Metal boxes. Counts assume no 314.16(B)(2)–(B)(5) allowances.', '4 x 1-1/4 round/oct, 8 AWG = 4 (one PDF read 5; two sources give 4).']);
export const T314_16B = live<ConductorVolumeRow>(same('Table 314.16(B)'), rawTable('05').rows.map(([size, v]) => ({ size, cubicIn: Number(v) })), rawFile('05'));
const base: BoxAllowanceRow[] = [
  { id: 'conductor', item: '(B)(1) Conductor from outside, terminated, spliced or passing through', units: 1, per: 'each', basis: 'each conductor' },
  { id: 'loop', item: '(B)(1) Unbroken loop/coil ≥ 2× the 300.14 free length', units: 2, per: 'each loop', basis: 'each conductor' },
  { id: 'clamps', item: '(B)(2) Internal cable clamps (one or more)', units: 1, per: 'total', basis: 'largest conductor' },
  { id: 'support', item: '(B)(3) Fixture stud or hickey', units: 1, per: 'each type', basis: 'largest conductor' },
  { id: 'device', item: '(B)(4) Device or equipment yoke/strap', units: 2, per: 'each yoke', basis: 'largest device conductor' },
  { id: 'wide-device', item: '(B)(4) Device wider than a single 2 in. device box', units: 2, per: 'each gang required', basis: 'largest device conductor' },
  { id: 'egc', item: '(B)(5) Equipment grounding conductors (all)', units: 1, per: 'total', basis: 'largest EGC' },
  { id: 'iso-egc', item: '(B)(5) 250.146(D) isolated EGCs', units: 1, per: 'additional', basis: 'largest isolated EGC' },
];
const LATER: RuleId[] = ['loop', 'wide-device', 'iso-egc'];
const V2011 = 'UNVERIFIED for 2011: Sparky could not confirm this rule is in the 2011 text (present in 2017 and 2023).';
const rules = (e: Edition) => base.map((r) => (e === '2011' && LATER.includes(r.id) ? { ...r, verify: V2011 } : r));
export const S314_16B_RULES = live<BoxAllowanceRow>(same('314.16(B)'), { '2023': rules('2023'), '2017': rules('2017'), '2011': rules('2011') }, 'docs/toolbox-data/06-314-16B-counting-rules.md',
  ['Conductors that never leave the box (pigtails, jumpers) count 0.', 'Exception: EGC or up to 4 fixture wires smaller than 14 AWG from a domed luminaire canopy are not counted.']);
