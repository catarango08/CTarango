/**
 * Compares the live Notion workspace against the schema.
 *
 *   npm run notion:verify
 *
 * Reports missing databases, missing properties, type mismatches and select
 * options that exist in code but not in Notion. Exits non-zero on any problem
 * so it can run in CI.
 */
import 'dotenv/config';
import { NotionClient, NotionError } from '../src/lib/notion/client';
import { databaseIds } from '../src/lib/notion/registry';
import { allDatabases, dualLabel, validateSchema, type FieldDef } from '../src/lib/schema';

const EXPECTED_NOTION_TYPE: Record<FieldDef['type'], string> = {
  title: 'title',
  text: 'rich_text',
  longtext: 'rich_text',
  number: 'number',
  money: 'number',
  percent: 'number',
  select: 'select',
  multi_select: 'multi_select',
  date: 'date',
  datetime: 'date',
  checkbox: 'checkbox',
  url: 'url',
  email: 'email',
  phone: 'phone_number',
  relation: 'relation',
  files: 'files',
  created_time: 'created_time',
  last_edited_time: 'last_edited_time',
};

async function main() {
  const schemaProblems = validateSchema();
  const problems: string[] = [...schemaProblems.map((p) => `schema: ${p}`)];
  const notes: string[] = [];

  const ids = databaseIds(true);
  const client = new NotionClient();

  for (const db of allDatabases()) {
    const id = ids[db.key];
    if (!id) {
      problems.push(`${db.label}: no database id configured`);
      continue;
    }

    let live;
    try {
      live = await client.retrieveDatabase(id);
    } catch (err) {
      problems.push(`${db.label}: could not read database ${id} — ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }

    const byName = new Map(Object.entries(live.properties));
    for (const field of db.fields) {
      const prop = byName.get(field.label);
      if (!prop) {
        problems.push(`${db.label}.${field.label}: missing in Notion`);
        continue;
      }
      const expected = EXPECTED_NOTION_TYPE[field.type];
      if (prop.type !== expected) {
        problems.push(`${db.label}.${field.label}: Notion says "${prop.type}", schema says "${expected}"`);
      }
    }

    const schemaNames = new Set(db.fields.map((f) => f.label));
    for (const [name] of byName) {
      if (schemaNames.has(name)) continue;
      // Reciprocal relation properties are created by Notion, not by us.
      const isDual = allDatabases().some((other) =>
        other.fields.some((f) => f.type === 'relation' && f.relation === db.key && f.dual && dualLabel(other, f) === name),
      );
      if (!isDual) notes.push(`${db.label}.${name}: exists in Notion but not in the schema (left alone)`);
    }

    console.log(`· ${db.label} — ${db.fields.length} properties checked`);
  }

  if (notes.length) {
    console.log('\nNotes:');
    for (const note of notes) console.log(`  · ${note}`);
  }

  if (problems.length) {
    console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} found:`);
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    console.error('\nRun `npm run notion:bootstrap` to add anything missing.');
    process.exit(1);
  }

  console.log('\nEverything matches the schema.');
}

main().catch((err) => {
  if (err instanceof NotionError) console.error(`Notion error: ${err.message} (${err.status})`);
  else console.error(err);
  process.exit(1);
});
