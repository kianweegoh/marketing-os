import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAgentId } from '@/lib/agents/registry';
import { errorMessage } from '@/lib/utils';
import type { AgentMemoryEntry } from '@/types';

export const dynamic = 'force-dynamic';

/** GET /api/agents/[agentId]/memories — every memory for this agent, newest first. */
export async function GET(
  _request: Request,
  { params }: { params: { agentId: string } },
): Promise<NextResponse<{ memories: AgentMemoryEntry[] } | { error: string }>> {
  const { agentId } = params;

  if (!isAgentId(agentId)) {
    return NextResponse.json({ error: `Unknown agent: "${agentId}"` }, { status: 404 });
  }

  try {
    const memories = await prisma.agentMemory.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true },
    });

    return NextResponse.json({
      memories: memories.map((memory) => ({
        ...memory,
        createdAt: memory.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(`[api/agents/${agentId}/memories] Failed:`, error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

/** DELETE /api/agents/[agentId]/memories — clears this agent's memory. Agent-scoped only. */
export async function DELETE(
  _request: Request,
  { params }: { params: { agentId: string } },
): Promise<NextResponse<{ deleted: number } | { error: string }>> {
  const { agentId } = params;

  if (!isAgentId(agentId)) {
    return NextResponse.json({ error: `Unknown agent: "${agentId}"` }, { status: 404 });
  }

  try {
    const { count } = await prisma.agentMemory.deleteMany({ where: { agentId } });
    console.info(`[memory] Cleared ${count} memories for "${agentId}".`);
    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error(`[api/agents/${agentId}/memories] Delete failed:`, error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
