// Pricing + payments tests. No Stripe account and no Notion writes.
// Payment cases use a local PostgreSQL database (PAYMENT_DATABASE_URL).
import assert from 'node:assert/strict';
import pg from 'pg';
import Stripe from 'stripe';
import { DemoStore } from '../src/lib/store/demo-store';
import { fallbackPricing, pricingFromRateBook, tripCharge, billableOvertime, RESIDENTIAL_FALLBACK, ZONE_FALLBACK } from '../src/lib/domain/pricing';
import { NOV3_PRICING } from '../src/config/pricing-2026-11-03';
import { buildQuote } from '../src/lib/domain/quote';
import { diagnosticFor } from '../src/lib/domain/playbook';
import { computeDeposit } from '../src/lib/domain/deposit';
import { computeInvoice, cardFeeCents } from '../src/lib/domain/invoice';
import { planCharge } from '../src/lib/payments/amounts';
import { signPayToken, verifyPayToken, PAY_LINK_TTL_SECONDS } from '../src/lib/payments/token';
import { startCheckout, type StripeLike } from '../src/lib/payments/checkout';
import { applyStripeEvent } from '../src/lib/payments/webhook';
import { parseLedger } from '../src/lib/payments/ledger';
import { recordManualReceipt } from '../src/lib/payments/manual';
import { dbQuery, closePaymentPool } from '../src/lib/payments/db';
import { PaymentRejected } from '../src/lib/payments/errors';
import type { PayConfig } from '../src/lib/payments/config';
import type { Store } from '../src/lib/store/types';

process.env.PAYMENT_DATABASE_URL ??= 'postgres://tarango_pay:tarango_pay_local_test@127.0.0.1:5432/tarango_payments';
process.env.APP_PASSCODE ??= 'test-passcode-for-payments';
process.env.PAYMENTS_ALLOW_DEMO_DISPLAY = '1';
(process.env as Record<string, string | undefined>).NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_FAKE';
process.env.STRIPE_WEBHOOK_SECRET ??= 'whsec_test_FAKE';
process.env.PAY_LINK_SECRET ??= 'x'.repeat(40);
process.env.APP_BASE_URL ??= 'https://example.test';
process.env.STRIPE_ACCOUNT_ID ??= 'acct_testpayments';
delete process.env.NOTION_TOKEN;

let n = 0; const T: [string, () => unknown][] = [];
const ok = (name: string, f: () => unknown) => T.push([name, f]);
const P = fallbackPricing();
const cfg: PayConfig = {
  secretKey: 'sk_test_FAKE', webhookSecret: 'whsec_test_FAKE', linkSecret: 'x'.repeat(40),
  baseUrl: 'https://example.test', accountId: 'acct_testpayments', livemode: false, products: {},
};
const expected = { livemode: false, accountId: 'acct_testpayments' };

ok('service call $250 incl. Zone 1 + 2 h; Zone 2 +45, Zone 3 +85', () => {
  assert.equal(tripCharge(P, 'residential', 'day', 1), 250);
  assert.equal(tripCharge(P, 'residential', 'day', 2), 295);
  assert.equal(tripCharge(P, 'residential', 'day', 3), 335);
  assert.equal(RESIDENTIAL_FALLBACK.includedHours, 2);
});
ok('stale Rate Book ($160 etc.) cannot override residential or zones', () => {
  const rows = [{ name: 'Day trip / diagnostic', price: 160 }, { name: 'T&M hour — days', price: 90 }, { name: 'Travel Zone 2', price: 999 }, { name: 'After-hours trip', price: 240 }].map((r, i) => ({ id: String(i), active: true, ...r }));
  const p = pricingFromRateBook(rows as never);
  assert.equal(p.residential.trip.day, 250); assert.equal(p.residential.hourly.day, 150); assert.equal(p.residential.trip.afterHours, 375); assert.equal(p.zones[2], ZONE_FALLBACK[2]);
  assert.equal(diagnosticFor('Residential', p).fee, 250);
});
ok('special calls: 375 / 450 / 500 incl. 2 h, then full-hour blocks at 225 / 225 / 300, plus zone 45/85', () => {
  for (const [k, trip, hr] of [['afterHours', 375, 225], ['emergency', 450, 225], ['holiday', 500, 300]] as const) {
    const q = buildQuote({ lines: [], pricing: P, trip: k, zone: 2, extraHours: 1.2 });
    assert.equal(q.trip, trip); assert.equal(q.zoneAdd, 45); assert.equal(q.hours, 2); assert.equal(q.hourlyRate, hr);
    assert.equal(q.total, trip + 45 + hr * 2);
  }
  assert.equal(tripCharge(P, 'residential', 'holiday', 2), 545);
  assert.equal(tripCharge(P, 'residential', 'emergency', 3), 535);
  assert.equal(billableOvertime('residential', 'afterHours', 0.2).hours, 1);
});
ok('day overtime $150/hr billed in $75 half-hours (rounds up)', () => {
  assert.deepEqual(billableOvertime('residential', 'day', 0.3).hours, 0.5);
  const q = buildQuote({ lines: [], pricing: P, trip: 'day', zone: 2, extraHours: 1.2 });
  assert.equal(q.hours, 1.5); assert.equal(q.laborCharged, 225); assert.equal(q.total, 250 + 45 + 225);
  assert.ok(q.notes.some((x) => /customer's OK/.test(x)));
});
ok('project / flat-rate labor $90/hr (no trip)', () => {
  const q = buildQuote({ lines: [], pricing: P, trip: 'none', extraHours: 3 });
  assert.equal(q.hourlyRate, 90); assert.equal(q.laborCharged, 270);
  assert.equal(P.residential.projectHourly, NOV3_PRICING.projectHourly);
});
ok('parts separate; $250 credit once per job, capped at the service call', () => {
  const q = buildQuote({ lines: [{ id: 'm', name: 'Parts', price: 100, quantity: 1, kind: 'material' }, { id: 'f', name: 'Repair', price: 800, quantity: 1, kind: 'flat' }], pricing: P, trip: 'none', zone: 1, creditDiagnostic: 400 });
  assert.equal(q.diagnosticCredit, 250);
  const again = buildQuote({ lines: [{ id: 'f', name: 'Repair', price: 800, quantity: 1, kind: 'flat' }], pricing: P, trip: 'none', creditDiagnostic: 250, creditAlreadyUsed: 250 });
  assert.equal(again.diagnosticCredit, 0);
});
ok('standalone zone fees keep the same 45/85 differences', () => { assert.equal(P.zones[2] - P.zones[1], 45); assert.equal(P.zones[3] - P.zones[1], 85); });
ok('commercial unchanged (still Rate Book driven, 1 included hour)', () => { assert.equal(P.commercial.includedHours, 1); assert.equal(P.commercial.trip.day, 195); });
ok('Oct 22 deposit policy replaces 50% over $1,500; edges are flagged; deposit is not a schedule gate', () => {
  const bare = buildQuote({ lines: [{ id: 'f', name: 'Repair', price: 2000, quantity: 1, kind: 'flat' }], pricing: P, trip: 'none' });
  assert.equal(bare.depositDue, 0);
  assert.ok(bare.unresolved.some((u) => /50%/.test(u)));
  const mats = buildQuote({ lines: [{ id: 'm', name: 'Parts', price: 400, quantity: 1, kind: 'material' }], pricing: P, trip: 'none' });
  assert.equal(mats.depositDue, 400);
  const furnished = computeDeposit({ total: 2000, materials: 100, laborOnly: false });
  assert.equal(furnished.deposit, 600);
  assert.equal(furnished.mandatory, false);
  const labor = computeDeposit({ total: 4000, materials: 0, laborOnly: true });
  assert.equal(labor.deposit, 500);
  const laborBig = computeDeposit({ total: 8000, materials: 0, laborOnly: true });
  assert.equal(laborBig.deposit, 2400);
  assert.ok(laborBig.edgeCases.length > 0);
  const big = computeDeposit({ total: 6000, materials: 400, laborOnly: false });
  assert.equal(big.deposit, 1800);
  assert.ok(big.schedule);
  const tight = computeDeposit({ total: 6000, materials: 5000, laborOnly: false });
  assert.ok(tight.edgeCases.some((e) => /30\/40\/30/.test(e)));
  assert.ok(tight.schedule && tight.schedule.final >= 0);
  const gen = computeDeposit({ total: 4000, materials: 0, laborOnly: false, generator: true, generatorGear: 2500 });
  assert.equal(gen.deposit, 2500);
});

const job = (o: Record<string, unknown> = {}) => ({ id: 'job1', jobNumber: 'J-1001', name: 'Panel', amount: 1000, deposit: 300, depositIn: false, invoiceStatus: 'Sent', ...o }) as never;
const depositReceipt = JSON.stringify([{ key: 'manual-d', session: '', kind: 'deposit', status: 'paid', baseCents: 30000, feeCents: 0, paidCents: 30000, refundedCents: 0, refundedPrincipalCents: 0, appliedPrincipalCents: 30000, source: 'manual', events: [], at: '' }]);

ok('balance credits an explicit deposit receipt once; editing the requested deposit does not change it', () => {
  const credited = computeInvoice(job({ deposit: 900, paymentLedger: depositReceipt }), [], P);
  assert.equal(credited.depositCreditCents, 30000);
  assert.equal(credited.balanceCents, 70000);
  const checkboxOnly = computeInvoice(job({ depositIn: true, deposit: 300 }), [], P);
  assert.equal(checkboxOnly.depositCreditCents, 0);
  assert.equal(checkboxOnly.balanceCents, 100000);
  const more = planCharge(job({ deposit: 500, paymentLedger: depositReceipt }), [], P, { jobId: 'job1', kind: 'deposit' });
  assert.equal(more.baseCents, 20000);
  assert.equal(more.blockers.length, 0);
});
ok('fee is 2.5% once on the base, and a legacy fixed pay link is not the amount', () => {
  const p = planCharge(job({ paymentLedger: depositReceipt, payLink: 'https://buy.stripe.com/test_175_flat' }), [], P, { jobId: 'job1', kind: 'balance' });
  assert.deepEqual([p.baseCents, p.feeCents, p.totalCents], [70000, 1750, 71750]);
  assert.equal(cardFeeCents(p.baseCents), p.feeCents);
  assert.ok(!String(p.title).includes('175'));
  assert.notEqual(p.baseCents, 17500);
});
ok('balance checkout blocked until a deposit receipt exists; a second deposit is blocked once received', () => {
  assert.ok(planCharge(job({ depositIn: true }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.some((b) => /recorded/.test(b)));
  assert.ok(planCharge(job({ paymentLedger: depositReceipt }), [], P, { jobId: 'job1', kind: 'deposit' }).blockers.includes('Deposit already received'));
});
ok('a change order of $300 or less cannot be collected separately and is not billed twice', () => {
  const co = { id: 'co1', job: [{ id: 'job1' }], status: 'Accepted', data: JSON.stringify({ changeOrder: true, n: 1, lines: [{ name: 'Fake', qty: 1, price: 200 }] }) };
  const blocked = planCharge(job({ deposit: 0 }), [co as never], P, { jobId: 'job1', kind: 'co', coId: 'co1' });
  assert.ok(blocked.blockers.some((b) => /main invoice/.test(b)));
  const paid = JSON.stringify([{ key: 'pi', session: 'cs', kind: 'co', coId: 'co1', status: 'paid', baseCents: 20000, feeCents: 500, paidCents: 20500, refundedCents: 0, refundedPrincipalCents: 0, appliedPrincipalCents: 20000, events: [], at: '' }]);
  const main = computeInvoice(job({ amount: 1000, deposit: 0, paymentLedger: paid }), [co as never], P);
  assert.equal(main.balanceCents, 100000);
  assert.equal(main.totalCents, 100000);
});
ok('Paid / manual Partial invoices refuse card checkout', () => {
  assert.ok(planCharge(job({ invoiceStatus: 'Paid', paymentLedger: depositReceipt }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.length);
  assert.ok(planCharge(job({ invoiceStatus: 'Partial', paymentLedger: depositReceipt }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.length);
});
ok('accepted quote bills the SIGNED total, not a re-price at today\'s rates', () => {
  const doc = { tier: 'residential', zone: 1, oldWork: false, options: [{ id: 'a', label: 'Fix', summary: '', lines: [], trip: 'day', extraHours: 0, materialsCost: 0 }], addOns: [], discount: null, scope: '' };
  const q = { id: 'q1', job: [{ id: 'job1' }], status: 'Accepted', version: 1, total: 160, data: JSON.stringify({ doc, accepted: { optionId: 'a', addOns: [] } }) };
  const c = computeInvoice(job({ deposit: 0, depositIn: false }), [q as never], P);
  assert.equal(c.totalCents, 16000); assert.ok(c.repriceNote?.includes('250.00'));
});
ok('pay token expires, rejects v1 with no expiry, and carries no amount', () => {
  const exp = Math.floor(Date.now() / 1000) + PAY_LINK_TTL_SECONDS;
  const t = signPayToken({ jobId: 'job1', kind: 'balance', id: 'link1', exp }, cfg.linkSecret);
  assert.equal(verifyPayToken(t, cfg.linkSecret)?.jobId, 'job1');
  assert.equal(verifyPayToken(t, cfg.linkSecret, (exp + 5) * 1000), null);
  assert.equal(verifyPayToken(t.slice(0, -2) + 'AA', cfg.linkSecret), null);
  const v1 = Buffer.from(JSON.stringify({ v: 1, j: 'job1', k: 'balance', c: null })).toString('base64url');
  assert.equal(verifyPayToken(`${v1}.${t.split('.')[1]}`, cfg.linkSecret), null);
  const decoded = JSON.parse(Buffer.from(t.split('.')[0], 'base64url').toString()) as Record<string, unknown>;
  assert.equal(decoded.amount, undefined);
  assert.equal(decoded.j, 'job1');
});

let sessionSeq = 0;
function fakeStripe() {
  const sessions = new Map<string, { id: string; url: string; status: 'open' | 'complete' | 'expired'; payment_status: 'paid' | 'unpaid'; amount_total: number; params: Stripe.Checkout.SessionCreateParams }>();
  const byKey = new Map<string, string>(); const calls = { create: 0 };
  const s: StripeLike = { checkout: { sessions: {
    async create(p, o) {
      calls.create++;
      const ex = byKey.get(o.idempotencyKey);
      if (ex) {
        const prior = sessions.get(ex)!;
        if (JSON.stringify(prior.params) !== JSON.stringify(p)) throw new Error('Stripe idempotency parameters differ');
        return prior;
      }
      const id = `cs_test_${++sessionSeq}`;
      const amt = p.line_items!.reduce((a, l) => a + (l.price_data!.unit_amount ?? 0), 0);
      const v = { id, url: `https://checkout.stripe.test/${id}`, status: 'open' as const, payment_status: 'unpaid' as const, amount_total: amt, params: p };
      sessions.set(id, v); byKey.set(o.idempotencyKey, id); return v;
    },
    async retrieve(id) { return sessions.get(id)!; },
    async expire(id) { const row = sessions.get(id); if (row) row.status = 'expired'; return {}; },
  } } };
  return { s, sessions, calls };
}
async function reset() {
  await dbQuery(`TRUNCATE stripe_events, outbox, receipts, checkout_attempts, pay_links, obligations, payment_job_locks RESTART IDENTITY CASCADE`);
}
async function seed(o: Record<string, unknown> = {}) {
  await reset();
  const store = new DemoStore();
  const j = await store.create('jobs', { name: 'Panel', jobNumber: 'J-1001', amount: 1000, deposit: 300, depositIn: false, invoiceStatus: 'Sent', ...o });
  return { store, id: j.id };
}
async function seedPaidDeposit() {
  const seeded = await seed();
  const rec = await recordManualReceipt({ store: seeded.store, pricing: P }, { jobId: seeded.id, kind: 'deposit', method: 'Cash' });
  assert.equal(rec.ok, true, rec.ok ? '' : rec.error);
  return seeded;
}
const evt = (id: string, type: string, obj: Record<string, unknown>) => ({ id, type, livemode: false, account: 'acct_testpayments', data: { object: obj } }) as unknown as Stripe.Event;

async function attemptOf(store: Store, id: string, kind: 'balance' | 'deposit' | 'co' = 'balance', coId?: string) {
  const f = fakeStripe();
  const started = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind, coId });
  assert.equal(started.ok, true, !started.ok ? started.error : '');
  const slot = kind === 'co' ? `co:${coId}` : kind;
  const rows = await dbQuery<Record<string, unknown>>(`SELECT * FROM checkout_attempts WHERE job_id = $1 AND slot = $2 ORDER BY generation DESC LIMIT 1`, [id, slot]);
  return { f, started, attempt: rows[0] };
}
function paidSession(attempt: Record<string, unknown>, o: Record<string, unknown> = {}) {
  const params = JSON.parse(String(attempt.params_json));
  return {
    id: attempt.stripe_session_id, payment_intent: `pi_${attempt.id}`, currency: 'usd', amount_total: Number(attempt.total_cents),
    payment_status: 'paid', metadata: params.metadata, ...o,
  };
}

ok('checkout refuses the demo store when the payment database is not allowed to project onto it', async () => {
  const { store, id } = await seed({ deposit: 0 });
  const env = process.env as Record<string, string | undefined>;
  const prev = env.NODE_ENV;
  env.NODE_ENV = 'production';
  const r = await startCheckout({ stripe: fakeStripe().s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  env.NODE_ENV = prev;
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 503);
});
ok('checkout: server-side amount, card allowlist, no address, stable idempotency params, double tap reuses one session', async () => {
  const { store, id } = await seedPaidDeposit();
  await store.update('jobs', id, { town: 'Elkland', address: '1 Secret St' });
  const f = fakeStripe();
  const a = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  const b = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.equal(a.ok, true); assert.equal(b.ok, true); assert.equal(f.sessions.size, 1); assert.equal(b.ok && b.reused, true);
  const p = [...f.sessions.values()][0].params;
  assert.equal(p.mode, 'payment');
  assert.equal((p as { payment_method_types?: string[] }).payment_method_types, undefined);
  assert.deepEqual(p.allowed_payment_method_types, ['card']);
  assert.match(String(p.integration_identifier), /^tarango-checkout-[a-z]{8}$/);
  assert.deepEqual(p.line_items!.map((l) => l.price_data!.unit_amount), [70000, 1750]);
  const meta = JSON.stringify([p.metadata, p.payment_intent_data?.metadata, p.line_items]);
  assert.ok(!/Elkland|Secret|address|street|email|phone/i.test(meta));
  assert.equal(p.customer_email, undefined);
});
ok('a crashed checkout retries the same key and the same expires_at', async () => {
  const { store, id } = await seedPaidDeposit();
  let calls = 0; let saved: { key: string; params: Stripe.Checkout.SessionCreateParams } | null = null;
  const stripe: StripeLike = { checkout: { sessions: {
    async create(p, o) {
      calls++;
      if (calls === 1) { saved = { key: o.idempotencyKey, params: p }; throw new Error('crash before response'); }
      assert.equal(o.idempotencyKey, saved!.key);
      assert.equal(p.expires_at, saved!.params.expires_at);
      assert.equal(JSON.stringify(p), JSON.stringify(saved!.params));
      const amt = p.line_items!.reduce((s, l) => s + (l.price_data!.unit_amount ?? 0), 0);
      return { id: 'cs_retry', url: 'https://checkout.stripe.test/cs_retry', status: 'open', payment_status: 'unpaid', amount_total: amt };
    },
    async retrieve() { throw new Error('no session yet'); },
  } } };
  const now = () => new Date('2026-11-07T01:00:00Z');
  const first = await startCheckout({ stripe, store, pricing: P, cfg, now }, { jobId: id, kind: 'balance' });
  assert.equal(first.ok, false);
  const later = () => new Date('2026-11-07T02:30:00Z');
  const second = await startCheckout({ stripe, store, pricing: P, cfg, now: later }, { jobId: id, kind: 'balance' });
  assert.equal(second.ok, true);
  assert.equal(calls, 2);
});
ok('an expired session gets a new generation instead of reusing the old idempotency key', async () => {
  const { store, id } = await seedPaidDeposit();
  const f = fakeStripe();
  let now = () => new Date('2026-11-07T01:00:00Z');
  await startCheckout({ stripe: f.s, store, pricing: P, cfg, now }, { jobId: id, kind: 'balance' });
  const sid = [...f.sessions.keys()][0];
  const rows = await dbQuery<Record<string, unknown>>(`SELECT params_json FROM checkout_attempts WHERE stripe_session_id = $1`, [sid]);
  const meta = JSON.parse(String(rows[0].params_json)).metadata;
  await applyStripeEvent({ store, pricing: P, expected }, evt('x1', 'checkout.session.expired', { id: sid, metadata: meta, payment_status: 'unpaid' }));
  now = () => new Date('2026-11-07T03:00:00Z');
  const r = await startCheckout({ stripe: f.s, store, pricing: P, cfg, now }, { jobId: id, kind: 'balance' });
  assert.equal(r.ok, true);
  assert.equal(f.calls.create, 2);
  const keys = await dbQuery<{ generation: number }>(`SELECT generation FROM checkout_attempts WHERE job_id = $1 AND slot = 'balance' ORDER BY generation`, [id]);
  assert.deepEqual(keys.map((k) => Number(k.generation)), [1, 2]);
});
ok('checkout: amount change expires the stale session and opens a new one', async () => {
  const { store, id } = await seedPaidDeposit();
  const f = fakeStripe();
  await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  await store.update('jobs', id, { amount: 1200 });
  const r = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.equal(r.ok, true);
  const all = [...f.sessions.values()];
  assert.equal(all.length, 2);
  assert.equal(all[0].status, 'expired');
  assert.equal(all[1].amount_total, 92250);
});
ok('checkout: completed-but-unpaid session blocks a second charge', async () => {
  const { store, id } = await seedPaidDeposit();
  const f = fakeStripe();
  await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  [...f.sessions.values()][0].status = 'complete';
  const r = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.status, 409);
  assert.equal(f.sessions.size, 1);
});
ok('webhook: paid session credits once; a dropped projection is repaired by the same event', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt);
  await applyStripeEvent({ store, pricing: P, expected }, evt('evt_1', 'checkout.session.completed', s));
  await applyStripeEvent({ store, pricing: P, expected }, evt('evt_1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!;
  assert.equal(parseLedger(j.paymentLedger).filter((e) => e.kind === 'balance').length, 1);
  assert.equal(j.amountPaid, 700); assert.equal(j.invoiceStatus, 'Paid'); assert.equal(j.paid, true);
  const orig = store.update.bind(store);
  store.update = (db, rid, v) => { const { paid, invoiceStatus, ...rest } = v as Record<string, unknown>; void paid; void invoiceStatus; return orig(db, rid, rest); };
  await dbQuery(`UPDATE stripe_events SET projection_ok = false WHERE event_id = 'evt_1'`);
  await dbQuery(`UPDATE outbox SET status = 'failed' WHERE job_id = $1`, [id]);
  await assert.rejects(applyStripeEvent({ store, pricing: P, expected }, evt('evt_1', 'checkout.session.completed', s)));
  store.update = orig;
  await applyStripeEvent({ store, pricing: P, expected }, evt('evt_1', 'checkout.session.completed', s));
  j = (await store.get('jobs', id))!;
  assert.equal(j.invoiceStatus, 'Paid'); assert.equal(j.paid, true);
});
ok('webhook: delayed payment is not paid until async success, and a late failure cannot unpay it', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt, { payment_status: 'unpaid' });
  await applyStripeEvent({ store, pricing: P, expected }, evt('e1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!;
  assert.equal(parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!.status, 'processing');
  assert.notEqual(j.paid, true);
  await applyStripeEvent({ store, pricing: P, expected }, evt('e2', 'checkout.session.async_payment_succeeded', { ...s, payment_status: 'paid' }));
  await applyStripeEvent({ store, pricing: P, expected }, evt('e3', 'checkout.session.async_payment_failed', { ...s, payment_status: 'unpaid' }));
  j = (await store.get('jobs', id))!;
  assert.equal(parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!.status, 'paid');
  assert.equal(j.invoiceStatus, 'Paid'); assert.equal(j.amountPaid, 700);
});
ok('webhook: amount mismatch and wrong account or livemode are not credited', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt, { amount_total: 100 });
  await applyStripeEvent({ store, pricing: P, expected }, evt('m1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!;
  assert.equal(parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!.status, 'review');
  assert.notEqual(j.paid, true);
  await assert.rejects(
    applyStripeEvent({ store, pricing: P, expected }, { ...evt('bad', 'checkout.session.completed', paidSession(attempt)), account: 'acct_wrong', livemode: true } as Stripe.Event),
    (e: unknown) => e instanceof PaymentRejected,
  );
  j = (await store.get('jobs', id))!;
  assert.notEqual(j.paid, true);
});
ok('full refund reopens the invoice; an ambiguous partial refund goes to review and does not invent a split', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt);
  await applyStripeEvent({ store, pricing: P, expected }, evt('p1', 'checkout.session.completed', s));
  const charge = { id: 'ch_1', payment_intent: s.payment_intent, amount: s.amount_total, currency: 'usd', amount_refunded: s.amount_total, refunded: true, metadata: s.metadata };
  await applyStripeEvent({ store, pricing: P, expected }, evt('r1', 'charge.refunded', charge));
  await applyStripeEvent({ store, pricing: P, expected }, evt('r1', 'charge.refunded', charge));
  let j = (await store.get('jobs', id))!;
  assert.equal(j.amountPaid, 0); assert.equal(j.invoiceStatus, 'Sent'); assert.equal(j.paid, false);
  const half = await seedPaidDeposit();
  const opened = await attemptOf(half.store, half.id);
  const s2 = paidSession(opened.attempt);
  await applyStripeEvent({ store: half.store, pricing: P, expected }, evt('p2', 'checkout.session.completed', s2));
  await applyStripeEvent({ store: half.store, pricing: P, expected }, evt('r2', 'charge.refunded', { ...charge, payment_intent: s2.payment_intent, amount: s2.amount_total, amount_refunded: Math.floor(Number(s2.amount_total) / 2), refunded: false, metadata: s2.metadata }));
  j = (await half.store.get('jobs', half.id))!;
  const entry = parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!;
  assert.equal(entry.needsReview, true);
  assert.equal(entry.appliedPrincipalCents, 70000);
  assert.equal(j.amountPaid, 700);
  assert.notEqual(j.invoiceStatus, 'Paid');
});
ok('explicit principal/fee refund is applied; a partial deposit refund does not clear the whole deposit', async () => {
  const { store, id } = await seed({ depositIn: false });
  const { attempt } = await attemptOf(store, id, 'deposit');
  const s = paidSession(attempt);
  await applyStripeEvent({ store, pricing: P, expected }, evt('d1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!;
  assert.equal(j.depositIn, true);
  assert.equal(computeInvoice(j, [], P).depositCreditCents, 30000);
  await applyStripeEvent({ store, pricing: P, expected }, evt('d2', 'charge.refunded', {
    id: 'ch_d', payment_intent: s.payment_intent, amount: s.amount_total, currency: 'usd', amount_refunded: 15375, refunded: false,
    metadata: { ...s.metadata, principal_cents: '15000', refund_fee_cents: '375' },
  }));
  j = (await store.get('jobs', id))!;
  assert.equal(j.depositIn, true);
  assert.equal(computeInvoice(j, [], P).depositCreditCents, 15000);
  assert.equal(computeInvoice(j, [], P).balanceCents, 85000);
  await applyStripeEvent({ store, pricing: P, expected }, evt('d3', 'charge.refunded', {
    id: 'ch_d', payment_intent: s.payment_intent, amount: s.amount_total, currency: 'usd', amount_refunded: s.amount_total, refunded: true, metadata: s.metadata,
  }));
  j = (await store.get('jobs', id))!;
  assert.equal(j.depositIn, false);
  assert.equal(computeInvoice(j, [], P).depositCreditCents, 0);
});
ok('a dropped ledger write is not acknowledged, and the retry repairs it', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt);
  await applyStripeEvent({ store, pricing: P, expected }, evt('g0', 'checkout.session.completed', s));
  const orig = store.update.bind(store);
  store.update = (db, rid, v) => { const { paymentLedger: _x, ...rest } = v as Record<string, unknown>; void _x; return orig(db, rid, rest); };
  const charge = { id: 'ch_g', payment_intent: s.payment_intent, amount: s.amount_total, currency: 'usd', amount_refunded: s.amount_total, refunded: true, metadata: s.metadata };
  await assert.rejects(applyStripeEvent({ store, pricing: P, expected }, evt('g1', 'charge.refunded', charge)));
  store.update = orig;
  await applyStripeEvent({ store, pricing: P, expected }, evt('g1', 'charge.refunded', charge));
  const j = (await store.get('jobs', id))!;
  assert.equal(parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!.refundedPrincipalCents, 70000);
  assert.equal(j.amountPaid, 0);
});
ok('missing currency is not acknowledged; events from other apps are ignored', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  const s = paidSession(attempt);
  delete (s as { currency?: string }).currency;
  await assert.rejects(applyStripeEvent({ store, pricing: P, expected }, evt('miss', 'checkout.session.completed', s)), (e: unknown) => e instanceof PaymentRejected);
  const r = await applyStripeEvent({ store, pricing: P, expected }, evt('o1', 'checkout.session.completed', { id: 'cs_x', metadata: { app: 'other' } }));
  assert.equal(r.handled, false);
});
ok('an edited invoice makes an in-flight checkout stale', async () => {
  const { store, id } = await seedPaidDeposit();
  const { attempt } = await attemptOf(store, id);
  await store.update('jobs', id, { amount: 1800 });
  const { noteJobMoneyChanged } = await import('../src/lib/payments/sync');
  await noteJobMoneyChanged(store, id, 'test edit');
  const s = paidSession(attempt);
  await applyStripeEvent({ store, pricing: P, expected }, evt('stale1', 'checkout.session.completed', s));
  const j = (await store.get('jobs', id))!;
  const entry = parseLedger(j.paymentLedger).find((e) => e.kind === 'balance')!;
  assert.equal(entry.needsReview, true);
  assert.equal(entry.appliedPrincipalCents, 0);
  assert.notEqual(j.paid, true);
});
ok('two payments for one job both persist under real PostgreSQL row locks', async () => {
  const { store, id } = await seed({ deposit: 0, amount: 1000 });
  const co = async (n: number, price: number) => store.create('quotes', {
    name: `CO ${n}`, job: [{ id }], status: 'Accepted', version: 0, total: price,
    data: JSON.stringify({ changeOrder: true, n, lines: [{ name: `Work ${n}`, qty: 1, price }] }),
  });
  const a = await co(1, 400); const b = await co(2, 450);
  const one = await attemptOf(store, id, 'co', a.id);
  const two = await attemptOf(store, id, 'co', b.id);
  const results = await Promise.all([
    applyStripeEvent({ store, pricing: P, expected }, evt('A', 'checkout.session.completed', paidSession(one.attempt, { payment_intent: 'pi_A' }))),
    applyStripeEvent({ store, pricing: P, expected }, evt('B', 'checkout.session.completed', paidSession(two.attempt, { payment_intent: 'pi_B' }))),
  ]);
  assert.equal(results.every((r) => r.handled), true);
  const rows = await dbQuery<{ stripe_payment_intent: string; applied_principal_cents: number }>(`SELECT stripe_payment_intent, applied_principal_cents FROM receipts WHERE job_id = $1 AND kind = 'co' ORDER BY stripe_payment_intent`, [id]);
  assert.deepEqual(rows.map((r) => r.stripe_payment_intent), ['pi_A', 'pi_B']);
  assert.equal(Number(rows[0].applied_principal_cents) + Number(rows[1].applied_principal_cents), 85000);
});
ok('an uncommitted receipt disappears when the connection drops, and a committed one does not', async () => {
  await reset();
  const crashed = new pg.Client({ connectionString: process.env.PAYMENT_DATABASE_URL });
  await crashed.connect();
  await crashed.query('BEGIN');
  await crashed.query(`INSERT INTO receipts (id, job_id, slot, kind, source, principal_cents, fee_cents, paid_cents, status, needs_review, applied_principal_cents) VALUES ('crash-r','crash-job','balance','balance','manual',100,0,100,'paid',false,100)`);
  await crashed.end();
  assert.equal((await dbQuery(`SELECT id FROM receipts WHERE id = 'crash-r'`)).length, 0);
  await dbQuery(`INSERT INTO receipts (id, job_id, slot, kind, source, principal_cents, fee_cents, paid_cents, status, needs_review, applied_principal_cents) VALUES ('kept-r','kept-job','balance','balance','manual',100,0,100,'paid',false,100)`);
  const other = new pg.Client({ connectionString: process.env.PAYMENT_DATABASE_URL });
  await other.connect();
  const kept = await other.query(`SELECT id FROM receipts WHERE id = 'kept-r'`);
  await other.end();
  assert.equal(kept.rowCount, 1);
});
ok('manual receipt ignores no client amount and records the server principal', async () => {
  const { store, id } = await seed({ deposit: 0, amount: 250 });
  const rec = await recordManualReceipt({ store, pricing: P }, { jobId: id, kind: 'balance', method: 'Check' });
  assert.equal(rec.ok, true);
  if (rec.ok) assert.equal(rec.principalCents, 25000);
  const j = (await store.get('jobs', id))!;
  assert.equal(j.paid, true);
  assert.equal(parseLedger(j.paymentLedger)[0].source, 'manual');
});
ok('route: rejects a bad signature; a valid ignored event needs the payment database; livemode mismatch is 400', async () => {
  const { POST } = await import('../src/app/api/stripe/webhook/route');
  const body = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'payment_intent.created', livemode: false, data: { object: {} } });
  const mk = (payload: string, sig?: string) => new Request('https://example.test/api/stripe/webhook', { method: 'POST', body: payload, headers: sig ? { 'stripe-signature': sig } : {} });
  assert.equal((await POST(mk(body))).status, 400);
  assert.equal((await POST(mk(body, 't=1,v1=deadbeef'))).status, 400);
  const good = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_test_FAKE' });
  assert.equal((await POST(mk(body, good))).status, 200);
  const old = Stripe.webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_test_FAKE', timestamp: Math.floor(Date.now() / 1000) - 3600 });
  assert.equal((await POST(mk(body, old))).status, 400);
  const liveBody = JSON.stringify({ id: 'evt_live', object: 'event', type: 'payment_intent.created', livemode: true, data: { object: {} } });
  const liveSig = Stripe.webhooks.generateTestHeaderString({ payload: liveBody, secret: 'whsec_test_FAKE' });
  assert.equal((await POST(mk(liveBody, liveSig))).status, 400);
  const saved = process.env.PAYMENT_DATABASE_URL;
  delete process.env.PAYMENT_DATABASE_URL;
  assert.equal((await POST(mk(body, good))).status, 503);
  process.env.PAYMENT_DATABASE_URL = saved;
});

(async () => {
  for (const [name, f] of T) { await f(); n++; console.log('  ✓', name); }
  await closePaymentPool();
  console.log(`payments tests: ${n} passed`);
})().catch(async (e) => { console.error(e); await closePaymentPool().catch(() => undefined); process.exit(1); });
