# Card payments (Stripe Checkout) and Nov 3 pricing

## How it works
1. On the invoice (or a change-order invoice), Corey taps **Copy customer pay link**. The link is `/pay/<token>`.
   - The token is HMAC-signed with `PAY_LINK_SECRET`. It names the job and what to pay (deposit, balance, or one change order). It carries **no amount**.
   - The customer quote's deposit button uses the same kind of link, for the deposit.
2. The customer opens the link. The server recomputes what's owed from Notion and shows it: first name, invoice number, amount, the 2.5% card fee, and the total.
   - No address is shown, and none is sent to Stripe.
   - The customer taps **Pay** (a POST), and the server creates (or reuses) a Stripe Checkout Session for exactly that amount. The session is card only and expires in 1 hour.
3. Stripe sends a webhook to `/api/stripe/webhook`. The signature is verified on the raw body, and old signatures (more than 5 minutes) are rejected.
   - Only the webhook writes payments to Notion, on the job's **Payment Ledger**, **Amount Paid Online**, **Invoice Status**, **Paid** and **Deposit in** fields.
   - The return page is read-only and never marks anything paid.

## The one invoice calculation
`src/lib/domain/invoice.ts` → `computeInvoice()` is used by both the invoice page and checkout:
- The **total** is the accepted quote's **signed total**. A re-price at today's rates is shown to Corey but never charged. Small change orders are added; change orders over $300 are billed separately.
- The **deposit** is credited exactly once, and only when **Deposit in** is checked. A paid deposit in the ledger turns Deposit in on and is not subtracted a second time.
- **Confirmed online payments** (net of refunds) are subtracted.
- The **card fee** is 2.5% of the balance, rounded to the cent. It's applied once, as its own line, and is never credited toward the invoice.

## Safeguards
| Risk | Guard |
|---|---|
| Duplicate checkout or double tap | One open session per job and target is stored on the job and reused. The Stripe idempotency key covers job, target, amount and payment history. If the amount changes, the stale session is expired first. |
| Charging twice | No checkout when the invoice is Paid, the balance is 0, or a payment is processing or under review. A completed-but-unpaid (delayed) session blocks a new one. |
| Replayed or duplicate events | Ledger entries are keyed by PaymentIntent, and event ids already seen are skipped. Totals are recomputed from the entries, never incremented, and refunds use Stripe's cumulative `amount_refunded`. |
| Delayed payment | `completed` with `payment_status: unpaid` is recorded as **processing**, not paid. Only `async_payment_succeeded` pays it, and `async_payment_failed` records **failed** with no credit. |
| Expired session | The pointer is cleared. Nothing is credited. |
| Refund | Credit is reduced pro rata, Paid reverts to Sent or Partial, and a refunded app-set deposit unchecks Deposit in. |
| Amount tampering | Amounts are computed server-side only. The webhook checks that `amount_total` equals base + fee from metadata, in USD. A mismatch goes to **review** and isn't credited. |
| Notion drops a field (schema gap) | The webhook reads the write back, and if the ledger didn't persist it returns 500 so Stripe retries. |
| Internal endpoints | `/api/payments/link` sits behind the passcode, and it refuses in production if `APP_PASSCODE` is unset. Only `/pay/*` and `/api/stripe/webhook` are public. |
| Data sent to Stripe | Metadata holds only the job id, kind, cents, invoice number and an app tag. No address, email or phone. |

**Known limit:** within one server instance, webhook writes are serialized per job. Two different payments for one job landing at the same moment on two instances could race on the Notion write. This is very unlikely, because a second checkout is blocked while one is open or processing.

## Configuration (env names, set in Vercel, never in the repo)
Required for card checkout:
- `STRIPE_SECRET_KEY`: a restricted key with Checkout Sessions write and read is preferred. Use a test key in Preview.
- `STRIPE_WEBHOOK_SECRET`: the `whsec_…` from the endpoint below.
- `PAY_LINK_SECRET`: 32 or more random characters. Rotating it invalidates the pay links already sent.
- `APP_BASE_URL`: the https production URL.
- `APP_PASSCODE`: already required. Pay links are refused in production without it.

Optional, only after Chief supplies real ids: `STRIPE_PRODUCT_INVOICE`, `STRIPE_PRODUCT_DEPOSIT`, `STRIPE_PRODUCT_CHANGE_ORDER` and `STRIPE_PRODUCT_CARD_FEE`. These must be `prod_…` ids; anything else is ignored.
- Fixed **price** ids can't express a variable invoice balance, so the app uses `price_data` with the server-computed amount on the product.

Stripe dashboard (Corey or Chief, not the app):
1. Add a webhook endpoint at `https://<production>/api/stripe/webhook` with these events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`
2. Notion: run `npm run notion:bootstrap`, which adds the Jobs fields **Amount Paid Online**, **Payment Ledger** and **Checkout Sessions**. No Rate Book rows are touched.

## Pricing (Nov 3, 2026)
`src/config/pricing-2026-11-03.ts` is the authority for residential pricing and zones. The stale Rate Book ($160) can't override it, and no Rate Book row is edited. Commercial still reads the Rate Book.

### Unresolved (not guessed)
1. **Zone 2/3 supplements on after-hours, emergency and holiday calls.** Nothing is added; the quote is flagged "not decided". The signed total is what's billed.
2. **Billing increment for special-call overtime.** Only the day rate's $75 half-hour was stated, so special-call hours bill as entered and are flagged.
3. **Commercial rates.** Nov 3 doesn't cover them, so they're unchanged.
4. **"Only with the customer's OK"** for time past 2 hours. Quotes say so, and accepting the quote counts as the OK. There is no separate approval capture.
5. **Change-order and estimator labor** use the project rate ($90). Should change-order T&M on a service call be $150?
6. **The $250 credit "once".** It's capped at $250 per quote. There's no cross-quote tracking.
7. **Standalone zone fee for no-trip project work.** It's still $70 / $115 / $155, and the 45 / 85 differences match Nov 3.

### Card-fee and deposit audit (policy not changed)
- **Card fee:** 2.5% is applied once, on the balance after the deposit credit. It is never charged on the fee and never credited.
  - The invoice page, the pay page and Stripe all use `cardFeeCents()`, so they match to the cent.
  - The customer quote's deposit button now computes the fee the same way. Before, it added 0 when the quote had no estimator deposit info.
- **Two deposit rules exist** and aren't reconciled. I left both as they were and am asking Corey:
  - Estimator quotes use the Oct 22 policy (`src/config/deposit-policy.ts`).
  - Older quote docs use `MONEY` (50% over $1,500), and the Jobs "Deposit in" help text also says 50% over $1,500.
- **Deposit card fee:** the deposit is credited in full, and its 2.5% fee isn't, per TERMS.
- **The legacy "Pay Link" field** (fixed Stripe links, such as the old $175 link) is no longer used for job invoices or deposits.
- **Manual tools are unchanged:** the "Cash / Check / Zelle / Card" mark-paid buttons, the in-person "Add 2.5% fee" toggle, and the Invoice Status select.
