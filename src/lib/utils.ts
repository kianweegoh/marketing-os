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

/* -------------------------------------------------------------------------- */
/* Stream markers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The run stream interleaves the model's text with two HTML-comment markers:
 * `<!--SEARCH:query-->` for an inline search pill, and `<!--ERROR:message-->` for a failure that
 * happened after the response headers were already sent. Neither is ever saved to the database.
 */
const SEARCH_MARKER = /<!--SEARCH:([\s\S]*?)-->/g;
const ERROR_MARKER = /<!--ERROR:([\s\S]*?)-->/g;

export type OutputSegment =
  | { kind: 'text'; content: string }
  | { kind: 'search'; query: string };

/** Splits streamed output into renderable segments so search pills appear inline, in order. */
export function parseOutputSegments(raw: string): OutputSegment[] {
  const segments: OutputSegment[] = [];
  const withoutErrors = raw.replace(ERROR_MARKER, '');
  let lastIndex = 0;

  // `matchAll` needs a fresh lastIndex each call because the regex is global and module-scoped.
  SEARCH_MARKER.lastIndex = 0;

  for (const match of withoutErrors.matchAll(SEARCH_MARKER)) {
    const index = match.index ?? 0;
    const before = withoutErrors.slice(lastIndex, index);
    if (before.trim()) segments.push({ kind: 'text', content: before });
    segments.push({ kind: 'search', query: match[1] ?? '' });
    lastIndex = index + match[0].length;
  }

  const tail = withoutErrors.slice(lastIndex);
  if (tail.trim()) segments.push({ kind: 'text', content: tail });

  return segments;
}

/** Strips every marker — used for copy, export, and anything persisted. */
export function stripMarkers(raw: string): string {
  return raw.replace(SEARCH_MARKER, '').replace(ERROR_MARKER, '').trim();
}

/** Returns the error carried by a trailing error marker, if the stream ended in failure. */
export function extractStreamError(raw: string): string | null {
  const matches = [...raw.matchAll(ERROR_MARKER)];
  const last = matches.at(-1);
  return last?.[1]?.trim() || null;
}

/** Truncates to `max` characters on a word boundary, appending an ellipsis when it cuts. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

/* -------------------------------------------------------------------------- */
/* Content calendar parsing                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The next Monday from today — the default start date the "Push to Calendar" modal offers, and
 * the anchor relative dates ("Day 1", "Week 2 Wed") resolve against.
 */
export function getNextMonday(from: Date = new Date()): Date {
  const day = from.getDay(); // 0 = Sunday
  const daysUntilMonday = (8 - day) % 7 || 7; // always strictly in the future, even if `from` is a Monday
  const result = new Date(from);
  result.setDate(result.getDate() + daysUntilMonday);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Formats a `Date`'s own local year/month/day as `YYYY-MM-DD`.
 *
 * Deliberately does not go through `.toISOString()`, which converts to UTC first — for a Date
 * built from local components (`new Date(y, m, d)`, `setDate(...)`), that conversion silently
 * shifts the date back a day in any UTC+ timezone (e.g. midnight local in UTC+8 is 16:00 the
 * *previous* day in UTC). Every date in this module is local by construction, so this is the only
 * correct way to read one back out as a string.
 */
export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const WEEKDAY_ABBREVIATIONS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const ABSOLUTE_DATE_PATTERNS: Array<{ regex: RegExp; build: (match: RegExpMatchArray) => Date | null }> = [
  {
    // 2026-04-15
    regex: /^(\d{4})-(\d{2})-(\d{2})$/,
    build: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  },
  {
    // 15 Apr or 15 Apr 2026
    regex: /^(\d{1,2})\s+([a-zA-Z]{3,})\s*(\d{4})?$/,
    build: (m) => buildFromDayMonth(Number(m[1]), m[2], m[3] ? Number(m[3]) : undefined),
  },
  {
    // Apr 15 or Apr 15, 2026
    regex: /^([a-zA-Z]{3,})\s+(\d{1,2}),?\s*(\d{4})?$/,
    build: (m) => buildFromDayMonth(Number(m[2]), m[1], m[3] ? Number(m[3]) : undefined),
  },
];

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function buildFromDayMonth(day: number, monthText: string, year: number | undefined): Date | null {
  const monthIndex = MONTH_NAMES.findIndex((name) => name.startsWith(monthText.toLowerCase()));
  if (monthIndex === -1 || Number.isNaN(day)) return null;
  const now = new Date();
  return new Date(year ?? now.getFullYear(), monthIndex, day);
}

/** Resolves a single date cell — absolute ("2026-04-15", "15 Apr") or relative to `startDate`
 *  ("Day 1", "Week 2 Wed") — to an ISO date string. Returns null rather than throwing on anything
 *  it doesn't recognise. */
function resolveDateCell(raw: string, startDate: Date): string | null {
  const cleaned = raw.trim().replace(/\*\*/g, '');
  if (!cleaned) return null;

  for (const { regex, build } of ABSOLUTE_DATE_PATTERNS) {
    const match = regex.exec(cleaned);
    if (match) {
      const date = build(match);
      if (date && !Number.isNaN(date.getTime())) return toIsoDate(date);
    }
  }

  const dayMatch = /^day\s*(\d+)$/i.exec(cleaned);
  if (dayMatch) {
    return toIsoDate(addDays(startDate, Number(dayMatch[1]) - 1));
  }

  const weekMatch = /^week\s*(\d+)[\s,-]+([a-zA-Z]{3,})$/i.exec(cleaned);
  if (weekMatch) {
    const weekNumber = Number(weekMatch[1]);
    const weekdayIndex = WEEKDAY_ABBREVIATIONS.indexOf(weekMatch[2].slice(0, 3).toLowerCase());
    if (weekdayIndex === -1) return null;
    const startWeekday = startDate.getDay();
    const offsetToWeekday = (weekdayIndex - startWeekday + 7) % 7;
    return toIsoDate(addDays(startDate, (weekNumber - 1) * 7 + offsetToWeekday));
  }

  return null;
}

/** True for a markdown table separator row like `|---|---|---|` or `|:--|:-:|--:|`. */
function isTableSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((cell) => /^:?-{1,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((cell) => cell.trim());
}

/** Returns the raw lines of the first markdown table found in `text`, or null if there isn't one. */
function extractFirstTable(text: string): string[] | null {
  const lines = text.split('\n');
  const tableLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      tableLines.push(trimmed);
    } else if (tableLines.length > 0) {
      break; // a non-table line after the table started ends it
    }
  }

  return tableLines.length >= 2 ? tableLines : null;
}

/**
 * Parses the first markdown table under a "Content Calendar" heading into `CalendarEvent`s.
 * Never throws — a heading it can't find, a table it can't parse, or a row with an unrecognised
 * date all just contribute nothing, so a malformed table degrades to an empty list rather than
 * breaking the "Push to Calendar" flow.
 */
export function parseContentCalendar(
  markdown: string,
  startDate: Date = getNextMonday(),
): Array<{ date: string; platform: string; format: string; hook: string; caption?: string }> {
  try {
    const headingMatch = /^#{1,6}\s*Content Calendar\s*$/im.exec(markdown);
    if (!headingMatch) return [];

    const table = extractFirstTable(markdown.slice(headingMatch.index + headingMatch[0].length));
    if (!table || table.length < 2) return [];

    const header = splitTableRow(table[0]).map((cell) => cell.toLowerCase());
    const dateIndex = header.findIndex((cell) => cell.includes('date'));
    const platformIndex = header.findIndex((cell) => cell.includes('platform'));
    const formatIndex = header.findIndex((cell) => cell.includes('format'));
    const hookIndex = header.findIndex((cell) => cell.includes('hook') || cell.includes('headline'));
    const captionIndex = header.findIndex((cell) => cell.includes('caption'));

    if (dateIndex === -1) return [];

    const events: Array<{ date: string; platform: string; format: string; hook: string; caption?: string }> = [];

    for (const line of table.slice(1)) {
      const cells = splitTableRow(line);
      if (isTableSeparatorRow(cells)) continue;

      const rawDate = cells[dateIndex];
      if (!rawDate) continue;

      const date = resolveDateCell(rawDate, startDate);
      if (!date) continue;

      events.push({
        date,
        platform: (platformIndex !== -1 ? cells[platformIndex] : undefined) || 'All Platforms',
        format: (formatIndex !== -1 ? cells[formatIndex] : undefined) || '',
        hook: (hookIndex !== -1 ? cells[hookIndex] : undefined) || '',
        caption: captionIndex !== -1 ? cells[captionIndex] : undefined,
      });
    }

    return events;
  } catch (error) {
    console.error('[parseContentCalendar] Failed to parse — returning an empty list:', error);
    return [];
  }
}
