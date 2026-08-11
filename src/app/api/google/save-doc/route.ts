import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { GOOGLE_TOKENS_MAX_AGE, googleCookieOptions, loadGoogleClient } from '@/lib/integrations/googleAuth';
import { createGoogleDoc } from '@/lib/integrations/googleDocs';
import { errorMessage, errorStatus, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface SaveDocBody {
  title?: unknown;
  content?: unknown;
  agentName?: unknown;
}

/**
 * POST /api/google/save-doc — exports agent output to a new Google Doc.
 *
 * Document title format: `{Agent Name} — {truncated goal} — {DD MMM YYYY}`. The request's `title`
 * field carries the run's goal (the source text for the middle segment); the server assembles the
 * full title.
 */
export async function POST(request: Request): Promise<NextResponse<{ success: true; docUrl: string; docId: string } | { error: string }>> {
  try {
    const body = (await request.json()) as SaveDocBody;

    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'There is no content to save yet.' }, { status: 400 });
    }

    const agentName = typeof body.agentName === 'string' && body.agentName.trim() ? body.agentName : 'Marketing OS';
    const goalText = typeof body.title === 'string' && body.title.trim() ? body.title : 'Untitled run';
    const docTitle = `${agentName} — ${truncate(goalText, 60)} — ${format(new Date(), 'd MMM yyyy')}`;

    const { client, refreshedCookieValue } = await loadGoogleClient();
    const { docId, docUrl } = await createGoogleDoc({ client, title: docTitle, content: body.content });

    const response = NextResponse.json({ success: true as const, docUrl, docId });
    if (refreshedCookieValue) {
      response.cookies.set({ ...googleCookieOptions(GOOGLE_TOKENS_MAX_AGE), value: refreshedCookieValue });
    }
    return response;
  } catch (error) {
    console.error('[api/google/save-doc] Failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: errorStatus(error) });
  }
}
