import { getDb, getField, type DbKey } from '@/lib/schema';
import type { EditField } from '@/components/inline-editor';

/** Resolve schema fields into the plain shape the client editor takes. */
export function editFields(db: DbKey, keys: string[]): EditField[] {
  const def = getDb(db);
  return keys.flatMap((k) => {
    const f = getField(def, k);
    if (!f) return [];
    return [{ key: f.key, label: f.label, type: f.type, options: f.options ? [...f.options] : undefined, placeholder: f.placeholder, help: f.help }];
  });
}

export const CUSTOMER_MAIN = ['name', 'phone', 'email', 'town', 'address', 'accessNotes', 'preferredContact', 'notes'];
export const CUSTOMER_MORE = ['kind', 'stage', 'foundUs', 'referredBy', 'tags'];
export const JOB_MAIN = ['status', 'scheduledAt', 'town', 'amount', 'notes', 'siteConditions', 'diagnosis', 'workPerformed'];
export const JOB_MORE = [
  'panelInfo', 'testResults', 'materialsUsed', 'installHours', 'mileage', 'afterHours', 'diagCredited',
  'followUpFlag', 'nextVisitNotes', 'recommendations', 'window', 'type', 'source', 'permit', 'phone', 'address', 'payLink',
];
