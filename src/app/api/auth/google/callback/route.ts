import { NextResponse } from 'next/server';
import { GOOGLE_TOKENS_MAX_AGE, getOAuthClient, googleCookieOptions, serializeTokensForCookie } from '@/lib/integrations/googleAuth';
import { errorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/google/callback — the OAuth redirect target. Exchanges the authorization code for
 * tokens, stores them, and sends the user back to Settings with a flag the page reads to show a
 * toast — errors surface the same way rather than as a bare API error page.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    return NextResponse.redirect(`${origin}/settings?google_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/settings?google_error=missing_code`);
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    const response = NextResponse.redirect(`${origin}/settings?google_connected=1`);
    response.cookies.set({
      ...googleCookieOptions(GOOGLE_TOKENS_MAX_AGE),
      value: serializeTokensForCookie(tokens),
    });
    return response;
  } catch (error) {
    console.error('[api/auth/google/callback] Token exchange failed:', error);
    return NextResponse.redirect(`${origin}/settings?google_error=${encodeURIComponent(errorMessage(error))}`);
  }
}
