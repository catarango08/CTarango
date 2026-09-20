import type { DbKey, FileRef, RecordValue } from '../schema';

export type ConditionOp =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'in'
  | 'gte'
  | 'lte'
  | 'before'
  | 'after'
  | 'is_empty'
  | 'is_not_empty';

export interface Condition {
  key: string;
  op: ConditionOp;
  value?: unknown;
}

export interface Query {
  where?: Condition[];
  sorts?: { key: string; direction: 'ascending' | 'descending' }[];
  limit?: number;
  /** Free-text match against the title field. */
  search?: string;
}

export interface UploadInput {
  name: string;
  contentType: string;
  data: Buffer | ArrayBuffer | Uint8Array;
}

export interface Store {
  readonly kind: 'notion' | 'demo';
  list(db: DbKey, query?: Query): Promise<RecordValue[]>;
  get(db: DbKey, id: string): Promise<RecordValue | null>;
  create(db: DbKey, values: Record<string, unknown>): Promise<RecordValue>;
  update(db: DbKey, id: string, values: Record<string, unknown>): Promise<RecordValue>;
  archive(db: DbKey, id: string): Promise<void>;
  upload(file: UploadInput): Promise<FileRef>;
  /** Public URL for the record in Notion, when there is one. */
  externalUrl(db: DbKey, id: string): string | null;
}
