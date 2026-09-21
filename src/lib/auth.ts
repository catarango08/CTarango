/**
 * A single shared passcode, because this is a one-person app that will sit on
 * the open internet with a customer list behind it.
 *
 * The cookie carries an expiry signed with HMAC-SHA256 over APP_PASSCODE, so a
 * cookie cannot be forged without the passcode and changing the passcode
 * invalidates every existing session. Web Crypto only, so the same code runs in
 * middleware (edge) and in a route handler (node).
 */

const COOKIE = 'tarango_session';
/** Long-lived on purpose: re-typing a passcode in a truck is how apps get abandoned. */
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = COOKIE;

export function passcode(): string | null {
  const value = process.env.APP_PASSCODE?.trim();
  return value ? value : null;
}

/** With no passcode set the app is open — correct for `npm run dev`, not for deployment. */
export function authRequired(): boolean {
  return passcode() !== null;
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function issueToken(secret: string, now = Date.now()): Promise<string> {
  const expiry = String(now + TTL_MS);
  const signature = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(expiry));
  return `${expiry}.${toBase64Url(signature)}`;
}

export async function verifyToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;

  const expected = await crypto.subtle.sign('HMAC', await key(secret), new TextEncoder().encode(expiry));
  if (!timingSafeEqual(signature, toBase64Url(expected))) return false;

  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

/** Comparison that does not leak how much of the value matched. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const SESSION_MAX_AGE_SECONDS = TTL_MS / 1000;
