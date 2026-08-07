/** Shared helpers, typed error classes, and the environment startup check. */

/* -------------------------------------------------------------------------- */
/* Typed errors                                                                */
/* -------------------------------------------------------------------------- */

/** Thrown when a request references an agent id that is not in the registry. */
export class AgentNotFoundError extends Error {
  readonly status = 404;

  constructor(agentId: string) {
    super(`Unknown agent: "${agentId}"`);
    this.name = 'AgentNotFoundError';
  }
}

/** Thrown when an optional integration is used before it has been configured or connected. */
export class IntegrationNotConnectedError extends Error {
  readonly status = 409;

  constructor(integration: string) {
    super(`${integration} is not connected. Connect it in Settings and try again.`);
    this.name = 'IntegrationNotConnectedError';
  }
}

/** Thrown when the Anthropic API fails after retries. */
export class AIProviderError extends Error {
  readonly status = 502;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/** Narrows an unknown caught value to a human-readable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
}

/** Maps a caught value to the HTTP status its error class declares, defaulting to 500. */
export function errorStatus(error: unknown): number {
  if (
    error instanceof AgentNotFoundError ||
    error instanceof IntegrationNotConnectedError ||
    error instanceof AIProviderError
  ) {
    return error.status;
  }
  return 500;
}

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

const REQUIRED_ENV = ['ANTHROPIC_API_KEY', 'AUTH_PASSWORD'] as const;

const OPTIONAL_ENV: ReadonlyArray<{ keys: string[]; feature: string }> = [
  { keys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'], feature: 'Telegram notifications' },
  {
    keys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'],
    feature: 'Google Docs and Calendar export',
  },
];

/**
 * Startup check. Throws if a required variable is missing — the app genuinely cannot work without
 * them — and logs a clear warning for each optional integration that is not configured, so the
 * degraded behaviour is never a surprise.
 */
export function checkEnvironment(): void {
  const missingRequired = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required environment variable${missingRequired.length > 1 ? 's' : ''}: ` +
        `${missingRequired.join(', ')}. Copy .env.example to .env and fill them in.`,
    );
  }

  for (const { keys, feature } of OPTIONAL_ENV) {
    const missing = keys.filter((key) => !process.env[key]?.trim());
    if (missing.length > 0) {
      console.warn(
        `[env] ${feature} is disabled — missing ${missing.join(', ')}. ` +
          'The rest of the app works normally.',
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Misc                                                                        */
/* -------------------------------------------------------------------------- */

/** Joins conditional class names. Keeps JSX readable without pulling in a dependency. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Truncates to `max` characters on a word boundary, appending an ellipsis when it cuts. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}
