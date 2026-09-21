import { loadHydrated } from '@/lib/data';
import { Card, PageHeader, Stat } from '@/components/ui';
import { LICENSE } from '@/lib/domain/rules';
import { date, number, toDate } from '@/lib/format';
import { num } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function HoursPage() {
  const entries = await loadHydrated('hourLedger', { sorts: [{ key: 'date', direction: 'descending' }] });

  const logged = entries.reduce((sum, e) => sum + num(e.installHours), 0);
  const remaining = Math.max(0, LICENSE.targetHours - logged);
  const pct = Math.min(100, (logged / LICENSE.targetHours) * 100);

  const bySource = ['Prior employer', 'Self-performed', 'Training'].map((source) => ({
    source,
    hours: entries.filter((e) => String(e.source) === source).reduce((s, e) => s + num(e.installHours), 0),
  }));

  const unverified = entries.filter((e) => !e.affidavit);
  const unverifiedHours = unverified.reduce((s, e) => s + num(e.installHours), 0);

  // Pace uses self-performed hours only — prior-employer balance is history, not rate of progress.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000);
  const recent = entries.filter((e) => {
    const d = toDate(e.date);
    return d ? d >= ninetyDaysAgo && String(e.source) === 'Self-performed' : false;
  });
  const recentHours = recent.reduce((s, e) => s + num(e.installHours), 0);
  const perMonth = recentHours / 3;
  const monthsLeft = perMonth > 0 ? remaining / perMonth : null;

  return (
    <>
      <PageHeader
        title="Hours to license"
        subtitle="Install hours only — tools on the work. Drive time is not in this ledger and never counts."
      />

      <Card className="mb-5">
        <div className="text-center">
          <div className="display text-6xl leading-none text-[color:var(--accent-ink)]">{number(logged, 0)}</div>
          <div className="label mt-1">of {LICENSE.targetHours.toLocaleString()} install hours</div>
        </div>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
          <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[color:var(--ink-muted)]">
          <span>{pct.toFixed(1)}% there</span>
          <span>{number(remaining, 0)} to go</span>
        </div>
      </Card>

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {bySource.map((row) => (
          <Stat key={row.source} label={row.source} value={number(row.hours, 0)} hint="hours" />
        ))}
        <Stat
          label="Pace"
          value={perMonth > 0 ? `${number(perMonth, 0)}/mo` : '—'}
          hint={
            monthsLeft === null
              ? 'Not enough self-performed history yet'
              : `About ${Math.round(monthsLeft)} months at this rate`
          }
          tone={perMonth > 0 ? 'default' : 'warn'}
        />
      </section>

      {unverifiedHours > 0 && (
        <div className="mb-5 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3">
          <p className="text-sm font-semibold text-[color:var(--hazard)]">
            {number(unverifiedHours, 0)} hours have no affidavit behind them.
          </p>
          <p className="mt-1 text-sm">
            The board wants documentation, not a number in a table. Chase the signed letters before this total
            matters — {unverified.length === 1 ? 'one entry is' : `${unverified.length} entries are`} unbacked.
          </p>
        </div>
      )}

      <Card title={`Ledger — ${entries.length} entries`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[color:var(--line)]">
                <th className="th">Date</th>
                <th className="th">Entry</th>
                <th className="th">Source</th>
                <th className="th text-right">Install hours</th>
                <th className="th">Affidavit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--line)]">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-[color:var(--surface-2)]">
                  <td className="td whitespace-nowrap text-[color:var(--ink-muted)]">{date(entry.date)}</td>
                  <td className="td">
                    <span className="font-medium">{String(entry.name)}</span>
                    {entry.notes ? (
                      <span className="mt-0.5 block text-xs text-[color:var(--ink-muted)]">{String(entry.notes)}</span>
                    ) : null}
                  </td>
                  <td className="td text-[color:var(--ink-muted)]">{String(entry.source ?? '—')}</td>
                  <td className="td text-right tabular-nums font-semibold">{number(entry.installHours, 0)}</td>
                  <td className="td">
                    {entry.affidavit ? (
                      <span className="text-[color:var(--go)]">on file</span>
                    ) : (
                      <span className="text-[color:var(--hazard)]">missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-sm text-[color:var(--ink-muted)]">
        Closing a job copies its install hours here automatically. Log them the same night — the ledger is the
        license file.
      </p>
    </>
  );
}
