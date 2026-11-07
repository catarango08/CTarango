import { NOV3_PRICING } from '@/config/pricing-2026-11-03';
import { relationIds } from '../calc';
import type { RecordValue } from '../schema';
import { isChangeOrder } from './change-order';
import { parseStored } from './options';

/** Diagnostic credit already applied on other accepted versions of this job, capped at one service call. */
export function serviceCreditUsedByJob(quotes: RecordValue[], jobId: string, exceptQuoteId?: string): number {
  let used = 0;
  for (const q of quotes) {
    if (exceptQuoteId && q.id === exceptQuoteId) continue;
    if (String(q.status) !== 'Accepted') continue;
    if (!relationIds(q.job).includes(jobId)) continue;
    if (isChangeOrder(q)) continue;
    const n = Number(parseStored(q.data)?.doc.diagCredit ?? 0);
    if (Number.isFinite(n) && n > 0) used += Math.min(n, NOV3_PRICING.serviceCallCredit);
  }
  return Math.min(NOV3_PRICING.serviceCallCredit, used);
}
