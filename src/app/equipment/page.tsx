import { loadAll } from '@/lib/data';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { CLOSED_WORK } from '@/lib/domain/rules';
import { date, daysUntil, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TIERS = [
  { name: 'Critical', price: 3200, scope: 'Do not sell response you cannot staff' },
  { name: 'Standard', price: 1550, scope: '2 visits, transfer, thermal' },
  { name: 'Basic', price: 695, scope: '1 visit, report, no-load' },
  { name: 'None', price: 0, scope: 'No agreement — service is billed per visit' },
];

export default async function EquipmentPage() {
  const equipment = await loadAll('equipment');
  const sorted = [...equipment].sort(
    (a, b) => (daysUntil(a.nextService) ?? 9999) - (daysUntil(b.nextService) ?? 9999),
  );

  const overdue = sorted.filter((e) => (daysUntil(e.nextService) ?? 9999) < 0);
  const soon = sorted.filter((e) => {
    const d = daysUntil(e.nextService);
    return d !== null && d >= 0 && d <= 30;
  });
  const contracted = equipment.filter((e) => String(e.agreement ?? 'None') !== 'None');
  const recurring = contracted.reduce(
    (sum, e) => sum + (TIERS.find((t) => t.name === String(e.agreement))?.price ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Keep Power"
        subtitle="Generators, transfer switches, UPS and panels under agreement, and when each one is next due."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Under agreement" value={String(contracted.length)} hint={`${equipment.length} tracked`} />
        <Stat label="Overdue" value={String(overdue.length)} tone={overdue.length ? 'bad' : 'good'} />
        <Stat label="Due in 30 days" value={String(soon.length)} tone={soon.length ? 'warn' : 'default'} />
        <Stat label="Contracted value" value={money(recurring, true)} hint="Per agreement year" />
      </section>

      <div className="mb-5 rounded border border-[color:var(--hazard)] bg-[color:var(--hazard-bg)] p-3 text-sm">
        {CLOSED_WORK.map((closed) => (
          <p key={closed.work}>
            <strong className="text-[color:var(--hazard)]">{closed.work} are not sold yet</strong> — not until {closed.until}. {closed.stillOpen}
          </p>
        ))}
      </div>

      {equipment.length === 0 ? (
        <Empty
          title="Nothing on an agreement yet"
          hint="Every generator and ATS you service is a reason to be back on that property next year. Log them as you meet them."
        />
      ) : (
        <div className="space-y-4">
          {TIERS.filter((tier) => equipment.some((e) => String(e.agreement ?? 'None') === tier.name)).map((tier) => (
            <Card
              key={tier.name}
              title={`${tier.name === 'None' ? 'No agreement' : `Keep Power ${tier.name}`}${tier.price ? ` — ${money(tier.price, true)}` : ''}`}
            >
              <p className="mb-3 text-xs text-[color:var(--ink-muted)]">{tier.scope}</p>
              <ul className="divide-y divide-[color:var(--line)]">
                {sorted
                  .filter((e) => String(e.agreement ?? 'None') === tier.name)
                  .map((item) => {
                    const due = daysUntil(item.nextService);
                    const late = due !== null && due < 0;
                    const near = due !== null && due >= 0 && due <= 30;
                    return (
                      <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
                        <span className="min-w-0 flex-1">
                          <span className="text-sm font-medium">{String(item.name)}</span>
                          <span className="mt-0.5 block text-xs text-[color:var(--ink-muted)]">
                            {[item.kind, item.makeModel, item.site].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-sm tabular-nums ${
                            late ? 'text-[color:var(--hazard)]' : near ? 'text-[color:var(--accent-ink)]' : 'text-[color:var(--ink-muted)]'
                          }`}
                        >
                          {item.nextService ? date(item.nextService) : 'not scheduled'}
                          {late ? ` · ${Math.abs(due)}d late` : near ? ` · in ${due}d` : ''}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
