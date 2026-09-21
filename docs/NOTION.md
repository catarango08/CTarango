# Connecting the Tarango Electric OS

The app reads and writes the databases that already exist in the workspace. It does not
create a parallel set, and it does not migrate anything.

## The nine databases

| Key | Notion database | Origin |
| --- | --- | --- |
| `jobs` | Jobs | already in the OS |
| `customers` | Customers | already in the OS |
| `hourLedger` | Hour Ledger | already in the OS |
| `rateBook` | Rate Book | already in the OS |
| `territory` | Service Territory (CRM) | already in the OS |
| `permits` | Permits & Inspectors | already in the OS |
| `referrals` | Referrals | already in the OS |
| `equipment` | Equipment Log | already in the OS |
| `jobPhotos` | Job Photos | **added by this app** |

Their ids are checked into `notion.config.json`. They are workspace addresses, not secrets —
useless without a token — and keeping them in the repo means the only thing to configure is
`NOTION_TOKEN`. Any of them can be overridden with `NOTION_DB_<KEY>` in the environment.

## Why Job Photos was added

Closeout requires four photos — before, panel or nameplate, completed work, and torque or
labeling on service equipment — but the OS had only a `Photos` checkbox on Jobs. A checkbox
cannot say which of the four are missing, so the app adds a database with a `Stage` select and
a two-way relation to Jobs.

The existing checkbox is not abandoned: it drives the Notion views, so the app keeps it true to
the photos themselves, ticking it once all three required stages are on file
(`syncJobPhotoFlag` in `src/lib/domain/writes.ts`).

Nothing else about the OS was changed. No property was renamed, retyped or removed.

## Setup

1. Create an internal integration at notion.so/my-integrations with read, update and insert
   content capabilities.
2. Open the **Tarango Electric OS** page → ⋯ → Connections → your integration. That one share
   covers every database under it.
3. Put the secret in `.env.local` as `NOTION_TOKEN`.

```bash
npm run notion:bootstrap -- --dry   # report only, changes nothing
npm run notion:bootstrap            # attach, add any missing property
npm run notion:verify               # diff the live workspace against the schema
```

The bootstrap never creates or replaces a database marked `existing`. At most it adds a
property the app needs and does not find, and `--dry` shows you that list first.

`npm run notion:seed` exists for a scratch workspace and will duplicate records if pointed at
the live OS. It warns, and takes `--only <db,db>` to scope it.

## What the app will not write

`Job #` (auto-increment), `Hours logged` (rollup), and the `Lane`, `Play`, `Ready` and
`Closeout score` formulas are computed by Notion. They are declared `readOnly` in the schema,
decoded for display, excluded from every write, and skipped by the bootstrap.

## The formula problem

The Notion API can read a formula's *value* but not its *source* — `formulaCode://` URLs are
not fetchable. So the next-move logic behind the Play button is not derived from the `Play`
formula; it is restated in `src/lib/domain/playbook.ts` from the **New client process** page,
which is where that formula's rules are written down in the first place.

Because two sources can drift, the job ticket shows both: its own action, and Notion's `Play`
value beneath it when they differ. If they disagree, one of them is out of date and you can
see which.

## Rate limits and files

The client pins `Notion-Version: 2022-06-28`, retries 429s and 5xx with exponential backoff,
honours `Retry-After`, and pages through queries 100 rows at a time. Photos go through the
two-step file upload endpoint (reserve, then POST the bytes), 20 MB per file. The URLs Notion
hands back are signed and expire, so nothing caches them.
