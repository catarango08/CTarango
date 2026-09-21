import { loadAll } from '@/lib/data';
import { Card, PageHeader } from '@/components/ui';
import type { RecordValue } from '@/lib/schema';
import { TownCheck } from './town-check';

export const dynamic = 'force-dynamic';

const GROUPS: { status: string; label: string; color: string; instruction: string }[] = [
  { status: 'GO', label: 'Green', color: 'var(--go)', instruction: 'Book the diagnostic.' },
  { status: 'VERIFY', label: 'Amber', color: 'var(--accent-ink)', instruction: 'Call the AHJ before you quote.' },
  { status: 'NO-GO', label: 'Red', color: 'var(--hazard)', instruction: 'Be polite. Do not quote.' },
];

export default async function TerritoryPage() {
  const territory = await loadAll('territory');

  return (
    <>
      <PageHeader
        title="Service Territory"
        subtitle="The town gate. Green books, amber calls the AHJ first, red is a polite no — never quote it."
      />

      <div className="mb-6">
        <TownCheck territory={territory} />
      </div>

      <div className="space-y-5">
        {GROUPS.map((group) => {
          const rows = territory.filter((t) => String(t.status) === group.status);
          return (
            <Card key={group.status}>
              <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-2xl uppercase tracking-[0.04em]" style={{ color: group.color }}>
                  {group.status}
                </span>
                <span className="text-sm text-[color:var(--ink-muted)]">
                  {group.label}. {group.instruction} · {rows.length} town{rows.length === 1 ? '' : 's'}
                </span>
              </header>

              {rows.length === 0 ? (
                <p className="text-sm text-[color:var(--ink-muted)]">None on file.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[color:var(--line)]">
                        <th className="th">Town</th>
                        <th className="th">Kind</th>
                        <th className="th">Schedule?</th>
                        <th className="th">License note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--line)]">
                      {rows.map((row: RecordValue) => (
                        <tr key={row.id}>
                          <td className="td font-medium">{String(row.name)}</td>
                          <td className="td text-[color:var(--ink-muted)]">{String(row.kind ?? '—')}</td>
                          <td className="td text-[color:var(--ink-muted)]">{String(row.schedule ?? '—')}</td>
                          <td className="td">{String(row.licenseNote ?? '—')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
