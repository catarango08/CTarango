import { loadAll } from '@/lib/data';

const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Today's date in Elkland (America/Chicago) as YYYY-MM-DD. */
function todayCentral(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 'YYYY-MM-DD' → 'Thu, Oct 22, 2026' without a UTC shift. */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function Block({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--ink-muted)]">{label}</h3>
      <p className="mt-1 whitespace-pre-line text-sm">{text}</p>
    </div>
  );
}

/** Morning Digest card for the top of Today: the latest Daily Digest row. */
export async function MorningDigest() {
  let rows: Record<string, unknown>[] = [];
  try {
    rows = (await loadAll('dailyDigest')) as Record<string, unknown>[];
  } catch {
    rows = [];
  }
  const latest = [...rows].sort((a, b) => s(b.date).localeCompare(s(a.date)))[0];
  const today = todayCentral();
  const isToday = latest && s(latest.date).slice(0, 10) === today;

  return (
    <section className="panel mb-6 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">Morning Digest</h2>
        {latest && <span className="text-xs text-[color:var(--ink-muted)]">{dayLabel(s(latest.date))}</span>}
      </header>

      {!isToday && (
        <p className="mb-3 rounded border border-dashed border-[color:var(--line)] px-3 py-2 text-sm text-[color:var(--ink-muted)]">
          No digest yet today.{latest ? ' Showing the latest one below.' : ''}
        </p>
      )}

      {latest && (
        <>
          <p className="text-base font-semibold">{s(latest.headline)}</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Block label="Priorities" text={s(latest.priorities)} />
            <Block label="Numbers" text={s(latest.numbers)} />
            <Block label="Weather" text={s(latest.weather)} />
            <Block label="Waiting on" text={s(latest.waitingOn)} />
          </div>
          {(s(latest.thisWeek) || s(latest.bizDev) || s(latest.tip) || s(latest.notes)) && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">More: this week, biz dev, tip, notes</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Block label="This week" text={s(latest.thisWeek)} />
                <Block label="Biz dev" text={s(latest.bizDev)} />
                <Block label="Tip" text={s(latest.tip)} />
                <Block label="Notes" text={s(latest.notes)} />
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
