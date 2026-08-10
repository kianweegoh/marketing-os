import { google, docs_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

interface CreateGoogleDocParams {
  client: OAuth2Client;
  title: string;
  /** Markdown — `##`/`###` headings and `**bold**` runs are converted to native Docs formatting. */
  content: string;
}

interface CreateGoogleDocResult {
  docId: string;
  docUrl: string;
}

interface HeadingRange {
  start: number;
  end: number;
  level: 2 | 3;
}

interface BoldRange {
  start: number;
  end: number;
}

/**
 * Converts markdown into a Google Docs `insertText` request plus formatting requests, computed
 * over a single pass so the character offsets line up with the final plain text.
 *
 * A plain-text insert alone would satisfy the spec, but heading and bold conversion is what makes
 * an exported doc look like a real report rather than a text dump — worth the extra pass.
 *
 * Exported so the offset math (the part most likely to silently drift and mis-style the wrong
 * span) is directly testable without a live Google API call.
 */
export function buildFormattingRequests(markdown: string): docs_v1.Schema$Request[] {
  const headingRanges: HeadingRange[] = [];
  const boldRanges: BoldRange[] = [];
  let plainText = '';

  for (const rawLine of markdown.split('\n')) {
    let line = rawLine;
    let level: 2 | 3 | null = null;

    if (line.startsWith('### ')) {
      level = 3;
      line = line.slice(4);
    } else if (line.startsWith('## ')) {
      level = 2;
      line = line.slice(3);
    }

    const lineStart = plainText.length;
    let cleanedLine = '';
    let lastIndex = 0;
    const boldPattern = /\*\*(.+?)\*\*/g;
    let match: RegExpExecArray | null;

    while ((match = boldPattern.exec(line)) !== null) {
      cleanedLine += line.slice(lastIndex, match.index);
      const boldStart = lineStart + cleanedLine.length;
      cleanedLine += match[1];
      boldRanges.push({ start: boldStart, end: lineStart + cleanedLine.length });
      lastIndex = match.index + match[0].length;
    }
    cleanedLine += line.slice(lastIndex);

    plainText += `${cleanedLine}\n`;

    if (level !== null && cleanedLine.length > 0) {
      headingRanges.push({ start: lineStart, end: lineStart + cleanedLine.length, level });
    }
  }

  // Google Docs indices are 1-based; index 1 is the very start of an empty document body.
  const requests: docs_v1.Schema$Request[] = [{ insertText: { location: { index: 1 }, text: plainText } }];

  for (const heading of headingRanges) {
    requests.push({
      updateParagraphStyle: {
        range: { startIndex: heading.start + 1, endIndex: heading.end + 1 },
        paragraphStyle: { namedStyleType: heading.level === 2 ? 'HEADING_2' : 'HEADING_3' },
        fields: 'namedStyleType',
      },
    });
  }

  for (const bold of boldRanges) {
    requests.push({
      updateTextStyle: {
        range: { startIndex: bold.start + 1, endIndex: bold.end + 1 },
        textStyle: { bold: true },
        fields: 'bold',
      },
    });
  }

  return requests;
}

/** Creates a Google Doc and writes formatted content into it in one round trip. */
export async function createGoogleDoc({ client, title, content }: CreateGoogleDocParams): Promise<CreateGoogleDocResult> {
  const docsApi = google.docs({ version: 'v1', auth: client });

  const created = await docsApi.documents.create({ requestBody: { title } });
  const docId = created.data.documentId;

  if (!docId) {
    throw new Error('Google Docs did not return a document id.');
  }

  const requests = buildFormattingRequests(content);
  if (requests.length > 0) {
    await docsApi.documents.batchUpdate({ documentId: docId, requestBody: { requests } });
  }

  return { docId, docUrl: `https://docs.google.com/document/d/${docId}/edit` };
}
