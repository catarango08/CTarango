import fs from 'node:fs';
import path from 'node:path';
import type { DbKey } from '../schema';
import { allDatabases } from '../schema';
import { normalizeId } from './client';

export type DatabaseIdMap = Partial<Record<DbKey, string>>;

const ID_FILE = process.env.NOTION_ID_FILE ?? path.join(process.cwd(), '.notion-ids.json');
/** Checked in: the Tarango Electric OS databases that already exist. */
const CONFIG_FILE = path.join(process.cwd(), 'notion.config.json');

let cached: DatabaseIdMap | null = null;

/** ENV var name for a database id, e.g. customers -> NOTION_DB_CUSTOMERS. */
export function envVarFor(key: DbKey): string {
  return `NOTION_DB_${key.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`;
}

/**
 * Resolution order:
 *   1. NOTION_DATABASE_IDS — a JSON blob, handy on platforms with few env slots
 *   2. NOTION_DB_<KEY> — one var per database
 *   3. .notion-ids.json — written by `npm run notion:bootstrap`
 */
export function databaseIds(refresh = false): DatabaseIdMap {
  if (cached && !refresh) return cached;

  const map: DatabaseIdMap = {};

  const blob = process.env.NOTION_DATABASE_IDS;
  if (blob) {
    try {
      Object.assign(map, JSON.parse(blob) as DatabaseIdMap);
    } catch {
      console.warn('[tarango] NOTION_DATABASE_IDS is not valid JSON — ignoring it.');
    }
  }

  for (const db of allDatabases()) {
    const fromEnv = process.env[envVarFor(db.key)];
    if (fromEnv) map[db.key] = fromEnv;
  }

  for (const file of [ID_FILE, CONFIG_FILE]) {
    if (!fs.existsSync(file)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { databases?: DatabaseIdMap };
      for (const [key, value] of Object.entries(parsed.databases ?? {})) {
        if (!map[key as DbKey] && typeof value === 'string') map[key as DbKey] = value;
      }
    } catch {
      console.warn(`[tarango] Could not read ${file} — ignoring it.`);
    }
  }

  for (const [key, value] of Object.entries(map)) {
    if (typeof value === 'string') {
      try {
        map[key as DbKey] = normalizeId(value);
      } catch {
        delete map[key as DbKey];
      }
    }
  }

  cached = map;
  return map;
}

export function databaseId(key: DbKey): string {
  const id = databaseIds()[key];
  if (!id) {
    throw new Error(
      `No Notion database id for "${key}". Run \`npm run notion:bootstrap\` or set ${envVarFor(key)}.`,
    );
  }
  return id;
}

export function writeIdFile(payload: { parentPageId: string; workspace?: string; databases: DatabaseIdMap }): string {
  fs.writeFileSync(ID_FILE, `${JSON.stringify({ ...payload, updatedAt: new Date().toISOString() }, null, 2)}\n`);
  cached = null;
  return ID_FILE;
}

/** True when every database in the schema has an id and a token is present. */
export function notionConfigured(): boolean {
  if (!process.env.NOTION_TOKEN) return false;
  const ids = databaseIds();
  return allDatabases().every((db) => Boolean(ids[db.key]));
}

export function missingDatabases(): DbKey[] {
  const ids = databaseIds();
  return allDatabases().filter((db) => !ids[db.key]).map((db) => db.key);
}
