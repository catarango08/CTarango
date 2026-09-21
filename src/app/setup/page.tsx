import { allDatabases, validateSchema } from '@/lib/schema';
import { databaseIds, envVarFor, missingDatabases, notionConfigured } from '@/lib/notion/registry';
import { NotionClient } from '@/lib/notion/client';
import { Card, PageHeader, Stat } from '@/components/ui';
import { getStore } from '@/lib/store';
import { HARD_LINES } from '@/lib/domain/rules';
import { authRequired } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const hasToken = Boolean(process.env.NOTION_TOKEN);
  const ids = databaseIds(true);
  const missing = missingDatabases();
  const problems = validateSchema();
  const locked = authRequired();

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
        subtitle="This app keeps no database of its own. Every record lives in the Tarango Electric OS, so the file cabinet stays where you already keep it."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reading from" value={getStore().kind === 'notion' ? 'Notion' : 'Sample data'} tone={notionConfigured() ? 'good' : 'warn'} />
        <Stat label="Integration token" value={hasToken ? (tokenError ? 'Rejected' : 'Present') : 'Missing'} tone={hasToken && !tokenError ? 'good' : 'bad'} />
        <Stat label="Databases wired" value={`${allDatabases().length - missing.length} / ${allDatabases().length}`} tone={missing.length ? 'warn' : 'good'} />
        <Stat label="Passcode" value={locked ? 'Set' : 'Not set'} tone={locked ? 'good' : 'bad'} />
      </section>

      {!locked && (
        <div className="mb-4 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3">
          <p className="text-sm font-semibold text-[color:var(--hazard)]">No passcode is set.</p>
          <p className="mt-1 text-sm">
            Fine on your own laptop. Not fine anywhere reachable from the internet — without{' '}
            <span className="font-mono">APP_PASSCODE</span>, anyone with the address can read the customer
            list and write to the OS. Set it before you deploy.
          </p>
        </div>
      )}

      {tokenError && (
        <div className="mb-4 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3 text-sm">
          <strong className="text-[color:var(--hazard)]">Notion rejected the token.</strong> {tokenError}
        </div>
      )}
      {workspace && !tokenError && (
        <div className="mb-4 rounded border border-[color:var(--go)] bg-[color:var(--go-bg)] p-3 text-sm">
          Connected to <strong>{workspace}</strong>.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Connecting it">
          <ol className="space-y-4 text-sm">
            <li>
              <p className="font-semibold">1 · Make an internal integration</p>
              <p className="mt-1 text-[color:var(--ink-muted)]">
                notion.so/my-integrations. Read, update and insert content. Copy the secret.
              </p>
            </li>
            <li>
              <p className="font-semibold">2 · Share the OS page with it</p>
              <p className="mt-1 text-[color:var(--ink-muted)]">
                Open <strong>Tarango Electric OS</strong> → ⋯ → Connections → your integration. Sharing the
                parent page shares every database under it.
              </p>
            </li>
            <li>
              <p className="font-semibold">3 · Point the app at it</p>
              <pre className="mt-1 overflow-x-auto rounded bg-[color:var(--bg)] p-3 text-xs">
{`cp .env.example .env.local
# NOTION_TOKEN=ntn_...

npm run notion:bootstrap -- --dry   # see what it would touch
npm run notion:bootstrap            # attach, add anything missing
npm run notion:verify               # confirm it matches the schema`}
              </pre>
            </li>
          </ol>
          <p className="mt-4 text-xs text-[color:var(--ink-muted)]">
            The database ids are already checked into <span className="font-mono">notion.config.json</span>, so
            the token is the only secret you supply. The bootstrap never recreates a database that exists — at
            most it adds a property the app needs, and <span className="font-mono">--dry</span> shows you first.
          </p>
        </Card>

        <Card title="The databases">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Database</th>
                  <th className="th">Origin</th>
                  <th className="th">Id</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {allDatabases().map((db) => {
                  const id = ids[db.key];
                  return (
                    <tr key={db.key}>
                      <td className="td">{db.emoji} {db.label}</td>
                      <td className="td text-xs text-[color:var(--ink-muted)]">
                        {db.existing ? 'Already in the OS' : 'Added by this app'}
                      </td>
                      <td className={`td font-mono text-xs ${id ? 'text-[color:var(--go)]' : 'text-[color:var(--hazard)]'}`}>
                        {id ? `${id.slice(0, 8)}…` : 'not set'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[color:var(--ink-muted)]">
            Override any of them with {envVarFor('jobs')}-style environment variables.
          </p>
        </Card>
      </div>

      <Card title="What the app enforces" className="mt-4">
        <ul className="space-y-2 text-sm">
          {HARD_LINES.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Things worth knowing" className="mt-4">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-[color:var(--ink-muted)]">
          <li>
            <strong className="text-[color:var(--ink)]">Job #, Hours logged, Lane, Play, Ready and Closeout score</strong> are
            computed by Notion. The app reads them and never writes them.
          </li>
          <li>
            The Notion API cannot read a formula&rsquo;s source, so the next-move logic here is restated from the
            <em> New client process</em> page rather than copied from the <span className="font-mono">Play</span> formula.
            The job screen shows both so they can be compared instead of drifting apart quietly.
          </li>
          <li>
            Photos upload through Notion&rsquo;s file endpoint, 20 MB each. The URLs Notion returns are signed and
            expire, so nothing caches them.
          </li>
          <li>
            Notion rate-limits around three requests a second. The client backs off and retries on its own.
          </li>
        </ul>
      </Card>

      {problems.length > 0 && (
        <Card title="Schema problems" className="mt-4">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--hazard)]">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </Card>
      )}
    </>
  );
}
