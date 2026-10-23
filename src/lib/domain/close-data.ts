import type { RecordValue } from '../schema';
import { num } from '../calc';
import { ageDays, callList, firstName, todayCentral } from './pipeline';
import type { CallItem } from '@/components/call-list';

export function callItems(jobs: RecordValue[], customers: RecordValue[], today = todayCentral()): CallItem[] {
  const byId = new Map(customers.map((c) => [c.id, c]));
  return callList(jobs, today).map((j) => {
    const cust = byId.get((j.customer as { id: string }[] | undefined)?.[0]?.id ?? '');
    const due = String(j.nextFollowUp).slice(0, 10);
    return {
      id: j.id,
      name: String(j.name ?? ''),
      first: firstName(cust?.name ?? String(j.name ?? '').split(/\s+[—-]\s+/)[0]),
      town: String(j.town ?? ''),
      phone: String(j.phone || cust?.phone || '').replace(/[^\d+]/g, ''),
      amount: num(j.amount),
      due,
      quotedOn: String(j.quotedOn ?? '').slice(0, 10),
      overdue: due < today,
    };
  });
}

export { ageDays };
