import type { DbKey, FieldDef, FileRef, RecordValue } from '../schema';
import { getDb, titleField } from '../schema';
import { toFileArray, toRelationArray } from '../notion/mapper';
import type { Condition, Query, Store, UploadInput } from './types';
import { buildDemoData } from './demo-data';

/**
 * In-memory store with the same semantics as the Notion one.
 *
 * It exists so the app is demoable the moment you clone it, and so the UI can
 * be developed without burning Notion rate limit. Writes live for the lifetime
 * of the server process only.
 */
export class DemoStore implements Store {
  readonly kind = 'demo' as const;
  private tables: Record<string, RecordValue[]>;
  private counter = 0;

  constructor() {
    this.tables = buildDemoData();
  }

  private table(db: DbKey): RecordValue[] {
    this.tables[db] ??= [];
    return this.tables[db];
  }

  async list(dbKey: DbKey, query: Query = {}): Promise<RecordValue[]> {
    const db = getDb(dbKey);
    let rows = [...this.table(dbKey)];

    for (const condition of query.where ?? []) {
      const field = db.fields.find((f) => f.key === condition.key);
      if (!field) continue;
      rows = rows.filter((row) => matches(field, row[field.key], condition));
    }

    if (query.search) {
      const needle = query.search.toLowerCase();
      const tKey = titleField(db).key;
      rows = rows.filter((row) => String(row[tKey] ?? '').toLowerCase().includes(needle));
    }

    const sorts = query.sorts ?? (db.defaultSort ? [db.defaultSort] : []);
    for (const sort of [...sorts].reverse()) {
      rows.sort((a, b) => compare(a[sort.key], b[sort.key]) * (sort.direction === 'descending' ? -1 : 1));
    }

    return query.limit ? rows.slice(0, query.limit) : rows;
  }

  async get(dbKey: DbKey, id: string): Promise<RecordValue | null> {
    return this.table(dbKey).find((r) => r.id === id) ?? null;
  }

  async create(dbKey: DbKey, values: Record<string, unknown>): Promise<RecordValue> {
    const db = getDb(dbKey);
    const now = new Date().toISOString();
    const record: RecordValue = { id: `demo-${dbKey}-${++this.counter}-${Date.now()}`, createdTime: now, lastEditedTime: now };
    for (const field of db.fields) {
      // Notion mints unique ids itself; stand in for it so demo mode matches.
      if (field.type === 'auto_number') {
        record[field.key] = `TE-${this.table(dbKey).length + 1}`;
        continue;
      }
      record[field.key] = normalize(field, values[field.key]);
    }
    this.table(dbKey).unshift(record);
    return record;
  }

  async update(dbKey: DbKey, id: string, values: Record<string, unknown>): Promise<RecordValue> {
    const db = getDb(dbKey);
    const record = this.table(dbKey).find((r) => r.id === id);
    if (!record) throw new Error(`No ${dbKey} record with id ${id}`);
    for (const field of db.fields) {
      if (field.key in values) record[field.key] = normalize(field, values[field.key]);
    }
    record.lastEditedTime = new Date().toISOString();
    return record;
  }

  async archive(dbKey: DbKey, id: string): Promise<void> {
    this.tables[dbKey] = this.table(dbKey).filter((r) => r.id !== id);
  }

  async upload(file: UploadInput): Promise<FileRef> {
    // Nothing leaves the process in demo mode; the placeholder renderer stands
    // in for Notion-hosted storage so the gallery still has something to show.
    const label = encodeURIComponent(file.name.replace(/\.[^.]+$/, ''));
    return { name: file.name, url: `/api/placeholder/upload?label=${label}` };
  }

  externalUrl(): string | null {
    return null;
  }
}

function normalize(field: FieldDef, value: unknown): unknown {
  switch (field.type) {
    case 'relation':
      return toRelationArray(value);
    case 'files':
      return toFileArray(value);
    case 'multi_select':
      return Array.isArray(value) ? value : value ? String(value).split(',').map((s) => s.trim()) : [];
    case 'checkbox':
      return Boolean(value);
    case 'number':
    case 'money':
    case 'percent':
      return value === '' || value === null || value === undefined ? null : Number(value);
    default:
      return value ?? null;
  }
}

function matches(field: FieldDef, actual: unknown, condition: Condition): boolean {
  const { op, value } = condition;

  if (op === 'is_empty') return isEmpty(actual);
  if (op === 'is_not_empty') return !isEmpty(actual);

  if (field.type === 'relation') {
    const ids = toRelationArray(actual).map((r) => r.id);
    const wanted = typeof value === 'string' ? value : (value as { id?: string })?.id ?? '';
    if (op === 'in') return (value as unknown[]).some((v) => ids.includes(String(v)));
    return ids.includes(wanted);
  }

  if (field.type === 'multi_select') {
    const list = Array.isArray(actual) ? actual.map(String) : [];
    if (op === 'not_equals') return !list.includes(String(value));
    if (op === 'in') return (value as unknown[]).some((v) => list.includes(String(v)));
    return list.includes(String(value));
  }

  switch (op) {
    case 'equals':
      return String(actual ?? '') === String(value ?? '');
    case 'not_equals':
      return String(actual ?? '') !== String(value ?? '');
    case 'contains':
      return String(actual ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'in':
      return (Array.isArray(value) ? value : [value]).some((v) => String(v) === String(actual ?? ''));
    case 'gte':
    case 'after':
      return compare(actual, value) >= 0;
    case 'lte':
    case 'before':
      return compare(actual, value) <= 0;
    default:
      return true;
  }
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
