import { NextResponse } from 'next/server';
import { getGoogleAuthUrl, googleCookieOptions } from '@/lib/integrations/googleAuth';
import { errorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/auth/google — redirects to the Google consent screen. */
export function GET(): NextResponse {
  try {
    return NextResponse.redirect(getGoogleAuthUrl());
  } catch (error) {
    console.error('[api/auth/google] Failed to build auth URL:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

/** DELETE /api/auth/google — disconnects Google by clearing the token cookie. */
export function DELETE(): NextResponse<{ success: true }> {
  const response = NextResponse.json({ success: true as const });
  response.cookies.set({ ...googleCookieOptions(0), value: '' });
  return response;
}
