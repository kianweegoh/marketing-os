import { NextResponse } from 'next/server';
import { isAgentId } from '@/lib/agents/registry';
import { runAgent } from '@/lib/ai/runAgent';
import { errorMessage } from '@/lib/utils';

// Streaming responses must never be statically optimised or cached.
export const dynamic = 'force-dynamic';

/**
 * Marker the client renders as an inline search pill and strips before saving/copying.
 * Not exported — a route module may only export handler names and route config.
 */
function searchMarker(query: string): string {
  return `\n\n<!--SEARCH:${query.replace(/-->/g, '--&gt;')}-->\n\n`;
}

/**
 * POST /api/agents/[agentId]/run — runs an agent and streams its output as plain text.
 *
 * Search markers are injected into the stream for the client to style, but never accumulated
 * into the text `runAgent` saves to the database.
 */
export async function POST(request: Request, { params }: { params: { agentId: string } }) {
  const { agentId } = params;

  if (!isAgentId(agentId)) {
    return NextResponse.json({ error: `Unknown agent: "${agentId}"` }, { status: 404 });
  }

  let goal: string;

  try {
    const body = (await request.json()) as { goal?: unknown };

    if (typeof body.goal !== 'string' || body.goal.trim().length === 0) {
      return NextResponse.json({ error: 'An objective is required.' }, { status: 400 });
    }

    goal = body.goal.trim();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string): void => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          // Client disconnected mid-run; the run still completes and is persisted server-side.
        }
      };

      try {
        await runAgent({
          agentId,
          goal,
          onTextChunk: send,
          onSearchStart: (query) => send(searchMarker(query)),
        });
      } catch (error) {
        console.error(`[api/agents/${agentId}/run] Failed:`, error);
        // The stream is already open, so the error is delivered as a trailing marker the client
        // parses out rather than as an HTTP status.
        send(`\n\n<!--ERROR:${errorMessage(error)}-->`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** Explicit 405 so a stray GET returns the standard typed error shape rather than a Next default. */
export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: 'Use POST to run an agent.' }, { status: 405 });
}
