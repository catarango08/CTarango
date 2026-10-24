import { live, type Edition, type Verifiable } from '../types';
import { rawFile, rawTable } from './raw';
/** Cells kept as text exactly as supplied (some are not plain numbers). */
export interface CoverRow extends Verifiable { location: string; column: number; wiringMethod: string; cover: string }
const t = rawTable('14');
const colName = (k: number, e: Edition) => { const h = t.headers[k + 1]; return k === 2 && e === '2023' ? `${h} / EMT (added 2023)` : h; };
const SLAB = 'UNVERIFIED: the 4 in. slab Col 4/5 split is from a 2014-based source and assumed for all editions.';
const rows = (e: Edition): CoverRow[] => t.rows.flatMap((r) => r.slice(1).map((c, k) => {
  const row: CoverRow = { location: r[0], column: k + 1, wiringMethod: colName(k, e), cover: c };
  return r[0].startsWith('Under min. 4 in.') && k >= 3 ? { ...row, verify: SLAB } : row;
}));
const common = ['Cover in inches, top of cable or raceway to finished grade.', 'Where a Col 1–3 method is used for a Col 4/5 circuit, the shallowest depth applies.', 'Rock: raceway with 2 in. concrete cover down to rock. Lesser depths permitted at risers and terminations.'];
export const T300_5 = live<CoverRow>({ '2023': 'Table 300.5', '2017': 'Table 300.5', '2011': 'Table 300.5' }, { '2023': rows('2023'), '2017': rows('2017'), '2011': rows('2011') }, rawFile('14'), {
  '2011': ['0 to 600 V.', ...common],
  '2017': ['0 to 1000 V. Col 5 footnotes a/b allow less depth for listed low-voltage lighting (411) and pool/spa low-voltage lighting.', ...common],
  '2023': ['0 to 1000 V. Col 5 footnotes as 2017. EMT added to Col 3; Note 6: direct-buried EMT must meet 358.10.', 'Designation (300.5 vs 300.5(A)) is UNVERIFIED.', ...common],
});
