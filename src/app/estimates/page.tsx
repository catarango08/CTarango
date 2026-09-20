import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Card, Empty, MoneyStat, PageHeader, PercentStat, RelationLinks, Stat, StatusPill } from '@/components/ui';
import { date, daysUntil, money, percent } from '@/lib/format';
import { lineTotal, lineCost, num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function EstimatesPage() {
  const [estimates, lineItems] = await Promise.all([loadHydrated('estimates'), loadAll('lineItems')]);

  const itemsFor = (estimateId: string) => lineItems.filter((li) => relationIds(li.estimate).includes(estimateId));

  const open = estimates.filter((e) => ['Draft', 'Sent', 'Viewed'].includes(String(e.status)));
  const decided = estimates.filter((e) => ['Approved', 'Converted to Job', 'Declined', 'Expired'].includes(String(e.status)));
  const won = decided.filter((e) => ['Approved', 'Converted to Job'].includes(String(e.status)));
  const openValue = open.reduce((sum, e) => sum + num(e.total), 0);
  const wonValue = won.reduce((sum, e) => sum + num(e.total), 0);

  const declineReasons = new Map<string, number>();
  for (const est of estimates.filter((e) => String(e.status) === 'Declined')) {
    const reason = String(est.declineReason ?? 'Unstated');
    declineReasons.set(reason, (declineReasons.get(reason) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Estimates"
        subtitle="The sales pipeline. Every quote carries its own cost, so you know the margin before you send it."
        actions={<Link href="/records/estimates/new" className="btn-primary">+ New estimate</Link>}
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Open quotes" value={String(open.length)} />
        <MoneyStat label="Open value" amount={openValue} />
        <PercentStat label="Win rate" value={decided.length ? won.length / decided.length : 0} tone={won.length / (decided.length || 1) >= 0.5 ? 'good' : 'warn'} />
        <MoneyStat label="Won value" amount={wonValue} tone="good" />
        <Stat
          label="Expiring in 7 days"
          value={String(open.filter((e) => (daysUntil(e.expiresOn) ?? 99) <= 7).length)}
          tone="warn"
          hint="Chase these first"
        />
      </section>

      {estimates.length === 0 ? (
        <Empty title="No estimates yet" hint="Quote the recommendations your techs write up in the field." />
      ) : (
        <div className="space-y-3">
          {estimates.map((estimate) => {
            const items = itemsFor(estimate.id);
            const revenue = items.reduce((sum, i) => sum + lineTotal(i), 0) || num(estimate.subtotal);
            const cost = items.reduce((sum, i) => sum + lineCost(i), 0) || num(estimate.estimatedCost);
            const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
            const expiring = (daysUntil(estimate.expiresOn) ?? 99) <= 7 && ['Sent', 'Viewed', 'Draft'].includes(String(estimate.status));

            return (
              <Card key={estimate.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">{String(estimate.title)}</h3>
                      <StatusPill value={estimate.status} />
                      {estimate.tier ? <span className="chip">{String(estimate.tier)}</span> : null}
                      {expiring ? <span className="chip border-rose-500/40 text-rose-300">expires {date(estimate.expiresOn)}</span> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[color:var(--muted)]">
                      <span>{String(estimate.estimateNumber ?? '')}</span>
                      <RelationLinks refs={estimate.customer} href={(id) => `/customers/${id}`} max={1} />
                      <span>issued {date(estimate.issuedOn)}</span>
                      {estimate.approvedBy ? <span>· approved by {String(estimate.approvedBy)} on {date(estimate.approvedOn)}</span> : null}
                      {estimate.declineReason ? <span className="text-rose-300">· declined: {String(estimate.declineReason)}</span> : null}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-semibold tabular-nums">{money(estimate.total)}</div>
                    <div className={`text-xs tabular-nums ${margin < 0.35 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {percent(margin)} margin · {money(cost, true)} cost
                    </div>
                  </div>
                </div>

                {estimate.scope ? <p className="mt-3 text-sm text-[color:var(--muted)]">{String(estimate.scope)}</p> : null}

                {items.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[color:var(--line)]">
                          <th className="th">Line</th>
                          <th className="th">Kind</th>
                          <th className="th text-right">Qty</th>
                          <th className="th text-right">Unit</th>
                          <th className="th text-right">Cost</th>
                          <th className="th text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--line)]">
                        {[...items].sort((a, b) => num(a.sortOrder) - num(b.sortOrder)).map((item) => (
                          <tr key={item.id}>
                            <td className="td">{String(item.description)}</td>
                            <td className="td text-[color:var(--muted)]">{String(item.kind ?? '')}</td>
                            <td className="td text-right tabular-nums">{num(item.quantity)} {String(item.unit ?? '')}</td>
                            <td className="td text-right tabular-nums">{money(item.unitPrice)}</td>
                            <td className="td text-right tabular-nums text-[color:var(--muted)]">{money(lineCost(item))}</td>
                            <td className="td text-right tabular-nums">{money(lineTotal(item))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[color:var(--line)]">
                          <td className="td text-[color:var(--muted)]" colSpan={5}>
                            Subtotal {money(estimate.subtotal)} · tax {money(estimate.taxAmount)}
                            {num(estimate.discount) ? ` · discount ${money(estimate.discount)}` : ''}
                          </td>
                          <td className="td text-right font-semibold tabular-nums">{money(estimate.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {estimate.exclusions ? (
                  <p className="mt-3 text-xs text-[color:var(--muted)]"><strong className="text-[color:var(--text)]">Excludes:</strong> {String(estimate.exclusions)}</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      {declineReasons.size > 0 && (
        <Card title="Why you lose work" className="mt-4">
          <ul className="flex flex-wrap gap-3 text-sm">
            {[...declineReasons.entries()].sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
              <li key={reason} className="panel-2 px-3 py-2">
                <span className="font-medium">{reason}</span>
                <span className="ml-2 text-[color:var(--muted)]">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
