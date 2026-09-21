import Link from 'next/link';
import clsx from 'clsx';
import { loadAll, loadHydrated } from '@/lib/data';
import { getDb, getField } from '@/lib/schema';
import { gateTown } from '@/lib/domain/gates';
import { Card, Empty, PageHeader, Stat, StatusPill } from '@/components/ui';
import { money } from '@/lib/format';
import { num, relationIds } from '@/lib/calc';

export const dynamic = 'force-dynamic';

const customersDb = getDb('customers');
const STAGE_OPTIONS = getField(customersDb, 'stage')?.options ?? [];
const KIND_OPTIONS = getField(customersDb, 'kind')?.options ?? [];

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; kind?: string }>;
}) {
  const { q, stage, kind } = await searchParams;

  const [customers, jobs, territory] = await Promise.all([
    loadHydrated('customers', {
      where: [
        ...(stage ? [{ key: 'stage', op: 'equals' as const, value: stage }] : []),
        ...(kind ? [{ key: 'kind', op: 'equals' as const, value: kind }] : []),
      ],
      search: q,
    }),
    loadAll('jobs'),
    loadAll('territory'),
  ]);

  const jobsByCustomer = new Map<string, typeof jobs>();
  for (const job of jobs) {
    for (const id of relationIds(job.customer)) {
      jobsByCustomer.set(id, [...(jobsByCustomer.get(id) ?? []), job]);
    }
  }

  const doNotServe = customers.filter((c) => String(c.stage) === 'Do not serve').length;

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Who called, where they are, and whether they have called before."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Customers" value={String(customers.length)} />
        <Stat label="Jobs on the books" value={String(jobs.length)} />
        <Stat
          label="Do not serve"
          value={String(doNotServe)}
          tone={doNotServe ? 'bad' : 'default'}
          hint={doNotServe ? 'Do not book these' : undefined}
        />
      </section>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/customers">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search name, phone, town…"
          className="input min-w-0 flex-1 sm:max-w-xs"
        />
        <select name="stage" defaultValue={stage ?? ''} className="input w-auto">
          <option value="">All stages</option>
          {STAGE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select name="kind" defaultValue={kind ?? ''} className="input w-auto">
          <option value="">All kinds</option>
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <button className="btn" type="submit">Filter</button>
        {(q || stage || kind) && (
          <Link href="/customers" className="text-xs text-[color:var(--ink-muted)] underline-offset-2 hover:underline">
            Clear
          </Link>
        )}
      </form>

      {customers.length === 0 ? (
        <Empty title="No customers match" hint="Try clearing the filters." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--line)]">
                  <th className="th">Name</th>
                  <th className="th">Phone</th>
                  <th className="th">Town</th>
                  <th className="th">Kind</th>
                  <th className="th">Stage</th>
                  <th className="th text-right">Jobs</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {customers.map((customer) => {
                  const blocked = String(customer.stage) === 'Do not serve';
                  const theirJobs = jobsByCustomer.get(customer.id) ?? [];
                  const total = theirJobs.reduce((sum, j) => sum + num(j.amount), 0);
                  const verdict = gateTown(String(customer.town ?? ''), territory);
                  const gateTone = verdict.gate === 'GO' ? 'done' : verdict.gate === 'VERIFY' ? 'active' : verdict.gate === 'NO-GO' ? 'hazard' : 'neutral';

                  return (
                    <tr
                      key={customer.id}
                      className={clsx('hover:bg-[color:var(--surface-2)]', blocked && 'bg-[color:var(--hazard-bg)]')}
                    >
                      <td className="td">
                        <Link
                          href={`/customers/${customer.id}`}
                          className={clsx('font-medium hover:text-[color:var(--accent-ink)]', blocked && 'text-[color:var(--hazard)]')}
                        >
                          {String(customer.name)}
                        </Link>
                        {blocked && (
                          <div className="mt-0.5 text-xs font-medium text-[color:var(--hazard)]">Do not serve</div>
                        )}
                      </td>
                      <td className="td whitespace-nowrap">
                        {customer.phone ? (
                          <a href={`tel:${String(customer.phone).replace(/[^\d+]/g, '')}`} className="text-[color:var(--accent-ink)] underline-offset-2 hover:underline">
                            {String(customer.phone)}
                          </a>
                        ) : (
                          <span className="text-[color:var(--ink-muted)]">—</span>
                        )}
                      </td>
                      <td className="td whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          {String(customer.town ?? '—')}
                          <StatusPill value={verdict.gate} tone={gateTone} className="text-[10px]" />
                        </span>
                      </td>
                      <td className="td">{String(customer.kind ?? '—')}</td>
                      <td className="td"><StatusPill value={customer.stage} tone={blocked ? 'hazard' : undefined} /></td>
                      <td className="td text-right tabular-nums">{theirJobs.length}</td>
                      <td className="td text-right tabular-nums">{money(total, true)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
