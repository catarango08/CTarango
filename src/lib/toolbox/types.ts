/**
 * Toolbox data contracts. RULE: no NEC numbers are typed from memory. Every
 * code table lives in src/lib/toolbox/data/*.ts, one block per edition, and
 * stays `pending-sparky` with empty rows until Sparky supplies and reviews it.
 * A tool whose table is pending shows "Table pending review", never a result.
 */
export const EDITIONS = ['2023', '2017', '2011'] as const;
export type Edition = (typeof EDITIONS)[number];
export const DEFAULT_EDITION: Edition = '2023';

export type TableStatus = 'pending-sparky' | 'reviewed';

export interface EditionTable<Row> {
  /** Table number as printed in that edition, e.g. "Table 310.16". */
  label: string;
  status: TableStatus;
  /** Who supplied it and from what (book page, publisher), filled in on review. */
  source?: string;
  reviewedBy?: string;
  reviewedOn?: string;
  rows: Row[];
  /** Table-level notes from Sparky's file (shown under the tool). */
  notes?: string[];
  /** Open wording/label questions (UNVERIFIED) — shown as a VERIFY badge next to the citation. */
  verify?: string[];
}

/** Any row may carry a verify flag: Sparky marked the cell UNVERIFIED. Shown with a badge, never hidden. */
export interface Verifiable { verify?: string }

export type PerEdition<Row> = Record<Edition, EditionTable<Row>>;

export function tableFor<Row>(t: PerEdition<Row>, e: Edition): EditionTable<Row> {
  return t[e];
}
export const isReady = (t: { status: TableStatus; rows: unknown[] }) => t.status === 'reviewed' && t.rows.length > 0;

/** Build three pending editions with the same label (labels themselves to be confirmed by Sparky). */
export function pending<Row>(labels: Record<Edition, string>): PerEdition<Row> {
  return {
    '2023': { label: labels['2023'], status: 'pending-sparky', rows: [] },
    '2017': { label: labels['2017'], status: 'pending-sparky', rows: [] },
    '2011': { label: labels['2011'], status: 'pending-sparky', rows: [] },
  };
}
const same = (l: string): Record<Edition, string> => ({ '2023': l, '2017': l, '2011': l });
export { same };

export const SPARKY = 'Sparky';
export const SPARKY_ON = '2026-10-24';
/** Reviewed table, built from Sparky's delivered file. Rows may differ per edition. */
export function live<Row>(labels: Record<Edition, string>, rows: Record<Edition, Row[]> | Row[], source: string, notes?: Record<Edition, string[]> | string[]): PerEdition<Row> {
  const r = (e: Edition) => (Array.isArray(rows) ? rows : rows[e]);
  const n = (e: Edition) => (notes == null ? undefined : Array.isArray(notes) ? notes : notes[e]);
  const t = (e: Edition): EditionTable<Row> => ({ label: labels[e], status: 'reviewed', source, reviewedBy: SPARKY, reviewedOn: SPARKY_ON, rows: r(e), notes: n(e) });
  return { '2023': t('2023'), '2017': t('2017'), '2011': t('2011') };
}
/** Attach an open wording/label question to some editions of a table (shown with a VERIFY badge). */
export function flag<Row>(t: PerEdition<Row>, editions: Edition[], msg: string): PerEdition<Row> {
  for (const e of editions) t[e] = { ...t[e], verify: [...(t[e].verify ?? []), msg] };
  return t;
}
