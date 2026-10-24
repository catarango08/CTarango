// Raw cells parsed verbatim from docs/toolbox-data/*.md by scripts/toolbox-import.mjs.
import raw from './sparky-raw.json';
type Raw = Record<string, { file: string; tables: { headers: string[]; rows: string[][] }[] }>;
const R = raw as Raw;
export const rawTable = (file: string, i = 0) => R[file].tables[i];
export const rawFile = (file: string) => `docs/toolbox-data/${R[file].file}`;
/** Parse a numeric cell exactly as written; "—" means not listed. */
export const num = (c: string): number | null => (c === '—' ? null : Number(c));
