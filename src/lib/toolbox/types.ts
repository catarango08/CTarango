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
}

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
