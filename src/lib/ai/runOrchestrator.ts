import { prisma } from '@/lib/db';
import { getAgent } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { getCompanyContext } from '@/lib/companyContext';
import { AGENT_MODEL, MAX_OUTPUT_TOKENS, getAnthropicClient } from '@/lib/ai/client';
import { runAgent } from '@/lib/ai/runAgent';
import { errorMessage, truncate } from '@/lib/utils';

export interface RunOrchestratorOptions {
  goal: string;
  agentIds: AgentId[];
  onEvent: (event: OrchestratorEvent) => void;
}

export type OrchestratorEvent =
  | { type: 'run_start'; orchestratorId: string; agentIds: AgentId[] }
  | { type: 'agent_running'; agentId: AgentId }
  | { type: 'agent_delta'; agentId: AgentId; chunk: string }
  | { type: 'agent_search'; agentId: AgentId; query: string }
  | {
      type: 'agent_done';
      agentId: AgentId;
      runId: string;
      output: string;
      searchesUsed: number;
      memoriesUsed: number;
    }
  | { type: 'agent_error'; agentId: AgentId; error: string }
  | { type: 'summary_start' }
  | { type: 'summary_delta'; chunk: string }
  | { type: 'summary_done'; summary: string }
  | { type: 'run_complete'; orchestratorId: string }
  | { type: 'run_error'; error: string };

/** Characters of a prior agent's output carried into the next agent's context block. */
const CONTEXT_EXCERPT_LENGTH = 1500;

const EXECUTIVE_SUMMARY_INSTRUCTIONS = `You are the Orchestrator for this company's marketing team. You have just coordinated a team of specialist marketing agents toward a single goal. Synthesise their outputs into a tight executive summary for the founder.

Structure:
## Executive Summary
[3–4 sentences: what the team concluded and the single most important takeaway]

## Key Decisions Required
[What the human needs to decide, with your recommendation on each]

## Top 5 Action Items
[Numbered, each with owner, timeline, and the specific action]

## Risks & Watchouts
[What could go wrong]

Be concise. The founder is time-poor. No filler.`;

/** Builds the goal handed to every agent after the first, prepending everything run so far. */
export function composeContextGoal(priorOutputs: Array<{ name: string; output: string }>, goal: string): string {
  const sections = priorOutputs
    .map((prior) => `### ${prior.name}\n${truncate(prior.output, CONTEXT_EXCERPT_LENGTH)}`)
    .join('\n\n');

  return `## CONTEXT FROM EARLIER AGENTS IN THIS RUN\n\n${sections}\n\n---\n\n## YOUR TASK\n${goal}`;
}

/**
 * Runs the selected agents sequentially in `orchestratorOrder`, then synthesises an executive
 * summary. Sequential matters: later agents see everything earlier agents produced.
 *
 * A single agent failing does not abort the run — it is reported and the remaining agents still
 * execute, since a Paid Acquisition hiccup has no bearing on whether ASO Optimization can run.
 * The run itself only ends in `error` status when every agent fails.
 */
export async function runOrchestrator(options: RunOrchestratorOptions): Promise<{ orchestratorId: string }> {
  const { goal, onEvent } = options;

  const agents = options.agentIds
    .map((id) => getAgent(id))
    .filter((agent): agent is NonNullable<typeof agent> => agent !== null)
    .sort((a, b) => a.orchestratorOrder - b.orchestratorOrder);

  if (agents.length === 0) {
    throw new Error('Select at least one agent to run.');
  }

  const orchestratorRun = await prisma.orchestratorRun.create({
    data: {
      goal,
      agentIds: JSON.stringify(agents.map((agent) => agent.id)),
      status: 'running',
    },
  });

  onEvent({
    type: 'run_start',
    orchestratorId: orchestratorRun.id,
    agentIds: agents.map((agent) => agent.id),
  });

  const priorOutputs: Array<{ name: string; output: string }> = [];
  const failedAgents: Array<{ name: string; error: string }> = [];

  for (const agent of agents) {
    onEvent({ type: 'agent_running', agentId: agent.id });

    const agentGoal = priorOutputs.length === 0 ? goal : composeContextGoal(priorOutputs, goal);

    try {
      const result = await runAgent({
        agentId: agent.id,
        goal: agentGoal,
        orchestratorId: orchestratorRun.id,
        onTextChunk: (chunk) => onEvent({ type: 'agent_delta', agentId: agent.id, chunk }),
        onSearchStart: (query) => onEvent({ type: 'agent_search', agentId: agent.id, query }),
      });

      priorOutputs.push({ name: agent.name, output: result.output });
      onEvent({
        type: 'agent_done',
        agentId: agent.id,
        runId: result.runId,
        output: result.output,
        searchesUsed: result.searchesUsed,
        memoriesUsed: result.memoriesLoaded,
      });
    } catch (error) {
      const message = errorMessage(error);
      console.error(`[runOrchestrator] "${agent.id}" failed:`, error);
      failedAgents.push({ name: agent.name, error: message });
      onEvent({ type: 'agent_error', agentId: agent.id, error: message });
    }
  }

  // Every agent failed — nothing to synthesise. Close the run as an error rather than
  // fabricating a summary of zero outputs.
  if (priorOutputs.length === 0) {
    await prisma.orchestratorRun.update({
      where: { id: orchestratorRun.id },
      data: { status: 'error', completedAt: new Date() },
    });
    onEvent({ type: 'run_error', error: 'Every agent in this run failed. See the errors above.' });
    return { orchestratorId: orchestratorRun.id };
  }

  onEvent({ type: 'summary_start' });
  const summary = await generateExecutiveSummary(goal, priorOutputs, failedAgents, (chunk) =>
    onEvent({ type: 'summary_delta', chunk }),
  );
  onEvent({ type: 'summary_done', summary });

  await prisma.orchestratorRun.update({
    where: { id: orchestratorRun.id },
    data: { summary, status: 'complete', completedAt: new Date() },
  });

  onEvent({ type: 'run_complete', orchestratorId: orchestratorRun.id });

  return { orchestratorId: orchestratorRun.id };
}

/**
 * One-off synthesis call — not a registry agent, so it doesn't go through `runAgent`'s memory or
 * tool machinery. It still gets the company context, so the summary uses the right product name,
 * targets, and tone rather than generic language.
 */
async function generateExecutiveSummary(
  goal: string,
  priorOutputs: Array<{ name: string; output: string }>,
  failedAgents: Array<{ name: string; error: string }>,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const companyContext = await getCompanyContext();
  const system = `${companyContext}\n\n---\n\n${EXECUTIVE_SUMMARY_INSTRUCTIONS}`;

  let userMessage = `## Goal\n${goal}\n\n## Agent Outputs\n\n${priorOutputs
    .map((prior) => `### ${prior.name}\n${prior.output}`)
    .join('\n\n---\n\n')}`;

  if (failedAgents.length > 0) {
    userMessage += `\n\n## Agents That Failed To Run\n${failedAgents
      .map((failed) => `- ${failed.name}: ${failed.error}`)
      .join('\n')}`;
  }

  try {
    const client = getAnthropicClient();
    const stream = client.messages.stream({
      model: AGENT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: 'user', content: userMessage }],
    });

    let summary = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        summary += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    await stream.finalMessage();
    return summary.trim();
  } catch (error) {
    console.error('[runOrchestrator] Executive summary failed:', error);
    const fallback = `_Executive summary could not be generated: ${errorMessage(error)}_\n\nIndividual agent outputs above are still complete and available.`;
    onChunk(fallback);
    return fallback;
  }
}
