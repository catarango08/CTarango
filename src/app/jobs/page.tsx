import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { JOB_STATUSES, JOB_TYPES, JOB_TOWNS, TERMINAL_STATUSES } from '@/lib/schema';
import type { RecordValue } from '@/lib/schema';
import { Card, Empty, PageHeader, StatusPill } from '@/components/ui';
import { gateTown } from '@/lib/domain/gates';
import { nextMove } from '@/lib/domain/playbook';
import { date, money } from '@/lib/format';
import { num } from '@/lib/calc';

export const dynamic = 'force-dynamic';

/** The board skips empty middle columns so it stays readable on a phone. */
const BOARD_COLUMNS = JOB_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s as never));

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ town?: string; type?: string; view?: string }>;
}) {
  const { town, type, view } = await searchParams;
  const [all, territory] = await Promise.all([loadHydrated('jobs'), loadAll('territory')]);

  const jobs = all.filter(
    (j) => (!town || String(j.town) === town) && (!type || String(j.type) === type),
  );

  const terminal = new Set<string>(TERMINAL_STATUSES);
  const finished = jobs.filter((j) => terminal.has(String(j.status)));
  const open = jobs.filter((j) => !terminal.has(String(j.status)));
  const booked = open.reduce((sum, j) => sum + num(j.amount), 0);

  const filterHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ town, type, view, ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/jobs${qs ? `?${qs}` : ''}`;
  };

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle={`${open.length} open · ${money(booked, true)} booked · ${finished.length} finished`}
        actions={
          <>
            <Link href={filterHref({ view: view === 'table' ? undefined : 'table' })} className="btn">
              {view === 'table' ? 'Board' : 'Table'}
            </Link>
            <Link href="/new-call" className="btn-primary">New call</Link>
          </>
        }
      />

      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Town</span>
          <Link href={filterHref({ town: undefined })} className={chip(!town)}>All</Link>
          {JOB_TOWNS.map((t) => (
            <Link key={t} href={filterHref({ town: t })} className={chip(town === t)}>{t}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="label mr-1">Type</span>
          <Link href={filterHref({ type: undefined })} className={chip(!type)}>All</Link>
          {JOB_TYPES.map((t) => (
            <Link key={t} href={filterHref({ type: t })} className={chip(type === t)}>{t}</Link>
          ))}
        </div>
      </div>

      {jobs.length === 0 ? (
        <Empty title="No tickets match" hint="Clear the filter, or take a call." />
      ) : view === 'table' ? (
        <TableView jobs={jobs} territory={territory} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {BOARD_COLUMNS.map((status) => {
            const column = open.filter((j) => String(j.status) === status);
            if (column.length === 0) return null;
            return (
              <section key={status} className="w-[270px] shrink-0">
                <header className="mb-2 flex items-baseline justify-between gap-2">
                  <h2 className="font-serif text-xs uppercase tracking-[0.12em]">{status}</h2>
                  <span className="text-xs tabular-nums text-[color:var(--ink-muted)]">{column.length}</span>
                </header>
                <div className="space-y-2">
                  {column.map((job) => (
                    <JobCard key={job.id} job={job} territory={territory} />
                  ))}
                </div>
              </section>
            );
          })}

          {finished.length > 0 && (
            <section className="w-[270px] shrink-0 opacity-70">
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="font-serif text-xs uppercase tracking-[0.12em] text-[color:var(--ink-muted)]">Finished</h2>
                <span className="text-xs tabular-nums text-[color:var(--ink-muted)]">{finished.length}</span>
              </header>
              <div className="space-y-2">
                {finished.map((job) => (
                  <JobCard key={job.id} job={job} territory={territory} muted />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function chip(active: boolean): string {
  return `chip min-h-8 ${active ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`;
}

function JobCard({ job, territory, muted }: { job: RecordValue; territory: RecordValue[]; muted?: boolean }) {
  const verdict = gateTown(String(job.town ?? ''), territory);
  const move = nextMove(job);
  // A red or unverified town has no price to show — you do not quote it.
  const showMoney = !verdict.blockQuote && num(job.amount) > 0;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`block rounded border p-2.5 transition hover:border-[color:var(--accent)] ${
        verdict.blockQuote && !muted
          ? 'border-[color:var(--hazard)] bg-[color:var(--hazard-bg)]'
          : 'border-[color:var(--line)] bg-[color:var(--surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold leading-snug">{String(job.name)}</span>
        {job.jobNumber ? (
          <span className="shrink-0 font-mono text-[10px] text-[color:var(--ink-muted)]">{String(job.jobNumber)}</span>
        ) : null}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={`chip ${
            verdict.gate === 'GO'
              ? 'border-[color:var(--go)] text-[color:var(--go)]'
              : verdict.gate === 'VERIFY'
                ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]'
                : 'border-[color:var(--hazard)] text-[color:var(--hazard)]'
          }`}
        >
          {String(job.town ?? '—')}
        </span>
        {showMoney ? <span className="chip tabular-nums">{money(job.amount, true)}</span> : null}
      </div>

      {!muted && (
        <p className="mt-1.5 text-xs text-[color:var(--ink-muted)]">{move.action}</p>
      )}
    </Link>
  );
}

function TableView({ jobs, territory }: { jobs: RecordValue[]; territory: RecordValue[] }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--line)]">
              <th className="th">Job</th>
              <th className="th">Status</th>
              <th className="th">Town</th>
              <th className="th">Type</th>
              <th className="th">On site</th>
              <th className="th text-right">Amount</th>
              <th className="th">Next</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[color:var(--line)]">
            {jobs.map((job) => {
              const verdict = gateTown(String(job.town ?? ''), territory);
              return (
                <tr key={job.id} className="hover:bg-[color:var(--surface-2)]">
                  <td className="td">
                    <Link href={`/jobs/${job.id}`} className="font-medium hover:text-[color:var(--accent-ink)]">
                      {String(job.name)}
                    </Link>
                    <div className="font-mono text-[10px] text-[color:var(--ink-muted)]">{String(job.jobNumber ?? '')}</div>
                  </td>
                  <td className="td"><StatusPill value={job.status} /></td>
                  <td className="td">
                    <span className={verdict.blockQuote ? 'text-[color:var(--hazard)]' : ''}>{String(job.town ?? '—')}</span>
                  </td>
                  <td className="td text-[color:var(--ink-muted)]">{String(job.type ?? '—')}</td>
                  <td className="td whitespace-nowrap text-[color:var(--ink-muted)]">{date(job.onSite)}</td>
                  <td className="td text-right tabular-nums">
                    {verdict.blockQuote ? <span className="text-[color:var(--ink-muted)]">—</span> : money(job.amount, true)}
                  </td>
                  <td className="td text-xs text-[color:var(--ink-muted)]">{String(job.nextAction ?? '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
