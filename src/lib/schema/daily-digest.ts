import type { DbDef } from './types';

/**
 * Daily Digest — one row per Chief of Staff morning digest. The Home screen
 * shows the latest row in its Morning Digest card.
 */
export const dailyDigest: DbDef = {
  key: 'dailyDigest',
  label: 'Daily Digest',
  singular: 'Digest',
  emoji: '☀️',
  group: 'crm',
  description: 'The Chief of Staff morning digest, one row per day. Shown at the top of Today.',
  defaultSort: { key: 'date', direction: 'descending' },
  fields: [
    { key: 'headline', label: 'Headline', type: 'title', required: true, column: true },
    { key: 'date', label: 'Date', type: 'date', required: true, column: true },
    { key: 'priorities', label: 'Priorities', type: 'longtext' },
    { key: 'thisWeek', label: 'This Week', type: 'longtext' },
    { key: 'waitingOn', label: 'Waiting On', type: 'longtext' },
    { key: 'numbers', label: 'Numbers', type: 'longtext' },
    { key: 'weather', label: 'Weather', type: 'longtext' },
    { key: 'bizDev', label: 'Biz Dev', type: 'longtext' },
    { key: 'tip', label: 'Tip', type: 'longtext' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
    { key: 'pdfPath', label: 'PDF Path', type: 'text' },
  ],
};
