import Link from 'next/link';
import { notFound } from 'next/navigation';
import { editableFields, tryGetDb, type DbKey } from '@/lib/schema';
import { Card, PageHeader } from '@/components/ui';
import { RecordForm } from '@/components/record-form';
import { loadRelationOptions } from '@/lib/relation-options';

export const dynamic = 'force-dynamic';

export default async function NewRecordPage({ params }: { params: Promise<{ db: string }> }) {
  const { db: dbKey } = await params;
  const db = tryGetDb(dbKey);
  if (!db) notFound();

  const fields = editableFields(db);
  const relationOptions = await loadRelationOptions(fields.map((f) => f.relation).filter(Boolean) as DbKey[]);

  return (
    <>
      <PageHeader
        title={`New ${db.singular.toLowerCase()}`}
        subtitle={db.description}
        actions={<Link href={`/records/${db.key}`} className="btn">← {db.label}</Link>}
      />
      <Card>
        <RecordForm
          db={db.key}
          dbLabel={db.singular}
          fields={fields}
          relationOptions={relationOptions}
          redirectTo={`/records/${db.key}`}
        />
      </Card>
    </>
  );
}
