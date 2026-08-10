import { truncate } from '@/lib/utils';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/** Telegram's hard cap on message length. */
const MAX_MESSAGE_LENGTH = 4096;
/** Where truncation starts looking for a sentence boundary, well under the hard cap. */
const TRUNCATE_AT = 2800;

/**
 * Sends a Telegram message. Never throws — an unconfigured or failing Telegram integration must
 * never break the agent run it's reporting on. Returns whether the send actually happened.
 */
export async function sendTelegramMessage(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification.');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: truncateForTelegram(message),
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[telegram] Send failed (${response.status}): ${body}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[telegram] Send failed:', error);
    return false;
  }
}

/**
 * Telegram caps messages at 4096 characters. Rather than hard-cut mid-sentence, take the first
 * 2,800 characters, cut back to the last complete sentence, and note that the full report lives
 * in the platform. Exported so the 4096-char guarantee is directly testable without a network call.
 */
export function truncateForTelegram(message: string): string {
  if (message.length <= MAX_MESSAGE_LENGTH) return message;

  const slice = message.slice(0, TRUNCATE_AT);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );
  const cut = lastSentenceEnd > TRUNCATE_AT * 0.5 ? slice.slice(0, lastSentenceEnd + 1) : slice;

  return `${cut.trimEnd()}\n\n_…truncated — full report available in Marketing OS._`;
}

/** Escapes legacy Telegram Markdown's special characters in user- or model-supplied text. */
function escapeMarkdown(text: string): string {
  return text.replace(/([_*`[])/g, '\\$1');
}

/** Extracts the body of a markdown section by its heading text, up to the next heading. */
function extractSection(markdown: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^#{1,6}\\s*${escapedHeading}\\s*$([\\s\\S]*?)(?=^#{1,6}\\s|$(?![\\s\\S]))`, 'im');
  const match = regex.exec(markdown);
  const body = match?.[1]?.trim();
  return body ? body : null;
}

/** Returns the first `n` list items (numbered or bulleted) from a section, or the section as-is. */
function firstListItems(text: string, n: number): string {
  const items = text
    .split('\n')
    .filter((line) => /^\s*(\d+[.)]|[-*])\s+/.test(line))
    .slice(0, n);
  return items.length > 0 ? items.join('\n') : truncate(text, 300);
}

/**
 * Builds the structured Telegram summary for a Performance Analyst run, per Section 12.1 — parsed
 * out of the report's own headings rather than dumping the raw markdown, which was unreadable on
 * a phone in the previous build.
 */
export function buildPerformanceAnalystTelegramMessage(goal: string, output: string): string {
  const headline = extractSection(output, 'Headline Diagnosis') ?? truncate(output.replace(/^#+.*$/gm, '').trim(), 300);
  const priorityActionsSection = extractSection(output, 'Priority Actions');
  const priorityActions = priorityActionsSection ? firstListItems(priorityActionsSection, 3) : '_Not found in the report — see full report._';

  return `🤖 *Kalo AI Marketing OS — Performance Analyst*

*Task*
${escapeMarkdown(truncate(goal, 200))}

*Headline Diagnosis*
${escapeMarkdown(headline)}

*Priority Actions*
${escapeMarkdown(priorityActions)}

_Full report available in Marketing OS_`;
}
