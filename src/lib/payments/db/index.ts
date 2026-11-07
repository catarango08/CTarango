import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
export type DbClient = pg.PoolClient;

let pool: pg.Pool | null = null;
let migrated = false;

export function paymentDatabaseUrl(): string | undefined {
  const v = process.env.PAYMENT_DATABASE_URL?.trim();
  return v || undefined;
}

export function getPool(): pg.Pool {
  const url = paymentDatabaseUrl();
  if (!url) throw new Error('PAYMENT_DATABASE_URL is not set');
  if (!pool) pool = new Pool({ connectionString: url, max: 8, connectionTimeoutMillis: 5000 });
  return pool;
}

/** Test hook. */
export async function closePaymentPool(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
  migrated = false;
}

export async function migratePayments(): Promise<void> {
  if (migrated) return;
  const db = getPool();
  const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'schema.sql'), 'utf8');
  const client = await db.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [81221022]);
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT (version) DO NOTHING');
    const v = await client.query('SELECT version FROM schema_migrations WHERE version = 1');
    if (v.rowCount !== 1) throw new Error('payment schema migration did not record version 1');
    migrated = true;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [81221022]).catch(() => undefined);
    client.release();
  }
}

export async function paymentSchemaReady(): Promise<boolean> {
  if (!paymentDatabaseUrl()) return false;
  try {
    await migratePayments();
    const r = await getPool().query('SELECT version FROM schema_migrations WHERE version = 1');
    return r.rowCount === 1;
  } catch {
    return false;
  }
}

/**
 * Serializes every money change for one job across processes.
 * The row lock is held until commit or rollback. A dropped connection rolls the transaction back.
 */
export async function withJob<T>(jobId: string, fn: (client: DbClient) => Promise<T>): Promise<T> {
  await migratePayments();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO payment_job_locks (job_id) VALUES ($1) ON CONFLICT (job_id) DO NOTHING', [jobId]);
    await client.query('SELECT job_id FROM payment_job_locks WHERE job_id = $1 FOR UPDATE', [jobId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function dbQuery<T extends pg.QueryResultRow = pg.QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  await migratePayments();
  const r = await getPool().query<T>(sql, params);
  return r.rows;
}
