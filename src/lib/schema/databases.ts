import type { DbDef } from './types';

/* ------------------------------------------------------------------ *
 * Shared option vocabularies
 * ------------------------------------------------------------------ */

export const JOB_STATUSES = [
  'Unscheduled',
  'Scheduled',
  'Dispatched',
  'On Site',
  'In Progress',
  'Needs Parts',
  'Awaiting Customer',
  'Ready to Invoice',
  'Invoiced',
  'Closed',
  'Cancelled',
] as const;

export const JOB_PRIORITIES = ['Emergency', 'Same Day', 'Urgent', 'Standard', 'Scheduled Maintenance'] as const;

export const JOB_TYPES = [
  'Service Call',
  'Troubleshooting',
  'Panel Upgrade',
  'Rewire',
  'New Construction Rough-In',
  'New Construction Trim',
  'Lighting',
  'EV Charger Install',
  'Generator',
  'Solar / Storage',
  'Low Voltage / Data',
  'Fire Alarm',
  'Motor / Controls',
  'Thermal Imaging Survey',
  'Code Correction',
  'Preventive Maintenance',
  'Warranty Callback',
] as const;

export const TRADE_SEGMENTS = ['Residential', 'Commercial', 'Industrial', 'Multi-Family', 'Institutional'] as const;

/* ------------------------------------------------------------------ *
 * CRM
 * ------------------------------------------------------------------ */

const customers: DbDef = {
  key: 'customers',
  label: 'Customers',
  singular: 'Customer',
  emoji: '🏠',
  group: 'crm',
  description: 'Every household, property manager, GC and facility you serve — the spine of the CRM.',
  defaultSort: { key: 'name', direction: 'ascending' },
  fields: [
    { key: 'name', label: 'Customer', type: 'title', required: true, column: true, placeholder: 'Alvarez Residence' },
    { key: 'segment', label: 'Segment', type: 'select', options: TRADE_SEGMENTS, column: true },
    { key: 'stage', label: 'Lifecycle Stage', type: 'select', column: true,
      options: ['Lead', 'Estimate Sent', 'Active Customer', 'Repeat Customer', 'Service Agreement', 'Dormant', 'Lost'] },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'email', label: 'Email', type: 'email', column: true },
    { key: 'billingAddress', label: 'Billing Address', type: 'text' },
    { key: 'source', label: 'Lead Source', type: 'select',
      options: ['Referral', 'Google', 'Repeat Customer', 'Yard Sign', 'Home Advisor', 'Social', 'GC Partner', 'Property Manager', 'Walk-In', 'Other'] },
    { key: 'referredBy', label: 'Referred By', type: 'text' },
    { key: 'rating', label: 'Account Health', type: 'select', options: ['A — Priority', 'B — Good', 'C — Watch', 'D — Do Not Service'] },
    { key: 'paymentTerms', label: 'Payment Terms', type: 'select', options: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Progress Billing', 'Card on File'] },
    { key: 'taxExempt', label: 'Tax Exempt', type: 'checkbox' },
    { key: 'creditHold', label: 'Credit Hold', type: 'checkbox', help: 'Blocks dispatch until cleared by the office.' },
    { key: 'tags', label: 'Tags', type: 'multi_select',
      options: ['VIP', 'Historic Home', 'Knob & Tube', 'Aluminum Wiring', 'Federal Pacific Panel', 'Zinsco Panel', 'Warranty Watch', 'Slow Pay', 'Net Promoter'] },
    { key: 'lifetimeValue', label: 'Lifetime Value', type: 'money', derived: true, column: true, help: 'Sum of paid invoices. Recalculated by the app.' },
    { key: 'openBalance', label: 'Open Balance', type: 'money', derived: true, column: true },
    { key: 'firstServiceDate', label: 'First Service', type: 'date' },
    { key: 'lastServiceDate', label: 'Last Service', type: 'date', derived: true, column: true },
    { key: 'preferredTech', label: 'Preferred Tech', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Preferred By' },
    { key: 'notes', label: 'Account Notes', type: 'longtext' },
  ],
};

const contacts: DbDef = {
  key: 'contacts',
  label: 'Contacts',
  singular: 'Contact',
  emoji: '👤',
  group: 'crm',
  description: 'People behind the accounts — owners, tenants, facility managers, GC superintendents.',
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'role', label: 'Role', type: 'select', column: true,
      options: ['Homeowner', 'Tenant', 'Property Manager', 'Facility Manager', 'GC Superintendent', 'Project Manager', 'Accounts Payable', 'Other'] },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'mobile', label: 'Mobile', type: 'phone' },
    { key: 'email', label: 'Email', type: 'email', column: true },
    { key: 'primary', label: 'Primary Contact', type: 'checkbox', column: true },
    { key: 'preferredChannel', label: 'Preferred Channel', type: 'select', options: ['Call', 'Text', 'Email'] },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const properties: DbDef = {
  key: 'properties',
  label: 'Service Locations',
  singular: 'Service Location',
  emoji: '📍',
  group: 'crm',
  description: 'The physical sites you work on, with the electrical details a tech wants before rolling up.',
  fields: [
    { key: 'name', label: 'Location', type: 'title', required: true, column: true, placeholder: '1820 Camino Real, Unit B' },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'address', label: 'Street Address', type: 'text', column: true },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'state', label: 'State', type: 'text' },
    { key: 'postalCode', label: 'ZIP', type: 'text' },
    { key: 'propertyType', label: 'Property Type', type: 'select', options: TRADE_SEGMENTS, column: true },
    { key: 'yearBuilt', label: 'Year Built', type: 'number' },
    { key: 'serviceSize', label: 'Service Size', type: 'select', column: true,
      options: ['60A', '100A', '125A', '150A', '200A', '400A', '600A', '800A', '1200A', '2000A+'] },
    { key: 'serviceVoltage', label: 'Service Voltage', type: 'select',
      options: ['120/240V 1Ø', '120/208V 3Ø', '277/480V 3Ø', '240V 3Ø Delta', 'Other'] },
    { key: 'panelMake', label: 'Panel Make / Model', type: 'text', help: 'Flag recalled panels (FPE Stab-Lok, Zinsco) in the customer tags.' },
    { key: 'meterNumber', label: 'Meter Number', type: 'text' },
    { key: 'utilityAccount', label: 'Utility Account', type: 'text' },
    { key: 'utility', label: 'Utility', type: 'text' },
    { key: 'ahj', label: 'AHJ', type: 'text', help: 'Authority having jurisdiction for permits and inspections.' },
    { key: 'accessNotes', label: 'Access Notes', type: 'longtext', help: 'Gate codes, lockbox, dogs, parking, after-hours contact.' },
    { key: 'hazards', label: 'Known Hazards', type: 'multi_select',
      options: ['Asbestos', 'Knob & Tube', 'Aluminum Branch Wiring', 'Confined Space', 'Live Bus Duct', 'Arc Flash > 8 cal', 'Roof Access', 'Crawl Space', 'Attic Heat', 'Dog on Site'] },
    { key: 'arcFlashCategory', label: 'Arc Flash PPE Category', type: 'select', options: ['1', '2', '3', '4', 'Not Assessed'] },
    { key: 'gpsLat', label: 'Latitude', type: 'number' },
    { key: 'gpsLng', label: 'Longitude', type: 'number' },
    { key: 'notes', label: 'Site Notes', type: 'longtext' },
  ],
};

const interactions: DbDef = {
  key: 'interactions',
  label: 'Interactions',
  singular: 'Interaction',
  emoji: '💬',
  group: 'crm',
  description: 'Every touch: calls, texts, emails, site walks, review requests. The CRM activity timeline.',
  defaultSort: { key: 'occurredAt', direction: 'descending' },
  fields: [
    { key: 'summary', label: 'Summary', type: 'title', required: true, column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true },
    { key: 'channel', label: 'Channel', type: 'select', column: true,
      options: ['Inbound Call', 'Outbound Call', 'Text', 'Email', 'Site Visit', 'Voicemail', 'Web Form', 'Review', 'Complaint'] },
    { key: 'occurredAt', label: 'Occurred At', type: 'datetime', column: true },
    { key: 'owner', label: 'Handled By', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Interactions' },
    { key: 'outcome', label: 'Outcome', type: 'select', options: ['Booked Job', 'Quote Requested', 'Info Only', 'Follow Up Needed', 'No Answer', 'Declined', 'Escalated'] },
    { key: 'followUpOn', label: 'Follow Up On', type: 'date', column: true },
    { key: 'sentiment', label: 'Sentiment', type: 'select', options: ['Promoter', 'Neutral', 'Detractor'] },
    { key: 'details', label: 'Details', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Operations
 * ------------------------------------------------------------------ */

const jobs: DbDef = {
  key: 'jobs',
  label: 'Jobs',
  singular: 'Job',
  emoji: '⚡',
  group: 'operations',
  description: 'Work orders from the first phone call to the closed-out invoice. The center of the system.',
  defaultSort: { key: 'scheduledStart', direction: 'descending' },
  fields: [
    { key: 'title', label: 'Job', type: 'title', required: true, column: true, placeholder: 'Panel upgrade 100A → 200A' },
    { key: 'jobNumber', label: 'Job #', type: 'text', column: true, derived: true, help: 'Auto-assigned as J-YYYY-NNNN when the job is created.' },
    { key: 'status', label: 'Status', type: 'select', options: JOB_STATUSES, column: true, required: true },
    { key: 'priority', label: 'Priority', type: 'select', options: JOB_PRIORITIES, column: true },
    { key: 'jobType', label: 'Job Type', type: 'select', options: JOB_TYPES, column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true },
    { key: 'contact', label: 'Site Contact', type: 'relation', relation: 'contacts', dual: true },
    { key: 'assignedTo', label: 'Assigned Crew', type: 'relation', relation: 'technicians', dual: true, column: true },
    { key: 'scheduledStart', label: 'Scheduled Start', type: 'datetime', column: true },
    { key: 'scheduledEnd', label: 'Scheduled End', type: 'datetime' },
    { key: 'arrivalWindow', label: 'Arrival Window', type: 'select', options: ['8–10 AM', '10–12 PM', '12–2 PM', '2–4 PM', '4–6 PM', 'First Call', 'All Day', 'After Hours'] },
    { key: 'onSiteAt', label: 'On Site At', type: 'datetime', derived: true },
    { key: 'completedAt', label: 'Completed At', type: 'datetime', derived: true },
    { key: 'estimatedHours', label: 'Estimated Hours', type: 'number' },
    { key: 'actualHours', label: 'Actual Hours', type: 'number', derived: true, help: 'Rolled up from time entries.' },
    { key: 'problem', label: 'Reported Problem', type: 'longtext', help: 'In the customer’s words. Never paraphrase this away.' },
    { key: 'diagnosis', label: 'Diagnosis', type: 'longtext' },
    { key: 'workPerformed', label: 'Work Performed', type: 'longtext', help: 'Goes on the invoice and the customer’s copy.' },
    { key: 'recommendations', label: 'Recommendations', type: 'longtext', help: 'Future work spotted on site — the highest-converting lead source you have.' },
    { key: 'permitRequired', label: 'Permit Required', type: 'checkbox' },
    { key: 'circuitsAffected', label: 'Circuits Affected', type: 'text' },
    { key: 'materialsCost', label: 'Materials Cost', type: 'money', derived: true },
    { key: 'laborCost', label: 'Labor Cost', type: 'money', derived: true },
    { key: 'revenue', label: 'Revenue', type: 'money', derived: true, column: true },
    { key: 'grossMargin', label: 'Gross Margin', type: 'percent', derived: true, column: true },
    { key: 'callbackOf', label: 'Callback Of', type: 'relation', relation: 'jobs', help: 'Links a warranty return to the original job so first-time-fix rate stays honest.' },
    { key: 'warranty', label: 'Warranty Work', type: 'checkbox' },
    { key: 'customerSignature', label: 'Customer Signature', type: 'files', help: 'Captured on the completion screen.' },
    { key: 'signedBy', label: 'Signed By', type: 'text' },
    { key: 'satisfaction', label: 'Satisfaction', type: 'select', options: ['5 — Delighted', '4 — Satisfied', '3 — Neutral', '2 — Unhappy', '1 — Escalate'] },
    { key: 'reviewRequested', label: 'Review Requested', type: 'checkbox' },
    { key: 'tags', label: 'Tags', type: 'multi_select', options: ['Callback Risk', 'Photo Required', 'Two-Person Job', 'Lift Required', 'Utility Coordination', 'Night Work', 'Hot Work'] },
  ],
};

const jobPhotos: DbDef = {
  key: 'jobPhotos',
  label: 'Job Photos',
  singular: 'Photo',
  emoji: '📸',
  group: 'operations',
  description: 'Before / during / after documentation for every job. Your defense in a dispute and your best sales tool.',
  defaultSort: { key: 'takenAt', direction: 'descending' },
  fields: [
    { key: 'caption', label: 'Caption', type: 'title', required: true, column: true, placeholder: 'Existing FPE panel, double-tapped breakers' },
    { key: 'file', label: 'Photo', type: 'files', required: true, help: 'Uploaded straight into Notion storage.' },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true },
    { key: 'stage', label: 'Stage', type: 'select', column: true, required: true,
      options: ['Before', 'During', 'After', 'Damage / Existing Condition', 'Code Violation', 'Equipment Label', 'Meter / Serial', 'Permit', 'Thermal Scan', 'Completion'] },
    { key: 'takenAt', label: 'Taken At', type: 'datetime', column: true },
    { key: 'takenBy', label: 'Taken By', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Photos' },
    { key: 'location', label: 'Location On Site', type: 'text', placeholder: 'Main panel, garage wall' },
    { key: 'tags', label: 'Tags', type: 'multi_select',
      options: ['Panel', 'Meter', 'Sub-Panel', 'Wiring', 'Device', 'Fixture', 'Trenching', 'Rough-In', 'Trim Out', 'Thermal', 'Hazard', 'Serial Number', 'Customer Copy'] },
    { key: 'includeInReport', label: 'Include In Customer Report', type: 'checkbox', column: true },
    { key: 'gpsLat', label: 'Latitude', type: 'number' },
    { key: 'gpsLng', label: 'Longitude', type: 'number' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const tasks: DbDef = {
  key: 'tasks',
  label: 'Tasks',
  singular: 'Task',
  emoji: '✅',
  group: 'operations',
  description: 'Office and field follow-ups that are not themselves billable jobs.',
  defaultSort: { key: 'dueDate', direction: 'ascending' },
  fields: [
    { key: 'title', label: 'Task', type: 'title', required: true, column: true },
    { key: 'status', label: 'Status', type: 'select', options: ['To Do', 'In Progress', 'Blocked', 'Done'], column: true },
    { key: 'priority', label: 'Priority', type: 'select', options: ['High', 'Medium', 'Low'], column: true },
    { key: 'assignee', label: 'Assignee', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Tasks', column: true },
    { key: 'dueDate', label: 'Due', type: 'date', column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true },
    { key: 'category', label: 'Category', type: 'select', options: ['Follow Up', 'Order Parts', 'Pull Permit', 'Schedule Inspection', 'Collections', 'Quote Follow Up', 'Warranty', 'Admin'] },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Money
 * ------------------------------------------------------------------ */

const estimates: DbDef = {
  key: 'estimates',
  label: 'Estimates',
  singular: 'Estimate',
  emoji: '📝',
  group: 'money',
  description: 'Good / Better / Best proposals with a real approval trail. Also serves as the sales pipeline.',
  defaultSort: { key: 'issuedOn', direction: 'descending' },
  fields: [
    { key: 'title', label: 'Estimate', type: 'title', required: true, column: true },
    { key: 'estimateNumber', label: 'Estimate #', type: 'text', column: true, derived: true },
    { key: 'status', label: 'Status', type: 'select', column: true, required: true,
      options: ['Draft', 'Sent', 'Viewed', 'Approved', 'Partially Approved', 'Declined', 'Expired', 'Converted to Job'] },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true },
    { key: 'tier', label: 'Option Tier', type: 'select', options: ['Good', 'Better', 'Best', 'Single Option'], column: true },
    { key: 'issuedOn', label: 'Issued', type: 'date', column: true },
    { key: 'expiresOn', label: 'Expires', type: 'date', column: true },
    { key: 'subtotal', label: 'Subtotal', type: 'money', derived: true },
    { key: 'taxRate', label: 'Tax Rate', type: 'percent' },
    { key: 'taxAmount', label: 'Tax', type: 'money', derived: true },
    { key: 'discount', label: 'Discount', type: 'money' },
    { key: 'total', label: 'Total', type: 'money', derived: true, column: true },
    { key: 'estimatedCost', label: 'Estimated Cost', type: 'money', derived: true, help: 'Material + labor cost, so you can see margin before you send it.' },
    { key: 'approvedOn', label: 'Approved', type: 'date' },
    { key: 'approvedBy', label: 'Approved By', type: 'text' },
    { key: 'signature', label: 'Signature', type: 'files' },
    { key: 'declineReason', label: 'Decline Reason', type: 'select', options: ['Price', 'Timing', 'Went With Competitor', 'Scope Changed', 'No Response', 'Other'] },
    { key: 'scope', label: 'Scope of Work', type: 'longtext' },
    { key: 'exclusions', label: 'Exclusions', type: 'longtext', help: 'Permits, drywall repair, trenching, engineering — say it up front.' },
    { key: 'terms', label: 'Terms', type: 'longtext' },
  ],
};

const lineItems: DbDef = {
  key: 'lineItems',
  label: 'Line Items',
  singular: 'Line Item',
  emoji: '➕',
  group: 'money',
  description: 'Priced lines shared by estimates and invoices, each one costed so margin is never a guess.',
  fields: [
    { key: 'description', label: 'Description', type: 'title', required: true, column: true },
    { key: 'estimate', label: 'Estimate', type: 'relation', relation: 'estimates', dual: true, dualLabel: 'Line Items' },
    { key: 'invoice', label: 'Invoice', type: 'relation', relation: 'invoices', dual: true, dualLabel: 'Line Items' },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Labor', 'Material', 'Equipment', 'Permit', 'Subcontractor', 'Trip Charge', 'Diagnostic', 'Discount'], column: true },
    { key: 'material', label: 'Catalog Item', type: 'relation', relation: 'materials', dual: true, dualLabel: 'Used On Lines' },
    { key: 'quantity', label: 'Qty', type: 'number', column: true },
    { key: 'unit', label: 'Unit', type: 'select', options: ['ea', 'hr', 'ft', 'lot', 'day', 'box', 'roll'] },
    { key: 'unitCost', label: 'Unit Cost', type: 'money' },
    { key: 'unitPrice', label: 'Unit Price', type: 'money', column: true },
    { key: 'lineTotal', label: 'Line Total', type: 'money', derived: true, column: true },
    { key: 'taxable', label: 'Taxable', type: 'checkbox' },
    { key: 'sortOrder', label: 'Order', type: 'number' },
  ],
};

const invoices: DbDef = {
  key: 'invoices',
  label: 'Invoices',
  singular: 'Invoice',
  emoji: '💵',
  group: 'money',
  description: 'Billing and collections, including progress billing and retainage on construction work.',
  defaultSort: { key: 'issuedOn', direction: 'descending' },
  fields: [
    { key: 'title', label: 'Invoice', type: 'title', required: true, column: true },
    { key: 'invoiceNumber', label: 'Invoice #', type: 'text', column: true, derived: true },
    { key: 'status', label: 'Status', type: 'select', column: true, required: true,
      options: ['Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'In Collections', 'Written Off', 'Void'] },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, column: true },
    { key: 'issuedOn', label: 'Issued', type: 'date', column: true },
    { key: 'dueOn', label: 'Due', type: 'date', column: true },
    { key: 'terms', label: 'Terms', type: 'select', options: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45'] },
    { key: 'subtotal', label: 'Subtotal', type: 'money', derived: true },
    { key: 'taxRate', label: 'Tax Rate', type: 'percent' },
    { key: 'taxAmount', label: 'Tax', type: 'money', derived: true },
    { key: 'retainage', label: 'Retainage', type: 'money', help: 'Held back on construction contracts until final acceptance.' },
    { key: 'total', label: 'Total', type: 'money', derived: true, column: true },
    { key: 'amountPaid', label: 'Paid', type: 'money', derived: true, column: true },
    { key: 'balanceDue', label: 'Balance Due', type: 'money', derived: true, column: true },
    { key: 'paidOn', label: 'Paid On', type: 'date' },
    { key: 'poNumber', label: 'PO Number', type: 'text' },
    { key: 'lienDeadline', label: 'Lien Deadline', type: 'date', help: 'Preliminary notice / mechanics lien clock. Miss it and the money is gone.' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const payments: DbDef = {
  key: 'payments',
  label: 'Payments',
  singular: 'Payment',
  emoji: '🏦',
  group: 'money',
  description: 'Money actually received, including deposits taken before the truck rolls.',
  defaultSort: { key: 'receivedOn', direction: 'descending' },
  fields: [
    { key: 'reference', label: 'Reference', type: 'title', required: true, column: true },
    { key: 'invoice', label: 'Invoice', type: 'relation', relation: 'invoices', dual: true, dualLabel: 'Payments', column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true },
    { key: 'amount', label: 'Amount', type: 'money', column: true, required: true },
    { key: 'method', label: 'Method', type: 'select', options: ['Card', 'ACH', 'Check', 'Cash', 'Financing', 'Warranty Credit'], column: true },
    { key: 'receivedOn', label: 'Received', type: 'date', column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Deposit', 'Progress Payment', 'Final Payment', 'Refund'] },
    { key: 'processorFee', label: 'Processor Fee', type: 'money' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Workforce
 * ------------------------------------------------------------------ */

const technicians: DbDef = {
  key: 'technicians',
  label: 'Team',
  singular: 'Team Member',
  emoji: '👷',
  group: 'workforce',
  description: 'Electricians, apprentices and office staff — with the license and cert dates that keep you legal.',
  fields: [
    { key: 'name', label: 'Name', type: 'title', required: true, column: true },
    { key: 'role', label: 'Role', type: 'select', column: true,
      options: ['Master Electrician', 'Journeyman', 'Apprentice', 'Helper', 'Foreman', 'Estimator', 'Dispatcher', 'Office Manager', 'Owner'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'], column: true },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'licenseNumber', label: 'License #', type: 'text', column: true },
    { key: 'licenseExpires', label: 'License Expires', type: 'date', column: true },
    { key: 'certifications', label: 'Certifications', type: 'multi_select',
      options: ['OSHA 10', 'OSHA 30', 'NFPA 70E', 'CPR / First Aid', 'EVITP', 'NABCEP Solar', 'Fire Alarm (NICET)', 'Confined Space', 'Aerial Lift', 'Forklift', 'Thermography Level 1'] },
    { key: 'certExpires', label: 'Next Cert Expiry', type: 'date' },
    { key: 'skills', label: 'Skills', type: 'multi_select',
      options: ['Service Work', 'Troubleshooting', 'Panel Upgrades', 'New Construction', 'Controls / PLC', 'Generators', 'EV Charging', 'Solar / Storage', 'Fire Alarm', 'Low Voltage', 'Motor Control', 'Bending / Pipe'] },
    { key: 'hourlyCost', label: 'Burdened Hourly Cost', type: 'money', help: 'Wage + taxes + insurance + benefits. The number margin math actually needs.' },
    { key: 'billableRate', label: 'Billable Rate', type: 'money' },
    { key: 'truck', label: 'Assigned Vehicle', type: 'relation', relation: 'assets', dual: true, dualLabel: 'Assigned To' },
    { key: 'hireDate', label: 'Hire Date', type: 'date' },
    { key: 'emergencyContact', label: 'Emergency Contact', type: 'text' },
    { key: 'color', label: 'Dispatch Color', type: 'select', options: ['Amber', 'Blue', 'Green', 'Purple', 'Red', 'Teal', 'Pink', 'Slate'] },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const timeEntries: DbDef = {
  key: 'timeEntries',
  label: 'Time Entries',
  singular: 'Time Entry',
  emoji: '⏱️',
  group: 'workforce',
  description: 'Clock in / clock out by job, split into billable, travel and warranty time.',
  defaultSort: { key: 'startedAt', direction: 'descending' },
  fields: [
    { key: 'label', label: 'Entry', type: 'title', required: true, column: true },
    { key: 'technician', label: 'Technician', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Time Entries', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Labor', 'Travel', 'Warranty', 'Shop', 'Training', 'PTO'], column: true },
    { key: 'startedAt', label: 'Start', type: 'datetime', column: true },
    { key: 'endedAt', label: 'End', type: 'datetime' },
    { key: 'hours', label: 'Hours', type: 'number', column: true, derived: true },
    { key: 'overtime', label: 'Overtime', type: 'checkbox' },
    { key: 'billable', label: 'Billable', type: 'checkbox', column: true },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Supply chain
 * ------------------------------------------------------------------ */

const materials: DbDef = {
  key: 'materials',
  label: 'Materials',
  singular: 'Material',
  emoji: '🔌',
  group: 'supply',
  description: 'Priced catalog and truck stock — breakers, wire, devices, fixtures, gear.',
  fields: [
    { key: 'name', label: 'Item', type: 'title', required: true, column: true, placeholder: '12/2 NM-B Romex, 250 ft roll' },
    { key: 'sku', label: 'SKU', type: 'text', column: true },
    { key: 'category', label: 'Category', type: 'select', column: true,
      options: ['Wire & Cable', 'Breakers', 'Panels & Load Centers', 'Devices', 'Boxes & Covers', 'Conduit & Fittings', 'Lighting', 'Fasteners', 'Grounding', 'EV Equipment', 'Generators', 'Controls', 'Fire / Low Voltage', 'Consumables', 'Tools'] },
    { key: 'unit', label: 'Unit', type: 'select', options: ['ea', 'ft', 'box', 'roll', 'lot'] },
    { key: 'cost', label: 'Cost', type: 'money', column: true },
    { key: 'price', label: 'Sell Price', type: 'money', column: true },
    { key: 'markup', label: 'Markup', type: 'percent', derived: true },
    { key: 'onHand', label: 'On Hand', type: 'number', column: true },
    { key: 'reorderPoint', label: 'Reorder At', type: 'number', column: true },
    { key: 'stockLocation', label: 'Stock Location', type: 'select', options: ['Shop', 'Truck 1', 'Truck 2', 'Truck 3', 'Job Site', 'Vendor Direct'] },
    { key: 'vendor', label: 'Preferred Vendor', type: 'relation', relation: 'vendors', dual: true, dualLabel: 'Catalog Items' },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const materialUsage: DbDef = {
  key: 'materialUsage',
  label: 'Material Usage',
  singular: 'Material Usage',
  emoji: '📦',
  group: 'supply',
  description: 'What was actually consumed on each job — the difference between estimated and real margin.',
  defaultSort: { key: 'usedOn', direction: 'descending' },
  fields: [
    { key: 'label', label: 'Usage', type: 'title', required: true, column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Materials Used', column: true },
    { key: 'material', label: 'Material', type: 'relation', relation: 'materials', dual: true, dualLabel: 'Usage', column: true },
    { key: 'quantity', label: 'Qty', type: 'number', column: true },
    { key: 'unitCost', label: 'Unit Cost', type: 'money' },
    { key: 'extendedCost', label: 'Extended Cost', type: 'money', derived: true, column: true },
    { key: 'usedOn', label: 'Used On', type: 'date', column: true },
    { key: 'usedBy', label: 'Used By', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Material Usage' },
    { key: 'billable', label: 'Billable', type: 'checkbox' },
  ],
};

const vendors: DbDef = {
  key: 'vendors',
  label: 'Vendors',
  singular: 'Vendor',
  emoji: '🚚',
  group: 'supply',
  description: 'Supply houses, manufacturers and subcontractors.',
  fields: [
    { key: 'name', label: 'Vendor', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Supply House', 'Manufacturer', 'Subcontractor', 'Rental', 'Service'], column: true },
    { key: 'accountNumber', label: 'Account #', type: 'text', column: true },
    { key: 'phone', label: 'Phone', type: 'phone', column: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'website', label: 'Website', type: 'url' },
    { key: 'rep', label: 'Rep', type: 'text' },
    { key: 'terms', label: 'Terms', type: 'select', options: ['COD', 'Net 15', 'Net 30', 'Net 60'] },
    { key: 'address', label: 'Address', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const purchaseOrders: DbDef = {
  key: 'purchaseOrders',
  label: 'Purchase Orders',
  singular: 'Purchase Order',
  emoji: '🧾',
  group: 'supply',
  description: 'Ordering and receiving, tied back to the job that needs the parts.',
  defaultSort: { key: 'orderedOn', direction: 'descending' },
  fields: [
    { key: 'title', label: 'PO', type: 'title', required: true, column: true },
    { key: 'poNumber', label: 'PO #', type: 'text', column: true, derived: true },
    { key: 'vendor', label: 'Vendor', type: 'relation', relation: 'vendors', dual: true, dualLabel: 'Purchase Orders', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Purchase Orders', column: true },
    { key: 'status', label: 'Status', type: 'select', column: true,
      options: ['Draft', 'Ordered', 'Partially Received', 'Received', 'Backordered', 'Cancelled'] },
    { key: 'orderedOn', label: 'Ordered', type: 'date', column: true },
    { key: 'expectedOn', label: 'Expected', type: 'date', column: true },
    { key: 'receivedOn', label: 'Received', type: 'date' },
    { key: 'total', label: 'Total', type: 'money', column: true },
    { key: 'orderedBy', label: 'Ordered By', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Purchase Orders' },
    { key: 'items', label: 'Items', type: 'longtext' },
    { key: 'attachments', label: 'Attachments', type: 'files' },
  ],
};

/* ------------------------------------------------------------------ *
 * Compliance & assets
 * ------------------------------------------------------------------ */

const permits: DbDef = {
  key: 'permits',
  label: 'Permits & Inspections',
  singular: 'Permit',
  emoji: '🏛️',
  group: 'compliance',
  description: 'Permit applications, inspection appointments and corrections — the thing that silently kills schedules.',
  defaultSort: { key: 'inspectionDate', direction: 'ascending' },
  fields: [
    { key: 'title', label: 'Permit', type: 'title', required: true, column: true },
    { key: 'permitNumber', label: 'Permit #', type: 'text', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Permits', column: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true, dualLabel: 'Permits' },
    { key: 'ahj', label: 'AHJ', type: 'text', column: true },
    { key: 'status', label: 'Status', type: 'select', column: true,
      options: ['Not Started', 'Applied', 'Issued', 'Inspection Scheduled', 'Passed', 'Corrections Required', 'Re-Inspection Scheduled', 'Finaled', 'Expired'] },
    { key: 'permitType', label: 'Type', type: 'select',
      options: ['Electrical', 'Service Change', 'Solar / Storage', 'EV Charger', 'Generator', 'Fire Alarm', 'Temporary Power', 'Over-the-Counter'] },
    { key: 'appliedOn', label: 'Applied', type: 'date' },
    { key: 'issuedOn', label: 'Issued', type: 'date' },
    { key: 'expiresOn', label: 'Expires', type: 'date' },
    { key: 'inspectionType', label: 'Inspection Stage', type: 'select', options: ['Underground', 'Rough-In', 'Service', 'Final', 'Re-Inspection'] },
    { key: 'inspectionDate', label: 'Inspection', type: 'datetime', column: true },
    { key: 'inspector', label: 'Inspector', type: 'text' },
    { key: 'result', label: 'Result', type: 'select', options: ['Passed', 'Passed With Notes', 'Failed', 'Partial', 'Not Ready'], column: true },
    { key: 'corrections', label: 'Corrections', type: 'longtext' },
    { key: 'fee', label: 'Fee', type: 'money' },
    { key: 'documents', label: 'Documents', type: 'files' },
  ],
};

const safety: DbDef = {
  key: 'safety',
  label: 'Safety',
  singular: 'Safety Record',
  emoji: '🦺',
  group: 'compliance',
  description: 'Job hazard analyses, toolbox talks, LOTO records and incidents. NFPA 70E lives here.',
  defaultSort: { key: 'date', direction: 'descending' },
  fields: [
    { key: 'title', label: 'Record', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', column: true, required: true,
      options: ['Job Hazard Analysis', 'Toolbox Talk', 'Lockout / Tagout', 'Energized Work Permit', 'Incident', 'Near Miss', 'Vehicle Incident', 'Inspection', 'Training'] },
    { key: 'date', label: 'Date', type: 'date', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Safety Records', column: true },
    { key: 'crew', label: 'Crew', type: 'relation', relation: 'technicians', dual: true, dualLabel: 'Safety Records', column: true },
    { key: 'severity', label: 'Severity', type: 'select', options: ['None', 'First Aid', 'Recordable', 'Lost Time', 'Property Damage'], column: true },
    { key: 'hazards', label: 'Hazards Identified', type: 'multi_select',
      options: ['Shock', 'Arc Flash', 'Fall', 'Confined Space', 'Trenching', 'Heat', 'Overhead Lines', 'Ladder', 'Lifting', 'Traffic', 'Asbestos / Lead'] },
    { key: 'ppe', label: 'PPE Required', type: 'multi_select',
      options: ['Class 0 Gloves', 'Class 2 Gloves', 'Arc Flash Suit 8 cal', 'Arc Flash Suit 40 cal', 'Face Shield', 'Hard Hat', 'Safety Glasses', 'Fall Harness', 'Hearing Protection', 'FR Clothing'] },
    { key: 'voltageLevel', label: 'Voltage Level', type: 'select', options: ['De-energized', '< 50V', '120/240V', '277/480V', '> 600V'] },
    { key: 'controls', label: 'Controls / Steps', type: 'longtext' },
    { key: 'correctiveAction', label: 'Corrective Action', type: 'longtext' },
    { key: 'reportedToOsha', label: 'OSHA Reportable', type: 'checkbox' },
    { key: 'attachments', label: 'Attachments', type: 'files' },
  ],
};

const agreements: DbDef = {
  key: 'agreements',
  label: 'Service Agreements',
  singular: 'Service Agreement',
  emoji: '🔁',
  group: 'compliance',
  description: 'Recurring maintenance plans — predictable revenue and a reason to be on site every year.',
  defaultSort: { key: 'nextServiceDate', direction: 'ascending' },
  fields: [
    { key: 'title', label: 'Agreement', type: 'title', required: true, column: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, dualLabel: 'Service Agreements', column: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true, dualLabel: 'Service Agreements' },
    { key: 'plan', label: 'Plan', type: 'select', options: ['Residential Safety Check', 'Commercial PM', 'Thermal Imaging', 'Generator Maintenance', 'Emergency Lighting', 'Custom'], column: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Pending Renewal', 'Lapsed', 'Cancelled'], column: true },
    { key: 'frequency', label: 'Frequency', type: 'select', options: ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'], column: true },
    { key: 'startDate', label: 'Start', type: 'date' },
    { key: 'renewalDate', label: 'Renews', type: 'date', column: true },
    { key: 'nextServiceDate', label: 'Next Service', type: 'date', column: true },
    { key: 'price', label: 'Price', type: 'money', column: true },
    { key: 'billingCycle', label: 'Billing', type: 'select', options: ['Monthly', 'Annual Upfront', 'Per Visit'] },
    { key: 'benefits', label: 'Included Benefits', type: 'longtext', placeholder: 'Priority dispatch, 15% discount, waived trip charge, annual panel thermal scan' },
    { key: 'autoRenew', label: 'Auto Renew', type: 'checkbox' },
  ],
};

const assets: DbDef = {
  key: 'assets',
  label: 'Vehicles & Equipment',
  singular: 'Asset',
  emoji: '🛻',
  group: 'compliance',
  description: 'Trucks, lifts, meters and testers — with the calibration and service dates that matter in court.',
  fields: [
    { key: 'name', label: 'Asset', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', options: ['Vehicle', 'Trailer', 'Lift', 'Test Equipment', 'Power Tool', 'Generator', 'Thermal Camera'], column: true },
    { key: 'identifier', label: 'VIN / Serial', type: 'text', column: true },
    { key: 'status', label: 'Status', type: 'select', options: ['In Service', 'In Shop', 'Out of Service', 'Retired'], column: true },
    { key: 'purchasedOn', label: 'Purchased', type: 'date' },
    { key: 'lastServiceDate', label: 'Last Service', type: 'date' },
    { key: 'nextServiceDate', label: 'Next Service', type: 'date', column: true },
    { key: 'calibrationDue', label: 'Calibration Due', type: 'date', column: true, help: 'Meggers, clamp meters and IR cameras need dated calibration certs.' },
    { key: 'registrationExpires', label: 'Registration Expires', type: 'date' },
    { key: 'odometer', label: 'Odometer', type: 'number' },
    { key: 'photos', label: 'Photos', type: 'files' },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

const documents: DbDef = {
  key: 'documents',
  label: 'Documents',
  singular: 'Document',
  emoji: '📄',
  group: 'compliance',
  description: 'Contracts, COIs, as-builts, load calcs, panel schedules and warranty registrations.',
  defaultSort: { key: 'date', direction: 'descending' },
  fields: [
    { key: 'title', label: 'Document', type: 'title', required: true, column: true },
    { key: 'kind', label: 'Kind', type: 'select', column: true,
      options: ['Contract', 'Change Order', 'Certificate of Insurance', 'W-9', 'Load Calculation', 'Panel Schedule', 'As-Built', 'Warranty', 'Submittal', 'Lien Release', 'Other'] },
    { key: 'file', label: 'File', type: 'files', required: true },
    { key: 'customer', label: 'Customer', type: 'relation', relation: 'customers', dual: true, dualLabel: 'Documents', column: true },
    { key: 'job', label: 'Job', type: 'relation', relation: 'jobs', dual: true, dualLabel: 'Documents', column: true },
    { key: 'property', label: 'Service Location', type: 'relation', relation: 'properties', dual: true, dualLabel: 'Documents' },
    { key: 'date', label: 'Date', type: 'date', column: true },
    { key: 'expiresOn', label: 'Expires', type: 'date', column: true },
    { key: 'notes', label: 'Notes', type: 'longtext' },
  ],
};

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const DATABASES = [
  customers, contacts, properties, interactions,
  jobs, jobPhotos, tasks,
  estimates, lineItems, invoices, payments,
  technicians, timeEntries,
  materials, materialUsage, vendors, purchaseOrders,
  permits, safety, agreements, assets, documents,
] as const;
