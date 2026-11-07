import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PayKind } from './ledger';

/**
 * Customer pay links: /pay/<token>. The token names a job and what to pay.
 * It carries no amount. It expires, and the payment database can revoke it.
 * v1 tokens (no expiry) are rejected.
 */
export interface PayTarget { jobId: string; kind: PayKind; coId?: string }
export interface PayClaims extends PayTarget { id: string; exp: number }

/** Seven days. Checkout itself expires after one hour. */
export const PAY_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

const b64 = (b: Buffer) => b.toString('base64url');

export function signPayToken(t: PayClaims, secret: string): string {
  const body = b64(Buffer.from(JSON.stringify({ v: 2, j: t.jobId, k: t.kind, c: t.coId ?? null, id: t.id, exp: t.exp })));
  return `${body}.${b64(createHmac('sha256', secret).update(body).digest())}`;
}

/** Signature and expiry only. Revocation is checked against the payment database. */
export function verifyPayToken(token: string, secret: string, now = Date.now()): PayClaims | null {
  const [body, sig, extra] = String(token ?? '').split('.');
  if (!body || !sig || extra !== undefined) return null;
  const want = createHmac('sha256', secret).update(body).digest();
  let got: Buffer;
  try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const v = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (v.v !== 2 || typeof v.j !== 'string' || !['deposit', 'balance', 'co'].includes(v.k)) return null;
    if (v.k === 'co' && typeof v.c !== 'string') return null;
    if (typeof v.id !== 'string' || !v.id) return null;
    if (typeof v.exp !== 'number' || !Number.isFinite(v.exp) || v.exp * 1000 <= now) return null;
    return { jobId: v.j, kind: v.k, coId: v.k === 'co' ? v.c : undefined, id: v.id, exp: v.exp };
  } catch { return null; }
}
