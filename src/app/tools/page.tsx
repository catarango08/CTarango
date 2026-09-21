import Link from 'next/link';
import { loadAll } from '@/lib/data';
import { TOOL_CATEGORIES } from '@/lib/schema';
import type { RecordValue } from '@/lib/schema';
import { Card, Empty, PageHeader, Stat } from '@/components/ui';
import { money, dateShort } from '@/lib/format';
import { num } from '@/lib/calc';
import { ToolCheck } from './tool-check';

export const dynamic = 'force-dynamic';

/**
 * The tool sheet. Stock gets used up and reordered; tools do not. A tool is
 * either on the truck, on your body, at the shop, or gone — and the ones that
 * are gone are the ones that cost you a Monday.
 */
export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; show?: string }>;
}) {
  const { category, show } = await searchParams;
  const all = await loadAll('tools');

  const missing = all.filter((t) => !t.have);
  const needsAttention = all.filter(
    (t) => t.have && ['Broken', 'Needs service', 'Needs calibration'].includes(String(t.condition ?? '')),
  );
  const replacementValue = all.reduce((sum, t) => (t.have ? sum + num(t.replacementCost) : sum), 0);

  let visible = all;
  if (show === 'buy') visible = missing;
  else if (show === 'attention') visible = needsAttention;
  if (category) visible = visible.filter((t) => String(t.category) === category);

  const filterHref = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ category, show, ...patch })) if (v) p.set(k, v);
    const qs = p.toString();
    return `/tools${qs ? `?${qs}` : ''}`;
  };

  const grouped = new Map<string, RecordValue[]>();
  for (const tool of visible) {
    const cat = String(tool.category ?? 'Uncategorized');
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(tool);
  }
  const ordered = [
    ...TOOL_CATEGORIES.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !TOOL_CATEGORIES.includes(c as (typeof TOOL_CATEGORIES)[number])),
  ];

  return (
    <>
      <PageHeader
        title="Tools"
        subtitle="Have means on the truck or on your body. If it lives at the house it does not count."
      />

      <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tools tracked" value={String(all.length)} />
        <Stat label="On the truck" value={String(all.length - missing.length)} tone={missing.length ? 'default' : 'good'} />
        <Stat label="Buy or fetch" value={String(missing.length)} tone={missing.length ? 'bad' : 'good'} />
        <Stat label="Replacement value" value={money(replacementValue, true)} />
      </section>

      {all.length === 0 ? (
        <Empty
          title="No tools listed yet"
          hint="The tool sheet lives in the Tools database in Notion. Add a row there and it shows up here."
        />
      ) : (
        <>
          {needsAttention.length > 0 && (
            <Card title="Needs attention" className="mb-5">
              <ul className="divide-y divide-[color:var(--line)]">
                {needsAttention.map((tool) => (
                  <li key={tool.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="text-sm font-medium">{String(tool.name)}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--accent-ink)]">
                      {String(tool.condition)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label mr-1">Show</span>
              <Link href={filterHref({ show: undefined })} className={chip(!show)}>All</Link>
              <Link href={filterHref({ show: 'buy' })} className={chip(show === 'buy')}>Buy or fetch</Link>
              <Link href={filterHref({ show: 'attention' })} className={chip(show === 'attention')}>Needs attention</Link>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="label mr-1">Section</span>
              <Link href={filterHref({ category: undefined })} className={chip(!category)}>All</Link>
              {TOOL_CATEGORIES.map((c) => (
                <Link key={c} href={filterHref({ category: c })} className={chip(category === c)}>{c}</Link>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <Empty title="Nothing here" hint="Clear the filter or pick a different section." />
          ) : (
            <div className="space-y-4">
              {ordered.map((cat) => {
                const items = grouped.get(cat) ?? [];
                if (!items.length) return null;
                return (
                  <Card key={cat} title={cat}>
                    <ul className="divide-y divide-[color:var(--line)]">
                      {items.map((tool) => {
                        const have = Boolean(tool.have);
                        const note = String(tool.notes ?? '').trim();
                        const checked = tool.lastChecked ? dateShort(tool.lastChecked) : null;
                        return (
                          <li key={tool.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium">{String(tool.name)}</div>
                              {note && <div className="mt-0.5 text-xs text-[color:var(--ink-muted)]">{note}</div>}
                              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-[color:var(--ink-muted)]">
                                {tool.location ? <span>{String(tool.location)}</span> : null}
                                {tool.condition ? <span>{String(tool.condition)}</span> : null}
                                <span>{checked ? `Counted ${checked}` : 'Never counted'}</span>
                              </div>
                            </div>
                            <ToolCheck id={tool.id} name={String(tool.name)} have={have} />
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
