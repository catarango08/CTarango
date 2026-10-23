import type { DbDef } from './types';

/** Activity Log → Type. What kind of touch it was. */
export const ACTIVITY_TYPES = ['Email', 'Call', 'Text', 'Visit', 'Review Request', 'Review Received', 'Task'] as const;

/**
 * Activity Log — the one database the Goals dashboard adds. Outreach touches,
 * calls, review asks and Google reviews had no home in the OS, so the weekly
 * KPIs could not be counted. One row per touch, or one row with a Count for a
 * batch (twelve emails on Oct 20 is one row with Count 12).
 */
export const activityLog: DbDef = {
  key: 'activityLog',
  label: 'Activity Log',
  singular: 'Activity',
  emoji: '📣',
  group: 'crm',
  description: 'Outreach touches, calls, visits, review asks and reviews received. Feeds the Goals dashboard.',
  defaultSort: { key: 'date', direction: 'descending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true, placeholder: 'Called Lockwood about standby' },
    { key: 'date', label: 'Date', type: 'date', required: true, column: true },
    { key: 'type', label: 'Type', type: 'select', options: ACTIVITY_TYPES, required: true, column: true },
    { key: 'count', label: 'Count', type: 'number', column: true, help: 'How many touches this row stands for. Blank means 1.' },
    { key: 'contact', label: 'Contact', type: 'text', column: true },
    { key: 'outcome', label: 'Outcome', type: 'text', column: true },
    { key: 'notes', label: 'Notes', type: 'longtext' },
    { key: 'assignee', label: 'Assignee', type: 'select', options: ['Corey', 'Estimator', 'Office Manager'], column: true },
    { key: 'taskDone', label: 'Task done', type: 'checkbox', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dualLabel: 'Activity' },
  ],
};
