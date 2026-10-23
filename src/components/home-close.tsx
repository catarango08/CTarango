import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { buildGoals } from '@/lib/domain/goals';
import { callItems } from '@/lib/domain/close-data';
import { todayCentral } from '@/lib/domain/pipeline';
import { GOALS } from '@/config/goals';
import { CallList } from './call-list';
import { Scoreboard, type ScoreRow } from './scoreboard';

/** Home additions for Phase 1: the scoreboard, today's calls, and reviews still to ask. */
export async function HomeClose() {
  const [jobs, customers, hours, referrals, activity, materials, rates] = await Promise.all([
    loadAll('jobs'), loadAll('customers'), loadAll('hourLedger'), loadAll('referrals'), loadAll('activityLog'), loadAll('jobMaterials'), loadAll('rateBook'),
  ]);
  const g = buildGoals({ jobs, hours, referrals, activity, materials, rates });
  const w = (k: string) => g.weekly.find((m) => m.key === k)?.actual ?? 0;
  const today = todayCentral();

  const rows: ScoreRow[] = [
    { key: 'touches', label: 'Touches', actual: w('touches'), target: GOALS.weekly.outreachTouches, log: { type: 'Text', name: 'Outreach touch' } },
    { key: 'calls', label: 'Calls', actual: w('calls'), target: GOALS.weekly.calls, log: { type: 'Call', name: 'Call' } },
    { key: 'estimates', label: 'Estimates', actual: w('estimates'), target: GOALS.weekly.estimatesSent, href: '/pipeline', note: 'Move a job to Quoted' },
    { key: 'jobs', label: 'Jobs done', actual: w('jobs'), target: GOALS.weekly.jobsCompleted, href: '/jobs', note: 'Close a job' },
    { key: 'profit', label: 'Profit', actual: w('profit'), target: GOALS.weekly.profit, money: true, href: '/dashboard', note: 'How it is counted' },
  ];

  const reviewsDue = jobs.filter((j) => ['Invoiced', 'Closed'].includes(String(j.status)) && !j.reviewAsked);

  return (
    <>
      <Scoreboard rows={rows} today={today} />
      <CallList items={callItems(jobs, customers, today)} />
      {reviewsDue.length > 0 && (
        <section className="panel mb-6 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider">Reviews to ask for</h2>
          <ul className="space-y-1 text-sm">
            {reviewsDue.map((j) => (
              <li key={j.id}><Link href={`/jobs/${j.id}#review`} className="underline">{String(j.name)}</Link> <span className="text-[color:var(--ink-muted)]">· {String(j.status)}</span></li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
