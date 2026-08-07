import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth';

const LOGIN_PATH = '/login';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const isAuthenticated = await verifySessionToken(token);
  const isLoginPage = request.nextUrl.pathname === LOGIN_PATH;

  if (isLoginPage) {
    // Already signed in — no reason to show the login form again.
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // `api/auth` MUST stay excluded: if the middleware intercepts the login POST it redirects the
  // request before the cookie is ever set, producing an endless bounce between / and /login.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)'],
};
