import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authRequired, passcode, verifyToken } from '@/lib/auth';

/**
 * Everything is behind the passcode except the login screen itself and the
 * files iOS needs before a session exists (icons, manifest) so the home-screen
 * install still shows the right mark on the lock screen.
 */
export async function middleware(request: NextRequest) {
  if (!authRequired()) return NextResponse.next();

  const secret = passcode();
  if (!secret) return NextResponse.next();

  const ok = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (ok) return NextResponse.next();

  // An API call gets a 401 rather than a redirect into an HTML page.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  if (request.nextUrl.pathname !== '/') login.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    /*
     * Everything except: the login screen and its endpoint, Next's own static
     * output, and the icon/manifest files the installed app needs.
     */
    '/((?!login|api/login|_next/static|_next/image|favicon.ico|icon-|manifest.webmanifest|brand/).*)',
  ],
};
