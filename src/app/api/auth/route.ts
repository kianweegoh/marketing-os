import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken, verifyPassword } from '@/lib/auth';
import { errorMessage } from '@/lib/utils';

interface LoginBody {
  password?: unknown;
}

interface LoginSuccess {
  success: true;
}

/** POST /api/auth — exchange the shared password for a session cookie. */
export async function POST(request: Request): Promise<NextResponse<LoginSuccess | { error: string }>> {
  try {
    if (!process.env.AUTH_PASSWORD?.trim()) {
      return NextResponse.json(
        { error: 'AUTH_PASSWORD is not configured on the server.' },
        { status: 500 },
      );
    }

    let body: LoginBody;
    try {
      body = (await request.json()) as LoginBody;
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    if (typeof body.password !== 'string' || body.password.length === 0) {
      return NextResponse.json({ error: 'Enter your password.' }, { status: 400 });
    }

    if (!verifyPassword(body.password)) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const response = NextResponse.json<LoginSuccess>({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: await createSessionToken(),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('[api/auth] Login failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

/** DELETE /api/auth — clear the session cookie. */
export async function DELETE(): Promise<NextResponse<LoginSuccess | { error: string }>> {
  try {
    const response = NextResponse.json<LoginSuccess>({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('[api/auth] Logout failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
