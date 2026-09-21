/**
 * Attaches the app to the Tarango Electric OS and adds only what is missing.
 *
 *   npm run notion:bootstrap            # report, then apply
 *   npm run notion:bootstrap -- --dry   # report only, change nothing
 *
 * Eight of the nine databases already exist in Corey's workspace. Those are
 * attached by id and are never recreated — at most the script adds a property
 * the app needs that is not there yet, and it will tell you before it does.
 *
 * Job Photos is the one database this app creates: closeout requires four
 * photos per job and the OS had only a checkbox for them.
 */
import 'dotenv/config';
import { NotionClient, NotionError, normalizeId } from '../src/lib/notion/client';
import { propertySchema } from '../src/lib/notion/mapper';
import { databaseIds, envVarFor, writeIdFile, type DatabaseIdMap } from '../src/lib/notion/registry';
import { allDatabases, validateSchema } from '../src/lib/schema';

const dryRun = process.argv.includes('--dry');

async function main() {
  const problems = validateSchema();
  if (problems.length) {
    console.error('Schema is invalid — fix these first:');
    for (const p of problems) console.error(`  · ${p}`);
    process.exit(1);
  }

  const client = new NotionClient();
  const me = await client.me();
  console.log(`Connected as "${me.bot?.workspace_name ?? me.name ?? 'integration'}".${dryRun ? ' (dry run)' : ''}\n`);

  const ids: DatabaseIdMap = { ...databaseIds(true) };
  const parentPageId = normalizeId(process.env.NOTION_PARENT_PAGE_ID ?? readConfigParent());

  // ---- existing databases: verify, then top up missing properties ----
  for (const db of allDatabases().filter((d) => d.existing)) {
    const id = ids[db.key];
    if (!id) {
      console.error(`✗ ${db.label} — no id configured. Set ${envVarFor(db.key)} or add it to notion.config.json.`);
      continue;
    }

    let live;
    try {
      live = await client.retrieveDatabase(id);
    } catch (err) {
      console.error(`✗ ${db.label} — cannot read ${id}: ${err instanceof Error ? err.message : String(err)}`);
      console.error('  Share the database with the integration, then run this again.');
      continue;
    }

    const present = new Set(Object.keys(live.properties));
    const missing = db.fields.filter((f) => !present.has(f.label) && !f.readOnly);

    if (missing.length === 0) {
      console.log(`· ${db.label} — attached, all ${db.fields.length} properties present`);
      continue;
    }

    console.log(`· ${db.label} — attached, missing ${missing.length}: ${missing.map((f) => f.label).join(', ')}`);
    if (dryRun) continue;

    const patch: Record<string, unknown> = {};
    for (const field of missing) {
      const spec = propertySchema(db, field, ids as Record<string, string>);
      if (spec) patch[field.label] = spec;
    }
    if (Object.keys(patch).length) {
      await client.updateDatabase(id, { properties: patch });
      console.log(`  ✓ added ${Object.keys(patch).join(', ')}`);
    }
  }

  // ---- the one database we add ----
  for (const db of allDatabases().filter((d) => !d.existing)) {
    if (ids[db.key]) {
      console.log(`· ${db.label} — already created`);
      continue;
    }
    if (dryRun) {
      console.log(`· ${db.label} — would be created under "${process.env.NOTION_PARENT_PAGE_NAME ?? 'Tarango Electric OS'}"`);
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
    });
    ids[db.key] = created.id;
    console.log(`✓ ${db.label} — created`);

    // Relations need both sides to exist, so they go in a second pass.
    const relationPatch: Record<string, unknown> = {};
    for (const field of db.fields.filter((f) => f.type === 'relation')) {
      const spec = propertySchema(db, field, ids as Record<string, string>);
      if (spec) relationPatch[field.label] = spec;
      else console.warn(`  ! ${field.label}: target "${field.relation}" has no id — skipped`);
    }
    if (Object.keys(relationPatch).length) {
      await client.updateDatabase(created.id, { properties: relationPatch });
      console.log(`  ✓ linked ${Object.keys(relationPatch).join(', ')}`);
    }
  }

  if (!dryRun) {
    const file = writeIdFile({ parentPageId, workspace: me.bot?.workspace_name, databases: ids });
    console.log(`\nWrote ${file}.`);
  }

  console.log('\nDatabase ids:');
  for (const db of allDatabases()) console.log(`${envVarFor(db.key)}=${ids[db.key] ?? ''}`);
  console.log('\nNext: `npm run notion:verify` to confirm every property matches the schema.');
}

function readConfigParent(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require('../notion.config.json') as { parentPageId: string };
  return config.parentPageId;
}

main().catch((err) => {
  console.error('\nBootstrap failed.');
  if (err instanceof NotionError) {
    console.error(`  Notion said: ${err.message} (status ${err.status}${err.code ? `, ${err.code}` : ''})`);
    if (err.status === 404) {
      console.error('  A 404 almost always means the page or database has not been shared with the integration.');
    }
  } else {
    console.error(err);
  }
  process.exit(1);
});
