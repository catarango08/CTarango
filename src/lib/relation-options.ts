import { getDb, titleField, type DbKey } from './schema';
import { loadAll } from './data';
import type { RelationOption } from '@/components/record-form';

/** Options for every relation select on a generated form, keyed by target database. */
export async function loadRelationOptions(targets: DbKey[]): Promise<Record<string, RelationOption[]>> {
  const unique = [...new Set(targets)];
  const entries = await Promise.all(
    unique.map(async (target) => {
      const rows = await loadAll(target);
      const key = titleField(getDb(target)).key;
      return [
        target,
        rows
          .map((row) => ({ id: row.id, label: String(row[key] ?? '') }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
