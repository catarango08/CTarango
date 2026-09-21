# Architecture

```
Browser
  ├── Server Components ──┐
  └── /api/records, /api/photos, /api/jobs/:id/close, /api/town
                          │
                   src/lib/store  (Store interface)
                          │
              ┌───────────┴───────────┐
        NotionStore              DemoStore
              │                 (in-memory)
     src/lib/notion/client
              │
        api.notion.com
```

No database of our own, no ORM. `Store` is six methods — `list`, `get`, `create`, `update`,
`archive`, `upload` — implemented twice. The Notion one is real; the in-memory one exists so a
fresh clone is usable and so UI work does not burn rate limit.

## The schema is the spine

`src/lib/schema/databases.ts` describes the nine databases. The `label` on every field is the
**exact Notion property name**, because that is what the API matches on — `Job #`,
`How they found us`, `Make / model`, `Schedule?` and all.

One declaration drives five consumers:

| Consumer | Use |
| --- | --- |
| `scripts/bootstrap-notion.ts` | Creates or tops up Notion properties |
| `src/lib/notion/mapper.ts` | Encodes app values → Notion properties, and back |
| `src/lib/schema/validate.ts` | A Zod schema per database, so bad writes 422 before Notion sees them |
| `src/components/record-form.tsx` | Renders the right input |
| `src/components/cell.tsx` | Renders the right table cell |

`validateSchema()` guards the invariants — one title per database, unique keys and property
names, relation targets that exist, selects with options — and both the bootstrap and `/setup`
run it.

Read-only Notion types (`auto_number`, `rollup`, `formula`) are first-class in the schema:
decoded for display, filtered out of every write by `isWritable()`, skipped by provisioning.

## The business lives in src/lib/domain

Not in the components. Four files:

- **`rules.ts`** — every number and every prohibition. Prices, thresholds, multipliers, the
  hard lines, the 12,000-hour target, and `checkCopy()` for the do-not-print list.
- **`gates.ts`** — `gateTown()`, `closeoutStatus()`, `depositRequired()`. These decide what the
  UI is allowed to offer.
- **`playbook.ts`** — status → next move, transcribed from the New client process page.
- **`quote.ts`** — the quote math, applying the rate card rules in the order that page states.
- **`writes.ts`** — what happens on write: defaults, `syncJobPhotoFlag`, `logHoursToLedger`,
  and `advanceStatus`, which refuses to close a job that has not been closed out.

Because these are functions over the store rather than UI code, the REST API, a server
component and a script all get the same behaviour. The closeout gate in particular is enforced
in `/api/jobs/:id/close`, not in the button — so it cannot be clicked past.

### Two decisions worth naming

**An unknown town is NO-GO, not GO.** `gateTown()` returns `blockQuote: true` for a town it
cannot match, because the OS says "Red or unknown → Status No-go". The failure mode is a polite
decline, never an accidental quote outside the footprint.

**Drive hours never reach the ledger.** `logHoursToLedger()` writes install hours only, and
subtracts what is already logged so closing a job twice cannot inflate the license file.

## The passcode gate runs in the proxy

`src/proxy.ts` — what Next called `middleware` before 16 — checks the signed
cookie on every request except the login screen and the icon/manifest files iOS
needs before a session exists. API routes get a 401 rather than a redirect.

Because the gate is edge code, a framework CVE in that layer is an auth bug
here, not just a dependency warning. That is why the Next version is pinned
exactly and why `npm audit` is expected to read zero.

## The Notion config is bundled, not read from disk

`notion.config.json` is a static import. Reading it with `fs` at runtime worked
locally but is fragile on serverless, where the function's working directory is
not guaranteed to hold the repo — a miss would silently fall back to sample data
in production. The optional `.notion-ids.json` is still read from disk, but only
outside production, where the bootstrap writes it.

## Request-level memoization

List screens read whole tables — that is how a relation's display label is resolved without an
N+1 of page reads. `loadAll` and `labelIndex` are wrapped in React's `cache()`, so a screen
touching jobs, customers and territory reads each table once per request. `hydrate()` then
fills in the labels.

Right for a one-truck shop with hundreds of jobs. At a different scale the `Store` interface is
the seam for a cache.

## The generated record browser

Databases without a bespoke screen still get full CRUD at `/records/<db>`, built from
`columnsFor()` and `editableFields()`. Adding a database to the schema gets you that for free;
you then build a real screen only where the work deserves one.
