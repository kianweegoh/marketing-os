import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAgentId } from '@/lib/agents/registry';
import { errorMessage } from '@/lib/utils';
import type { AgentRunSummary } from '@/types';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 30;

/** GET /api/agents/[agentId]/history — past runs for this agent, newest first. */
export async function GET(
  _request: Request,
  { params }: { params: { agentId: string } },
): Promise<NextResponse<{ runs: AgentRunSummary[] } | { error: string }>> {
  const { agentId } = params;

  if (!isAgentId(agentId)) {
    return NextResponse.json({ error: `Unknown agent: "${agentId}"` }, { status: 404 });
  }

  try {
    const runs = await prisma.agentRun.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
      select: {
        id: true,
        agentId: true,
        goal: true,
        output: true,
        memoriesUsed: true,
        searchesUsed: true,
        durationMs: true,
        orchestratorId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      runs: runs.map((run) => ({ ...run, createdAt: run.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error(`[api/agents/${agentId}/history] Failed:`, error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
