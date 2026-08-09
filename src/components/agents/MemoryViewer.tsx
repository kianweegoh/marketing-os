'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Brain, ChevronDown, Loader2, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/utils';
import type { AgentMemoryEntry } from '@/types';

interface MemoryViewerProps {
  memories: AgentMemoryEntry[];
  onClear: () => Promise<void>;
}

export function MemoryViewer({ memories, onClear }: MemoryViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear(): Promise<void> {
    setIsClearing(true);
    try {
      await onClear();
      setIsConfirming(false);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-field"
      >
        <Brain className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="text-sm font-medium text-ink">Agent Memory</span>
        <span className="rounded-full border border-line bg-field px-2 py-0.5 text-xs text-ink-muted">
          {memories.length}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto h-4 w-4 shrink-0 text-ink-muted transition-transform',
            isExpanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="border-t border-line">
          {memories.length === 0 ? (
            <EmptyState
              icon={Brain}
              title="No memories yet"
              description="This agent records durable learnings after each run."
            />
          ) : (
            <>
              <ol className="max-h-80 divide-y divide-line overflow-y-auto">
                {memories.map((memory, index) => (
                  <li key={memory.id} className="flex gap-3 px-5 py-3">
                    <span className="shrink-0 font-mono text-xs text-ink-muted">{index + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed text-ink">{memory.content}</p>
                      <p className="mt-1 text-[11px] text-ink-muted">
                        {format(new Date(memory.createdAt), 'd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="border-t border-line px-5 py-3">
                {isConfirming ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink">
                      Delete all {memories.length} memories? This cannot be undone.
                    </span>
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isClearing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
                    >
                      {isClearing && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                      {isClearing ? 'Clearing…' : 'Yes, clear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirming(false)}
                      disabled={isClearing}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear all
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
