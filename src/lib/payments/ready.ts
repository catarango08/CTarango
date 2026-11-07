import type { Store } from '../store/types';
import { passcode } from '../auth';
import { payConfig, type PayConfig } from './config';
import { paymentDatabaseUrl, paymentSchemaReady } from './db';

export type Ready = { ok: true; cfg: PayConfig } | { ok: false; status: number; error: string; missing: string[] };

/**
 * Card payments fail closed unless the passcode, Stripe config, and the payment
 * database schema are all present. The demo store is not a payment ledger.
 */
export async function paymentsReady(store: Store): Promise<Ready> {
  if (!passcode()) return { ok: false, status: 503, error: 'APP_PASSCODE must be set before card payments', missing: ['APP_PASSCODE'] };
  const cfg = payConfig();
  if (!cfg.ok) return { ok: false, status: 503, error: 'Card payments are not configured', missing: cfg.missing };
  if (!paymentDatabaseUrl()) return { ok: false, status: 503, error: 'PAYMENT_DATABASE_URL is not set', missing: ['PAYMENT_DATABASE_URL'] };
  const schema = await paymentSchemaReady();
  if (!schema) return { ok: false, status: 503, error: 'Payment database schema is not ready', missing: ['payment schema'] };
  const allowDemo = process.env.PAYMENTS_ALLOW_DEMO_DISPLAY === '1' && process.env.NODE_ENV !== 'production';
  if (store.kind === 'demo' && !allowDemo) return { ok: false, status: 503, error: 'Card payments are not accepted against the demo store', missing: ['Notion'] };
  return { ok: true, cfg: cfg.cfg };
}
