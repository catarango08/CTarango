// Pricing + payments tests. No network, no Stripe account, no Notion: an in-memory DemoStore,
// a fake Stripe client, and Stripe's own test-signature helper with a throwaway secret.
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { DemoStore } from '../src/lib/store/demo-store';
import { fallbackPricing, pricingFromRateBook, tripCharge, billableOvertime, RESIDENTIAL_FALLBACK, ZONE_FALLBACK } from '../src/lib/domain/pricing';
import { NOV3_PRICING } from '../src/config/pricing-2026-11-03';
import { buildQuote } from '../src/lib/domain/quote';
import { diagnosticFor } from '../src/lib/domain/playbook';
import { computeInvoice, cardFeeCents } from '../src/lib/domain/invoice';
import { planCharge } from '../src/lib/payments/amounts';
import { signPayToken, verifyPayToken } from '../src/lib/payments/token';
import { startCheckout, type StripeLike } from '../src/lib/payments/checkout';
import { applyStripeEvent } from '../src/lib/payments/webhook';
import { parseLedger } from '../src/lib/payments/ledger';
import type { PayConfig } from '../src/lib/payments/config';

let n = 0; const T: [string, () => unknown][] = [];
const ok = (name: string, f: () => unknown) => T.push([name, f]);
const P = fallbackPricing();
const cfg: PayConfig = { secretKey: 'sk_test_FAKE', webhookSecret: 'whsec_test_FAKE', linkSecret: 'x'.repeat(40), baseUrl: 'https://example.test', products: {} };

// ── Pricing (Nov 3) ────────────────────────────────────────────────
ok('service call $250 incl. Zone 1 + 2 h; Zone 2 +45, Zone 3 +85', () => {
  assert.equal(tripCharge(P, 'residential', 'day', 1), 250); assert.equal(tripCharge(P, 'residential', 'day', 2), 295); assert.equal(tripCharge(P, 'residential', 'day', 3), 335);
  assert.equal(RESIDENTIAL_FALLBACK.includedHours, 2);
});
ok('stale Rate Book ($160 etc.) cannot override residential or zones', () => {
  const rows = [{ name: 'Day trip / diagnostic', price: 160 }, { name: 'T&M hour — days', price: 90 }, { name: 'Travel Zone 2', price: 999 }, { name: 'After-hours trip', price: 240 }].map((r, i) => ({ id: String(i), active: true, ...r }));
  const p = pricingFromRateBook(rows as never);
  assert.equal(p.residential.trip.day, 250); assert.equal(p.residential.hourly.day, 150); assert.equal(p.residential.trip.afterHours, 375); assert.equal(p.zones[2], ZONE_FALLBACK[2]);
  assert.equal(diagnosticFor('Residential', p).fee, 250);
});
ok('special calls: 375 / 450 / 500 incl. 2 h, then 225 / 225 / 300 per hour', () => {
  for (const [k, trip, hr] of [['afterHours', 375, 225], ['emergency', 450, 225], ['holiday', 500, 300]] as const) {
    const q = buildQuote({ lines: [], pricing: P, trip: k, zone: 1, extraHours: 1 });
    assert.equal(q.trip, trip); assert.equal(q.hourlyRate, hr); assert.equal(q.total, trip + hr); assert.deepEqual(q.unresolved, []);
  }
});
ok('zone supplement on special calls in Zone 2/3 is UNRESOLVED: nothing added, flagged', () => {
  const q = buildQuote({ lines: [], pricing: P, trip: 'emergency', zone: 3 });
  assert.equal(q.zoneAdd, 0); assert.equal(q.total, 450); assert.equal(q.unresolved.length, 1);
  assert.equal(tripCharge(P, 'residential', 'holiday', 2), null);
});
ok('day overtime $150/hr billed in $75 half-hours (rounds up)', () => {
  assert.deepEqual(billableOvertime('residential', 'day', 0.3).hours, 0.5);
  const q = buildQuote({ lines: [], pricing: P, trip: 'day', zone: 2, extraHours: 1.2 }); // 1.2 h -> 1.5 h
  assert.equal(q.hours, 1.5); assert.equal(q.laborCharged, 225); assert.equal(q.total, 250 + 45 + 225);
  assert.ok(q.notes.some((x) => /customer's OK/.test(x)));
});
ok('project / flat-rate labor $90/hr (no trip)', () => {
  const q = buildQuote({ lines: [], pricing: P, trip: 'none', extraHours: 3 }); assert.equal(q.hourlyRate, 90); assert.equal(q.laborCharged, 270);
  assert.equal(P.residential.projectHourly, NOV3_PRICING.projectHourly);
});
ok('parts separate; $250 credit once, capped at the service call', () => {
  const q = buildQuote({ lines: [{ id: 'm', name: 'Parts', price: 100, quantity: 1, kind: 'material' }, { id: 'f', name: 'Repair', price: 800, quantity: 1, kind: 'flat' }], pricing: P, trip: 'none', zone: 1, creditDiagnostic: 400 });
  assert.equal(q.diagnosticCredit, 250); assert.ok(q.materialsCharged > 0);
});
ok('standalone zone fees keep the same 45/85 differences', () => { assert.equal(P.zones[2] - P.zones[1], 45); assert.equal(P.zones[3] - P.zones[1], 85); });
ok('commercial unchanged (still Rate Book driven, 1 included hour)', () => { assert.equal(P.commercial.includedHours, 1); assert.equal(P.commercial.trip.day, 195); });

// ── Invoice / card fee / deposit credit ────────────────────────────
const job = (o: Record<string, unknown> = {}) => ({ id: 'job1', jobNumber: 'J-1001', name: 'Panel', amount: 1000, deposit: 300, depositIn: true, invoiceStatus: 'Sent', ...o }) as never;
ok('balance = total − deposit (once) − confirmed online; fee 2.5% once on the base', () => {
  const c = computeInvoice(job(), [], P); assert.equal(c.balanceCents, 70000);
  const p = planCharge(job(), [], P, { jobId: 'job1', kind: 'balance' }); assert.deepEqual([p.baseCents, p.feeCents, p.totalCents], [70000, 1750, 71750]); assert.equal(cardFeeCents(p.baseCents), p.feeCents);
});
ok('deposit not double-credited: a paid deposit ledger entry is not subtracted again', () => {
  const ledger = JSON.stringify([{ key: 'pi_d', session: 'cs_d', kind: 'deposit', status: 'paid', baseCents: 30000, feeCents: 750, paidCents: 30750, refundedCents: 0, events: [], at: '' }]);
  assert.equal(computeInvoice(job({ paymentLedger: ledger }), [], P).balanceCents, 70000);
});
ok('balance checkout blocked while deposit owed but not marked in; deposit checkout blocked once in', () => {
  assert.ok(planCharge(job({ depositIn: false }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.length);
  assert.ok(planCharge(job(), [], P, { jobId: 'job1', kind: 'deposit' }).blockers.includes('Deposit already received'));
  const d = planCharge(job({ depositIn: false }), [], P, { jobId: 'job1', kind: 'deposit' }); assert.deepEqual([d.baseCents, d.feeCents, d.blockers.length], [30000, 750, 0]);
});
ok('Paid / manual Partial invoices refuse card checkout', () => {
  assert.ok(planCharge(job({ invoiceStatus: 'Paid' }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.length);
  assert.ok(planCharge(job({ invoiceStatus: 'Partial' }), [], P, { jobId: 'job1', kind: 'balance' }).blockers.length);
});
ok('accepted quote bills the SIGNED total, not a re-price at today\'s rates', () => {
  const doc = { tier: 'residential', zone: 1, oldWork: false, options: [{ id: 'a', label: 'Fix', summary: '', lines: [], trip: 'day', extraHours: 0, materialsCost: 0 }], addOns: [], discount: null, scope: '' };
  const q = { id: 'q1', job: [{ id: 'job1' }], status: 'Accepted', version: 1, total: 160, data: JSON.stringify({ doc, accepted: { optionId: 'a', addOns: [] } }) };
  const c = computeInvoice(job({ deposit: 0, depositIn: false }), [q as never], P);
  assert.equal(c.totalCents, 16000); assert.ok(c.repriceNote?.includes('250.00'));
});

// ── Tokens ─────────────────────────────────────────────────────────
ok('pay token: round trip, tamper rejected, carries no amount', () => {
  const t = signPayToken({ jobId: 'job1', kind: 'balance' }, cfg.linkSecret);
  assert.deepEqual(verifyPayToken(t, cfg.linkSecret), { jobId: 'job1', kind: 'balance', coId: undefined });
  assert.equal(verifyPayToken(t.slice(0, -2) + 'AA', cfg.linkSecret), null); assert.equal(verifyPayToken(t, 'y'.repeat(40)), null);
  const forged = Buffer.from(JSON.stringify({ v: 1, j: 'job2', k: 'balance', c: null })).toString('base64url') + '.' + t.split('.')[1];
  assert.equal(verifyPayToken(forged, cfg.linkSecret), null);
  assert.ok(!/\d{3,}/.test(Buffer.from(t.split('.')[0], 'base64url').toString()));
});

// ── Checkout (fake Stripe) ─────────────────────────────────────────
function fakeStripe() {
  const sessions = new Map<string, { id: string; url: string; status: 'open' | 'complete' | 'expired'; payment_status: 'paid' | 'unpaid'; amount_total: number; params: Stripe.Checkout.SessionCreateParams }>();
  const byKey = new Map<string, string>(); let i = 0; const calls = { create: 0 };
  const s: StripeLike = { checkout: { sessions: {
    async create(p, o) { calls.create++; const ex = byKey.get(o.idempotencyKey); if (ex) return sessions.get(ex)!; const id = `cs_test_${++i}`; const amt = p.line_items!.reduce((a, l) => a + (l.price_data!.unit_amount ?? 0), 0); const v = { id, url: `https://checkout.stripe.test/${id}`, status: 'open' as const, payment_status: 'unpaid' as const, amount_total: amt, params: p }; sessions.set(id, v); byKey.set(o.idempotencyKey, id); return v; },
    async retrieve(id) { return sessions.get(id)!; },
    async expire(id) { sessions.get(id)!.status = 'expired'; return {}; },
  } } };
  return { s, sessions, calls };
}
async function seed(o: Record<string, unknown> = {}) {
  const store = new DemoStore();
  const j = await store.create('jobs', { name: 'Panel', jobNumber: 'J-1001', amount: 1000, deposit: 300, depositIn: true, invoiceStatus: 'Sent', ...o });
  return { store, id: j.id };
}
ok('checkout: server-side amount, card only, metadata has no address/PII, double tap reuses one session', async () => {
  const { store, id } = await seed({ town: 'Elkland' });
  const f = fakeStripe();
  const a = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  const b = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.ok(a.ok && b.ok); assert.equal(f.sessions.size, 1); assert.ok(b.ok && b.reused);
  const p = [...f.sessions.values()][0].params;
  assert.equal(p.mode, 'payment'); assert.deepEqual(p.payment_method_types, ['card']);
  assert.deepEqual(p.line_items!.map((l) => l.price_data!.unit_amount), [70000, 1750]);
  const meta = JSON.stringify([p.metadata, p.payment_intent_data?.metadata, p.line_items]);
  assert.ok(!/Elkland|address|street|email|phone/i.test(meta)); assert.equal(p.customer_email, undefined);
});
ok('checkout: amount change expires the stale session and opens a new one', async () => {
  const { store, id } = await seed(); const f = fakeStripe();
  await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  await store.update('jobs', id, { amount: 1200 });
  const r = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.ok(r.ok); const all = [...f.sessions.values()]; assert.equal(all.length, 2); assert.equal(all[0].status, 'expired'); assert.equal(all[1].amount_total, 92250);
});
ok('checkout: completed-but-unpaid (delayed) session blocks a second charge', async () => {
  const { store, id } = await seed(); const f = fakeStripe();
  await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  [...f.sessions.values()][0].status = 'complete';
  const r = await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  assert.ok(!r.ok && r.status === 409); assert.equal(f.sessions.size, 1);
});

// ── Webhook (applyStripeEvent) ─────────────────────────────────────
const evt = (id: string, type: string, obj: Record<string, unknown>) => ({ id, type, data: { object: obj } }) as unknown as Stripe.Event;
const sess = (id: string, o: Record<string, unknown>) => ({ id, payment_intent: 'pi_1', currency: 'usd', amount_total: 71750, payment_status: 'paid', metadata: { app: 'tarango-field-desk', job_id: '', kind: 'balance', base_cents: '70000', fee_cents: '1750' }, ...o });
ok('webhook: paid session credits once; replayed + duplicate events do not double-credit', async () => {
  const { store, id } = await seed(); const s = sess('cs_1', {}); (s.metadata as Record<string, string>).job_id = id;
  await applyStripeEvent({ store, pricing: P }, evt('evt_1', 'checkout.session.completed', s));
  await applyStripeEvent({ store, pricing: P }, evt('evt_1', 'checkout.session.completed', s)); // replay
  await applyStripeEvent({ store, pricing: P }, evt('evt_2', 'checkout.session.completed', s)); // new id, same payment
  const j = (await store.get('jobs', id))!; const l = parseLedger(j.paymentLedger);
  assert.equal(l.length, 1); assert.equal(j.amountPaid, 700); assert.equal(j.invoiceStatus, 'Paid'); assert.equal(j.paid, true);
});
ok('webhook: completed + unpaid (delayed) is NOT paid; async success then pays; async failure never pays', async () => {
  const { store, id } = await seed(); const s = sess('cs_2', { payment_status: 'unpaid' }); (s.metadata as Record<string, string>).job_id = id;
  await applyStripeEvent({ store, pricing: P }, evt('e1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!; assert.equal(parseLedger(j.paymentLedger)[0].status, 'processing'); assert.notEqual(j.invoiceStatus, 'Paid'); assert.notEqual(j.paid, true);
  assert.ok(planCharge(j, [], P, { jobId: id, kind: 'balance' }).blockers.length, 'no second checkout while processing');
  await applyStripeEvent({ store, pricing: P }, evt('e2', 'checkout.session.async_payment_succeeded', { ...s, payment_status: 'paid' }));
  await applyStripeEvent({ store, pricing: P }, evt('e1', 'checkout.session.completed', s)); // late replay of the unpaid event
  j = (await store.get('jobs', id))!; assert.equal(parseLedger(j.paymentLedger)[0].status, 'paid'); assert.equal(j.invoiceStatus, 'Paid');
  const b = await seed(); const f2 = sess('cs_3', { payment_status: 'unpaid', payment_intent: 'pi_3' }); (f2.metadata as Record<string, string>).job_id = b.id;
  await applyStripeEvent({ store: b.store, pricing: P }, evt('f1', 'checkout.session.completed', f2));
  await applyStripeEvent({ store: b.store, pricing: P }, evt('f2', 'checkout.session.async_payment_failed', f2));
  const jb = (await b.store.get('jobs', b.id))!; assert.equal(parseLedger(jb.paymentLedger)[0].status, 'failed'); assert.equal(jb.amountPaid, 0); assert.notEqual(jb.invoiceStatus, 'Paid');
  assert.equal(planCharge(jb, [], P, { jobId: b.id, kind: 'balance' }).baseCents, 70000);
});
ok('webhook: expired session clears the pointer, credits nothing', async () => {
  const { store, id } = await seed(); const f = fakeStripe();
  await startCheckout({ stripe: f.s, store, pricing: P, cfg }, { jobId: id, kind: 'balance' });
  const sid = [...f.sessions.keys()][0]; const s = sess(sid, { payment_status: 'unpaid', status: 'expired' }); (s.metadata as Record<string, string>).job_id = id;
  await applyStripeEvent({ store, pricing: P }, evt('x1', 'checkout.session.expired', s));
  const j = (await store.get('jobs', id))!; assert.equal(JSON.parse(String(j.checkoutSessions)).balance, undefined); assert.equal(parseLedger(j.paymentLedger).length, 0);
});
ok('webhook: amount mismatch goes to review, not credited', async () => {
  const { store, id } = await seed(); const s = sess('cs_4', { amount_total: 100 }); (s.metadata as Record<string, string>).job_id = id;
  await applyStripeEvent({ store, pricing: P }, evt('m1', 'checkout.session.completed', s));
  const j = (await store.get('jobs', id))!; assert.equal(parseLedger(j.paymentLedger)[0].status, 'review'); assert.equal(j.amountPaid, 0); assert.notEqual(j.invoiceStatus, 'Paid');
});
ok('webhook: refunds reduce credit (pro rata), replay-safe, reopen a Paid invoice', async () => {
  const { store, id } = await seed(); const s = sess('cs_5', {}); (s.metadata as Record<string, string>).job_id = id;
  await applyStripeEvent({ store, pricing: P }, evt('p1', 'checkout.session.completed', s));
  const ch = { id: 'ch_1', payment_intent: 'pi_1', amount_refunded: 71750, refunded: true, metadata: s.metadata };
  await applyStripeEvent({ store, pricing: P }, evt('r1', 'charge.refunded', ch));
  await applyStripeEvent({ store, pricing: P }, evt('r1', 'charge.refunded', ch));
  const j = (await store.get('jobs', id))!; assert.equal(j.amountPaid, 0); assert.equal(j.invoiceStatus, 'Sent'); assert.equal(j.paid, false);
  const half = await seed(); const s2 = sess('cs_6', {}); (s2.metadata as Record<string, string>).job_id = half.id;
  await applyStripeEvent({ store: half.store, pricing: P }, evt('p2', 'checkout.session.completed', s2));
  await applyStripeEvent({ store: half.store, pricing: P }, evt('r2', 'charge.refunded', { ...ch, amount_refunded: 35875, refunded: false, metadata: s2.metadata }));
  const jh = (await half.store.get('jobs', half.id))!; assert.equal(jh.amountPaid, 350); assert.equal(jh.invoiceStatus, 'Partial');
});
ok('webhook: deposit payment sets Deposit in once; refund removes it', async () => {
  const { store, id } = await seed({ depositIn: false }); const s = sess('cs_7', { amount_total: 30750, payment_intent: 'pi_7' }); Object.assign(s.metadata as object, { job_id: id, kind: 'deposit', base_cents: '30000', fee_cents: '750' });
  await applyStripeEvent({ store, pricing: P }, evt('d1', 'checkout.session.completed', s));
  let j = (await store.get('jobs', id))!; assert.equal(j.depositIn, true); assert.equal(computeInvoice(j, [], P).balanceCents, 70000);
  await applyStripeEvent({ store, pricing: P }, evt('d2', 'charge.refunded', { id: 'ch_7', payment_intent: 'pi_7', amount_refunded: 30750, refunded: true, metadata: s.metadata }));
  j = (await store.get('jobs', id))!; assert.equal(j.depositIn, false);
});
ok('webhook: if Notion drops the ledger field, it throws (Stripe retries) instead of losing the payment', async () => {
  const { store, id } = await seed(); const orig = store.update.bind(store);
  store.update = (db, rid, v) => { const { paymentLedger: _x, ...rest } = v as Record<string, unknown>; void _x; return orig(db, rid, rest); };
  const s = sess('cs_8', {}); (s.metadata as Record<string, string>).job_id = id;
  await assert.rejects(applyStripeEvent({ store, pricing: P }, evt('g1', 'checkout.session.completed', s)));
});
ok('webhook: events from other apps are ignored', async () => {
  const { store } = await seed(); const r = await applyStripeEvent({ store, pricing: P }, evt('o1', 'checkout.session.completed', { id: 'cs_x', metadata: { app: 'other' } }));
  assert.equal(r.handled, false);
});

// ── Route: real signature verification (Stripe test helper, fake secret) ──
ok('route: rejects missing/bad signature; accepts a valid one', async () => {
  Object.assign(process.env, { STRIPE_SECRET_KEY: 'sk_test_FAKE', STRIPE_WEBHOOK_SECRET: 'whsec_test_FAKE', PAY_LINK_SECRET: 'x'.repeat(40), APP_BASE_URL: 'https://example.test' });
  delete process.env.NOTION_TOKEN;
  const { POST } = await import('../src/app/api/stripe/webhook/route');
  const body = JSON.stringify({ id: 'evt_sig', object: 'event', type: 'payment_intent.created', data: { object: {} } });
  const mk = (sig?: string) => new Request('https://example.test/api/stripe/webhook', { method: 'POST', body, headers: sig ? { 'stripe-signature': sig } : {} });
  assert.equal((await POST(mk())).status, 400);
  assert.equal((await POST(mk('t=1,v1=deadbeef'))).status, 400);
  const good = new Stripe('sk_test_FAKE').webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_test_FAKE' });
  const r = await POST(mk(good)); assert.equal(r.status, 200);
  const old = new Stripe('sk_test_FAKE').webhooks.generateTestHeaderString({ payload: body, secret: 'whsec_test_FAKE', timestamp: Math.floor(Date.now() / 1000) - 3600 });
  assert.equal((await POST(mk(old))).status, 400, 'old signature (replay) rejected');
});

(async () => {
  for (const [name, f] of T) { await f(); n++; console.log('  ✓', name); }
  console.log(`payments tests: ${n} passed`);
})().catch((e) => { console.error(e); process.exit(1); });
