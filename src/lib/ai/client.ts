import Anthropic from '@anthropic-ai/sdk';

/**
 * Model used by every agent.
 *
 * The build spec named `claude-sonnet-4-20250514`, which is deprecated and past its retirement
 * date — requests against it 404. `claude-sonnet-5` is its documented replacement in the same
 * tier. Override with ANTHROPIC_MODEL if you need to pin a different one.
 */
export const AGENT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5';

/**
 * Output ceiling per run. Higher than the spec's 8192 because this model thinks adaptively by
 * default and `max_tokens` caps thinking *plus* response text — at 8192 a long report can be
 * truncated mid-sentence. Every call streams, so a large ceiling costs nothing until it is used.
 */
export const MAX_OUTPUT_TOKENS = 16_000;

/**
 * Web search tool. The `_20260209` variant is the current one for this model and adds dynamic
 * filtering of results before they reach the context window. It is fully typed by the SDK, so no
 * cast is needed. Do not also declare `code_execution` — this tool runs it internally.
 */
export const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
} as const;

const globalForAnthropic = globalThis as unknown as { anthropic: Anthropic | undefined };

/**
 * Anthropic client singleton. Cached on `globalThis` so Next.js hot reloads in development reuse
 * one instance instead of leaking a connection pool per edit.
 *
 * `maxRetries: 2` gives the exponential-backoff retry the spec asks for on 429 (rate limit) and
 * 529 (overloaded) — the SDK handles the backoff itself.
 */
export function getAnthropicClient(): Anthropic {
  if (globalForAnthropic.anthropic) return globalForAnthropic.anthropic;

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key before running an agent.',
    );
  }

  const client = new Anthropic({ apiKey, maxRetries: 2 });

  if (process.env.NODE_ENV !== 'production') {
    globalForAnthropic.anthropic = client;
  }

  return client;
}
