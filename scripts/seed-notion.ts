/**
 * Loads the sample electrical company into your Notion workspace.
 *
 *   npm run notion:seed            # create
 *   npm run notion:seed -- --dry   # print what would be written
 *
 * Runs in two passes for the same reason the bootstrap does: relations can only
 * be written once both sides exist. Photo bytes are not seeded — the demo
 * images are generated SVGs, and Notion only accepts real uploads or public
 * URLs — so the sample rows arrive with their captions and metadata and you
 * attach real photos from the app.
 */
import 'dotenv/config';
import { NotionClient, NotionError } from '../src/lib/notion/client';
import { encodeProperties } from '../src/lib/notion/mapper';
import { databaseIds } from '../src/lib/notion/registry';
import { allDatabases, getDb, type DbKey, type RecordValue } from '../src/lib/schema';
import { buildDemoData } from '../src/lib/store/demo-data';

const dryRun = process.argv.includes('--dry');

async function main() {
  const ids = databaseIds(true);
  const missing = allDatabases().filter((db) => !ids[db.key]);
  if (missing.length) {
    console.error(`Missing database ids for: ${missing.map((d) => d.key).join(', ')}`);
    console.error('Run `npm run notion:bootstrap` first.');
    process.exit(1);
  }

  const client = new NotionClient();
  const data = buildDemoData();
  const idMap = new Map<string, string>();

  let created = 0;

  // ---- pass 1: create rows without relations or files ---------------
  for (const db of allDatabases()) {
    const rows = data[db.key] ?? [];
    if (!rows.length) continue;

    for (const row of rows) {
      const values = strip(db.key, row, { relations: false, files: false });
      if (dryRun) {
        console.log(`[dry] ${db.label}: ${JSON.stringify(Object.values(values)[0] ?? '')}`);
        idMap.set(row.id, `dry-${row.id}`);
        continue;
      }
      const page = await client.createPage({
        parent: { database_id: ids[db.key] },
        icon: { type: 'emoji', emoji: db.emoji },
        properties: encodeProperties(getDb(db.key), values),
      });
      idMap.set(row.id, page.id);
      created++;
    }
    console.log(`· ${db.label} — ${rows.length} rows`);
  }

  // ---- pass 2: wire the relations ----------------------------------
  let linked = 0;
  for (const db of allDatabases()) {
    const rows = data[db.key] ?? [];
    const relationFields = getDb(db.key).fields.filter((f) => f.type === 'relation');
    if (!rows.length || !relationFields.length) continue;

    for (const row of rows) {
      const target = idMap.get(row.id);
      if (!target) continue;

      const values: Record<string, unknown> = {};
      for (const field of relationFields) {
        const refs = Array.isArray(row[field.key]) ? (row[field.key] as { id: string }[]) : [];
        const mapped = refs.map((ref) => idMap.get(ref.id)).filter((id): id is string => Boolean(id));
        if (mapped.length) values[field.key] = mapped.map((id) => ({ id }));
      }
      if (!Object.keys(values).length) continue;

      if (dryRun) {
        console.log(`[dry] link ${db.label}: ${Object.keys(values).join(', ')}`);
        continue;
      }
      await client.updatePage(target, { properties: encodeProperties(getDb(db.key), values) });
      linked++;
    }
    console.log(`· ${db.label} — relations wired`);
  }

  console.log(dryRun ? '\nDry run complete — nothing was written.' : `\nCreated ${created} pages and linked ${linked} of them.`);
}

/** Copy a demo row, dropping the fields a given pass should not write. */
function strip(dbKey: DbKey, row: RecordValue, keep: { relations: boolean; files: boolean }): Record<string, unknown> {
  const db = getDb(dbKey);
  const values: Record<string, unknown> = {};
  for (const field of db.fields) {
    if (field.type === 'relation' && !keep.relations) continue;
    if (field.type === 'files' && !keep.files) continue;
    if (row[field.key] === undefined || row[field.key] === null) continue;
    values[field.key] = row[field.key];
  }
  return values;
}

main().catch((err) => {
  if (err instanceof NotionError) console.error(`Notion error: ${err.message} (${err.status})`);
  else console.error(err);
  process.exit(1);
});
