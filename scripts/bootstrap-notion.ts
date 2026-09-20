/**
 * Creates (or updates) every VoltFlow database inside one Notion page.
 *
 *   npm run notion:bootstrap
 *
 * Two passes are required because relation properties need their target
 * database to exist first:
 *   pass 1 — create each database with its non-relation properties
 *   pass 2 — PATCH the relation properties in, wiring the graph together
 *
 * Re-running is safe. Existing databases are matched by title and patched with
 * any properties the schema has gained since.
 */
import 'dotenv/config';
import { NotionClient, NotionError, normalizeId } from '../src/lib/notion/client';
import { propertySchema } from '../src/lib/notion/mapper';
import { databaseIds, envVarFor, writeIdFile, type DatabaseIdMap } from '../src/lib/notion/registry';
import { allDatabases, validateSchema } from '../src/lib/schema';

async function main() {
  const problems = validateSchema();
  if (problems.length) {
    console.error('Schema is invalid — fix these before provisioning:');
    for (const problem of problems) console.error(`  · ${problem}`);
    process.exit(1);
  }

  const parentRaw = process.env.NOTION_PARENT_PAGE_ID;
  if (!parentRaw) {
    console.error('NOTION_PARENT_PAGE_ID is not set.');
    console.error('Create an empty Notion page, share it with your integration, and paste its URL or id into .env.local.');
    process.exit(1);
  }
  const parentPageId = normalizeId(parentRaw);
  const client = new NotionClient();

  const me = await client.me();
  console.log(`Connected as "${me.bot?.workspace_name ?? me.name ?? 'integration'}".`);

  const existing = await findExistingDatabases(client, parentPageId);
  const ids: DatabaseIdMap = { ...databaseIds(true) };

  // ---- pass 1: create or locate every database ----------------------
  for (const db of allDatabases()) {
    const known = ids[db.key] ?? existing.get(db.label);
    if (known) {
      ids[db.key] = known;
      console.log(`· ${db.label} — already exists`);
      continue;
    }

    const properties: Record<string, unknown> = {};
    for (const field of db.fields) {
      if (field.type === 'relation') continue;
      const spec = propertySchema(db, field, {});
      if (spec) properties[field.label] = spec;
    }

    const created = await client.createDatabase({
      parent: { type: 'page_id', page_id: parentPageId },
      icon: { type: 'emoji', emoji: db.emoji },
      title: [{ type: 'text', text: { content: db.label } }],
      description: [{ type: 'text', text: { content: db.description } }],
      properties,
      is_inline: false,
    });

    ids[db.key] = created.id;
    console.log(`✓ ${db.label} — created (${Object.keys(properties).length} properties)`);
  }

  // ---- pass 2: relations, plus any properties added since -----------
  for (const db of allDatabases()) {
    const id = ids[db.key];
    if (!id) continue;

    const live = await client.retrieveDatabase(id);
    const present = new Set(Object.keys(live.properties));
    const patch: Record<string, unknown> = {};

    for (const field of db.fields) {
      if (present.has(field.label)) continue;
      const spec = propertySchema(db, field, ids as Record<string, string>);
      if (spec) patch[field.label] = spec;
      else if (field.type === 'relation') {
        console.warn(`  ! ${db.label}.${field.label}: target "${field.relation}" has no id — skipped`);
      }
    }

    if (Object.keys(patch).length) {
      await client.updateDatabase(id, { properties: patch });
      console.log(`✓ ${db.label} — added ${Object.keys(patch).length} properties (${Object.keys(patch).join(', ')})`);
    }
  }

  const file = writeIdFile({ parentPageId, workspace: me.bot?.workspace_name, databases: ids });

  console.log(`\nWrote ${file}.`);
  console.log('\nTo pin these ids in a deployment, copy these into your environment:\n');
  for (const db of allDatabases()) {
    console.log(`${envVarFor(db.key)}=${ids[db.key] ?? ''}`);
  }
  console.log('\nNext: `npm run notion:seed` for sample data, or `npm run dev` and start booking work.');
}

/** Databases already sitting under the parent page, keyed by title. */
async function findExistingDatabases(client: NotionClient, parentPageId: string): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  try {
    const res = await client.search({ filter: { value: 'database', property: 'object' }, page_size: 100 });
    for (const item of res.results as { id: string; title?: { plain_text: string }[]; parent?: { page_id?: string } }[]) {
      const title = (item.title ?? []).map((t) => t.plain_text).join('');
      const parent = item.parent?.page_id ? normalizeId(item.parent.page_id) : null;
      if (title && parent === parentPageId) found.set(title, item.id);
    }
  } catch (err) {
    if (err instanceof NotionError) console.warn(`(search skipped: ${err.message})`);
  }
  return found;
}

main().catch((err) => {
  console.error('\nBootstrap failed.');
  if (err instanceof NotionError) {
    console.error(`  Notion said: ${err.message} (status ${err.status}${err.code ? `, ${err.code}` : ''})`);
    if (err.status === 404) {
      console.error('  A 404 here almost always means the parent page has not been shared with the integration.');
    }
  } else {
    console.error(err);
  }
  process.exit(1);
});

