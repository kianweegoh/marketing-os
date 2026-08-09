'use client';

import { useMemo, useReducer, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AgentOutputCard, type OrchestratorAgentStatus } from '@/components/orchestrator/AgentOutputCard';
import { AgentSelector } from '@/components/orchestrator/AgentSelector';
import { ExecutiveSummaryPanel } from '@/components/orchestrator/ExecutiveSummaryPanel';
import { OrchestratorInput } from '@/components/orchestrator/OrchestratorInput';
import { getAgent, getOrchestratorAgents } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { errorMessage } from '@/lib/utils';
import type { AgentRunSummary, OrchestratorRunRecord } from '@/types';
// Type-only import — erased at compile time, so the server-only modules `runOrchestrator.ts`
// pulls in (Prisma, the Anthropic client) never reach the client bundle.
import type { OrchestratorEvent } from '@/lib/ai/runOrchestrator';

interface AgentRunState {
  status: OrchestratorAgentStatus;
  output: string;
  error?: string;
  runId?: string;
  searchesUsed?: number;
  memoriesUsed?: number;
  searchingQuery?: string;
}

interface OrchestratorState {
  orchestratorId: string | null;
  agentOrder: AgentId[];
  agents: Record<string, AgentRunState>;
  summary: string;
  summaryStatus: 'idle' | 'running' | 'done';
  isRunning: boolean;
  runError: string | null;
}

type Action =
  | { kind: 'start_new_run' }
  | { kind: 'event'; event: OrchestratorEvent }
  | { kind: 'fatal_error'; error: string };

const EMPTY_STATE: OrchestratorState = {
  orchestratorId: null,
  agentOrder: [],
  agents: {},
  summary: '',
  summaryStatus: 'idle',
  isRunning: false,
  runError: null,
};

function reducer(state: OrchestratorState, action: Action): OrchestratorState {
  if (action.kind === 'start_new_run') {
    return { ...EMPTY_STATE, isRunning: true };
  }

  if (action.kind === 'fatal_error') {
    return { ...state, isRunning: false, runError: action.error };
  }

  const event = action.event;

  switch (event.type) {
    case 'run_start':
      return {
        ...state,
        orchestratorId: event.orchestratorId,
        agentOrder: event.agentIds,
        agents: Object.fromEntries(
          event.agentIds.map((id): [string, AgentRunState] => [id, { status: 'queued', output: '' }]),
        ),
      };

    case 'agent_running':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: { ...state.agents[event.agentId], status: 'running' },
        },
      };

    case 'agent_delta':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: {
            ...state.agents[event.agentId],
            output: (state.agents[event.agentId]?.output ?? '') + event.chunk,
          },
        },
      };

    case 'agent_search':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: { ...state.agents[event.agentId], searchingQuery: event.query },
        },
      };

    case 'agent_done':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: {
            status: 'done',
            output: event.output,
            runId: event.runId,
            searchesUsed: event.searchesUsed,
            memoriesUsed: event.memoriesUsed,
          },
        },
      };

    case 'agent_error':
      return {
        ...state,
        agents: {
          ...state.agents,
          [event.agentId]: { ...state.agents[event.agentId], status: 'error', error: event.error },
        },
      };

    case 'summary_start':
      return { ...state, summaryStatus: 'running', summary: '' };

    case 'summary_delta':
      return { ...state, summary: state.summary + event.chunk };

    case 'summary_done':
      return { ...state, summary: event.summary, summaryStatus: 'done' };

    case 'run_complete':
      return { ...state, isRunning: false };

    case 'run_error':
      return { ...state, isRunning: false, runError: event.error };

    default:
      return state;
  }
}

/** Reconstructs display state from the DB for the most recent run, without re-streaming. */
function restoreFromRecord(
  run: OrchestratorRunRecord | null,
  agentRuns: AgentRunSummary[],
): OrchestratorState {
  if (!run) return EMPTY_STATE;

  let agentOrder: AgentId[] = [];
  try {
    agentOrder = JSON.parse(run.agentIds) as AgentId[];
  } catch {
    agentOrder = [];
  }

  const runsByAgent = new Map(agentRuns.map((r) => [r.agentId, r]));
  const agents: Record<string, AgentRunState> = {};

  for (const agentId of agentOrder) {
    const found = runsByAgent.get(agentId);
    agents[agentId] = found
      ? {
          status: 'done',
          output: found.output,
          runId: found.id,
          searchesUsed: found.searchesUsed,
          memoriesUsed: found.memoriesUsed,
        }
      : {
          // The schema has no per-agent failure log — only OrchestratorRun.status. An agent with
          // no matching AgentRun either failed or the process was interrupted before it finished.
          status: 'error',
          output: '',
          error: 'This agent did not complete in the saved run. Re-run to try again.',
        };
  }

  return {
    orchestratorId: run.id,
    agentOrder,
    agents,
    summary: run.summary ?? '',
    summaryStatus: run.summary ? 'done' : 'idle',
    isRunning: false,
    runError: run.status === 'error' && !run.summary ? 'This run did not complete successfully.' : null,
  };
}

interface OrchestratorWorkspaceProps {
  initialRun: OrchestratorRunRecord | null;
  initialAgentRuns: AgentRunSummary[];
}

export function OrchestratorWorkspace({ initialRun, initialAgentRuns }: OrchestratorWorkspaceProps) {
  const defaultAgentIds = useMemo(() => getOrchestratorAgents().map((agent) => agent.id), []);

  const [goal, setGoal] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<AgentId>>(() => new Set(defaultAgentIds));
  const [formError, setFormError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reducer, restoreFromRecord(initialRun, initialAgentRuns));

  function toggleAgent(agentId: AgentId): void {
    setSelectedAgents((current) => {
      const next = new Set(current);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }

  async function handleRun(): Promise<void> {
    const trimmedGoal = goal.trim();
    if (!trimmedGoal) return;

    const agentIds = Array.from(selectedAgents);
    if (agentIds.length === 0) {
      setFormError('Select at least one agent to run.');
      return;
    }

    setFormError(null);
    dispatch({ kind: 'start_new_run' });

    try {
      const response = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: trimmedGoal, agentIds }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Run failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf('\n');

          if (!line.trim()) continue;

          try {
            const event = JSON.parse(line) as OrchestratorEvent;
            dispatch({ kind: 'event', event });
          } catch (parseError) {
            console.error('[orchestrator] Could not parse event line:', parseError, line);
          }
        }
      }

      if (buffer.trim()) {
        try {
          dispatch({ kind: 'event', event: JSON.parse(buffer) as OrchestratorEvent });
        } catch {
          // Stream ended mid-line — nothing more to recover.
        }
      }

      setGoal('');
    } catch (caught) {
      dispatch({ kind: 'fatal_error', error: errorMessage(caught) });
    }
  }

  const hasResults = state.agentOrder.length > 0;

  return (
    <div className="space-y-6">
      <OrchestratorInput goal={goal} onChange={setGoal} onSubmit={() => void handleRun()} isRunning={state.isRunning} />

      <AgentSelector selected={selectedAgents} onToggle={toggleAgent} disabled={state.isRunning} />

      {formError && (
        <p role="alert" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      {state.runError && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.runError}
        </p>
      )}

      {hasResults && (
        <>
          {/* Hide the panel for a run that failed before the summary stage was ever reached
              (every agent failed) — "Waiting on the agent team" would be misleading for a run
              that has already terminated. */}
          {(state.summaryStatus !== 'idle' || (!state.isRunning && !state.runError)) && (
            <ExecutiveSummaryPanel summary={state.summary} isGenerating={state.summaryStatus === 'running'} />
          )}

          <div className="space-y-2">
            {state.agentOrder.map((agentId) => {
              const agent = getAgent(agentId);
              if (!agent) return null;

              const agentState = state.agents[agentId] ?? { status: 'queued' as const, output: '' };

              return (
                <AgentOutputCard
                  key={agentId}
                  agent={agent}
                  status={agentState.status}
                  output={agentState.output}
                  error={agentState.error}
                  searchingQuery={agentState.searchingQuery}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
