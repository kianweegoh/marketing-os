'use client';

import { formatDistanceToNow } from 'date-fns';
import { Brain, History, Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import type { AgentRunSummary } from '@/types';

interface RunHistoryPanelProps {
  runs: AgentRunSummary[];
  activeRunId: string | null;
  onSelect: (run: AgentRunSummary) => void;
  isLoading: boolean;
}

export function RunHistoryPanel({ runs, activeRunId, onSelect, isLoading }: RunHistoryPanelProps) {
  return (
    <aside className="rounded-xl border border-line bg-surface lg:sticky lg:top-10">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium text-ink">Run history</h2>
      </div>

      {isLoading && <p className="px-4 py-6 text-center text-xs text-ink-muted">Loading…</p>}

      {!isLoading && runs.length === 0 && (
        <EmptyState
          icon={History}
          title="No runs yet"
          description="Completed runs appear here and can be reloaded with one click."
        />
      )}

      {!isLoading && runs.length > 0 && (
        <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {runs.map((run) => {
            const isActive = run.id === activeRunId;

            return (
              <li key={run.id}>
                <button
                  type="button"
                  onClick={() => onSelect(run)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors hover:bg-field',
                    isActive && 'bg-field',
                  )}
                >
                  <p className="line-clamp-2 text-xs leading-relaxed text-ink">{run.goal}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                    <span>
                      {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Brain className="h-3 w-3" aria-hidden="true" />
                      {run.memoriesUsed}
                    </span>

                    {run.searchesUsed > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Search className="h-3 w-3" aria-hidden="true" />
                        {run.searchesUsed}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
