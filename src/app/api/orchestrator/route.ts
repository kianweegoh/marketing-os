import { NextResponse } from 'next/server';
import { isAgentId } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { runOrchestrator, type OrchestratorEvent } from '@/lib/ai/runOrchestrator';
import { errorMessage } from '@/lib/utils';

// Streaming responses must never be statically optimised or cached.
export const dynamic = 'force-dynamic';

interface OrchestratorRequestBody {
  goal?: unknown;
  agentIds?: unknown;
}

/**
 * POST /api/orchestrator — runs the selected agents sequentially and streams progress as
 * newline-delimited JSON, one `OrchestratorEvent` per line. The client reads the body, splits on
 * "\n", and `JSON.parse`s each complete line as it arrives.
 */
export async function POST(request: Request) {
  let goal: string;
  let agentIds: AgentId[];

  try {
    const body = (await request.json()) as OrchestratorRequestBody;

    if (typeof body.goal !== 'string' || body.goal.trim().length === 0) {
      return NextResponse.json({ error: 'A goal is required.' }, { status: 400 });
    }

    if (!Array.isArray(body.agentIds) || body.agentIds.length === 0) {
      return NextResponse.json({ error: 'Select at least one agent.' }, { status: 400 });
    }

    const invalid = body.agentIds.filter((id): boolean => typeof id !== 'string' || !isAgentId(id));
    if (invalid.length > 0) {
      return NextResponse.json({ error: `Unknown agent id(s): ${invalid.join(', ')}` }, { status: 400 });
    }

    goal = body.goal.trim();
    agentIds = body.agentIds as AgentId[];
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: OrchestratorEvent): void => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client disconnected mid-run; the run still completes and is persisted server-side.
        }
      };

      try {
        await runOrchestrator({ goal, agentIds, onEvent: emit });
      } catch (error) {
        console.error('[api/orchestrator] Failed:', error);
        emit({ type: 'run_error', error: errorMessage(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

export function GET(): NextResponse<{ error: string }> {
  return NextResponse.json({ error: 'Use POST to run the orchestrator.' }, { status: 405 });
}
