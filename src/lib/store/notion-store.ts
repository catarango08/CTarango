import type { DbDef, DbKey, FieldDef, FileRef, RecordValue } from '../schema';
import { getDb, titleField } from '../schema';
import { NotionClient, type NotionPage } from '../notion/client';
import { uploadFile } from '../notion/files';
import { decodePage, encodeProperties } from '../notion/mapper';
import { databaseId } from '../notion/registry';
import type { Condition, Query, Store, UploadInput } from './types';

export class NotionStore implements Store {
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

    const pages = await this.client.queryAll(databaseId(dbKey), body, query.limit ?? 2000);
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
      properties: encodeProperties(db, values),
    });
    return decodePage(db, page);
  }

  async update(dbKey: DbKey, id: string, values: Record<string, unknown>): Promise<RecordValue> {
    const db = getDb(dbKey);
    const page = await this.client.updatePage(id, { properties: encodeProperties(db, values) });
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
