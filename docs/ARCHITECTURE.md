# Architecture

## The shape of the thing

```
Browser
  │
  ├── Server Components ──┐
  └── /api/records, /api/photos
                          │
                   src/lib/store  (Store interface)
                          │
              ┌───────────┴───────────┐
        NotionStore               DemoStore
              │                  (in-memory)
     src/lib/notion/client
              │
        api.notion.com
```

There is no database of our own and no ORM. `Store` is a six-method interface —
`list`, `get`, `create`, `update`, `archive`, `upload` — implemented twice. The Notion
implementation is the real one; the demo implementation exists so a fresh clone is
demoable and so UI work does not burn rate limit.

## The schema is the spine

`src/lib/schema/databases.ts` is a plain declarative description of 22 databases. A field
looks like this:

```ts
{ key: 'serviceSize', label: 'Service Size', type: 'select', column: true,
  options: ['60A', '100A', '125A', '150A', '200A', '400A', '600A', '800A', '1200A', '2000A+'] }
```

`key` is what the app and the JSON API use. `label` is the Notion property name. That one
declaration drives five things:

| Consumer | What it does with the field |
| --- | --- |
| `scripts/bootstrap-notion.ts` | Creates the Notion property (`propertySchema`) |
| `src/lib/notion/mapper.ts` | Encodes app values → Notion property values, and back |
| `src/lib/schema/validate.ts` | Builds a Zod validator so bad writes 422 instead of reaching Notion |
| `src/components/record-form.tsx` | Renders the right input |
| `src/components/cell.tsx` | Renders the right table cell |

`validateSchema()` guards the invariants — one title field per database, unique keys and
property names, relation targets that exist, select fields with options — and both the
bootstrap script and the `/setup` page run it.

## The two-pass provisioning problem

A Notion relation property needs its target database id at creation time, and 22 databases
reference each other in cycles (a job points at a customer; a customer points at a
preferred technician; a technician points at a vehicle). So the bootstrap runs twice:

1. **Pass one** creates every database with its non-relation properties.
2. **Pass two** PATCHes the relation properties in, now that every id exists.

Pass two doubles as the migration path. It only adds properties that are missing, so
re-running the bootstrap after adding a field to the schema is how you migrate, and
re-running it on an unchanged schema does nothing.

Dual relations create a reciprocal property on the far side (`dual: true`,
`dualLabel: 'Materials Used'`). `verify-notion.ts` knows about these so it does not report
Notion-created reciprocals as schema drift.

## Notion-specific decisions

**Status properties are `select`.** The Notion API cannot create a `status` property.
Rather than ship a schema that only half-provisions, every workflow state — job status,
invoice status, permit status — is a `select` with the full option list. Converting one in
the Notion UI later is a two-click operation and the app keeps working, because it reads
and writes a name either way.

**No rollups or formulas.** They are tempting for invoice totals and job margin, but a
formula only computes inside Notion: the API returns its result, not a value you can
filter or sort on reliably, and a failed expression breaks provisioning with a message
that points nowhere. Instead `src/lib/domain.ts` computes totals, hours, markup and
balances on write and stores plain numbers. The figures are therefore correct whether you
are looking at the app, a Notion view or a CSV export.

**Money is `number` with `dollar` format; percentages are fractions.** A margin of 51.8%
is stored as `0.518`, which is what Notion's percent format expects.

**Rich text is chunked at 2,000 characters.** Notion rejects longer chunks, so
`mapper.ts` splits long notes rather than truncating them.

**File URLs expire.** Photos live in Notion storage after a two-step upload
(`POST /v1/file_uploads` → `POST` the bytes → attach the `file_upload` id to a `files`
property). The signed URLs Notion returns are short-lived, so nothing caches them; pages
re-read the property each request.

**Rate limits are handled in the client.** `NotionClient` retries 429s and 5xx with
exponential backoff and honours `Retry-After`. `queryAll` pages through 100-item responses.

## Request-level memoization

List pages read whole tables — that is how you resolve a relation's display label without
an N+1 of page reads. `loadAll` and `labelIndex` are wrapped in React's `cache()`, so a
page that touches jobs, customers and technicians reads each table once per request no
matter how many components ask for it. `hydrate()` then fills in a `label` on every
relation value so the UI can render chips and links.

This is the right trade for a contractor with hundreds of jobs. At tens of thousands you
would put a cache or a read replica in front of the store — the `Store` interface is the
seam for exactly that.

## Business rules live in one place

`src/lib/domain.ts` runs on every write, whichever path it came from:

- **Document numbering** — `J-2026-0184`, `EST-2026-0061`, `INV-2026-0412`, continuing
  from the highest existing number in the current year.
- **Line math** — line totals, extended material cost, hours from clock-in/clock-out,
  catalog markup.
- **`recalculateJob`** — rolls time entries (at each tech's burdened cost, 1.5× for
  overtime) and material usage into labor cost, material cost, revenue and gross margin.
- **`recalculateInvoice`** — rolls payments up, sets `amountPaid`, `balanceDue` and moves
  status to Paid / Partially Paid / Overdue.

Because these are functions over the store rather than UI code, a script, the REST API and
a server component all get the same behaviour.

## The generated record browser

Sixteen of the 22 databases have no bespoke screen and do not need one. `/records/[db]`
renders a table from `columnsFor(db)`, `/records/[db]/new` and `/records/[db]/[id]?edit=true`
render a form from `editableFields(db)`, and relation fields become selects populated from
the target database. Adding a database to the schema gets you full CRUD for free; you then
build a bespoke screen only where the work deserves one — the dispatch board, the job page,
the customer 360.
