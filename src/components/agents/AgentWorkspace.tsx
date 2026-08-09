'use client';

import { useCallback, useEffect, useState } from 'react';
import { AgentHeader } from '@/components/agents/AgentHeader';
import { AgentInput } from '@/components/agents/AgentInput';
import { AgentOutputPanel } from '@/components/agents/AgentOutputPanel';
import { MemoryViewer } from '@/components/agents/MemoryViewer';
import { RunHistoryPanel } from '@/components/agents/RunHistoryPanel';
import type { AgentConfig } from '@/lib/agents/types';
import { errorMessage, extractStreamError } from '@/lib/utils';
import type { AgentMemoryEntry, AgentRunSummary, AgentStatus } from '@/types';

/**
 * Client shell for a single agent. One template serves all seven — everything that differs comes
 * from the registry config passed in by the server component.
 */
export function AgentWorkspace({ agent }: { agent: AgentConfig }) {
  const [goal, setGoal] = useState('');
  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [memories, setMemories] = useState<AgentMemoryEntry[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchHistory = useCallback(async (): Promise<AgentRunSummary[]> => {
    const response = await fetch(`/api/agents/${agent.id}/history`);
    const data = (await response.json()) as { runs?: AgentRunSummary[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Could not load run history.');
    return data.runs ?? [];
  }, [agent.id]);

  const fetchMemories = useCallback(async (): Promise<AgentMemoryEntry[]> => {
    const response = await fetch(`/api/agents/${agent.id}/memories`);
    const data = (await response.json()) as { memories?: AgentMemoryEntry[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Could not load memories.');
    return data.memories ?? [];
  }, [agent.id]);

  // On mount, load history and memories in parallel and restore the most recent run's output.
  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoadingHistory(true);
      try {
        const [loadedRuns, loadedMemories] = await Promise.all([fetchHistory(), fetchMemories()]);
        if (cancelled) return;

        setRuns(loadedRuns);
        setMemories(loadedMemories);

        const latest = loadedRuns[0];
        if (latest) {
          setRaw(latest.output);
          setActiveRunId(latest.id);
          setStatus('complete');
        }
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught));
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [fetchHistory, fetchMemories]);

  async function handleRun(): Promise<void> {
    const objective = goal.trim();
    if (!objective) return;

    setStatus('running');
    setError(null);
    setRaw('');
    setActiveRunId(null);

    try {
      const response = await fetch(`/api/agents/${agent.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: objective }),
      });

      if (!response.ok || !response.body) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Run failed (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      // Read to completion, appending each chunk so output appears token by token.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setRaw(accumulated);
      }

      // The route reports post-header failures as a trailing marker, not an HTTP status.
      const streamError = extractStreamError(accumulated);
      if (streamError) {
        setError(streamError);
        setStatus('error');
      } else {
        setStatus('complete');
        setGoal('');
      }

      // Refresh both panels without a full page reload.
      const [loadedRuns, loadedMemories] = await Promise.all([fetchHistory(), fetchMemories()]);
      setRuns(loadedRuns);
      setMemories(loadedMemories);

      // The live stream carries raw model text, which still contains the "## MEMORY_UPDATE"
      // section — runAgent only splits that off once the full response has been accumulated.
      // Swap to the persisted, already-clean output now that it exists, so the memory block
      // never lingers on screen after the run finishes.
      const latest = loadedRuns[0];
      if (!streamError && latest) {
        setRaw(latest.output);
        setActiveRunId(latest.id);
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setStatus('error');
    }
  }

  function handleSelectRun(run: AgentRunSummary): void {
    if (status === 'running') return;
    setRaw(run.output);
    setActiveRunId(run.id);
    setStatus('complete');
    setError(null);
  }

  async function handleClearMemories(): Promise<void> {
    try {
      const response = await fetch(`/api/agents/${agent.id}/memories`, { method: 'DELETE' });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Could not clear memories.');
      }
      setMemories([]);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <div className="animate-fade-in">
      <AgentHeader agent={agent} status={status} />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <AgentInput
            agent={agent}
            value={goal}
            onChange={setGoal}
            onSubmit={() => void handleRun()}
            isRunning={status === 'running'}
          />

          <AgentOutputPanel
            agent={agent}
            raw={raw}
            isRunning={status === 'running'}
            error={error}
          />

          <MemoryViewer memories={memories} onClear={handleClearMemories} />
        </div>

        <RunHistoryPanel
          runs={runs}
          activeRunId={activeRunId}
          onSelect={handleSelectRun}
          isLoading={isLoadingHistory}
        />
      </div>
    </div>
  );
}
