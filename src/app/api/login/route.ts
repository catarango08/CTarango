import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, issueToken, passcode, timingSafeEqual } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = passcode();
  if (!secret) return NextResponse.json({ error: 'No passcode is configured' }, { status: 400 });

  let body: { passcode?: string };
  try {
    body = (await request.json()) as { passcode?: string };
  } catch {
    return NextResponse.json({ error: 'Expected JSON' }, { status: 400 });
  }

  const supplied = String(body.passcode ?? '');
  if (!timingSafeEqual(supplied.padEnd(secret.length, '\0').slice(0, secret.length), secret) || supplied.length !== secret.length) {
    // A deliberate pause: this is the only guard in front of a customer list.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'That is not the passcode' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await issueToken(secret), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
