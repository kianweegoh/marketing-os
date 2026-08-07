/** Shared types used across the app. Agent-specific types live in `src/lib/agents/types.ts`. */

export type Theme = 'light' | 'dark';

/** Standard error shape returned by every API route. */
export interface ApiError {
  error: string;
}

/** Discriminated result used by client fetch helpers. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };
