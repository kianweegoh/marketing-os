import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { cookies } from 'next/headers';
import { IntegrationNotConnectedError } from '@/lib/utils';

export const GOOGLE_TOKENS_COOKIE = 'google_tokens';
/** 30 days, in seconds. */
export const GOOGLE_TOKENS_MAX_AGE = 60 * 60 * 24 * 30;

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
];

/** Whether the three Google env vars needed to even start the OAuth flow are present. */
export function isGoogleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REDIRECT_URI?.trim(),
  );
}

/** Builds a fresh OAuth2 client from env vars. Throws if Google isn't configured at all. */
export function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Google is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable it.',
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** The URL to send the user to for the Google consent screen. */
export function getGoogleAuthUrl(): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    // Forces Google to return a refresh_token even if the user has consented before — without
    // this, a re-connect after a token was revoked silently comes back with no refresh_token.
    prompt: 'consent',
    scope: SCOPES,
  });
}

function serializeTokens(tokens: Credentials): string {
  return Buffer.from(JSON.stringify(tokens)).toString('base64');
}

function deserializeTokens(value: string | undefined): Credentials | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf-8')) as Credentials;
  } catch {
    return null;
  }
}

/** Cookie options shared by every place that sets or clears `google_tokens`. */
export function googleCookieOptions(maxAge: number) {
  return {
    name: GOOGLE_TOKENS_COOKIE,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function serializeTokensForCookie(tokens: Credentials): string {
  return serializeTokens(tokens);
}

interface LoadedGoogleClient {
  client: OAuth2Client;
  /** Set only when the access token was refreshed and the cookie needs updating on the response. */
  refreshedCookieValue: string | null;
}

/**
 * Reads `google_tokens` from the incoming request, refreshing the access token first if it has
 * expired (or is about to, within a minute) and a refresh token is available. Throws
 * `IntegrationNotConnectedError` if there's no stored connection at all — callers let that surface
 * as a 409 with a message pointing the user at Settings.
 */
export async function loadGoogleClient(): Promise<LoadedGoogleClient> {
  const store = cookies();
  const stored = deserializeTokens(store.get(GOOGLE_TOKENS_COOKIE)?.value);

  if (!stored) {
    throw new IntegrationNotConnectedError('Google');
  }

  const client = getOAuthClient();
  client.setCredentials(stored);

  const isExpiringSoon = stored.expiry_date ? stored.expiry_date < Date.now() + 60_000 : false;

  if (isExpiringSoon && stored.refresh_token) {
    const { credentials } = await client.refreshAccessToken();
    client.setCredentials(credentials);
    return { client, refreshedCookieValue: serializeTokens(credentials) };
  }

  return { client, refreshedCookieValue: null };
}
