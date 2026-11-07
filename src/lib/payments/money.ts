import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { DbClient } from './db';
import type { Pricing } from '../domain/pricing';
import { computeInvoice, fromCents, toCents } from '../domain/invoice';
import { CO_DUE_ON_APPROVAL, coTotal, isChangeOrder, parseCO } from '../domain/change-order';
import { relationIds } from '../calc';
import type { RecordValue } from '../schema';
import { parseLedger, serializeLedger, sumCredited, slotFor, type LedgerEntry, type PayKind } from './ledger';
import { planCharge } from './amounts';
import type { PayTarget } from './token';

export interface ReceiptRow {
  id: string;
  job_id: string;
  slot: string;
  kind: PayKind;
  co_id: string | null;
  source: 'stripe' | 'manual';
  principal_cents: number;
  fee_cents: number;
  paid_cents: number;
  status: LedgerEntry['status'];
  needs_review: boolean;
  applied_principal_cents: number;
  refunded_cents: number;
  refunded_principal_cents: number;
  refunded_fee_cents: number;
  stripe_payment_intent: string | null;
  stripe_session: string | null;
  stripe_charge: string | null;
  obligation_id: string | null;
  method: string | null;
  note: string | null;
  events: string[] | null;
  created_at: Date | string;
}

export interface AttemptRow {
  id: string;
  job_id: string;
  slot: string;
  generation: number;
  obligation_id: string;
  idempotency_key: string;
  params_json: string;
  base_cents: number;
  fee_cents: number;
  total_cents: number;
  currency: string;
  stripe_session_id: string | null;
  url: string | null;
  status: 'reserved' | 'open' | 'complete' | 'expired' | 'failed' | 'superseded';
  created_at: Date | string;
}

export interface ObligationRow {
  id: string;
  job_id: string;
  slot: string;
  revision: number;
  principal_cents: number;
  currency: string;
  fingerprint: string;
  reason: string;
}

export interface DisplayPatch {
  amountPaid: number;
  depositIn: boolean;
  paid: boolean;
  invoiceStatus: string;
  paymentLedger: string;
  checkoutSessions: string;
}

const n = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));

export function receiptToEntry(r: ReceiptRow): LedgerEntry {
  return {
    key: r.stripe_payment_intent || r.id,
    session: r.stripe_session || '',
    kind: r.kind,
    coId: r.co_id || undefined,
    status: r.status,
    baseCents: n(r.principal_cents),
    feeCents: n(r.fee_cents),
    paidCents: n(r.paid_cents),
    refundedCents: n(r.refunded_cents),
    refundedPrincipalCents: n(r.refunded_principal_cents),
    refundedFeeCents: n(r.refunded_fee_cents),
    appliedPrincipalCents: n(r.applied_principal_cents),
    needsReview: r.needs_review === true,
    source: r.source,
    note: r.note || undefined,
    events: Array.isArray(r.events) ? r.events : [],
    at: new Date(r.created_at).toISOString(),
  };
}

export async function loadReceipts(client: DbClient, jobId: string): Promise<ReceiptRow[]> {
  const r = await client.query<ReceiptRow>('SELECT * FROM receipts WHERE job_id = $1 ORDER BY created_at, id', [jobId]);
  return r.rows;
}

export async function loadLedger(client: DbClient, jobId: string): Promise<LedgerEntry[]> {
  return (await loadReceipts(client, jobId)).map(receiptToEntry);
}

export async function currentObligation(client: DbClient, jobId: string, slot: string): Promise<ObligationRow | null> {
  const r = await client.query<ObligationRow>(
    'SELECT * FROM obligations WHERE job_id = $1 AND slot = $2 ORDER BY revision DESC LIMIT 1',
    [jobId, slot],
  );
  return r.rows[0] ?? null;
}

export async function latestAttempt(client: DbClient, jobId: string, slot: string): Promise<AttemptRow | null> {
  const r = await client.query<AttemptRow>(
    'SELECT * FROM checkout_attempts WHERE job_id = $1 AND slot = $2 ORDER BY generation DESC LIMIT 1',
    [jobId, slot],
  );
  return r.rows[0] ?? null;
}

export async function findAttemptById(client: DbClient, id: string): Promise<AttemptRow | null> {
  const r = await client.query<AttemptRow>('SELECT * FROM checkout_attempts WHERE id = $1', [id]);
  return r.rows[0] ?? null;
}

export async function findAttemptBySession(client: DbClient, sessionId: string): Promise<AttemptRow | null> {
  const r = await client.query<AttemptRow>('SELECT * FROM checkout_attempts WHERE stripe_session_id = $1', [sessionId]);
  return r.rows[0] ?? null;
}

export async function findReceiptByIntent(client: DbClient, intent: string): Promise<ReceiptRow | null> {
  const r = await client.query<ReceiptRow>('SELECT * FROM receipts WHERE stripe_payment_intent = $1', [intent]);
  return r.rows[0] ?? null;
}

function fingerprint(parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

/** Insert a new immutable revision when the contract fingerprint changes. Does not touch receipts. */
export async function ensureContract(client: DbClient, job: RecordValue, quotes: RecordValue[], pricing: Pricing, reason: string): Promise<void> {
  const ledger = parseLedger(job.paymentLedger);
  const inv = computeInvoice({ ...job, paymentLedger: serializeLedger(ledger) }, quotes, pricing);
  const accepted = quotes
    .filter((q) => String(q.status) === 'Accepted' && !isChangeOrder(q) && relationIds(q.job).includes(job.id))
    .sort((a, b) => Number(b.version) - Number(a.version))[0];
  const cos = quotes
    .filter((q) => String(q.status) === 'Accepted' && isChangeOrder(q) && relationIds(q.job).includes(job.id))
    .map((q) => ({ id: q.id, co: parseCO(q.data) }))
    .filter((x): x is { id: string; co: NonNullable<ReturnType<typeof parseCO>> } => x.co !== null)
    .map((x) => ({ id: x.id, total: coTotal(x.co), n: x.co.n }));
  const slots: { slot: string; principal: number; extra: unknown }[] = [
    { slot: 'deposit', principal: toCents(Number(job.deposit) || 0), extra: 'requested' },
    { slot: 'balance', principal: inv.totalCents, extra: { quote: accepted?.id ?? null, signed: accepted ? Number(accepted.total) || 0 : null, lines: inv.lines.map((l) => l.label) } },
  ];
  for (const c of cos) {
    if (c.total > CO_DUE_ON_APPROVAL) slots.push({ slot: slotFor('co', c.id), principal: toCents(c.total), extra: { n: c.n } });
  }
  for (const s of slots) {
    const fp = fingerprint([s.slot, s.principal, 'usd', s.extra]);
    const cur = await currentObligation(client, job.id, s.slot);
    if (cur && cur.fingerprint === fp && n(cur.principal_cents) === s.principal) continue;
    const revision = (cur?.revision ?? 0) + 1;
    await client.query(
      `INSERT INTO obligations (id, job_id, slot, revision, principal_cents, currency, fingerprint, reason)
       VALUES ($1,$2,$3,$4,$5,'usd',$6,$7)`,
      [randomUUID(), job.id, s.slot, revision, s.principal, fp, reason],
    );
  }
}

export async function supersedeAttempt(client: DbClient, id: string): Promise<void> {
  await client.query(`UPDATE checkout_attempts SET status = 'superseded' WHERE id = $1 AND status IN ('reserved','open')`, [id]);
}

export async function revokeLinks(client: DbClient, jobId: string, slot: string): Promise<void> {
  await client.query(`UPDATE pay_links SET revoked_at = now() WHERE job_id = $1 AND slot = $2 AND revoked_at IS NULL`, [jobId, slot]);
}

export function integrationIdentifier(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = randomBytes(8);
  let suffix = '';
  for (let i = 0; i < 8; i++) suffix += alphabet[bytes[i] % 26];
  return `tarango-checkout-${suffix}`;
}

export function checkoutIdempotencyKey(jobId: string, slot: string, generation: number): string {
  const h = createHash('sha256').update(`${jobId}|${slot}|${generation}`).digest('hex').slice(0, 40);
  return `te-checkout-${h}`;
}

export async function nextGeneration(client: DbClient, jobId: string, slot: string): Promise<number> {
  const r = await client.query<{ g: number }>('SELECT COALESCE(MAX(generation), 0) AS g FROM checkout_attempts WHERE job_id = $1 AND slot = $2', [jobId, slot]);
  return n(r.rows[0]?.g) + 1;
}

export function settlementPatch(job: RecordValue, quotes: RecordValue[], pricing: Pricing, ledger: LedgerEntry[], sessionsJson: string): DisplayPatch {
  const inv = computeInvoice({ ...job, paymentLedger: serializeLedger(ledger), invoiceStatus: 'Sent', paid: false, depositIn: false }, quotes, pricing);
  const review = ledger.some((e) => e.needsReview || e.status === 'review' || e.status === 'processing');
  const balanceCredited = sumCredited(ledger, 'balance');
  const depositCredit = sumCredited(ledger, 'deposit');
  let invoiceStatus = String(job.invoiceStatus ?? 'Draft');
  let paid = false;
  if (review) {
    paid = false;
    if (invoiceStatus === 'Paid' || balanceCredited > 0 || depositCredit > 0) invoiceStatus = 'Partial';
  } else if (inv.totalCents > 0 && inv.balanceCents === 0 && (balanceCredited > 0 || depositCredit > 0)) {
    invoiceStatus = 'Paid';
    paid = true;
  } else if (balanceCredited > 0) {
    invoiceStatus = 'Partial';
    paid = false;
  } else if (ledger.some((e) => e.kind === 'balance' && (e.refundedPrincipalCents ?? 0) > 0)) {
    invoiceStatus = 'Sent';
    paid = false;
  }
  return {
    amountPaid: fromCents(balanceCredited),
    depositIn: depositCredit > 0,
    paid,
    invoiceStatus,
    paymentLedger: serializeLedger(ledger),
    checkoutSessions: sessionsJson,
  };
}

export async function buildDisplayPatch(client: DbClient, job: RecordValue, quotes: RecordValue[], pricing: Pricing): Promise<DisplayPatch> {
  const ledger = await loadLedger(client, job.id);
  const attempts = await client.query<AttemptRow>(
    `SELECT * FROM checkout_attempts WHERE job_id = $1 AND status IN ('reserved','open') ORDER BY generation`,
    [job.id],
  );
  const ptrs: Record<string, { id: string | null; key: string; totalCents: number; at: string; generation: number; status: string }> = {};
  for (const a of attempts.rows) {
    ptrs[a.slot] = {
      id: a.stripe_session_id,
      key: a.idempotency_key,
      totalCents: n(a.total_cents),
      at: new Date(a.created_at).toISOString(),
      generation: n(a.generation),
      status: a.status,
    };
  }
  return settlementPatch(job, quotes, pricing, ledger, JSON.stringify(ptrs));
}

export async function enqueueDisplay(client: DbClient, job: RecordValue, quotes: RecordValue[], pricing: Pricing): Promise<DisplayPatch> {
  const patch = await buildDisplayPatch(client, job, quotes, pricing);
  const seq = await client.query<{ n: string }>('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM outbox WHERE job_id = $1', [job.id]);
  await client.query('INSERT INTO outbox (job_id, seq, payload, status) VALUES ($1,$2,$3,\'pending\')', [job.id, seq.rows[0].n, patch]);
  return patch;
}

/** Read-back must match the exact money fields. A dropped column is not success. */
export function assertDisplay(back: RecordValue | null, patch: DisplayPatch): void {
  if (!back) throw new Error('payment display record missing');
  const got = parseLedger(back.paymentLedger);
  const want = parseLedger(patch.paymentLedger);
  if (got.length !== want.length) throw new Error('payment ledger did not persist');
  for (const w of want) {
    const g = got.find((x) => x.key === w.key);
    if (!g) throw new Error(`payment ledger did not persist ${w.key}`);
    if (g.status !== w.status) throw new Error(`payment status did not persist for ${w.key}`);
    if ((g.refundedCents ?? 0) !== (w.refundedCents ?? 0)) throw new Error(`refund amount did not persist for ${w.key}`);
    if ((g.refundedPrincipalCents ?? 0) !== (w.refundedPrincipalCents ?? 0)) throw new Error(`refund principal did not persist for ${w.key}`);
    if (Boolean(g.needsReview) !== Boolean(w.needsReview)) throw new Error(`review flag did not persist for ${w.key}`);
    if ((g.appliedPrincipalCents ?? g.baseCents) !== (w.appliedPrincipalCents ?? w.baseCents) && g.needsReview) {
      throw new Error(`applied principal did not persist for ${w.key}`);
    }
  }
  if (Boolean(back.paid) !== Boolean(patch.paid)) throw new Error('paid flag did not persist');
  if (String(back.invoiceStatus ?? '') !== String(patch.invoiceStatus)) throw new Error('invoice status did not persist');
  if (Boolean(back.depositIn) !== Boolean(patch.depositIn)) throw new Error('deposit flag did not persist');
  const gotPaid = back.amountPaid === null || back.amountPaid === undefined ? 0 : Number(back.amountPaid);
  if (gotPaid !== Number(patch.amountPaid)) throw new Error('amount paid did not persist');
}

export function jobWithLedger(job: RecordValue, ledger: LedgerEntry[]): RecordValue {
  return { ...job, paymentLedger: serializeLedger(ledger) };
}

export function chargeBase(job: RecordValue, quotes: RecordValue[], pricing: Pricing, target: PayTarget): number {
  return planCharge(job, quotes, pricing, target).baseCents;
}

export async function openSessionIds(client: DbClient, jobId: string, slot?: string): Promise<string[]> {
  const r = await client.query<{ stripe_session_id: string }>(
    `SELECT stripe_session_id FROM checkout_attempts
     WHERE job_id = $1 AND status IN ('open','reserved') AND stripe_session_id IS NOT NULL
     AND ($2::text IS NULL OR slot = $2)`,
    [jobId, slot ?? null],
  );
  return r.rows.map((row) => row.stripe_session_id);
}
