import { DATABASES } from './databases';
import type { DbDef, DbGroup, DbKey, FieldDef, FieldType } from './types';

export * from './types';
export { DATABASES } from './databases';
export {
  JOB_STATUSES, TERMINAL_STATUSES, JOB_TYPES, LEAD_SOURCES, JOB_TOWNS,
  PERMIT_STATES, TERRITORY_STATUSES, PHOTO_STAGES, REQUIRED_PHOTO_STAGES,
  ARRIVAL_PHOTO_STAGES, COMPLETION_PHOTO_STAGES,
  TRUCK_CATEGORIES, TOOL_CATEGORIES, TOOL_LOCATIONS, TOOL_CONDITIONS,
} from './databases';

const BY_KEY = new Map<DbKey, DbDef>(DATABASES.map((d) => [d.key, d as DbDef]));

export function getDb(key: string): DbDef {
  const db = BY_KEY.get(key as DbKey);
  if (!db) throw new Error(`Unknown database "${key}". Known: ${[...BY_KEY.keys()].join(', ')}`);
  return db;
}

export function tryGetDb(key: string): DbDef | undefined {
  return BY_KEY.get(key as DbKey);
}

export function allDatabases(): DbDef[] {
  return DATABASES as unknown as DbDef[];
}

export function getField(db: DbDef, key: string): FieldDef | undefined {
  return db.fields.find((f) => f.key === key);
}

export function titleField(db: DbDef): FieldDef {
  const f = db.fields.find((x) => x.type === 'title');
  if (!f) throw new Error(`Database "${db.key}" has no title field`);
  return f;
}

/** The reciprocal property name created on the related database. */
export function dualLabel(db: DbDef, field: FieldDef): string {
  return field.dualLabel ?? db.label;
}

export function columnsFor(db: DbDef): FieldDef[] {
  const cols = db.fields.filter((f) => f.column);
  return cols.length ? cols : db.fields.slice(0, 5);
}

const COMPUTED: FieldType[] = ['created_time', 'last_edited_time', 'auto_number', 'rollup', 'formula'];

/** Fields a human can actually set. Notion computes the rest. */
export function editableFields(db: DbDef): FieldDef[] {
  return db.fields.filter((f) => !f.derived && !f.readOnly && !COMPUTED.includes(f.type));
}

/** Fields we never send on a write. */
export function isWritable(field: FieldDef): boolean {
  return !field.readOnly && !COMPUTED.includes(field.type);
}

export const GROUP_LABELS: Record<DbGroup, string> = {
  field: 'Field work',
  crm: 'Customers',
  money: 'Money',
  license: 'License file',
  supply: 'Supply',
  reference: 'Reference',
};

export function databasesByGroup(): { group: DbGroup; label: string; dbs: DbDef[] }[] {
  const order: DbGroup[] = ['field', 'crm', 'money', 'license', 'supply', 'reference'];
  return order.map((group) => ({
    group,
    label: GROUP_LABELS[group],
    dbs: allDatabases().filter((d) => d.group === group),
  }));
}

/** Sanity check used by the bootstrap script and a unit-style guard at import time. */
export function validateSchema(): string[] {
  const problems: string[] = [];
  for (const db of allDatabases()) {
    const titles = db.fields.filter((f) => f.type === 'title');
    if (titles.length !== 1) problems.push(`${db.key}: expected exactly one title field, found ${titles.length}`);
    const seen = new Set<string>();
    const labels = new Set<string>();
    for (const f of db.fields) {
      if (seen.has(f.key)) problems.push(`${db.key}.${f.key}: duplicate field key`);
      if (labels.has(f.label)) problems.push(`${db.key}: duplicate Notion property name "${f.label}"`);
      seen.add(f.key);
      labels.add(f.label);
      if (f.type === 'relation') {
        if (!f.relation) problems.push(`${db.key}.${f.key}: relation field is missing a target`);
        else if (!BY_KEY.has(f.relation)) problems.push(`${db.key}.${f.key}: relation target "${f.relation}" does not exist`);
      }
      if ((f.type === 'select' || f.type === 'multi_select') && !f.readOnly && (!f.options || f.options.length === 0)) {
        problems.push(`${db.key}.${f.key}: ${f.type} field has no options`);
      }
    }
  }
  return problems;
}
