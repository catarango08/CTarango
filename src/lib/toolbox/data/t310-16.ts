import { flag, live, type Verifiable } from '../types';
import { num, rawFile, rawTable } from './raw';
// One row per size × material × column, read from the 6 value columns of Sparky's file 02.
export interface AmpacityRow extends Verifiable { size: string; material: 'Cu' | 'Al'; column: string; amps: number }
const t = rawTable('02');
const cols = t.headers.slice(1).map((h) => { const [m, c] = h.split(' '); return { material: (m === 'Cu' ? 'Cu' : 'Al') as 'Cu' | 'Al', column: `${c}°C` }; });
const rows: AmpacityRow[] = [];
for (const r of t.rows) cols.forEach((c, k) => { const a = num(r[k + 1]); if (a != null) rows.push({ size: r[0], ...c, amps: a }); });
export const T310_16 = live<AmpacityRow>({ '2023': 'Table 310.16', '2017': 'Table 310.15(B)(16)', '2011': 'Table 310.15(B)(16)' }, rows, rawFile('02'),
  ['Not more than 3 current-carrying conductors in raceway, cable or earth, 30°C ambient. Al column is Al / copper-clad Al.']);
flag(T310_16, ['2023'], 'UNVERIFIED: Table 310.16 (2023) not compared row by row with the primary NFPA 2023 text; secondary sources agree.');
