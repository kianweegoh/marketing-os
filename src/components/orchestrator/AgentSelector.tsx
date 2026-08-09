'use client';

import { Check } from 'lucide-react';
import { getAllAgents } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

interface AgentSelectorProps {
  selected: Set<AgentId>;
  onToggle: (agentId: AgentId) => void;
  disabled: boolean;
}

/** Checkboxes for all seven agents, rendered in execution order so selection order is legible. */
export function AgentSelector({ selected, onToggle, disabled }: AgentSelectorProps) {
  const agents = [...getAllAgents()].sort((a, b) => a.orchestratorOrder - b.orchestratorOrder);

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Agents to run</h2>
      <p className="mt-1 text-xs text-ink-muted">
        Runs sequentially in this order. Later agents see earlier agents&rsquo; output.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {agents.map((agent) => {
          const isSelected = selected.has(agent.id);

          return (
            <button
              key={agent.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onToggle(agent.id)}
              disabled={disabled}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                isSelected ? cn(agent.accent.bg, agent.accent.border) : 'border-line hover:bg-field',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                  isSelected ? cn(agent.accent.border, agent.accent.text) : 'border-line',
                )}
                aria-hidden="true"
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>

              <span className="shrink-0 text-base leading-none" aria-hidden="true">
                {agent.icon}
              </span>

              <span className="min-w-0 truncate text-sm text-ink">{agent.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
