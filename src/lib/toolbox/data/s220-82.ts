import { flag, live, same, type Verifiable } from '../types';
// Transcribed from Sparky's prose file 17 (no markdown table). Tests check each number appears there.
export interface OptionalCalcRow extends Verifiable {
  kind: 'general-va-per-sqft' | 'small-appliance-va-per-circuit' | 'laundry-va-per-circuit' | 'general-first-va' | 'general-first-pct' | 'general-remainder-pct' | 'hvac';
  label: string; value: number;
  /** For hvac options: which input(s) and percent applied. */
  hvac?: { id: string; parts: { input: 'ac' | 'hp' | 'hpCompressor' | 'supplemental' | 'spaceHeat' | 'storage'; pct: number }[]; when?: 'units<4' | 'units>=4' };
}
const rows: OptionalCalcRow[] = [
  { kind: 'general-va-per-sqft', label: '(B)(1) VA per sq ft (outside dimensions)', value: 3 },
  { kind: 'small-appliance-va-per-circuit', label: '(B)(2) VA per 20 A small-appliance circuit', value: 1500 },
  { kind: 'laundry-va-per-circuit', label: '(B)(2) VA per laundry circuit', value: 1500 },
  { kind: 'general-first-va', label: 'First 10 kVA of (B)', value: 10000 },
  { kind: 'general-first-pct', label: 'First 10 kVA at', value: 100 },
  { kind: 'general-remainder-pct', label: 'Remainder at', value: 40 },
  { kind: 'hvac', label: '(C)(1) 100% of AC/cooling', value: 100, hvac: { id: 'c1', parts: [{ input: 'ac', pct: 100 }] } },
  { kind: 'hvac', label: '(C)(2) 100% of heat pump without supplemental heat', value: 100, hvac: { id: 'c2', parts: [{ input: 'hp', pct: 100 }] } },
  { kind: 'hvac', label: '(C)(3) 100% heat pump compressor + 65% supplemental heat', value: 65, hvac: { id: 'c3', parts: [{ input: 'hpCompressor', pct: 100 }, { input: 'supplemental', pct: 65 }] } },
  { kind: 'hvac', label: '(C)(4) 65% electric space heat, fewer than 4 units', value: 65, hvac: { id: 'c4', parts: [{ input: 'spaceHeat', pct: 65 }], when: 'units<4' } },
  { kind: 'hvac', label: '(C)(5) 40% electric space heat, 4 or more units', value: 40, hvac: { id: 'c5', parts: [{ input: 'spaceHeat', pct: 40 }], when: 'units>=4' } },
  { kind: 'hvac', label: '(C)(6) 100% thermal storage / continuous heat', value: 100, hvac: { id: 'c6', parts: [{ input: 'storage', pct: 100 }] } },
];
export const S220_82 = live<OptionalCalcRow>(same('220.82'), rows, 'docs/toolbox-data/17-220-82-optional-dwelling.md',
  ['Single dwelling, 120/240 V or 208Y/120 V, service or feeder 100 A or more.', '(C)(3): if the compressor cannot run with the supplemental heat, leave the compressor out.']);
flag(S220_82, ['2023'], 'UNVERIFIED: 2023 order of (C)(1)–(6) and the "100 A or more" wording.');
