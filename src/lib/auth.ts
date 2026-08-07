/**
 * Single shared-password auth.
 *
 * The session cookie holds a SHA-256 digest derived from `AUTH_PASSWORD`, not the password itself
 * and not a bare "logged in" flag — so a hand-crafted cookie cannot grant access, and rotating
 * `AUTH_PASSWORD` invalidates every existing session.
 *
 * This module is imported by `src/middleware.ts` and therefore must stay Edge-compatible:
 * Web Crypto only, no Node built-ins, no Prisma.
 */

export const SESSION_COOKIE = 'kalo_session';

/** 7 days, in seconds. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const TOKEN_SALT = 'kalo-marketing-os::session::v1';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compares two strings in time independent of how many leading characters match, so response
 * timing cannot be used to recover the expected value character by character.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // Length itself is not secret here, but keep the comparison loop running either way.
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;

  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }

  return diff === 0;
}

/** Derives the session token for the configured password. */
export async function createSessionToken(): Promise<string> {
  const password = process.env.AUTH_PASSWORD;

  if (!password) {
    throw new Error('AUTH_PASSWORD is not set — authentication cannot work.');
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${TOKEN_SALT}::${password}`),
  );

  return toHex(digest);
}

/** True when the supplied cookie value is a valid session for the current `AUTH_PASSWORD`. */
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  try {
    return timingSafeEqual(token, await createSessionToken());
  } catch {
    // AUTH_PASSWORD missing — fail closed rather than letting everyone through.
    return false;
  }
}

/** True when the submitted password matches `AUTH_PASSWORD`. */
export function verifyPassword(submitted: unknown): boolean {
  const expected = process.env.AUTH_PASSWORD;

  if (!expected || typeof submitted !== 'string' || submitted.length === 0) {
    return false;
  }

  return timingSafeEqual(submitted, expected);
}
