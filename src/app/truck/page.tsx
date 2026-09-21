import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { restockList, truckValue } from '@/lib/domain/materials';
import { getDb } from '@/lib/schema';
import type { RecordValue } from '@/lib/schema';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { money } from '@/lib/format';
import { num, round2 } from '@/lib/calc';
import { StockControl } from './stock-control';

export const dynamic = 'force-dynamic';

const CATEGORY_OPTIONS = (getDb('truckInventory').fields.find((f) => f.key === 'category')?.options ?? []) as readonly string[];

export default async function TruckPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const search = q?.trim();

  // Stats and the restock list always look at the whole van, never the filtered view.
  const all = await loadAll('truckInventory');
  const filtered = search ? await loadHydrated('truckInventory', { search }) : all;
  const visible = category ? filtered.filter((item) => String(item.category) === category) : filtered;

  const restock = restockList(all);
  const restockCost = round2(restock.reduce((sum, line) => sum + line.cost, 0));
  const outCount = restock.filter((line) => line.out).length;

  const filterHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, q, ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/truck${qs ? `?${qs}` : ''}`;
  };

  const grouped = new Map<string, RecordValue[]>();
  for (const item of visible) {
    const cat = String(item.category ?? 'Uncategorized');
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }
  for (const list of grouped.values()) list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const orderedCategories = [...CATEGORY_OPTIONS.filter((c) => grouped.has(c)), ...[...grouped.keys()].filter((c) => !CATEGORY_OPTIONS.includes(c as (typeof CATEGORY_OPTIONS)[number]))];

  return (
    <>
      <PageHeader
        title="Truck stock"
        subtitle="What's on the van, what it's worth, and what to buy before the next job runs you out."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Truck value" value={money(truckValue(all), true)} />
        <Stat label="Items tracked" value={String(all.length)} />
        <Stat label="Need restock" value={String(restock.length)} tone={restock.length ? 'warn' : 'default'} />
        <Stat label="Out of stock" value={String(outCount)} tone={outCount ? 'bad' : 'good'} />
      </section>

      {all.length === 0 ? (
        <Empty
          title="Nothing on the van yet"
          hint="Stock gets added here as you load the van. Set a minimum on each item — Min on truck is what drives the restock list, so it can warn you before a job instead of mid-install."
        />
      ) : (
        <>
          <Card
            title="Restock list"
            className="mb-5"
            action={
              restock.length > 0 ? (
                <span className="text-sm tabular-nums text-[color:var(--ink-muted)]">
                  Supply run: <span className="font-semibold text-[color:var(--ink)]">{money(restockCost, true)}</span>
                </span>
              ) : undefined
            }
          >
            {restock.length === 0 ? (
              <p className="text-sm text-[color:var(--ink-muted)]">The van is stocked. Nothing is at or below its minimum.</p>
            ) : (
              <ul className="divide-y divide-[color:var(--line)]">
                {restock.map((line) => {
                  const tone = line.out ? 'text-[color:var(--hazard)]' : 'text-[color:var(--accent-ink)]';
                  return (
                    <li key={line.item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold uppercase tracking-[0.08em] ${tone}`}>{line.out ? 'Out' : 'Low'}</span>
                          <span className="text-sm font-medium">{String(line.item.name)}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-[color:var(--ink-muted)]">
                          Bin {String(line.item.bin ?? '—')} · <span className="tabular-nums">{line.onTruck}</span> on truck, min{' '}
                          <span className="tabular-nums">{line.min}</span>
                        </div>
                        <div className="mt-0.5 text-xs tabular-nums text-[color:var(--ink-muted)]">
                          Buy {line.buy} · {money(line.cost, true)}
                        </div>
                      </div>
                      <StockControl itemId={line.item.id} name={String(line.item.name)} defaultQty={line.buy} />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <div className="mb-4 space-y-3">
            <form action="/truck" className="flex gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search the van by name…"
                className="input h-11 text-base"
              />
              <button type="submit" className="btn h-11 shrink-0">Search</button>
            </form>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label mr-1">Category</span>
              <Link href={filterHref({ category: undefined })} className={chip(!category)}>All</Link>
              {CATEGORY_OPTIONS.map((c) => (
                <Link key={c} href={filterHref({ category: c })} className={chip(category === c)}>{c}</Link>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <Empty title="No items match" hint="Clear the search or pick a different category." />
          ) : (
            <div className="space-y-4">
              {orderedCategories.map((cat) => {
                const items = grouped.get(cat) ?? [];
                if (!items.length) return null;
                return (
                  <Card key={cat} title={cat}>
                    <ul className="divide-y divide-[color:var(--line)]">
                      {items.map((item) => {
                        const onTruck = num(item.onTruck);
                        const min = num(item.minOnTruck);
                        const out = min > 0 && onTruck <= 0;
                        const low = min > 0 && onTruck > 0 && onTruck <= min;
                        const qtyTone = out ? 'text-[color:var(--hazard)]' : low ? 'text-[color:var(--accent-ink)]' : 'text-[color:var(--ink)]';
                        return (
                          <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{String(item.name)}</div>
                              <div className="mt-0.5 text-xs text-[color:var(--ink-muted)]">Bin {String(item.bin ?? '—')}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tabular-nums text-[color:var(--ink-muted)]">
                              <span className={qtyTone}>
                                {onTruck} {String(item.unit ?? 'ea')} on truck
                              </span>
                              <span>Min {min}</span>
                              <span>Cost {money(item.cost, true)}</span>
                              <span>Sell {money(item.sellPrice, true)}</span>
                            </div>
                            <StockControl itemId={item.id} name={String(item.name)} />
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

function chip(active: boolean): string {
  return `chip min-h-8 ${active ? 'border-[color:var(--accent)] text-[color:var(--accent-ink)]' : ''}`;
}
