import Link from 'next/link';
import { loadAll, loadHydrated } from '@/lib/data';
import { Card, Chips, PageHeader, RelationLinks, Stat, StatusPill, MoneyStat } from '@/components/ui';
import { date, money, number, percent } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [materials, usage, pos, vendors] = await Promise.all([
    loadHydrated('materials'),
    loadAll('materialUsage'),
    loadHydrated('purchaseOrders'),
    loadAll('vendors'),
  ]);

  const stockValue = materials.reduce((sum, m) => sum + num(m.onHand) * num(m.cost), 0);
  const lowStock = materials.filter((m) => num(m.onHand) <= num(m.reorderPoint));
  const consumed90 = usage.reduce((sum, u) => sum + num(u.extendedCost), 0);
  const openPos = pos.filter((p) => ['Draft', 'Ordered', 'Partially Received', 'Backordered'].includes(String(p.status)));
  const vendorName = new Map(vendors.map((v) => [v.id, String(v.name ?? '')]));

  const usageByMaterial = new Map<string, number>();
  for (const row of usage) {
    for (const id of relationIds(row.material)) usageByMaterial.set(id, (usageByMaterial.get(id) ?? 0) + num(row.quantity));
  }

  const categories = [...new Set(materials.map((m) => String(m.category ?? 'Other')))].sort();

  return (
    <>
      <PageHeader
        title="Inventory & purchasing"
        subtitle="Truck stock, shop stock and what is on order — so nobody drives to the supply house mid-job."
        actions={
          <>
            <Link href="/records/purchaseOrders/new" className="btn">+ Purchase order</Link>
            <Link href="/records/materials/new" className="btn-primary">+ Catalog item</Link>
          </>
        }
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MoneyStat label="Stock value at cost" amount={stockValue} />
        <Stat label="At or below reorder" value={String(lowStock.length)} tone={lowStock.length ? 'warn' : 'good'} />
        <Stat label="Open purchase orders" value={String(openPos.length)} />
        <MoneyStat label="Material consumed" amount={consumed90} hint="All recorded usage" />
        <Stat label="Catalog items" value={String(materials.length)} hint={`${categories.length} categories`} />
      </section>

      {lowStock.length > 0 && (
        <Card title="Reorder now" className="mb-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Item</th>
                  <th className="th">Location</th>
                  <th className="th text-right">On hand</th>
                  <th className="th text-right">Reorder at</th>
                  <th className="th">Preferred vendor</th>
                  <th className="th text-right">Replacement cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {lowStock.map((item) => (
                  <tr key={item.id}>
                    <td className="td">
                      <div className="font-medium">{String(item.name)}</div>
                      <div className="text-xs text-[color:var(--muted)]">{String(item.sku ?? '')}</div>
                    </td>
                    <td className="td text-[color:var(--muted)]">{String(item.stockLocation ?? '—')}</td>
                    <td className={`td text-right tabular-nums ${num(item.onHand) === 0 ? 'text-rose-300' : 'text-volt-300'}`}>
                      {number(item.onHand, 0)}
                    </td>
                    <td className="td text-right tabular-nums text-[color:var(--muted)]">{number(item.reorderPoint, 0)}</td>
                    <td className="td"><RelationLinks refs={item.vendor} max={1} /></td>
                    <td className="td text-right tabular-nums">
                      {money(Math.max(num(item.reorderPoint) * 2 - num(item.onHand), 0) * num(item.cost))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card title="Catalog">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Item</th>
                  <th className="th">Category</th>
                  <th className="th text-right">Cost</th>
                  <th className="th text-right">Price</th>
                  <th className="th text-right">Markup</th>
                  <th className="th text-right">On hand</th>
                  <th className="th text-right">Used</th>
                  <th className="th">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {materials.map((item) => (
                  <tr key={item.id} className="hover:bg-[color:var(--panel-2)]">
                    <td className="td">
                      <div className="font-medium">{String(item.name)}</div>
                      <div className="text-xs text-[color:var(--muted)]">{String(item.sku ?? '')}</div>
                    </td>
                    <td className="td text-[color:var(--muted)]">{String(item.category ?? '—')}</td>
                    <td className="td text-right tabular-nums">{money(item.cost)}</td>
                    <td className="td text-right tabular-nums">{money(item.price)}</td>
                    <td className="td text-right tabular-nums text-[color:var(--muted)]">{percent(item.markup)}</td>
                    <td className={`td text-right tabular-nums ${num(item.onHand) <= num(item.reorderPoint) ? 'text-volt-300' : ''}`}>
                      {number(item.onHand, 0)}
                    </td>
                    <td className="td text-right tabular-nums text-[color:var(--muted)]">{number(usageByMaterial.get(item.id) ?? 0, 0)}</td>
                    <td className="td text-[color:var(--muted)]">{String(item.stockLocation ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Purchase orders">
            <ul className="space-y-2">
              {pos.length === 0 && <li className="text-sm text-[color:var(--muted)]">No purchase orders.</li>}
              {pos.map((po) => (
                <li key={po.id} className="panel-2 p-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{String(po.poNumber ?? po.title)}</span>
                    <StatusPill value={po.status} />
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted)]">
                    {vendorName.get(relationIds(po.vendor)[0] ?? '') ?? '—'} · {money(po.total, true)}
                    {po.expectedOn ? ` · expected ${date(po.expectedOn)}` : ''}
                  </div>
                  {po.items ? <p className="mt-1 text-xs text-[color:var(--muted)]">{String(po.items)}</p> : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Vendors">
            <ul className="space-y-2">
              {vendors.map((vendor) => (
                <li key={vendor.id} className="panel-2 p-2.5">
                  <div className="text-sm font-medium">{String(vendor.name)}</div>
                  <div className="mt-0.5 text-xs text-[color:var(--muted)]">
                    {String(vendor.kind ?? '')} · acct {String(vendor.accountNumber ?? '—')} · {String(vendor.terms ?? '')}
                  </div>
                  <div className="mt-1 text-xs">{String(vendor.phone ?? '')}</div>
                  {vendor.rep ? <div className="text-xs text-[color:var(--muted)]">Rep: {String(vendor.rep)}</div> : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Categories">
            <Chips values={categories} max={20} />
          </Card>
        </div>
      </div>
    </>
  );
}
