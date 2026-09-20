import type { DbDef, FieldDef, FileRef, RecordValue, RelationRef } from '../schema';
import { dualLabel, getDb } from '../schema';
import type { NotionPage, NotionPropertyValue } from './client';

const RICH_TEXT_LIMIT = 2000;

/* ------------------------------------------------------------------ *
 * Field definition  ->  Notion property schema (used when provisioning)
 * ------------------------------------------------------------------ */

export function propertySchema(db: DbDef, field: FieldDef, databaseIds: Partial<Record<string, string>>): Record<string, unknown> | null {
  switch (field.type) {
    case 'title':
      return { title: {} };
    case 'text':
    case 'longtext':
      return { rich_text: {} };
    case 'number':
      return { number: { format: 'number' } };
    case 'money':
      return { number: { format: 'dollar' } };
    case 'percent':
      return { number: { format: 'percent' } };
    case 'select':
      return { select: { options: (field.options ?? []).map((name) => ({ name })) } };
    case 'multi_select':
      return { multi_select: { options: (field.options ?? []).map((name) => ({ name })) } };
    case 'date':
    case 'datetime':
      return { date: {} };
    case 'checkbox':
      return { checkbox: {} };
    case 'url':
      return { url: {} };
    case 'email':
      return { email: {} };
    case 'phone':
      return { phone_number: {} };
    case 'files':
      return { files: {} };
    case 'created_time':
      return { created_time: {} };
    case 'last_edited_time':
      return { last_edited_time: {} };
    case 'relation': {
      const targetId = field.relation ? databaseIds[field.relation] : undefined;
      // Relations are added in a second pass, once every database exists.
      if (!targetId) return null;
      return field.dual
        ? {
            relation: {
              database_id: targetId,
              type: 'dual_property',
              dual_property: { synced_property_name: dualLabel(db, field) },
            },
          }
        : { relation: { database_id: targetId, type: 'single_property', single_property: {} } };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * App value  ->  Notion property value
 * ------------------------------------------------------------------ */

export function encodeValue(field: FieldDef, value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;

  switch (field.type) {
    case 'title':
      return { title: richText(asString(value)) };
    case 'text':
    case 'longtext':
      return { rich_text: richText(asString(value)) };
    case 'number':
    case 'money':
    case 'percent': {
      const n = value === null || value === '' ? null : Number(value);
      return { number: n === null || Number.isNaN(n) ? null : n };
    }
    case 'select': {
      const name = asString(value);
      return { select: name ? { name } : null };
    }
    case 'multi_select': {
      const list = Array.isArray(value) ? value : asString(value) ? asString(value).split(',') : [];
      return { multi_select: list.map((v) => ({ name: String(v).trim() })).filter((v) => v.name) };
    }
    case 'date':
    case 'datetime': {
      const start = asString(value);
      return { date: start ? { start } : null };
    }
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'url': {
      const url = asString(value);
      return { url: url || null };
    }
    case 'email': {
      const email = asString(value);
      return { email: email || null };
    }
    case 'phone': {
      const phone = asString(value);
      return { phone_number: phone || null };
    }
    case 'relation': {
      const refs = toRelationArray(value);
      return { relation: refs.map((r) => ({ id: r.id })) };
    }
    case 'files': {
      const files = toFileArray(value);
      return {
        files: files.map((f) =>
          f.uploadId
            ? { type: 'file_upload', file_upload: { id: f.uploadId }, name: f.name }
            : { type: 'external', external: { url: f.url }, name: f.name },
        ),
      };
    }
    default:
      return undefined;
  }
}

export function encodeProperties(db: DbDef, values: Record<string, unknown>): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const field of db.fields) {
    if (field.type === 'created_time' || field.type === 'last_edited_time') continue;
    if (!(field.key in values)) continue;
    const encoded = encodeValue(field, values[field.key]);
    if (encoded !== undefined) props[field.label] = encoded;
  }
  return props;
}

/* ------------------------------------------------------------------ *
 * Notion page  ->  app record
 * ------------------------------------------------------------------ */

export function decodePage(db: DbDef, page: NotionPage): RecordValue {
  const record: RecordValue = {
    id: page.id,
    url: page.url,
    createdTime: page.created_time,
    lastEditedTime: page.last_edited_time,
  };
  for (const field of db.fields) {
    record[field.key] = decodeValue(field, page.properties?.[field.label]);
  }
  return record;
}

export function decodeValue(field: FieldDef, prop: NotionPropertyValue | undefined): unknown {
  if (!prop) return defaultFor(field);

  switch (field.type) {
    case 'title':
      return plainText(prop.title);
    case 'text':
    case 'longtext':
      return plainText(prop.rich_text);
    case 'number':
    case 'money':
    case 'percent':
      return (prop.number as number | null) ?? null;
    case 'select':
      return (prop.select as { name?: string } | null)?.name ?? null;
    case 'multi_select':
      return ((prop.multi_select as { name: string }[] | undefined) ?? []).map((o) => o.name);
    case 'date':
    case 'datetime':
      return (prop.date as { start?: string } | null)?.start ?? null;
    case 'checkbox':
      return Boolean(prop.checkbox);
    case 'url':
      return (prop.url as string | null) ?? null;
    case 'email':
      return (prop.email as string | null) ?? null;
    case 'phone':
      return (prop.phone_number as string | null) ?? null;
    case 'relation':
      return ((prop.relation as { id: string }[] | undefined) ?? []).map((r) => ({ id: r.id }) as RelationRef);
    case 'files':
      return ((prop.files as NotionFile[] | undefined) ?? []).map(decodeFile);
    case 'created_time':
      return (prop.created_time as string | undefined) ?? null;
    case 'last_edited_time':
      return (prop.last_edited_time as string | undefined) ?? null;
    default:
      return null;
  }
}

interface NotionFile {
  name?: string;
  type?: string;
  file?: { url: string; expiry_time?: string };
  external?: { url: string };
}

function decodeFile(f: NotionFile): FileRef {
  return {
    name: f.name ?? 'file',
    url: f.file?.url ?? f.external?.url ?? '',
    expiryTime: f.file?.expiry_time,
  };
}

function defaultFor(field: FieldDef): unknown {
  switch (field.type) {
    case 'multi_select':
    case 'relation':
    case 'files':
      return [];
    case 'checkbox':
      return false;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

export function plainText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((chunk) => (chunk as { plain_text?: string }).plain_text ?? '').join('');
}

/** Notion rejects rich-text chunks over 2000 chars, so long notes are split. */
function richText(text: string): unknown[] {
  if (!text) return [];
  const chunks: unknown[] = [];
  for (let i = 0; i < text.length; i += RICH_TEXT_LIMIT) {
    chunks.push({ type: 'text', text: { content: text.slice(i, i + RICH_TEXT_LIMIT) } });
  }
  return chunks;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

export function toRelationArray(value: unknown): RelationRef[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === 'string') return { id: item };
      if (item && typeof item === 'object' && 'id' in item) return { id: String((item as RelationRef).id), label: (item as RelationRef).label };
      return null;
    })
    .filter((x): x is RelationRef => Boolean(x && x.id));
}

export function toFileArray(value: unknown): FileRef[] {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === 'string') return { name: fileNameFromUrl(item), url: item };
      if (item && typeof item === 'object') {
        const f = item as Partial<FileRef>;
        if (f.uploadId || f.url) return { name: f.name ?? 'file', url: f.url ?? '', uploadId: f.uploadId, expiryTime: f.expiryTime };
      }
      return null;
    })
    .filter((x): x is FileRef => Boolean(x));
}

function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'file');
  } catch {
    return 'file';
  }
}

/** Display label for a record, used for relation chips and page titles. */
export function recordLabel(dbKey: string, record: RecordValue | undefined): string {
  if (!record) return '';
  const db = getDb(dbKey);
  const title = db.fields.find((f) => f.type === 'title');
  return title ? String(record[title.key] ?? '') : '';
}
