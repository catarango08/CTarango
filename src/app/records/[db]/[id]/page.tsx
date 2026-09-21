import Link from 'next/link';
import { notFound } from 'next/navigation';
import { editableFields, tryGetDb, type DbKey } from '@/lib/schema';
import { findById } from '@/lib/data';
import { loadRelationOptions } from '@/lib/relation-options';
import { Card, Field, PageHeader } from '@/components/ui';
import { RecordForm } from '@/components/record-form';
import { renderCell } from '@/components/cell';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function RecordDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ db: string; id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { db: dbKey, id } = await params;
  const { edit } = await searchParams;
  const db = tryGetDb(dbKey);
  if (!db) notFound();

  const record = await findById(db.key as DbKey, id);
  if (!record) notFound();

  const fields = editableFields(db);
  const title = String(record[db.fields.find((f) => f.type === 'title')!.key] ?? 'Untitled');

  if (edit === 'true') {
    const relationOptions = await loadRelationOptions(fields.map((f) => f.relation).filter(Boolean) as DbKey[]);
    return (
      <>
        <PageHeader
          title={`Edit ${title}`}
          subtitle={db.label}
          actions={<Link href={`/records/${db.key}/${id}`} className="btn">Cancel</Link>}
        />
        <Card>
          <RecordForm
            db={db.key}
            dbLabel={db.singular}
            fields={fields}
            record={record}
            relationOptions={relationOptions}
            redirectTo={`/records/${db.key}/${id}`}
          />
        </Card>
      </>
    );
  }

  const shortcut = shortcutFor(db.key, id);

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`${db.emoji} ${db.label}`}
        actions={
          <>
            {shortcut ? <Link href={shortcut} className="btn">Open full view</Link> : null}
            {record.url ? <a href={String(record.url)} target="_blank" rel="noreferrer" className="btn">Notion ↗</a> : null}
            <Link href={`/records/${db.key}/${id}?edit=true`} className="btn-primary">Edit</Link>
          </>
        }
      />

      <Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {db.fields.map((field) => (
            <Field key={field.key} label={field.label} className={field.type === 'longtext' ? 'md:col-span-2 xl:col-span-3' : ''}>
              {renderCell(field, record)}
            </Field>
          ))}
        </div>
        <p className="mt-4 border-t border-[color:var(--line)] pt-3 text-xs text-[color:var(--muted)]">
          Created {dateTime(record.createdTime)} · last edited {dateTime(record.lastEditedTime)} · id <span className="font-mono">{record.id}</span>
        </p>
      </Card>
    </>
  );
}

function shortcutFor(db: string, id: string): string | null {
  if (db === 'jobs') return `/jobs/${id}`;
  if (db === 'customers') return `/customers/${id}`;
  return null;
}
