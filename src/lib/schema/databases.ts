import type { DbDef } from './types';

/**
 * The Tarango Electric OS, as it actually exists in Notion.
 *
 * Eight of these nine databases already live in Corey's workspace and are
 * attached by id — the `label` strings below are the real Notion property
 * names, spelling and punctuation included, because that is what the API
 * matches on. Job Photos is the one database this app adds, because closeout
 * requires four photos per job and the OS had only a checkbox for them.
 *
 * Nothing here invents a workflow. Statuses, towns, rate books and closeout
 * fields are the ones Corey already runs the business on.
 */

/* ------------------------------------------------------------------ *
 * Vocabularies taken verbatim from the workspace
 * ------------------------------------------------------------------ */

/** Jobs → Status. The pipeline board's column order. */
export const JOB_STATUSES = [
  'Lead',
  'New call',
  'Qualify',
  'Booked',
  'On site',
  'Quoted',
  'Approved',
  'Scheduled',
  'In Progress',
  'Invoiced',
  'Closed',
  'Declined',
  'No-go',
  'Lost',
] as const;

/** Statuses that mean the ticket is finished, one way or another. */
export const TERMINAL_STATUSES = ['Closed', 'Declined', 'No-go', 'Lost'] as const;

export const JOB_TYPES = ['Residential', 'Commercial', 'Farm / Shop', 'Standby / Critical'] as const;

export const LEAD_SOURCES = ['Phone', 'Google', 'HVAC referral', 'Repeat', 'Magnet', 'Facebook', 'Walk-in'] as const;

/** Jobs → Town. Only towns the business already serves, plus the stop value. */
export const JOB_TOWNS = ['Bolivar', 'Marshfield', 'Buffalo', 'Dallas Co', 'Webster Co', 'Polk Co', 'Other — STOP'] as const;

export const PERMIT_STATES = ['None', 'Needed', 'Pulled', 'Inspected'] as const;

export const TERRITORY_STATUSES = ['GO', 'VERIFY', 'NO-GO'] as const;

/** Job Photos → Stage. The four the closeout card requires, plus the extras
 *  the hidden-damage protocol asks for. */
export const PHOTO_STAGES = [
  'Before',
  'Panel / nameplate',
  'Completed work',
  'Torque / labeling',
  'Hidden damage',
  'Meter / service',
  'Permit',
  'Other',
] as const;

/** The four stages a job must carry before it can close. */
export const REQUIRED_PHOTO_STAGES = ['Before', 'Panel / nameplate', 'Completed work'] as const;

/* ------------------------------------------------------------------ *
 * Field work
 * ------------------------------------------------------------------ */

const jobs: DbDef = {
  key: 'jobs',
  label: 'Jobs',
  singular: 'Job',
  emoji: '⚡',
  group: 'field',
  existing: true,
  description: 'Every ticket from the phone ringing to closeout. Town gates the quote; closeout gates the close.',
  defaultSort: { key: 'onSite', direction: 'descending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true, placeholder: 'Customer + what is dead' },
    { key: 'jobNumber', label: 'Job #', type: 'auto_number', readOnly: true, column: true, help: 'Notion assigns this. Shows as TE-2.' },
    { key: 'status', label: 'Status', type: 'select', options: JOB_STATUSES, column: true, required: true },
    { key: 'type', label: 'Type', type: 'select', options: JOB_TYPES, column: true },
    { key: 'source', label: 'Source', type: 'select', options: LEAD_SOURCES },
    { key: 'town', label: 'Town', type: 'select', options: JOB_TOWNS, column: true, help: 'Town first. Red or unknown is a No-go.' },
    { key: 'permit', label: 'Permit', type: 'select', options: PERMIT_STATES },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'phone', label: 'Phone', type: 'phone', help: 'Capture on the call so the ticket stands alone.' },
    { key: 'window', label: 'Window', type: 'text', placeholder: 'Tue 8–10 AM' },
    { key: 'callIn', label: 'Call in', type: 'date', column: true },
    { key: 'onSite', label: 'On site', type: 'date', column: true },
    { key: 'amount', label: 'Amount', type: 'money', column: true },
    { key: 'installHours', label: 'Install hours', type: 'number', help: 'Tools on the work. This is what counts toward the license.' },
    { key: 'driveHours', label: 'Drive hours', type: 'number', help: 'Windshield time. Never counts toward the license.' },
    { key: 'nextAction', label: 'Next action', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
    { key: 'signed', label: 'Signed', type: 'checkbox', help: 'Estimate signed or invoice filled.' },
    { key: 'depositIn', label: 'Deposit in', type: 'checkbox', help: 'Required at 50% over $1,500.' },
    { key: 'paid', label: 'Paid', type: 'checkbox' },
    { key: 'closeoutDone', label: 'Closeout done', type: 'checkbox' },
    { key: 'reviewAsked', label: 'Review asked', type: 'checkbox', help: 'On your phone, before you leave.' },
    { key: 'magnets', label: 'Magnets', type: 'checkbox', help: 'Two magnets left.' },
    { key: 'photos', label: 'Photos', type: 'checkbox', help: 'Cover off / cover on before you leave.' },
    { key: 'hiddenDamage', label: 'Hidden damage', type: 'checkbox', help: 'Logged if anything extra was found.' },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dualLabel: 'Jobs' },
    { key: 'hourEntries', label: 'Hour entries', type: 'relation', relation: 'hourLedger', dualLabel: 'Job' },
    { key: 'hoursLogged', label: 'Hours logged', type: 'rollup', readOnly: true, help: 'Sum of install hours on the linked ledger entries.' },
    { key: 'lane', label: 'Lane', type: 'formula', readOnly: true },
    { key: 'play', label: 'Play', type: 'formula', readOnly: true, help: 'Notion’s own next-button text.' },
    { key: 'ready', label: 'Ready', type: 'formula', readOnly: true },
    { key: 'closeoutScore', label: 'Closeout score', type: 'formula', readOnly: true },
  ],
};

const jobPhotos: DbDef = {
  key: 'jobPhotos',
  label: 'Job Photos',
  singular: 'Photo',
  emoji: '📸',
  group: 'field',
  description: 'Cover off / cover on. Four minimum per job: before, panel or nameplate, completed work, and torque or labeling on service equipment.',
  defaultSort: { key: 'takenAt', direction: 'descending' },
  fields: [
    { key: 'caption', label: 'Caption', type: 'title', required: true, column: true, placeholder: 'Panel cover off, before' },
    { key: 'file', label: 'Photo', type: 'files', required: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Job photos', column: true },
    { key: 'stage', label: 'Stage', type: 'select', options: PHOTO_STAGES, column: true, required: true },
    { key: 'takenAt', label: 'Taken at', type: 'datetime', column: true },
    { key: 'location', label: 'Location', type: 'text', placeholder: 'Main panel, north wall' },
    { key: 'customerOk', label: 'Customer OK', type: 'checkbox', column: true, help: 'Customer saw it and is fine with the photo.' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Customers
 * ------------------------------------------------------------------ */

const customers: DbDef = {
  key: 'customers',
  label: 'Customers',
  singular: 'Customer',
  emoji: '👤',
  group: 'crm',
  existing: true,
  description: 'Who called, where they are, and whether they have called before.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'town', label: 'Town', type: 'text', column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Homeowner', 'Farm', 'Commercial', 'HVAC / Referral'], column: true },
    { key: 'stage', label: 'Stage', type: 'select', options: ['New', 'Active', 'Repeat', 'Do not serve'], column: true },
    { key: 'foundUs', label: 'How they found us', type: 'select', options: LEAD_SOURCES },
    { key: 'notes', label: 'Notes', type: 'longtext' },
    { key: 'jobs', label: 'Jobs', type: 'relation', relation: 'jobs', dualLabel: 'Customer' },
    { key: 'jobCount', label: 'Job count', type: 'rollup', readOnly: true, column: true },
  ],
};

/* ------------------------------------------------------------------ *
 * License file
 * ------------------------------------------------------------------ */

const hourLedger: DbDef = {
  key: 'hourLedger',
  label: 'Hour Ledger',
  singular: 'Hour Entry',
  emoji: '⏱️',
  group: 'license',
  existing: true,
  description: 'Install hours toward the 12,000 the state wants. Drive time never lands here.',
  defaultSort: { key: 'date', direction: 'descending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dualLabel: 'Hour entries', column: true },
    { key: 'source', label: 'Source', type: 'select', options: ['Prior employer', 'Self-performed', 'Training'], column: true },
    { key: 'installHours', label: 'Install hours', type: 'number', column: true, required: true },
    { key: 'date', label: 'Date', type: 'date', column: true },
    { key: 'affidavit', label: 'Affidavit', type: 'checkbox', column: true, help: 'Backed by a signed letter you could hand the board.' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

const rateBook: DbDef = {
  key: 'rateBook',
  label: 'Rate Book',
  singular: 'Rate',
  emoji: '💰',
  group: 'money',
  existing: true,
  description: 'The published flats and labor rates. Residential is quoted off this card — never the hour on the porch.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'book', label: 'Book', type: 'select', options: ['Residential flat', 'Labor / dispatch', 'Commercial / critical', 'Agreement'], column: true },
    { key: 'price', label: 'Price', type: 'money', column: true },
    { key: 'assumes', label: 'Assumes', type: 'text', column: true, help: 'The scope the price depends on. Quote it out loud.' },
    { key: 'active', label: 'Active', type: 'checkbox', column: true },
  ],
};

/* ------------------------------------------------------------------ *
 * Reference tables
 * ------------------------------------------------------------------ */

const territory: DbDef = {
  key: 'territory',
  label: 'Service Territory (CRM)',
  singular: 'Town',
  emoji: '🗺️',
  group: 'reference',
  existing: true,
  description: 'The town gate. Green books, amber calls the AHJ first, red is a polite no — do not quote it.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'status', label: 'Status', type: 'select', options: TERRITORY_STATUSES, column: true, required: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['City', 'County unincorporated', 'Metro / suburb'], column: true },
    { key: 'schedule', label: 'Schedule?', type: 'select', options: ['Yes', 'Call AHJ first', 'Decline'], column: true },
    { key: 'crmColor', label: 'CRM color', type: 'select', options: ['Green', 'Amber', 'Red'], column: true },
    { key: 'licenseNote', label: 'License note', type: 'text' },
  ],
};

const permits: DbDef = {
  key: 'permits',
  label: 'Permits & Inspectors',
  singular: 'Permit Office',
  emoji: '🏛️',
  group: 'reference',
  existing: true,
  description: 'Who to call in each office, what triggers a permit, and what it costs.',
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'office', label: 'Office', type: 'select', options: ['Bolivar', 'Buffalo', 'Marshfield', 'Dallas Co', 'Webster Co', 'Polk Co'], column: true },
    { key: 'contact', label: 'Contact', type: 'text', column: true },
    { key: 'confirmed', label: 'Confirmed', type: 'date', column: true, help: 'When you last heard it from the clerk directly.' },
    { key: 'feeNotes', label: 'Fee notes', type: 'text' },
    { key: 'permitTrigger', label: 'Permit trigger', type: 'text', column: true },
  ],
};

const referrals: DbDef = {
  key: 'referrals',
  label: 'Referrals',
  singular: 'Referral',
  emoji: '🤝',
  group: 'reference',
  existing: true,
  description: 'HVAC shops, co-ops, propane and rental outfits — the walk-in list that feeds the phone.',
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['HVAC', 'Co-op', 'Propane', 'Rental', 'Other'], column: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Not called', 'Introduced', 'Active', 'Competitor'], column: true },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'notes', label: 'Notes', type: 'longtext', column: true },
  ],
};

const equipment: DbDef = {
  key: 'equipment',
  label: 'Equipment Log',
  singular: 'Equipment',
  emoji: '🔧',
  group: 'reference',
  existing: true,
  description: 'Generators, transfer switches, UPS and panels under a Keep Power agreement, and when each is next due.',
  defaultSort: { key: 'nextService', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Generator', 'ATS', 'UPS', 'Panel'], column: true },
    { key: 'agreement', label: 'Agreement', type: 'select', options: ['None', 'Basic', 'Standard', 'Critical'], column: true },
    { key: 'makeModel', label: 'Make / model', type: 'text', column: true },
    { key: 'site', label: 'Site', type: 'text', column: true },
    { key: 'nextService', label: 'Next service', type: 'date', column: true },
  ],
};

export const DATABASES = [
  jobs, jobPhotos, customers, hourLedger, rateBook, territory, permits, referrals, equipment,
] as const;
