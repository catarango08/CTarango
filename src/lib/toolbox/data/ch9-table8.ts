import { live, same, type Verifiable } from '../types';
import { num, rawFile, rawTable } from './raw';
export interface ResistanceRow extends Verifiable { size: string; strands: string; cuOhmsPerKft: number | null; alOhmsPerKft: number | null }
const t = rawTable('01');
export const CH9_TABLE8 = live<ResistanceRow>(same('Chapter 9, Table 8'),
  t.rows.map(([size, strands, cu, al]) => ({ size, strands, cuOhmsPerKft: num(cu), alOhmsPerKft: num(al) })),
  rawFile('01'), ['DC resistance at 75°C, ohm/1000 ft. Uncoated copper.', 'Temperature correction (Note 2): R2 = R1[1 + α(T2 − 75)], α = 0.00323 Cu, 0.00330 Al.']);
