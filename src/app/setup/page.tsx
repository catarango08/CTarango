import { allDatabases, validateSchema } from '@/lib/schema';
import { databaseIds, envVarFor, missingDatabases, notionConfigured } from '@/lib/notion/registry';
import { NotionClient } from '@/lib/notion/client';
import { Card, PageHeader, Stat } from '@/components/ui';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const hasToken = Boolean(process.env.NOTION_TOKEN);
  const ids = databaseIds(true);
  const missing = missingDatabases();
  const connected = notionConfigured();
  const problems = validateSchema();

  let workspace: string | null = null;
  let tokenError: string | null = null;
  if (hasToken) {
    try {
      const me = await new NotionClient().me();
      workspace = me.bot?.workspace_name ?? me.name ?? 'connected';
    } catch (err) {
      tokenError = err instanceof Error ? err.message : 'Could not reach Notion';
    }
  }

  return (
    <>
      <PageHeader
        title="Notion setup"
        subtitle="VoltFlow keeps no database of its own. Every record lives in your Notion workspace, which means your team can also open, filter and comment on it there."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Data source" value={getStore().kind === 'notion' ? 'Notion' : 'Demo'} tone={connected ? 'good' : 'warn'} />
        <Stat label="Integration token" value={hasToken ? (tokenError ? 'Error' : 'Present') : 'Missing'} tone={hasToken && !tokenError ? 'good' : 'bad'} />
        <Stat label="Databases mapped" value={`${allDatabases().length - missing.length} / ${allDatabases().length}`} tone={missing.length ? 'warn' : 'good'} />
        <Stat label="Schema check" value={problems.length ? `${problems.length} issues` : 'Clean'} tone={problems.length ? 'bad' : 'good'} />
      </section>

      {tokenError && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm">
          <strong className="text-rose-200">Notion rejected the token.</strong> {tokenError}
        </div>
      )}
      {workspace && !tokenError && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          Connected to <strong>{workspace}</strong>.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Three steps to go live">
          <ol className="space-y-4 text-sm">
            <li>
              <p className="font-medium">1 · Create an internal integration</p>
              <p className="mt-1 text-[color:var(--muted)]">
                At <span className="font-mono">notion.so/my-integrations</span>, create one and copy the secret. Give it
                read, update and insert content capabilities.
              </p>
            </li>
            <li>
              <p className="font-medium">2 · Share one parent page with it</p>
              <p className="mt-1 text-[color:var(--muted)]">
                Make an empty page — &ldquo;VoltFlow&rdquo; works — and use the page menu → Connections → your integration.
                Every database gets created inside it, so that one share is the only permission you grant.
              </p>
            </li>
            <li>
              <p className="font-medium">3 · Run the bootstrap</p>
              <pre className="mt-1 overflow-x-auto rounded-lg bg-[color:var(--bg)] p-3 text-xs">
{`cp .env.example .env.local
# fill in NOTION_TOKEN and NOTION_PARENT_PAGE_ID
npm run notion:bootstrap      # creates all ${allDatabases().length} databases + relations
npm run notion:seed           # optional: load the sample company
npm run notion:verify         # confirms every property matches the schema`}
              </pre>
            </li>
          </ol>
          <p className="mt-4 text-xs text-[color:var(--muted)]">
            The bootstrap is idempotent: run it again after changing the schema and it adds the new properties
            rather than recreating anything.
          </p>
        </Card>

        <Card title="Database mapping">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Database</th>
                  <th className="th">Env var</th>
                  <th className="th">Notion id</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {allDatabases().map((db) => {
                  const id = ids[db.key];
                  return (
                    <tr key={db.key}>
                      <td className="td">{db.emoji} {db.label}</td>
                      <td className="td font-mono text-xs text-[color:var(--muted)]">{envVarFor(db.key)}</td>
                      <td className={`td font-mono text-xs ${id ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {id ? `${id.slice(0, 8)}…` : 'not set'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {problems.length > 0 && (
        <Card title="Schema problems" className="mt-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-rose-300">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="What lives where" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allDatabases().map((db) => (
            <div key={db.key} className="panel-2 p-3">
              <div className="text-sm font-medium">{db.emoji} {db.label}</div>
              <p className="mt-1 text-xs text-[color:var(--muted)]">{db.description}</p>
              <p className="mt-2 text-[11px] text-[color:var(--muted)]">
                {db.fields.length} properties · {db.fields.filter((f) => f.type === 'relation').length} relations
                {db.fields.some((f) => f.type === 'files') ? ' · holds files' : ''}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Notes on the Notion API" className="mt-4">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[color:var(--muted)]">
          <li>Status-type properties cannot be created through the API, so every workflow state here is a <strong>select</strong>. Convert one in the Notion UI later if you want its board grouping.</li>
          <li>Rollups and formulas are deliberately left out: totals, margins and balances are computed by the app and written as plain numbers, so the figures read correctly inside Notion too.</li>
          <li>Photos upload through Notion&rsquo;s file-upload endpoint (20 MB per file, single-part). File URLs Notion returns are signed and expire, so the app always re-reads them rather than caching.</li>
          <li>Notion rate-limits at roughly three requests per second; the client retries with exponential backoff and honours <span className="font-mono">Retry-After</span>.</li>
        </ul>
      </Card>
    </>
  );
}
