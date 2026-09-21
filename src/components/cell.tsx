import type { ReactNode } from 'react';
import type { FieldDef, RecordValue } from '@/lib/schema';
import { Chips, RelationLinks, StatusPill } from './ui';
import { date, dateTime, money, number, percent } from '@/lib/format';

/** Renders one field of one record using the schema's declared type. */
export function renderCell(field: FieldDef, record: RecordValue): ReactNode {
  const value = record[field.key];
  switch (field.type) {
    case 'money':
      return money(value, true);
    case 'percent':
      return value === null || value === undefined ? '—' : percent(value);
    case 'number':
      return value === null || value === undefined ? '—' : number(value);
    case 'checkbox':
      return value ? '✓' : '—';
    case 'date':
      return date(value);
    case 'datetime':
      return dateTime(value);
    case 'select':
      return <StatusPill value={value} />;
    case 'multi_select':
      return <Chips values={value} max={3} />;
    case 'relation':
      return <RelationLinks refs={value} max={2} />;
    case 'files':
      return Array.isArray(value) && value.length ? `${value.length} file${value.length === 1 ? '' : 's'}` : '—';
    case 'longtext':
      return <span className="text-[color:var(--muted)]">{String(value ?? '—').slice(0, 90)}</span>;
    default:
      return String(value ?? '—');
  }
}

export function isNumericField(field: FieldDef): boolean {
  return ['number', 'money', 'percent'].includes(field.type);
}
