import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PayKind } from './ledger';

/**
 * Customer pay links: /pay/<token>. The token names a job and what to pay
 * (deposit, balance, or one change order), HMAC-signed with PAY_LINK_SECRET.
 * It carries NO amount. The amount is always recomputed server-side at checkout.
 */
export interface PayTarget { jobId: string; kind: PayKind; coId?: string }
const b64 = (b: Buffer) => b.toString('base64url');

export function signPayToken(t: PayTarget, secret: string): string {
  const body = b64(Buffer.from(JSON.stringify({ v: 1, j: t.jobId, k: t.kind, c: t.coId ?? null })));
  return `${body}.${b64(createHmac('sha256', secret).update(body).digest())}`;
}

export function verifyPayToken(token: string, secret: string): PayTarget | null {
  const [body, sig, extra] = String(token ?? '').split('.');
  if (!body || !sig || extra !== undefined) return null;
  const want = createHmac('sha256', secret).update(body).digest();
  let got: Buffer;
  try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const v = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (v.v !== 1 || typeof v.j !== 'string' || !['deposit', 'balance', 'co'].includes(v.k)) return null;
    if (v.k === 'co' && typeof v.c !== 'string') return null;
    return { jobId: v.j, kind: v.k, coId: v.k === 'co' ? v.c : undefined };
  } catch { return null; }
}
