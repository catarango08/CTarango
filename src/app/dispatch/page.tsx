import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Card, PageHeader, StatusPill, Chips } from '@/components/ui';
import { isoDay, money, number, startOfDay, time, toDate } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';
import type { RecordValue } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const CREW_COLORS: Record<string, string> = {
  Amber: 'border-volt-500/50 bg-volt-500/10',
  Blue: 'border-sky-500/50 bg-sky-500/10',
  Green: 'border-emerald-500/50 bg-emerald-500/10',
  Purple: 'border-violet-500/50 bg-violet-500/10',
  Red: 'border-rose-500/50 bg-rose-500/10',
  Teal: 'border-teal-500/50 bg-teal-500/10',
  Pink: 'border-pink-500/50 bg-pink-500/10',
  Slate: 'border-slate-500/50 bg-slate-500/10',
};

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date: dateParam } = await searchParams;
  const anchor = startOfDay(toDate(dateParam) ?? new Date());
  const days = Array.from({ length: 5 }, (_, i) => new Date(anchor.getTime() + i * 86_400_000));

  const [jobs, technicians] = await Promise.all([loadHydrated('jobs'), loadAll('technicians')]);
  const crew = technicians.filter((t) => String(t.status ?? 'Active') === 'Active' && String(t.role) !== 'Dispatcher' && String(t.role) !== 'Office Manager');

  const scheduled = jobs.filter((j) => toDate(j.scheduledStart));
  const backlog = jobs
    .filter((j) => ['Unscheduled', 'Needs Parts', 'Awaiting Customer'].includes(String(j.status)))
    .sort((a, b) => priorityRank(a) - priorityRank(b));

  const prev = new Date(anchor.getTime() - 5 * 86_400_000);
  const next = new Date(anchor.getTime() + 5 * 86_400_000);

  const jobsOn = (day: Date, techId?: string) =>
    scheduled.filter(
      (j) => spansDay(j, day) && (techId === undefined || relationIds(j.assignedTo).includes(techId)),
    );

  const hoursFor = (techId: string, day: Date) =>
    jobsOn(day, techId).reduce((sum, j) => sum + hoursOnDay(j, day), 0);

  return (
    <>
      <PageHeader
        title="Dispatch board"
        subtitle="Five working days at a glance. Estimated hours per tech per day tell you where the next call can go."
        actions={
          <>
            <Link href={`/dispatch?date=${isoDay(prev)}`} className="btn">← Earlier</Link>
            <Link href="/dispatch" className="btn">Today</Link>
            <Link href={`/dispatch?date=${isoDay(next)}`} className="btn">Later →</Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="th sticky left-0 z-10 bg-[color:var(--panel)]">Crew</th>
                {days.map((day) => (
                  <th key={day.toISOString()} className="th">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}{' '}
                    <span className="text-[color:var(--text)]">{day.getDate()}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crew.map((tech) => (
                <tr key={tech.id} className="align-top">
                  <td className="td sticky left-0 z-10 w-40 border-t border-[color:var(--line)] bg-[color:var(--panel)]">
                    <div className="font-medium">{String(tech.name)}</div>
                    <div className="text-xs text-[color:var(--muted)]">{String(tech.role)}</div>
                    <div className="mt-1"><Chips values={(tech.skills as string[])?.slice(0, 2)} max={2} /></div>
                  </td>
                  {days.map((day) => {
                    const dayJobs = jobsOn(day, tech.id);
                    const booked = hoursFor(tech.id, day);
                    return (
                      <td key={day.toISOString()} className="td min-w-[135px] border-t border-[color:var(--line)]">
                        <div className="space-y-1.5">
                          {dayJobs.map((job) => (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className={`block rounded-lg border p-2 text-xs transition hover:brightness-125 ${
                                CREW_COLORS[String(tech.color ?? 'Slate')] ?? CREW_COLORS.Slate
                              }`}
                            >
                              <div className="font-medium leading-snug">{String(job.title)}</div>
                              <div className="mt-1 flex items-center justify-between gap-1 text-[10px] opacity-80">
                                <span>{sameDay(job.scheduledStart, day) ? time(job.scheduledStart) : 'continues'}</span>
                                <span>{number(hoursOnDay(job, day))}h</span>
                              </div>
                            </Link>
                          ))}
                          {booked > 0 ? (
                            <div className={`text-[10px] ${booked > 10 ? 'text-rose-300' : 'text-[color:var(--muted)]'}`}>
                              {number(booked)}h booked{booked > 10 ? ' · overloaded' : ''}
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-300/70">open</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-4">
          <Card title={`Needs scheduling — ${backlog.length}`}>
            {backlog.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">Backlog is clear.</p>
            ) : (
              <ul className="space-y-2">
                {backlog.map((job) => (
                  <li key={job.id} className="panel-2 p-2.5">
                    <Link href={`/jobs/${job.id}`} className="block text-sm font-medium hover:text-volt-200">
                      {String(job.title)}
                    </Link>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill value={job.status} />
                      <StatusPill value={job.priority} />
                      <span className="chip">{number(job.estimatedHours)}h</span>
                    </div>
                    {job.problem ? (
                      <p className="mt-1.5 text-xs text-[color:var(--muted)]">{String(job.problem).slice(0, 110)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Day load">
            <ul className="space-y-2 text-sm">
              {days.map((day) => {
                const dayJobs = jobsOn(day);
                const hours = dayJobs.reduce((sum, j) => sum + hoursOnDay(j, day), 0);
                const capacity = crew.length * 8;
                return (
                  <li key={day.toISOString()} className="flex items-baseline justify-between gap-3">
                    <span>{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span className={`tabular-nums ${hours > capacity ? 'text-rose-300' : 'text-[color:var(--muted)]'}`}>
                      {number(hours)} / {capacity}h · {dayJobs.length} jobs
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Booked revenue on the board">
            <p className="text-2xl font-semibold tabular-nums">
              {money(
                scheduled
                  .filter((j) => days.some((d) => sameDay(j.scheduledStart, d)))
                  .reduce((s, j) => s + num(j.revenue), 0),
                true,
              )}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">Across the five days shown.</p>
          </Card>
        </div>
      </div>
    </>
  );
}

/**
 * A multi-day job shows on every day it spans, with its estimated hours spread
 * evenly across them — otherwise a three-day rough-in reads as a 26-hour Monday
 * and the whole board looks overloaded.
 */
function spansDay(job: RecordValue, day: Date): boolean {
  const start = toDate(job.scheduledStart);
  if (!start) return false;
  const end = toDate(job.scheduledEnd) ?? start;
  const dayStart = startOfDay(day).getTime();
  return dayStart >= startOfDay(start).getTime() && dayStart <= startOfDay(end).getTime();
}

function spanDays(job: RecordValue): number {
  const start = toDate(job.scheduledStart);
  if (!start) return 1;
  const end = toDate(job.scheduledEnd) ?? start;
  const days = Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86_400_000) + 1;
  return Math.max(1, days);
}

function hoursOnDay(job: RecordValue, day: Date): number {
  if (!spansDay(job, day)) return 0;
  return num(job.estimatedHours, 0) / spanDays(job);
}

function sameDay(value: unknown, day: Date): boolean {
  const d = toDate(value);
  if (!d) return false;
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
}

function priorityRank(job: RecordValue): number {
  const order = ['Emergency', 'Same Day', 'Urgent', 'Standard', 'Scheduled Maintenance'];
  const index = order.indexOf(String(job.priority));
  return index === -1 ? 99 : index;
}
