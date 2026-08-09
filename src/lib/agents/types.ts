export type AgentId =
  | 'competitor-intelligence'
  | 'creative-angle'
  | 'ad-script-generator'
  | 'paid-acquisition'
  | 'performance-analyst'
  | 'aso-optimization'
  | 'content-social';

export interface AgentConfig {
  id: AgentId;
  name: string;
  shortName: string;
  icon: string;
  accent: {
    bg: string; // e.g. 'bg-violet-500/10 dark:bg-violet-500/10'
    text: string; // e.g. 'text-violet-600 dark:text-violet-400'
    border: string; // e.g. 'border-violet-500/20 dark:border-violet-500/30'
    dot: string; // e.g. 'bg-violet-500'
  };
  description: string;
  placeholder: string;
  category: 'intelligence' | 'creative' | 'growth';
  systemPrompt: string;
  /** Whether this agent should be included in orchestrator runs by default */
  orchestratorDefault: boolean;
  /** Order in which this agent runs during orchestration (lower = earlier) */
  orchestratorOrder: number;
}

/** Display label for each category, used by the sidebar and agent header. */
export const CATEGORY_LABELS: Record<AgentConfig['category'], string> = {
  intelligence: 'Intelligence',
  creative: 'Creative',
  growth: 'Growth',
};
