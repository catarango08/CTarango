import { live, same, type Verifiable } from '../types';
import { rawFile, rawTable } from './raw';
export interface SmallConductorRow extends Verifiable { size: string; material: 'Cu' | 'Al'; maxOcpdAmps: number; condition?: string }
const t = rawTable('03');
export const S240_4D = live<SmallConductorRow>(same('240.4(D)'), t.rows.map(([c, max]) => {
  const m = c.match(/^(\d+) AWG (Cu|Al\/CCA)$/)!;
  const a = max.match(/^(\d+) A(?: \((.*)\))?$/)!;
  return { size: m[1], material: m[2] === 'Cu' ? 'Cu' : 'Al', maxOcpdAmps: Number(a[1]), condition: a[2] };
}), rawFile('03'), ['Applies after ambient and bundling correction unless 240.4(E) or (G) permits otherwise.', '18 and 16 AWG conditions in (D)(1)/(D)(2) not checked word for word in each edition.']);
