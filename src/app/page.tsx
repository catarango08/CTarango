import Link from 'next/link';
import { hydrate, loadToday } from '@/lib/data';
import { Card, Empty, PageHeader, Stat, StatusPill } from '@/components/ui';
import { Tagline } from '@/components/brand';
import { nextMove } from '@/lib/domain/playbook';
import { BUSINESS, HARD_LINES, LICENSE } from '@/lib/domain/rules';
import { date, money, number, relativeDays } from '@/lib/format';
import { num } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  const today = await loadToday();
  const [onDeck, hanging, needsCloseout] = await Promise.all([
    hydrate('jobs', today.onDeck),
    hydrate('jobs', today.hanging),
    hydrate('jobs', today.needsCloseout),
  ]);

  const pct = Math.min(100, (today.hours.logged / today.hours.target) * 100);

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        actions={
          <>
            <Link href="/jobs" className="btn">Pipeline</Link>
            <Link href="/new-call" className="btn-primary">New call</Link>
          </>
        }
      />

      {today.alerts.length > 0 && (
        <section className="mb-6 space-y-2">
          {today.alerts.slice(0, 5).map((alert, i) => (
            <Link
              key={`${alert.title}-${i}`}
              href={alert.href ?? '#'}
              className={`block rounded border px-3 py-2 transition hover:brightness-105 ${
                alert.severity === 'stop'
                  ? 'border-[color:var(--hazard)] bg-[color:var(--hazard-bg)]'
                  : alert.severity === 'watch'
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent)]/10'
                    : 'border-[color:var(--line)] bg-[color:var(--surface)]'
              }`}
            >
              <span className="block text-sm font-semibold">{alert.title}</span>
              <span className="mt-0.5 block text-sm text-[color:var(--ink-muted)]">{alert.detail}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="On the truck today" value={String(onDeck.length)} hint={`${today.counts.openJobs} open tickets`} />
        <Stat label="Hanging calls" value={String(hanging.length)} hint="Leads, quotes, unqualified" tone={hanging.length ? 'warn' : 'default'} />
        <Stat label="Waiting on money" value={money(today.money.unpaid, true)} hint={`${money(today.money.quotedOpen, true)} quoted out`} tone={today.money.unpaid > 0 ? 'warn' : 'good'} />
        <Stat label="Needs closeout" value={String(needsCloseout.length)} hint="Invoiced but not closed" tone={needsCloseout.length ? 'bad' : 'good'} />
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card title={`On the truck — ${onDeck.length}`} className="xl:col-span-2">
          {onDeck.length === 0 ? (
            <Empty title="Nothing booked today" hint="Pull something off the hanging list, or go knock on a referral." />
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {onDeck.map((job) => {
                const move = nextMove(job);
                return (
                  <li key={job.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link href={`/jobs/${job.id}`} className="text-sm font-semibold hover:text-[color:var(--accent-ink)]">
                        {String(job.name)}
                      </Link>
                      <span className="flex items-center gap-2">
                        <StatusPill value={job.status} />
                        <span className="text-sm tabular-nums">{money(job.amount, true)}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{move.instruction}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[color:var(--ink-muted)]">
                      <span className="chip">{String(job.town ?? '—')}</span>
                      {job.window ? <span className="chip">{String(job.window)}</span> : null}
                      {job.phone ? (
                        <a href={`tel:${String(job.phone).replace(/[^\d+]/g, '')}`} className="chip hover:border-[color:var(--accent)] hover:text-[color:var(--accent-ink)]">
                          {String(job.phone)}
                        </a>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card title="Hours to license">
          <div className="text-center">
            <div className="display text-5xl leading-none text-[color:var(--accent-ink)]">
              {number(today.hours.logged, 0)}
            </div>
            <div className="label mt-1">of {LICENSE.targetHours.toLocaleString()} install hours</div>
          </div>
          <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[color:var(--surface-2)]">
            <div className="h-full rounded-full bg-[color:var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-[color:var(--ink-muted)]">Remaining</dt><dd className="tabular-nums">{number(today.hours.remaining, 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-[color:var(--ink-muted)]">Self-performed</dt><dd className="tabular-nums">{number(today.hours.selfPerformed, 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-[color:var(--ink-muted)]">This month</dt><dd className="tabular-nums">{number(today.hours.thisMonth, 0)}</dd></div>
            {today.hours.unverified > 0 && (
              <div className="flex justify-between">
                <dt className="text-[color:var(--hazard)]">No affidavit yet</dt>
                <dd className="tabular-nums text-[color:var(--hazard)]">{number(today.hours.unverified, 0)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-xs text-[color:var(--ink-muted)]">{LICENSE.note}</p>
          <Link href="/hours" className="btn mt-3 w-full justify-center">Open the ledger</Link>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title={`Hanging calls — ${hanging.length}`} className="xl:col-span-2">
          {hanging.length === 0 ? (
            <p className="text-sm text-[color:var(--ink-muted)]">Nothing hanging. Good.</p>
          ) : (
            <ul className="divide-y divide-[color:var(--line)]">
              {hanging.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-[color:var(--accent-ink)]">
                    {String(job.name)}
                  </Link>
                  <StatusPill value={job.status} />
                  <span className="chip">{String(job.town ?? '—')}</span>
                  <span className="text-xs text-[color:var(--ink-muted)]">called {relativeDays(job.callIn)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Hard lines">
          <ul className="space-y-2 text-sm">
            {HARD_LINES.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--accent)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-[color:var(--line)] pt-2 text-xs text-[color:var(--ink-muted)]">
            Open: {BUSINESS.advertisedTowns.join(', ')}, unincorporated Dallas / Webster / Polk. {BUSINESS.codeBasis}.
          </p>
        </Card>
      </div>

      {needsCloseout.length > 0 && (
        <Card title={`Closeout owed — ${needsCloseout.length}`} className="mt-4">
          <ul className="divide-y divide-[color:var(--line)]">
            {needsCloseout.map((job) => (
              <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                <Link href={`/jobs/${job.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-[color:var(--accent-ink)]">
                  {String(job.name)}
                </Link>
                <span className="text-xs text-[color:var(--ink-muted)]">on site {date(job.onSite)}</span>
                <span className="text-sm tabular-nums">{money(job.amount, true)}</span>
                {!job.paid && num(job.amount) > 0 ? <StatusPill value="Unpaid" tone="hazard" /> : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[color:var(--ink-muted)]">
            Hours, photos, signature, review, two magnets. Nothing closes until all of it is done.
          </p>
        </Card>
      )}

      <p className="mt-8 text-center font-serif text-sm">
        <Tagline />
      </p>
    </>
  );
}
