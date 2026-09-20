import Link from 'next/link';
import { databasesByGroup } from '@/lib/schema';
import { loadAll } from '@/lib/data';
import { Card, PageHeader } from '@/components/ui';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function RecordsIndexPage() {
  const groups = databasesByGroup();
  const counts = new Map<string, number>();
  await Promise.all(
    groups.flatMap((group) =>
      group.dbs.map(async (db) => {
        try {
          counts.set(db.key, (await loadAll(db.key)).length);
        } catch {
          counts.set(db.key, -1);
        }
      }),
    ),
  );

  const total = [...counts.values()].filter((n) => n >= 0).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHeader
        title="All databases"
        subtitle={`${groups.reduce((sum, g) => sum + g.dbs.length, 0)} databases · ${total} records · ${
          getStore().kind === 'notion' ? 'live from your Notion workspace' : 'demo data in memory'
        }`}
      />

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.group}>
            <h2 className="label mb-2">{group.label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.dbs.map((db) => (
                <Link key={db.key} href={`/records/${db.key}`} className="panel block p-4 transition hover:border-volt-500/50">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-2xl leading-none">{db.emoji}</span>
                    <span className="tabular-nums text-sm text-[color:var(--muted)]">
                      {counts.get(db.key) === -1 ? '—' : counts.get(db.key)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold">{db.label}</h3>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{db.description}</p>
                  <p className="mt-2 text-[11px] text-[color:var(--muted)]">{db.fields.length} fields</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Card title="API" className="mt-5">
        <p className="text-sm text-[color:var(--muted)]">
          Every database above is also a REST endpoint, validated against the same schema:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[color:var(--bg)] p-3 text-xs">
{`GET    /api/records/:db?search=&limit=&<field>=<value>
POST   /api/records/:db
GET    /api/records/:db/:id
PATCH  /api/records/:db/:id
DELETE /api/records/:db/:id      # archives the Notion page
POST   /api/photos               # multipart upload -> Notion file storage`}
        </pre>
      </Card>
    </>
  );
}
