'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Library, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { LibraryFilters } from '@/components/library/LibraryFilters';
import { LibraryResultCard } from '@/components/library/LibraryResultCard';
import { getAgent } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { errorMessage } from '@/lib/utils';
import type { AgentRunSummary } from '@/types';

/** Debounce so search doesn't fire a request on every keystroke. */
const SEARCH_DEBOUNCE_MS = 350;

export function LibraryWorkspace() {
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<AgentId>>(new Set());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce the free-text search box.
  useEffect(() => {
    const timeout = window.setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  function buildQuery(targetPage: number): string {
    const params = new URLSearchParams();
    if (selectedAgentIds.size > 0) params.set('agentIds', Array.from(selectedAgentIds).join(','));
    if (search) params.set('search', search);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    params.set('page', String(targetPage));
    return params.toString();
  }

  // Any filter change resets to page 1 and replaces the result set.
  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/library?${buildQuery(1)}`);
        const data = (await response.json()) as {
          runs?: AgentRunSummary[];
          total?: number;
          hasMore?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? 'Could not load the library.');
        if (cancelled) return;

        setRuns(data.runs ?? []);
        setTotal(data.total ?? 0);
        setHasMore(data.hasMore ?? false);
        setPage(1);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildQuery closes over the filters below, which are already listed
  }, [selectedAgentIds, search, dateFrom, dateTo]);

  async function handleLoadMore(): Promise<void> {
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/library?${buildQuery(nextPage)}`);
      const data = (await response.json()) as {
        runs?: AgentRunSummary[];
        total?: number;
        hasMore?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'Could not load more runs.');

      setRuns((current) => [...current, ...(data.runs ?? [])]);
      setHasMore(data.hasMore ?? false);
      setPage(nextPage);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setIsLoadingMore(false);
    }
  }

  function toggleAgent(agentId: AgentId): void {
    setSelectedAgentIds((current) => {
      const next = new Set(current);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }

  function clearFilters(): void {
    setSelectedAgentIds(new Set());
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  }

  const hasActiveFilters = selectedAgentIds.size > 0 || search.length > 0 || dateFrom.length > 0 || dateTo.length > 0;

  return (
    <div className="space-y-6">
      <LibraryFilters
        selectedAgentIds={selectedAgentIds}
        onToggleAgent={toggleAgent}
        search={searchInput}
        onSearchChange={setSearchInput}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-ink-muted" aria-hidden="true" />
        </div>
      )}

      {!isLoading && runs.length === 0 && !error && (
        <section className="rounded-xl border border-line bg-surface">
          <EmptyState
            icon={Library}
            title={hasActiveFilters ? 'No runs match these filters' : 'No runs yet'}
            description={
              hasActiveFilters
                ? 'Try widening the date range or clearing a filter.'
                : 'Run any agent and it will show up here.'
            }
          />
        </section>
      )}

      {!isLoading && runs.length > 0 && (
        <>
          <p className="text-xs text-ink-muted">
            {total.toLocaleString()} run{total === 1 ? '' : 's'}
          </p>

          <div className="space-y-2">
            {runs.map((run) => {
              const agent = getAgent(run.agentId);
              if (!agent) return null;
              return <LibraryResultCard key={run.id} run={run} agent={agent} />;
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60"
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
