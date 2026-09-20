import { getStore } from './store';
import type { DbKey, RecordValue } from './schema';
import { num, round2 } from './calc';

/**
 * Business rules applied on write, regardless of whether the caller is the UI,
 * the REST API or a script. Keeping them here means Notion never holds a
 * half-computed record.
 */

const NUMBERED: Partial<Record<DbKey, { field: string; prefix: string }>> = {
  jobs: { field: 'jobNumber', prefix: 'J' },
  estimates: { field: 'estimateNumber', prefix: 'EST' },
  invoices: { field: 'invoiceNumber', prefix: 'INV' },
  purchaseOrders: { field: 'poNumber', prefix: 'PO' },
};

export async function applyDerived(db: DbKey, values: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out = { ...values };

  const numbering = NUMBERED[db];
  if (numbering && !out[numbering.field]) {
    out[numbering.field] = await nextDocumentNumber(db, numbering.field, numbering.prefix);
  }

  switch (db) {
    case 'lineItems':
      out.lineTotal = round2(num(out.quantity, 1) * num(out.unitPrice, 0));
      break;
    case 'materialUsage':
      out.extendedCost = round2(num(out.quantity, 0) * num(out.unitCost, 0));
      if (!out.usedOn) out.usedOn = today();
      break;
    case 'timeEntries': {
      const hours = hoursBetween(out.startedAt, out.endedAt);
      if (hours !== null && !out.hours) out.hours = hours;
      break;
    }
    case 'materials': {
      const cost = num(out.cost, 0);
      if (cost > 0) out.markup = round2((num(out.price, 0) - cost) / cost);
      break;
    }
    case 'invoices': {
      if (out.total !== undefined && out.balanceDue === undefined) {
        out.balanceDue = round2(num(out.total, 0) - num(out.amountPaid, 0));
      }
      break;
    }
    case 'jobPhotos': {
      if (!out.takenAt) out.takenAt = new Date().toISOString();
      break;
    }
    case 'jobs': {
      if (!out.status) out.status = out.scheduledStart ? 'Scheduled' : 'Unscheduled';
      break;
    }
    default:
      break;
  }

  return out;
}

/** J-2026-0184 style identifiers, continuing from whatever is already stored. */
export async function nextDocumentNumber(db: DbKey, field: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  let highest = 0;
  try {
    const rows = await getStore().list(db, { limit: 500 });
    for (const row of rows) {
      const match = String(row[field] ?? '').match(new RegExp(`^${prefix}-(\\d{4})-(\\d+)$`));
      if (match && Number(match[1]) === year) highest = Math.max(highest, Number(match[2]));
    }
  } catch {
    // A brand-new workspace has nothing to read; start the series at 1.
  }
  return `${prefix}-${year}-${String(highest + 1).padStart(4, '0')}`;
}

/**
 * Recompute a job's cost, revenue and margin from its time entries, material
 * usage and invoices, then persist the result.
 */
export async function recalculateJob(jobId: string): Promise<RecordValue | null> {
  const store = getStore();
  const job = await store.get('jobs', jobId);
  if (!job) return null;

  const [entries, usage, technicians, invoices] = await Promise.all([
    store.list('timeEntries'),
    store.list('materialUsage'),
    store.list('technicians'),
    store.list('invoices'),
  ]);

  const mine = <T extends RecordValue>(rows: T[], field: string) =>
    rows.filter((row) => (Array.isArray(row[field]) ? (row[field] as { id: string }[]) : []).some((r) => r.id === jobId));

  const rate = new Map(technicians.map((t) => [t.id, num(t.hourlyCost)]));
  const jobEntries = mine(entries, 'job');
  const jobUsage = mine(usage, 'job');
  const jobInvoices = mine(invoices, 'job');

  const hours = jobEntries.reduce((sum, e) => sum + num(e.hours), 0);
  const laborCost = jobEntries.reduce((sum, e) => {
    const techId = (Array.isArray(e.technician) ? (e.technician as { id: string }[])[0]?.id : undefined) ?? '';
    return sum + num(e.hours) * (rate.get(techId) ?? 0) * (e.overtime ? 1.5 : 1);
  }, 0);
  const materialsCost = jobUsage.reduce((sum, u) => sum + num(u.extendedCost), 0);
  const revenue = jobInvoices
    .filter((i) => String(i.status) !== 'Void')
    .reduce((sum, i) => sum + num(i.total), 0);
  const cost = laborCost + materialsCost;

  return store.update('jobs', jobId, {
    actualHours: round2(hours),
    laborCost: round2(laborCost),
    materialsCost: round2(materialsCost),
    revenue: round2(revenue),
    grossMargin: revenue > 0 ? round2((revenue - cost) / revenue) : 0,
  });
}

/** Roll payments up onto an invoice and move its status along. */
export async function recalculateInvoice(invoiceId: string): Promise<RecordValue | null> {
  const store = getStore();
  const invoice = await store.get('invoices', invoiceId);
  if (!invoice) return null;

  const payments = (await store.list('payments')).filter((p) =>
    (Array.isArray(p.invoice) ? (p.invoice as { id: string }[]) : []).some((r) => r.id === invoiceId),
  );

  const paid = round2(payments.reduce((sum, p) => sum + num(p.amount) * (p.kind === 'Refund' ? -1 : 1), 0));
  const total = num(invoice.total);
  const balance = round2(total - paid);

  const overdue = invoice.dueOn ? new Date(String(invoice.dueOn)) < new Date() : false;
  const status =
    balance <= 0 && total > 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : overdue ? 'Overdue' : String(invoice.status ?? 'Sent');

  return store.update('invoices', invoiceId, {
    amountPaid: paid,
    balanceDue: balance,
    status,
    ...(balance <= 0 && total > 0 && payments.length ? { paidOn: String(payments[payments.length - 1].receivedOn ?? today()) } : {}),
  });
}

function hoursBetween(start: unknown, end: unknown): number | null {
  if (!start || !end) return null;
  const a = Date.parse(String(start));
  const b = Date.parse(String(end));
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return round2((b - a) / 3_600_000);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
