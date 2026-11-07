# Card payments (Stripe Checkout) and pricing

This is not live. Nothing in the repo takes a real payment, creates a webhook, or writes to Notion or Stripe. Corey still has to do the setup below before a card can be charged.

## Source of truth

Money lives in a dedicated PostgreSQL database (`PAYMENT_DATABASE_URL`), not in Notion and not in the demo store.

- Each job is locked with `SELECT … FOR UPDATE` so two servers cannot lose an event.
- Stripe event ids and payment intents are unique.
- Obligation revisions are insert-only. Editing the requested deposit or the signed total creates a new revision and supersedes open checkouts.
- Checkout params, including `expires_at` and the idempotency key, are saved before Stripe is called. A retry sends that same body. An expired session uses a new generation and a new key.
- Notion receives an ordered outbox projection (ledger, amount paid, deposit flag, invoice status). If Notion drops a field, the webhook returns 500 and the next delivery repairs the projection. Notion is a display. It is not the ledger.
- Card checkout is refused unless the passcode, Stripe config, account id, and migrated payment schema are all present. The demo store cannot take a payment.

## What a customer can pay

1. A signed link `/pay/<token>` names the job and deposit, balance, or one change order. It carries no amount. It expires in 7 days and can be revoked when the invoice changes.
2. The server computes the amount from the signed total plus explicit receipts. The return page only reads the payment database. It never marks anything paid.
3. Checkout is card-only via `allowed_payment_method_types: ['card']` (not `payment_method_types`), because the 2.5% line is a card fee. The fee is its own line and is never credited.
4. Metadata sent to Stripe is the job id, kind, cents, invoice number, and attempt id. No street address, email, or phone.

## Credit rules

- Collected credit is the sum of explicit receipts (card, cash, check, Zelle). The Deposit checkbox and the editable Deposit amount are not the credit.
- A full refund returns all principal and the fee.
- Any other refund needs `principal_cents` and `refund_fee_cents` on the charge or refund metadata, adding up to Stripe's cumulative refund. Otherwise the payment stays in review and the previous credit is left alone. The split is not guessed.
- A paid entry stays paid if a failure notice arrives later. A refund is the way money comes back.
- A webhook must match livemode, and the account when Stripe sends one, plus currency and amount against the stored checkout. A stale or excess payment is review, not an automatic paid invoice.
- Change orders of $300 or less stay on the main invoice. They cannot also be collected on their own. If one was already paid on its own, the main invoice does not bill it again.

## Deposit policy (Oct 22, 2026)

The old "50% over $1,500" rule is not used. `computeDeposit` in `src/lib/domain/deposit.ts` is the shared helper (`src/config/deposit-policy.ts`):

- Materials or rentals over $300 are due at signing.
- Contractor-furnished jobs of $1,000 or more: the greater of 30% or materials and rentals.
- Jobs over $5,000: 30/40/30, and signing is never below materials. If that split cannot fit, it is flagged.
- Labor-only: the greater of $500 or 10%, then bills every two weeks. If another rule is also higher, that higher amount is shown and flagged.
- Generators: the greater of 50% or the unit plus transfer switch. A missing gear cost is flagged.
- The amount is shown. Scheduling is not blocked on it.

## Pricing (Nov 3, 2026)

`src/config/pricing-2026-11-03.ts` is the residential authority. The app does not write Rate Book rows. The stale $160 row cannot change residential prices. Job invoices use the accepted signed total, not a re-price, and not the legacy fixed Pay Link field.

- Service call $250 includes Zone 1 and 2 hours. Zone 2 is +$45 and Zone 3 is +$85 on day calls and on after-hours, holiday, and same-day special calls.
- Day overtime is $150/hr, billed in $75 half-hours, only with the customer's OK.
- After-hours $375, same-day special $450, and holiday $500 include 2 hours, then full-hour blocks at $225, $225, and $300.
- Project, extra repair, and change-order labor is $90/hr. Parts are separate.
- The $250 service-call credit applies once per job across quote versions.
- Commercial rates are unchanged.

## Setup before any real card (not done by this change)

Set these in the host's secret store. Do not commit them.

- `PAYMENT_DATABASE_URL` — a Postgres database used only for payments. Apply happens on startup (`schema_migrations` version 1). Take a backup before pointing this at anything that already has data.
- `APP_PASSCODE` — required. Signed pay links are refused when it is unset. Staff pages still use the passcode cookie. Customers do not get that cookie; they need a valid unexpired link.
- `STRIPE_SECRET_KEY` — a restricted key (`rk_`) is preferred over a secret key. Use a test key until Corey says otherwise.
- `STRIPE_ACCOUNT_ID` — `acct_…` for this Stripe account. An event that names a different account is rejected.
- `STRIPE_WEBHOOK_SECRET` — from the endpoint Corey creates. The app does not create the endpoint.
- `PAY_LINK_SECRET` — 32+ random characters. Rotating it invalidates links.
- `APP_BASE_URL` — https origin, no trailing slash.

Optional product ids, only after they exist: `STRIPE_PRODUCT_INVOICE`, `STRIPE_PRODUCT_DEPOSIT`, `STRIPE_PRODUCT_CHANGE_ORDER`, `STRIPE_PRODUCT_CARD_FEE`.

Webhook events to subscribe, when Corey is ready: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.

Dashboard payment methods should leave card enabled. The code also filters Checkout to card.

Notion bootstrap (`npm run notion:bootstrap`) can add the display fields. Do not run it against the live workspace until Corey asks. It does not change Rate Book prices. Do not edit Rate Book rows.

## Still not verified

No live Stripe call, no live webhook, and no live Notion write was made. Tests use a fake Stripe client and local Postgres.
