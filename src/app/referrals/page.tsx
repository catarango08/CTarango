import { loadAll } from '@/lib/data';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import type { RecordValue } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const COLUMNS = ['Not called', 'Introduced', 'Active', 'Competitor'] as const;

export default async function ReferralsPage() {
  const referrals = await loadAll('referrals');
  const notCalled = referrals.filter((r) => String(r.status) === 'Not called').length;

  return (
    <>
      <PageHeader
        title="Referrals"
        subtitle="HVAC shops, co-ops, propane and rental outfits — the walk-in list that feeds the phone."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Still not called"
          value={String(notCalled)}
          tone={notCalled ? 'warn' : 'good'}
          hint="This is a to-do, not an archive"
        />
        <Stat label="Total on the list" value={String(referrals.length)} />
      </section>

      {referrals.length === 0 ? (
        <Empty title="No referral contacts yet" hint="Log a shop, co-op or rental counter the moment you meet one." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((status) => {
            const rows = referrals.filter((r) => String(r.status) === status);
            return (
              <Card key={status} title={`${status} · ${rows.length}`} className="lg:self-start">
                {rows.length === 0 ? (
                  <p className="text-sm text-[color:var(--ink-muted)]">None.</p>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((r: RecordValue) => (
                      <li key={r.id} className="panel-2 p-2.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">{String(r.name)}</span>
                          <span className="chip">{String(r.kind ?? '—')}</span>
                        </div>
                        {r.phone ? (
                          <a
                            href={`tel:${String(r.phone).replace(/[^\d+]/g, '')}`}
                            className="mt-1 block text-sm text-[color:var(--accent-ink)] underline-offset-2 hover:underline"
                          >
                            {String(r.phone)}
                          </a>
                        ) : null}
                        {r.notes ? (
                          <p className="mt-1.5 text-xs text-[color:var(--ink-muted)]">{String(r.notes)}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
