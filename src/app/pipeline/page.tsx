import { loadAll } from '@/lib/data';
import { PageHeader } from '@/components/ui';
import { CallList } from '@/components/call-list';
import { callItems } from '@/lib/domain/close-data';
import { PIPELINE, ageDays, columnFor, firstName, todayCentral } from '@/lib/domain/pipeline';
import { LOSS_REASONS } from '@/lib/schema';
import { num } from '@/lib/calc';
import { PipelineBoard, type BoardCard } from './board';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const [jobs, customers] = await Promise.all([loadAll('jobs'), loadAll('customers')]);
  const byId = new Map(customers.map((c) => [c.id, c]));
  const today = todayCentral();

  const cards: BoardCard[] = [];
  for (const j of jobs) {
    const col = columnFor(j.status);
    if (!col) continue;
    const cust = byId.get((j.customer as { id: string }[] | undefined)?.[0]?.id ?? '');
    cards.push({
      id: j.id,
      column: col,
      status: String(j.status ?? ''),
      first: firstName(cust?.name) || 'No customer',
      town: String(j.town ?? ''),
      age: ageDays(j.callIn || j.createdTime, today),
      amount: num(j.amount),
      source: String(j.source ?? ''),
      lossReason: String(j.lossReason ?? ''),
      nextFollowUp: String(j.nextFollowUp ?? '').slice(0, 10),
    });
  }

  return (
    <>
      <PageHeader title="Pipeline" subtitle="Lead → Estimate scheduled → Quoted → Won / Lost. Drag a card, or use Move. Lost needs a reason." />
      <CallList items={callItems(jobs, customers, today)} />
      <PipelineBoard
        columns={PIPELINE.map((c) => ({ key: c.key, label: c.label, moveTo: c.moveTo, statuses: [...c.statuses] }))}
        cards={cards}
        lossReasons={[...LOSS_REASONS]}
      />
    </>
  );
}
