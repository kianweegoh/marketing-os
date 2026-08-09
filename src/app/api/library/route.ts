import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAgentId } from '@/lib/agents/registry';
import { errorMessage } from '@/lib/utils';
import type { AgentRunSummary } from '@/types';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/**
 * GET /api/library — every run across every agent, filterable and paginated.
 *
 * Query params: `agentIds` (comma-separated), `search` (matches goal or output), `dateFrom` /
 * `dateTo` (YYYY-MM-DD), `page` (1-indexed, default 1).
 *
 * The search filter relies on SQLite's default case-insensitive ASCII `LIKE` — Prisma's
 * `mode: 'insensitive'` option only exists for Postgres/MongoDB and would throw a validation
 * error here. Revisit this when the app migrates to Postgres, where `LIKE` is case-sensitive.
 */
export async function GET(
  request: Request,
): Promise<NextResponse<{ runs: AgentRunSummary[]; total: number; hasMore: boolean } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);

    const agentIdsParam = searchParams.get('agentIds');
    const agentIds = agentIdsParam
      ? agentIdsParam.split(',').filter((id) => isAgentId(id))
      : [];

    const search = searchParams.get('search')?.trim() ?? '';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, Number(searchParams.get('page')) || 1);

    const where: Prisma.AgentRunWhereInput = {};

    if (agentIds.length > 0) {
      where.agentId = { in: agentIds };
    }

    if (search) {
      where.OR = [{ goal: { contains: search } }, { output: { contains: search } }];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (!Number.isNaN(from.getTime())) where.createdAt.gte = from;
      }
      if (dateTo) {
        // Include the entire end day rather than stopping at 00:00:00.
        const to = new Date(dateTo);
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }
    }

    const [rows, total] = await Promise.all([
      prisma.agentRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.agentRun.count({ where }),
    ]);

    const runs: AgentRunSummary[] = rows.map((run) => ({
      id: run.id,
      agentId: run.agentId,
      goal: run.goal,
      output: run.output,
      memoriesUsed: run.memoriesUsed,
      searchesUsed: run.searchesUsed,
      durationMs: run.durationMs,
      orchestratorId: run.orchestratorId,
      createdAt: run.createdAt.toISOString(),
    }));

    return NextResponse.json({ runs, total, hasMore: page * PAGE_SIZE < total });
  } catch (error) {
    console.error('[api/library] Failed:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
