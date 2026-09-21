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

/**
 * Truck Inventory → Category. These are the seven sections of the printed
 * truck-stock sheet, in the order you walk them on the Sunday count, followed
 * by categories the van may grow into. Changing the order here changes the
 * order of the count.
 */
export const TRUCK_CATEGORIES = [
  'Breakers',
  'Devices',
  'Wire & Cable',
  'Connectors & Fittings',
  'Panel & Service',
  'Generator',
  'Consumables & Safety',
  'Lighting',
  'Boxes & Covers',
  'Grounding',
  'Fasteners',
  'Specialty',
] as const;

/** Tools → Category. The tool sheet's sections, in count order. */
export const TOOL_CATEGORIES = [
  'Test & Measure',
  'Hand',
  'Power & Bend',
  'Access & PPE',
  'Generator Service',
  'Shop / Truck',
] as const;

/** Where a tool is right now. Anything that lives at the house does not count. */
export const TOOL_LOCATIONS = ['Truck', 'On body', 'Shop', 'Missing'] as const;

export const TOOL_CONDITIONS = ['Good', 'Needs service', 'Needs calibration', 'Broken', 'Retired'] as const;

export const PERMIT_STATES = ['None', 'Needed', 'Pulled', 'Inspected'] as const;

export const TERRITORY_STATUSES = ['GO', 'VERIFY', 'NO-GO'] as const;

/** Job Photos → Stage. */
export const PHOTO_STAGES = [
  'Before',
  'Service entry',
  'Panel',
  'Other',
  'Completed work',
  'Torque / labeling',
  'Hidden damage',
  'Permit',
] as const;

/**
 * What the arrival intake asks for, before a hand goes on a tool. Each one
 * takes as many photos as the site needs.
 */
export const ARRIVAL_PHOTO_STAGES = ['Before', 'Service entry', 'Panel', 'Other'] as const;

/** Stages that only make sense once the work is done. */
export const COMPLETION_PHOTO_STAGES = ['Completed work', 'Torque / labeling', 'Permit'] as const;

/**
 * The stages a job must carry before it can close. Service entry is not on
 * this list on purpose — plenty of jobs never touch the service.
 */
export const REQUIRED_PHOTO_STAGES = ['Before', 'Panel', 'Completed work'] as const;

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
    { key: 'estTravelMin', label: 'Est travel min', type: 'number', help: 'Forecast one-way drive from Bolivar.' },
    { key: 'estHours', label: 'Est hours', type: 'number', help: 'Forecast before you roll. Compare against install hours after.' },
    { key: 'arrived', label: 'Arrived', type: 'datetime', help: 'Stamped when you tap On site.' },
    { key: 'departed', label: 'Departed', type: 'datetime' },
    { key: 'amount', label: 'Amount', type: 'money', column: true },
    { key: 'installHours', label: 'Install hours', type: 'number', help: 'Tools on the work. This is what counts toward the license.' },
    { key: 'driveHours', label: 'Drive hours', type: 'number', help: 'Windshield time. Never counts toward the license.' },
    { key: 'nextAction', label: 'Next action', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'longtext', help: 'What they said on the phone. In their words.' },
    { key: 'siteConditions', label: 'Site conditions', type: 'longtext', help: 'What you found on arrival: access, hazards, what the panel looks like.' },
    { key: 'diagnosis', label: 'Diagnosis', type: 'longtext', help: 'What is actually wrong, and how you know.' },
    { key: 'workPerformed', label: 'Work performed', type: 'longtext', help: 'Goes on the invoice and the customer copy.' },
    { key: 'testResults', label: 'Test results', type: 'longtext', help: 'Readings, torque values, megger results. The defensible record.' },
    { key: 'recommendations', label: 'Recommendations', type: 'longtext', help: 'Future work you spotted. The best lead source you have.' },
    { key: 'signed', label: 'Signed', type: 'checkbox', help: 'Estimate signed or invoice filled.' },
    { key: 'signedBy', label: 'Signed by', type: 'text' },
    { key: 'paymentMethod', label: 'Payment method', type: 'select', options: ['Cash', 'Check', 'Card', 'ACH', 'Net 15', 'Financing'] },
    { key: 'depositIn', label: 'Deposit in', type: 'checkbox', help: 'Required at 50% over $1,500.' },
    { key: 'paid', label: 'Paid', type: 'checkbox' },
    { key: 'closeoutDone', label: 'Closeout done', type: 'checkbox' },
    { key: 'reviewAsked', label: 'Review asked', type: 'checkbox', help: 'On your phone, before you leave.' },
    { key: 'magnets', label: 'Magnets', type: 'checkbox', help: 'Two magnets left.' },
    { key: 'photos', label: 'Photos', type: 'checkbox', help: 'Cover off / cover on before you leave.' },
    { key: 'hiddenDamage', label: 'Hidden damage', type: 'checkbox', help: 'Logged if anything extra was found.' },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dualLabel: 'Jobs' },
    { key: 'hourEntries', label: 'Hour entries', type: 'relation', relation: 'hourLedger', dualLabel: 'Job' },
    { key: 'materials', label: 'Materials', type: 'relation', relation: 'jobMaterials', dualLabel: 'Job' },
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

/* ------------------------------------------------------------------ *
 * Supply
 * ------------------------------------------------------------------ */

const truckInventory: DbDef = {
  key: 'truckInventory',
  existing: true,
  label: 'Truck Inventory',
  singular: 'Item',
  emoji: '🚚',
  group: 'supply',
  description: 'What is on the van right now. Anything at or below its minimum lands on the restock list, so you hit the supply house once instead of mid-job.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Item', type: 'title', required: true, column: true, placeholder: '12/2 NM-B, 250 ft roll' },
    { key: 'category', label: 'Category', type: 'select', column: true,
      options: TRUCK_CATEGORIES },
    { key: 'onTruck', label: 'On truck', type: 'number', column: true },
    { key: 'minOnTruck', label: 'Min on truck', type: 'number', column: true, help: 'At or below this, it goes on the restock list.' },
    { key: 'unit', label: 'Unit', type: 'select', options: ['ea', 'ft', 'box', 'roll', 'lot'] },
    { key: 'cost', label: 'Cost', type: 'money', column: true },
    { key: 'sellPrice', label: 'Sell price', type: 'money' },
    { key: 'bin', label: 'Bin', type: 'text', column: true, help: 'Where it lives on the van.' },
    { key: 'supplier', label: 'Supplier', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
    { key: 'lastCounted', label: 'Last counted', type: 'date', column: true, help: 'Sunday count. The date you actually laid eyes on it.' },
    { key: 'orderForJob', label: 'Order for the job', type: 'checkbox', help: 'Not truck stock. Ordered per job and billed as job material, so it never hits the restock list.' },
  ],
};

const jobMaterials: DbDef = {
  key: 'jobMaterials',
  existing: true,
  label: 'Job Materials',
  singular: 'Material Line',
  emoji: '🧰',
  group: 'supply',
  description: 'What actually went into each job. Truck-stock lines pull the van count down; everything bills at cost plus 35%.',
  defaultSort: { key: 'usedOn', direction: 'descending' },
  fields: [
    { key: 'name', label: 'Line', type: 'title', required: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dualLabel: 'Materials', column: true },
    { key: 'item', label: 'Item', type: 'relation', relation: 'truckInventory', dualLabel: 'Used on', column: true },
    { key: 'quantity', label: 'Qty', type: 'number', column: true },
    { key: 'unitCost', label: 'Unit cost', type: 'money', column: true },
    { key: 'extendedCost', label: 'Extended cost', type: 'money', column: true, derived: true, help: 'Qty x unit cost, before the 35% markup.' },
    { key: 'source', label: 'Source', type: 'select', options: ['Truck stock', 'Supply house', 'Customer supplied', 'Special order'], column: true },
    { key: 'billable', label: 'Billable', type: 'checkbox', column: true },
    { key: 'pulledFromTruck', label: 'Pulled from truck', type: 'checkbox', derived: true, help: 'Set once the van count has been decremented.' },
    { key: 'usedOn', label: 'Used on', type: 'date', column: true },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const tools: DbDef = {
  key: 'tools',
  existing: true,
  label: 'Tools',
  singular: 'Tool',
  emoji: '🔧',
  group: 'supply',
  description:
    'Every tool you own, where it lives, and what shape it is in. Tools are not stock — they do not get used up, they go missing, break, or come due for calibration. Have means it is on the truck or on your body; unchecked means buy or fetch before Monday.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Tool', type: 'title', required: true, column: true, placeholder: 'Clamp meter (amp)' },
    { key: 'category', label: 'Category', type: 'select', column: true, options: TOOL_CATEGORIES },
    { key: 'have', label: 'Have', type: 'checkbox', column: true, help: 'On the truck or on your body. Unchecked means buy or fetch before Monday.' },
    { key: 'location', label: 'Location', type: 'select', column: true, options: TOOL_LOCATIONS },
    { key: 'condition', label: 'Condition', type: 'select', column: true, options: TOOL_CONDITIONS },
    { key: 'lastChecked', label: 'Last checked', type: 'date', column: true, help: 'Sunday count.' },
    { key: 'replacementCost', label: 'Replacement cost', type: 'money', column: true, help: 'What it costs to replace today. The total is what the insurance rider has to cover.' },
    { key: 'serial', label: 'Serial / ID', type: 'text', help: 'Serial or your own paint-pen mark. Fill it in for anything worth stealing.' },
    { key: 'notes', label: 'Note', type: 'longtext' },
  ],
};

export const DATABASES = [
  jobs, jobPhotos, customers, hourLedger, rateBook, territory, permits, referrals, equipment,
  truckInventory, jobMaterials, tools,
] as const;
