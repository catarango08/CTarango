import { loadAll } from '@/lib/data';
import { Bar, Card, PageHeader } from '@/components/ui';
import { GOALS } from '@/config/goals';
import { buildGoals, type Metric } from '@/lib/domain/goals';
import { date, money, percent } from '@/lib/format';
import { ActivityQuickLog } from './activity-quick-log';

export const dynamic = 'force-dynamic';

function show(m: Pick<Metric, 'actual' | 'unit'>): string {
  if (m.actual === null) return 'needs data';
  switch (m.unit) {
    case 'money': return money(m.actual);
    case 'percent': return percent(m.actual);
    case 'hours': return `${m.actual.toFixed(1)}h`;
    default: return Number.isInteger(m.actual) ? m.actual.toLocaleString() : m.actual.toFixed(1);
  }
}

function showTarget(m: Pick<Metric, 'target' | 'unit' | 'lowerIsBetter'>): string {
  if (m.target === null) return '';
  const t = m.unit === 'money' ? money(m.target) : m.unit === 'percent' ? percent(m.target) : m.unit === 'hours' ? `${m.target}h` : m.target.toLocaleString();
  return m.lowerIsBetter ? `under ${t}` : m.unit === 'percent' && m.target < 1 ? `${t}+` : t;
}

function ratio(m: Metric): number {
  if (m.actual === null || !m.target) return 0;
  return m.lowerIsBetter ? (m.actual <= m.target ? 1 : m.target / m.actual) : m.actual / m.target;
}

function MetricRow({ m, due }: { m: Metric; due?: string }) {
  const r = ratio(m);
  const needs = m.actual === null;
  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{m.label}</span>
        <span className="text-sm tabular-nums">
          <span className={needs ? 'italic text-[color:var(--ink-muted)]' : 'font-semibold'}>{show(m)}</span>
          {m.target !== null && <span className="text-[color:var(--ink-muted)]"> / {showTarget(m)}</span>}
        </span>
      </div>
      {m.target !== null && !needs && <div className="mt-1.5"><Bar value={r} max={1} tone={r >= 1 ? 'go' : 'accent'} /></div>}
      {(m.needs || m.note) && <p className="mt-1 text-xs text-[color:var(--ink-muted)]">{needs ? m.needs : m.note}</p>}
      {due && <p className="mt-1 text-xs text-[color:var(--ink-muted)]">Due {date(due)}</p>}
    </li>
  );
}

/** Half-donut gauge, $0 → $6K, with the $4–5K band shaded gold. */
function Gauge({ value }: { value: number | null }) {
  const max = 6000;
  const { bandLow, bandHigh } = GOALS.northStar;
  const angle = (v: number) => Math.PI * (1 - Math.max(0, Math.min(max, v)) / max);
  const pt = (v: number, r: number) => [100 + r * Math.cos(angle(v)), 100 - r * Math.sin(angle(v))];
  const arc = (from: number, to: number, r: number) => {
    const [x1, y1] = pt(from, r);
    const [x2, y2] = pt(to, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const v = value ?? 0;
  const [nx, ny] = pt(v, 70);
  return (
    <svg viewBox="0 0 200 118" className="w-full max-w-xs" role="img" aria-label={`This month's profit ${money(v)} against a $4,000 to $5,000 band`}>
      <path d={arc(0, max, 80)} stroke="var(--surface-2)" strokeWidth="16" fill="none" />
      <path d={arc(bandLow, bandHigh, 80)} stroke="#B8871F" strokeWidth="16" fill="none" />
      {v > 0 && <path d={arc(0, Math.min(v, max), 80)} stroke="var(--go)" strokeWidth="6" fill="none" />}
      <line x1="100" y1="100" x2={nx} y2={ny} stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill="var(--ink)" />
      <text x="20" y="116" fontSize="9" fill="var(--ink-muted)" textAnchor="middle">$0</text>
      <text x="180" y="116" fontSize="9" fill="var(--ink-muted)" textAnchor="middle">$6K</text>
      <text x={pt(4500, 98)[0]} y={pt(4500, 98)[1]} fontSize="9" fill="var(--accent-ink)" textAnchor="middle">$4.5K</text>
    </svg>
  );
}

export default async function DashboardPage() {
  const [jobs, hours, referrals, activity, materials, rates] = await Promise.all([
    loadAll('jobs'), loadAll('hourLedger'), loadAll('referrals'), loadAll('activityLog'), loadAll('jobMaterials'), loadAll('rateBook'),
  ]);
  const g = buildGoals({ jobs, hours, referrals, activity, materials, rates });
  const ns = GOALS.northStar;

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle={`Tracking since ${date(GOALS.trackingStart)}. Week of ${date(g.week.start)} to ${date(g.week.end)} · ${g.month.label}. Targets live in src/config/goals.ts.`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="North star" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-6">
            <Gauge value={g.northStar.thisMonthProfit} />
            <div className="min-w-48 flex-1">
              <p className="display text-xl">{ns.label}</p>
              <p className="mt-1 text-sm text-[color:var(--ink-muted)]">{ns.detail} Target {date(ns.targetDate)}.</p>
              <p className="mt-3 text-sm">
                This month: <span className="font-semibold tabular-nums">{money(g.northStar.thisMonthProfit ?? 0)}</span> profit
                · streak <span className="font-semibold">{g.northStar.streak} of {ns.consecutiveMonths}</span> months
              </p>
              <div className="mt-2"><Bar value={g.northStar.streak} max={ns.consecutiveMonths} tone="go" /></div>
              <ul className="mt-3 space-y-0.5 text-xs text-[color:var(--ink-muted)]">
                {g.northStar.months.map((m) => (
                  <li key={m.label}>{m.label}: {money(m.revenue)} revenue − {money(m.materials)} materials = {money(m.profit)}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic text-[color:var(--ink-muted)]">{g.northStar.profitNote}</p>
            </div>
          </div>
        </Card>

        <Card title="Quick log">
          <ActivityQuickLog />
        </Card>

        <Card title="This week">
          <ul className="divide-y divide-[color:var(--line)]">{g.weekly.map((m) => <MetricRow key={m.key} m={m} />)}</ul>
        </Card>

        <Card title={`This month · ${g.month.label}`}>
          <ul className="divide-y divide-[color:var(--line)]">{g.monthly.map((m) => <MetricRow key={m.key} m={m} />)}</ul>
        </Card>

        <div className="space-y-5">
          <Card title="Leads by source, this month">
            {g.leadsBySource.length === 0 ? <p className="text-sm text-[color:var(--ink-muted)]">No leads this month yet.</p> : (
              <ul className="space-y-2">
                {g.leadsBySource.map((s) => (
                  <li key={s.source}>
                    <div className="flex justify-between text-sm"><span>{s.source}</span><span className="tabular-nums">{s.count}</span></div>
                    <Bar value={s.count} max={Math.max(...g.leadsBySource.map((x) => x.count))} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Trips by zone, this month">
            {g.tripsByZone.length === 0 ? <p className="text-sm text-[color:var(--ink-muted)]">No completed trips this month yet.</p> : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-[color:var(--line)]">
                  {g.tripsByZone.map((t) => (
                    <tr key={t.zone}><td className="py-1.5">{t.zone}</td><td className="text-right tabular-nums">{t.trips} trips</td><td className="text-right tabular-nums">{money(t.fees)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-2 text-xs text-[color:var(--ink-muted)]">Jobs.Town mapped to a zone, straight-line from Elkland.</p>
          </Card>
        </div>
      </div>

      <h2 className="display mb-3 mt-8 text-xl">OKRs</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {g.okrs.map((o) => (
          <Card key={o.id} title={`${o.id} · ${o.objective}`}>
            <ul className="divide-y divide-[color:var(--line)]">
              {o.keyResults.map((kr) => (
                <MetricRow key={kr.key} m={kr} due={kr.due} />
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {g.needsData.length > 0 && (
        <Card title="Needs data" className="mt-8">
          <p className="mb-2 text-sm text-[color:var(--ink-muted)]">These have no home in the OS yet, so they show “needs data” instead of a guess.</p>
          <ul className="space-y-1 text-sm">
            {g.needsData.map((n) => <li key={n.metric}><span className="font-medium">{n.metric}</span> — {n.why}</li>)}
          </ul>
        </Card>
      )}
    </>
  );
}
