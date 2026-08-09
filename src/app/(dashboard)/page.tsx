import { prisma } from '@/lib/db';
import { OrchestratorWorkspace } from '@/components/orchestrator/OrchestratorWorkspace';
import type { AgentRunSummary, OrchestratorRunRecord } from '@/types';

// The company context and run history are edited/created at runtime, so this page must never be
// baked into a static prerender at build time.
export const dynamic = 'force-dynamic';

async function loadLatestRun(): Promise<{
  run: OrchestratorRunRecord | null;
  agentRuns: AgentRunSummary[];
}> {
  const latest = await prisma.orchestratorRun.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (!latest) return { run: null, agentRuns: [] };

  const agentRuns = await prisma.agentRun.findMany({
    where: { orchestratorId: latest.id },
    orderBy: { createdAt: 'asc' },
  });

  return {
    run: {
      id: latest.id,
      goal: latest.goal,
      summary: latest.summary,
      agentIds: latest.agentIds,
      status: latest.status,
      createdAt: latest.createdAt.toISOString(),
      completedAt: latest.completedAt?.toISOString() ?? null,
    },
    agentRuns: agentRuns.map((run) => ({
      id: run.id,
      agentId: run.agentId,
      goal: run.goal,
      output: run.output,
      memoriesUsed: run.memoriesUsed,
      searchesUsed: run.searchesUsed,
      durationMs: run.durationMs,
      orchestratorId: run.orchestratorId,
      createdAt: run.createdAt.toISOString(),
    })),
  };
}

export default async function OrchestratorPage() {
  const { run, agentRuns } = await loadLatestRun();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Orchestrator</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Run the full agent team toward a single goal. Agents execute sequentially, each seeing
        what the ones before it produced, then a founder-facing executive summary ties it
        together.
      </p>

      <div className="mt-8">
        <OrchestratorWorkspace initialRun={run} initialAgentRuns={agentRuns} />
      </div>
    </div>
  );
}
