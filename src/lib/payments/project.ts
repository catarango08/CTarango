import type { Store } from '../store/types';
import type { Pricing } from '../domain/pricing';
import { withJob, type DbClient } from './db';
import { PaymentRetry } from './errors';
import { assertDisplay, enqueueDisplay } from './money';

/** Apply pending outbox rows in order. A failed read-back leaves the row unprojected so a retry can repair it. */
export async function projectPending(store: Store, jobId: string): Promise<void> {
  await withJob(jobId, async (client) => {
    await projectOn(client, store, jobId);
  });
}

export async function projectOn(client: DbClient, store: Store, jobId: string): Promise<void> {
  const rows = await client.query<{ id: string; payload: Record<string, unknown> }>(
    `SELECT id, payload FROM outbox WHERE job_id = $1 AND status <> 'projected' ORDER BY seq`,
    [jobId],
  );
  for (const row of rows.rows) {
    const patch = row.payload as unknown as Parameters<typeof assertDisplay>[1];
    try {
      await store.update('jobs', jobId, { ...patch });
      const back = await store.get('jobs', jobId);
      assertDisplay(back, patch);
      await client.query(`UPDATE outbox SET status = 'projected', last_error = NULL WHERE id = $1`, [row.id]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'projection failed';
      throw new PaymentRetry(message);
    }
  }
}

/** If a previous projection failed, write the current snapshot again and push it. */
export async function repairProjection(store: Store, pricing: Pricing, jobId: string): Promise<void> {
  await withJob(jobId, async (client) => {
    const pending = await client.query(`SELECT 1 FROM outbox WHERE job_id = $1 AND status <> 'projected' LIMIT 1`, [jobId]);
    if ((pending.rowCount ?? 0) === 0) {
      const job = await store.get('jobs', jobId);
      if (!job) throw new PaymentRetry('job not found');
      const quotes = await store.list('quotes');
      await enqueueDisplay(client, job, quotes, pricing);
    }
  });
  await projectPending(store, jobId);
}
