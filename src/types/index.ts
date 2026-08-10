/** Shared types used across the app. Agent-specific types live in `src/lib/agents/types.ts`. */

export type Theme = 'light' | 'dark';

/** Standard error shape returned by every API route. */
export interface ApiError {
  error: string;
}

/** Discriminated result used by client fetch helpers. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * An AgentRun as it crosses the API boundary. Dates are ISO strings rather than `Date` because
 * JSON has no date type — the client parses them where it needs to.
 */
export interface AgentRunSummary {
  id: string;
  agentId: string;
  goal: string;
  output: string;
  memoriesUsed: number;
  searchesUsed: number;
  durationMs: number | null;
  orchestratorId: string | null;
  createdAt: string;
}

/** An AgentMemory as it crosses the API boundary. */
export interface AgentMemoryEntry {
  id: string;
  content: string;
  createdAt: string;
}

/** UI status for an agent workspace. */
export type AgentStatus = 'idle' | 'running' | 'complete' | 'error';

/** An OrchestratorRun as it crosses the API boundary. `agentIds` is still JSON-encoded. */
export interface OrchestratorRunRecord {
  id: string;
  goal: string;
  summary: string | null;
  agentIds: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

/** A CampaignMetrics row as it crosses the API boundary. */
export interface CampaignMetricsRecord {
  id: string;
  weekStart: string;
  weekEnd: string;
  platform: string;
  totalSpend: number;
  installs: number;
  cpi: number;
  ctr: number;
  trialConversionRate: number;
  day7Retention: number;
  day30Retention: number;
  analysisRunId: string | null;
  createdAt: string;
}

/** One row parsed out of a Content & Social agent's markdown content calendar table. */
export interface CalendarEvent {
  date: string; // ISO date (YYYY-MM-DD)
  platform: string;
  format: string;
  hook: string;
  caption?: string;
}

/** Connection state for each optional integration, shown in Settings. */
export interface IntegrationStatus {
  telegram: { configured: boolean };
  google: { configured: boolean; connected: boolean };
}
