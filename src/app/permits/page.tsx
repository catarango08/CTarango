import { loadAll } from '@/lib/data';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { BUSINESS } from '@/lib/domain/rules';
import { date, daysUntil } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Every office he works in. Anything not in the data still needs a call. */
const OFFICES = ['Bolivar', 'Buffalo', 'Marshfield', 'Dallas Co', 'Webster Co', 'Polk Co'];

/** A clerk's answer goes stale. Six months is the outside limit. */
const STALE_DAYS = 180;

export default async function PermitsPage() {
  const permits = await loadAll('permits');

  const covered = new Set(permits.map((p) => String(p.office ?? '')));
  const uncalled = OFFICES.filter((o) => !covered.has(o));
  const stale = permits.filter((p) => {
    const d = daysUntil(p.confirmed);
    return d === null || d < -STALE_DAYS;
  });

  return (
    <>
      <PageHeader
        title="Permit offices"
        subtitle={`Who to call, what triggers a permit, and when you last heard it from the clerk. ${BUSINESS.codeBasis}.`}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Offices on file" value={`${covered.size} / ${OFFICES.length}`} tone={uncalled.length ? 'warn' : 'good'} />
        <Stat label="Never called" value={String(uncalled.length)} tone={uncalled.length ? 'warn' : 'good'} />
        <Stat label="Stale answers" value={String(stale.length)} tone={stale.length ? 'bad' : 'good'} hint={`Older than ${STALE_DAYS} days`} />
        <Stat label="Code basis" value={BUSINESS.codeBasis} />
      </section>

      {uncalled.length > 0 && (
        <div className="mb-5 rounded border border-[color:var(--accent)] bg-[color:var(--accent)]/10 p-3">
          <p className="text-sm font-semibold">Still need a call: {uncalled.join(', ')}</p>
          <p className="mt-1 text-sm text-[color:var(--ink-muted)]">
            Ask the clerk directly: is there a local electrical license, what triggers a permit, and what does it
            cost. Write down who said it and when.
          </p>
        </div>
      )}

      {permits.length === 0 ? (
        <Empty
          title="No offices logged yet"
          hint={`Start with ${OFFICES.slice(0, 3).join(', ')} — those are the three towns you work.`}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Office</th>
                  <th className="th">Contact</th>
                  <th className="th">What triggers a permit</th>
                  <th className="th">Fees</th>
                  <th className="th">Confirmed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {permits.map((permit) => {
                  const d = daysUntil(permit.confirmed);
                  const isStale = d === null || d < -STALE_DAYS;
                  return (
                    <tr key={permit.id} className="hover:bg-[color:var(--surface-2)]">
                      <td className="td">
                        <span className="font-medium">{String(permit.name)}</span>
                        <span className="mt-0.5 block text-xs text-[color:var(--ink-muted)]">{String(permit.office ?? '')}</span>
                      </td>
                      <td className="td">{String(permit.contact ?? '—')}</td>
                      <td className="td text-[color:var(--ink-muted)]">{String(permit.permitTrigger ?? '—')}</td>
                      <td className="td text-[color:var(--ink-muted)]">{String(permit.feeNotes ?? '—')}</td>
                      <td className={`td whitespace-nowrap ${isStale ? 'text-[color:var(--hazard)]' : 'text-[color:var(--ink-muted)]'}`}>
                        {permit.confirmed ? date(permit.confirmed) : 'never'}
                        {isStale && <span className="block text-xs">call again</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
