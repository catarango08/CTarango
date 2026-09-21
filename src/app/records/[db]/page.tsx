import Link from 'next/link';
import { notFound } from 'next/navigation';
import { columnsFor, tryGetDb, type DbKey } from '@/lib/schema';
import { loadHydrated } from '@/lib/data';
import { Card, Empty, PageHeader } from '@/components/ui';
import { isNumericField, renderCell } from '@/components/cell';

export const dynamic = 'force-dynamic';

export default async function RecordListPage({
  params,
  searchParams,
}: {
  params: Promise<{ db: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { db: dbKey } = await params;
  const { q } = await searchParams;
  const db = tryGetDb(dbKey);
  if (!db) notFound();

  const records = await loadHydrated(db.key as DbKey, { search: q });
  const columns = columnsFor(db);

  return (
    <>
      <PageHeader
        title={`${db.emoji} ${db.label}`}
        subtitle={db.description}
        actions={
          <>
            <Link href="/records" className="btn">All databases</Link>
            <Link href={`/records/${db.key}/new`} className="btn-primary">+ New {db.singular.toLowerCase()}</Link>
          </>
        }
      />

      <form className="mb-4 flex items-center gap-2" action={`/records/${db.key}`}>
        <input name="q" defaultValue={q ?? ''} placeholder={`Search ${db.label.toLowerCase()}…`} className="input max-w-xs" />
        <button className="btn" type="submit">Search</button>
        {q ? <Link href={`/records/${db.key}`} className="chip">Clear</Link> : null}
      </form>

      {records.length === 0 ? (
        <Empty title={`No ${db.label.toLowerCase()} yet`} hint={db.description} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  {columns.map((field) => (
                    <th key={field.key} className={`th ${isNumericField(field) ? 'text-right' : ''}`}>{field.label}</th>
                  ))}
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-[color:var(--panel-2)]">
                    {columns.map((field, index) => (
                      <td key={field.key} className={`td ${isNumericField(field) ? 'text-right tabular-nums' : ''}`}>
                        {index === 0 ? (
                          <Link href={`/records/${db.key}/${record.id}`} className="font-medium hover:text-volt-200">
                            {renderCell(field, record) || 'Untitled'}
                          </Link>
                        ) : (
                          renderCell(field, record)
                        )}
                      </td>
                    ))}
                    <td className="td text-right">
                      <Link href={`/records/${db.key}/${record.id}`} className="text-xs text-[color:var(--muted)] hover:text-volt-300">open →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[color:var(--muted)]">{records.length} records</p>
        </Card>
      )}
    </>
  );
}
