'use client';

import { Search, X } from 'lucide-react';
import { getAllAgents } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

interface LibraryFiltersProps {
  selectedAgentIds: Set<AgentId>;
  onToggleAgent: (agentId: AgentId) => void;
  search: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function LibraryFilters({
  selectedAgentIds,
  onToggleAgent,
  search,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  onClear,
  hasActiveFilters,
}: LibraryFiltersProps) {
  const agents = getAllAgents();

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3 lg:col-span-1">
          <label htmlFor="library-search" className="block text-xs font-medium text-ink-muted">
            Search goal &amp; output
          </label>
          <div className="relative mt-1.5">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              aria-hidden="true"
            />
            <input
              id="library-search"
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search runs…"
              className="w-full rounded-lg border border-line bg-field py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted"
            />
          </div>
        </div>

        <div>
          <label htmlFor="library-date-from" className="block text-xs font-medium text-ink-muted">
            From
          </label>
          <input
            id="library-date-from"
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <label htmlFor="library-date-to" className="block text-xs font-medium text-ink-muted">
            To
          </label>
          <input
            id="library-date-to"
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink"
          />
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium text-ink-muted">Agents</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {agents.map((agent) => {
            const isSelected = selectedAgentIds.has(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onToggleAgent(agent.id)}
                aria-pressed={isSelected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors',
                  isSelected
                    ? cn(agent.accent.bg, agent.accent.border, agent.accent.text)
                    : 'border-line text-ink-muted hover:bg-field hover:text-ink',
                )}
              >
                <span aria-hidden="true">{agent.icon}</span>
                {agent.shortName}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          <X className="h-3 w-3" aria-hidden="true" />
          Clear filters
        </button>
      )}
    </section>
  );
}
