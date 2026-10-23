import type { DbDef } from './types';

export const QUOTE_STATUSES = ['Draft', 'Sent', 'Accepted', 'Superseded'] as const;

/**
 * Quotes — one row per revision (v1, v2…) of a job's quote. `data` holds the
 * good/better/best options and add-ons as JSON; every price in it came from
 * the Rate Book through buildQuote().
 */
export const quotes: DbDef = {
  key: 'quotes',
  label: 'Quotes',
  singular: 'Quote',
  emoji: '🧾',
  group: 'money',
  description: 'Quote revisions per job: options, add-ons, the accepted option and the signature.',
  defaultSort: { key: 'version', direction: 'descending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dualLabel: 'Quotes', column: true },
    { key: 'version', label: 'Version', type: 'number', column: true },
    { key: 'status', label: 'Status', type: 'select', options: QUOTE_STATUSES, column: true },
    { key: 'acceptedOption', label: 'Accepted Option', type: 'text', column: true },
    { key: 'total', label: 'Total', type: 'money', column: true },
    { key: 'deposit', label: 'Deposit', type: 'money' },
    { key: 'data', label: 'Data', type: 'longtext', derived: true },
    { key: 'signature', label: 'Signature', type: 'files' },
    { key: 'signedBy', label: 'Signed By', type: 'text' },
    { key: 'signedAt', label: 'Signed At', type: 'datetime' },
  ],
};
