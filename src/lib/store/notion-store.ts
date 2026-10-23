import type { DbDef, DbKey, FieldDef, FileRef, RecordValue } from '../schema';
import { getDb, titleField } from '../schema';
import { NotionClient, type NotionPage } from '../notion/client';
import { uploadFile } from '../notion/files';
import { decodePage, encodeProperties } from '../notion/mapper';
import { databaseId } from '../notion/registry';
import type { Condition, Query, Store, UploadInput } from './types';

/**
 * Properties the app knows about but this Notion database doesn't have yet
 * (bootstrap not run). Writes skip them instead of failing; the UI shows a quiet notice.
 */
const gapsG = globalThis as unknown as { __teSchemaGaps?: Map<string, Set<string>> };
export const schemaGaps: Map<string, Set<string>> = (gapsG.__teSchemaGaps ??= new Map());

export class NotionStore implements Store {
  private readonly props = new Map<string, { at: number; names: Set<string> }>();

  /** Drop properties the live database doesn't have. Never throws: unknown schema = send everything. */
  private async present(dbKey: DbKey, encoded: Record<string, unknown>): Promise<Record<string, unknown>> {
    let cached = this.props.get(dbKey);
    if (!cached || Date.now() - cached.at > 10 * 60_000) {
      try {
        const db = await this.client.retrieveDatabase(databaseId(dbKey));
        cached = { at: Date.now(), names: new Set(Object.keys(db.properties ?? {})) };
        this.props.set(dbKey, cached);
      } catch {
        return encoded;
      }
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(encoded)) {
      if (cached.names.has(k)) out[k] = v;
      else {
        if (!schemaGaps.has(dbKey)) schemaGaps.set(dbKey, new Set());
        schemaGaps.get(dbKey)!.add(k);
      }
    }
    return out;
  }

  readonly kind = 'notion' as const;
  private readonly client: NotionClient;

  constructor(client?: NotionClient) {
    this.client = client ?? new NotionClient();
  }

  async list(dbKey: DbKey, query: Query = {}): Promise<RecordValue[]> {
    const db = getDb(dbKey);
    const body: Record<string, unknown> = {};

    const filter = buildFilter(db, query);
    if (filter) body.filter = filter;

    const sorts = (query.sorts ?? (db.defaultSort ? [db.defaultSort] : []))
      .map((s) => {
        const field = db.fields.find((f) => f.key === s.key);
        return field ? { property: field.label, direction: s.direction } : null;
      })
      .filter(Boolean);
    if (sorts.length) body.sorts = sorts;

    let pages;
    try {
      pages = await this.client.queryAll(databaseId(dbKey), body, query.limit ?? 2000);
    } catch (err) {
      // A filter/sort on a property bootstrap hasn't added yet: list everything and filter in memory.
      if (!body.filter && !body.sorts) throw err;
      pages = await this.client.queryAll(databaseId(dbKey), {}, 2000);
      const all = pages.map((p) => decodePage(db, p as NotionPage));
      const conds = query.where ?? [];
      const kept = all.filter((r) => conds.every((c) => matchLocal(r, c)));
      return query.limit ? kept.slice(0, query.limit) : kept;
    }
    const records = pages.map((p) => decodePage(db, p));
    return query.limit ? records.slice(0, query.limit) : records;
  }

  async get(dbKey: DbKey, id: string): Promise<RecordValue | null> {
    const db = getDb(dbKey);
    try {
      const page = await this.client.retrievePage(id);
      return decodePage(db, page as NotionPage);
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async create(dbKey: DbKey, values: Record<string, unknown>): Promise<RecordValue> {
    const db = getDb(dbKey);
    const page = await this.client.createPage({
      parent: { database_id: databaseId(dbKey) },
      icon: { type: 'emoji', emoji: db.emoji },
      properties: await this.present(dbKey, encodeProperties(db, values)),
    });
    return decodePage(db, page);
  }

  async update(dbKey: DbKey, id: string, values: Record<string, unknown>): Promise<RecordValue> {
    const db = getDb(dbKey);
    const page = await this.client.updatePage(id, { properties: await this.present(dbKey, encodeProperties(db, values)) });
    return decodePage(db, page);
  }

  async archive(_dbKey: DbKey, id: string): Promise<void> {
    await this.client.updatePage(id, { archived: true });
  }

  upload(file: UploadInput): Promise<FileRef> {
    return uploadFile(this.client, file);
  }

  externalUrl(dbKey: DbKey, id: string): string {
    void dbKey;
    return `https://www.notion.so/${id.replace(/-/g, '')}`;
  }
}

/* ------------------------------------------------------------------ *
 * Query -> Notion filter
 * ------------------------------------------------------------------ */

function buildFilter(db: DbDef, query: Query): Record<string, unknown> | null {
  const clauses: Record<string, unknown>[] = [];

  for (const condition of query.where ?? []) {
    const field = db.fields.find((f) => f.key === condition.key);
    if (!field) continue;
    const clause = conditionToFilter(field, condition);
    if (clause) clauses.push(clause);
  }

  if (query.search) {
    clauses.push({ property: titleField(db).label, title: { contains: query.search } });
  }

  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  return { and: clauses };
}

function conditionToFilter(field: FieldDef, condition: Condition): Record<string, unknown> | null {
  const property = field.label;
  const value = condition.value;

  if (condition.op === 'in') {
    const list = Array.isArray(value) ? value : [value];
    const or = list
      .map((v) => conditionToFilter(field, { key: condition.key, op: 'equals', value: v }))
      .filter(Boolean) as Record<string, unknown>[];
    return or.length ? { or } : null;
  }

  switch (field.type) {
    case 'title':
    case 'text':
    case 'longtext': {
      const key = field.type === 'title' ? 'title' : 'rich_text';
      return { property, [key]: textPredicate(condition) };
    }
    case 'select':
      return { property, select: selectPredicate(condition) };
    case 'multi_select':
      return { property, multi_select: multiSelectPredicate(condition) };
    case 'number':
    case 'money':
    case 'percent':
      return { property, number: numberPredicate(condition) };
    case 'checkbox':
      return { property, checkbox: { equals: Boolean(value) } };
    case 'date':
    case 'datetime':
      return { property, date: datePredicate(condition) };
    case 'relation':
      return {
        property,
        relation:
          condition.op === 'is_empty'
            ? { is_empty: true }
            : condition.op === 'is_not_empty'
              ? { is_not_empty: true }
              : { contains: String(relationId(value)) },
      };
    case 'files':
      return { property, files: condition.op === 'is_empty' ? { is_empty: true } : { is_not_empty: true } };
    case 'email':
      return { property, email: textPredicate(condition) };
    case 'phone':
      return { property, phone_number: textPredicate(condition) };
    case 'url':
      return { property, url: textPredicate(condition) };
    default:
      return null;
  }
}

function textPredicate(c: Condition): Record<string, unknown> {
  switch (c.op) {
    case 'contains':
      return { contains: String(c.value ?? '') };
    case 'not_equals':
      return { does_not_equal: String(c.value ?? '') };
    case 'is_empty':
      return { is_empty: true };
    case 'is_not_empty':
      return { is_not_empty: true };
    default:
      return { equals: String(c.value ?? '') };
  }
}

function selectPredicate(c: Condition): Record<string, unknown> {
  switch (c.op) {
    case 'not_equals':
      return { does_not_equal: String(c.value ?? '') };
    case 'is_empty':
      return { is_empty: true };
    case 'is_not_empty':
      return { is_not_empty: true };
    default:
      return { equals: String(c.value ?? '') };
  }
}

function multiSelectPredicate(c: Condition): Record<string, unknown> {
  switch (c.op) {
    case 'not_equals':
      return { does_not_contain: String(c.value ?? '') };
    case 'is_empty':
      return { is_empty: true };
    case 'is_not_empty':
      return { is_not_empty: true };
    default:
      return { contains: String(c.value ?? '') };
  }
}

function numberPredicate(c: Condition): Record<string, unknown> {
  const n = Number(c.value);
  switch (c.op) {
    case 'gte':
      return { greater_than_or_equal_to: n };
    case 'lte':
      return { less_than_or_equal_to: n };
    case 'not_equals':
      return { does_not_equal: n };
    case 'is_empty':
      return { is_empty: true };
    case 'is_not_empty':
      return { is_not_empty: true };
    default:
      return { equals: n };
  }
}

function datePredicate(c: Condition): Record<string, unknown> {
  const value = String(c.value ?? '');
  switch (c.op) {
    case 'before':
    case 'lte':
      return { on_or_before: value };
    case 'after':
    case 'gte':
      return { on_or_after: value };
    case 'is_empty':
      return { is_empty: true };
    case 'is_not_empty':
      return { is_not_empty: true };
    default:
      return { equals: value };
  }
}

function relationId(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return String((value as { id: string }).id);
  return '';
}

function isNotFound(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404);
}

function matchLocal(r: RecordValue, c: Condition): boolean {
  const raw = r[c.key] as unknown;
  const vals = Array.isArray(raw) ? raw.map((x) => (typeof x === 'object' && x ? (x as { id?: string }).id : x)) : [raw];
  const str = (x: unknown) => String(x ?? '');
  const cmp = (x: unknown) => (typeof x === 'number' && typeof c.value === 'number' ? x - c.value : str(x).localeCompare(str(c.value)));
  switch (c.op) {
    case 'equals': return vals.some((x) => str(x) === str(c.value));
    case 'not_equals': return !vals.some((x) => str(x) === str(c.value));
    case 'contains': return vals.some((x) => str(x).toLowerCase().includes(str(c.value).toLowerCase()));
    case 'in': return Array.isArray(c.value) && vals.some((x) => (c.value as unknown[]).map(str).includes(str(x)));
    case 'gte': return vals.some((x) => x != null && cmp(x) >= 0);
    case 'lte': return vals.some((x) => x != null && cmp(x) <= 0);
    default: return true;
  }
}
