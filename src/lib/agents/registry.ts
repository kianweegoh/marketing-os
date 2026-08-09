import type { AgentConfig, AgentId } from '@/lib/agents/types';
import { COMPETITOR_INTELLIGENCE_PROMPT } from '@/lib/agents/prompts/competitorIntelligence';
import { CREATIVE_ANGLE_PROMPT } from '@/lib/agents/prompts/creativeAngle';
import { AD_SCRIPT_GENERATOR_PROMPT } from '@/lib/agents/prompts/adScriptGenerator';
import { PAID_ACQUISITION_PROMPT } from '@/lib/agents/prompts/paidAcquisition';
import { PERFORMANCE_ANALYST_PROMPT } from '@/lib/agents/prompts/performanceAnalyst';
import { ASO_OPTIMIZATION_PROMPT } from '@/lib/agents/prompts/asoOptimization';
import { CONTENT_SOCIAL_PROMPT } from '@/lib/agents/prompts/contentSocial';

/**
 * Keys are kebab-case and must match the `[agentId]` URL segment exactly — a mismatch silently
 * routes every agent page to notFound().
 *
 * Accent classes are written out in full rather than composed from a colour name, so Tailwind's
 * scanner can see each literal and keep them in the build.
 */
export const AGENTS: Record<AgentId, AgentConfig> = {
  'competitor-intelligence': {
    id: 'competitor-intelligence',
    name: 'Competitor Intelligence',
    shortName: 'Competitor',
    icon: '🔍',
    accent: {
      bg: 'bg-violet-500/10 dark:bg-violet-500/10',
      text: 'text-violet-600 dark:text-violet-400',
      border: 'border-violet-500/20 dark:border-violet-500/30',
      dot: 'bg-violet-500',
    },
    description:
      'Monitors and analyses competitor apps, ad creative, store listings, and pricing across your primary market. Surfaces exploitable gaps with a clear recommendation attached to every finding.',
    placeholder:
      "e.g. Analyse our closest competitor's App Store listing and identify keyword gaps we can own",
    category: 'intelligence',
    systemPrompt: COMPETITOR_INTELLIGENCE_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 1,
  },

  'creative-angle': {
    id: 'creative-angle',
    name: 'Creative Angle Agent',
    shortName: 'Creative Angle',
    icon: '💡',
    accent: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/30',
      dot: 'bg-amber-500',
    },
    description:
      'Generates psychologically-driven creative angles, hooks, and campaign concepts rooted in local cultural truth. The idea factory that feeds the script writer.',
    placeholder:
      'e.g. Generate angles for our core revenue segment — busy professionals who want results without effort',
    category: 'creative',
    systemPrompt: CREATIVE_ANGLE_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 2,
  },

  'ad-script-generator': {
    id: 'ad-script-generator',
    name: 'Ad Script Generator',
    shortName: 'Ad Scripts',
    icon: '🎬',
    accent: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/10',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/30',
      dot: 'bg-rose-500',
    },
    description:
      "Turns creative angles into fully shootable video ad scripts with timestamps, director's notes, and B-roll lists. Ready to hand to a creator or editor.",
    placeholder: 'e.g. Write a 30s TikTok UGC script based on our top-priority creative angle',
    category: 'creative',
    systemPrompt: AD_SCRIPT_GENERATOR_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 3,
  },

  'paid-acquisition': {
    id: 'paid-acquisition',
    name: 'Paid Acquisition Strategist',
    shortName: 'Paid Acquisition',
    icon: '💰',
    accent: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/30',
      dot: 'bg-emerald-500',
    },
    description:
      'Plans campaign structures, audience tiers, budget allocation, and creative testing frameworks across Meta, TikTok, and Google — all denominated in your local currency.',
    placeholder: 'e.g. Plan a 3,000/month Meta + TikTok launch campaign against our CPI target',
    category: 'growth',
    systemPrompt: PAID_ACQUISITION_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 4,
  },

  'performance-analyst': {
    id: 'performance-analyst',
    name: 'Performance Analyst',
    shortName: 'Performance',
    icon: '📊',
    accent: {
      bg: 'bg-blue-500/10 dark:bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-500/20 dark:border-blue-500/30',
      dot: 'bg-blue-500',
    },
    description:
      "Diagnoses campaign data against your own KPI benchmarks, identifies the true funnel bottleneck, and returns a ranked action list.",
    placeholder:
      'e.g. Week 1 TikTok: 2,000 spend, 320 installs, 1.8% CTR, 38% trial conversion, 18% D30',
    category: 'growth',
    systemPrompt: PERFORMANCE_ANALYST_PROMPT,
    orchestratorDefault: false,
    orchestratorOrder: 5,
  },

  'aso-optimization': {
    id: 'aso-optimization',
    name: 'ASO Optimization',
    shortName: 'ASO',
    icon: '📱',
    accent: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/10',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-500/20 dark:border-sky-500/30',
      dot: 'bg-sky-500',
    },
    description:
      'Maximises App Store and Google Play discoverability with a multi-language keyword strategy and conversion-optimised metadata.',
    placeholder: 'e.g. Build our multi-language keyword strategy and write optimised iOS metadata',
    category: 'growth',
    systemPrompt: ASO_OPTIMIZATION_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 6,
  },

  'content-social': {
    id: 'content-social',
    name: 'Content & Social Agent',
    shortName: 'Content & Social',
    icon: '📣',
    accent: {
      bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/10',
      text: 'text-fuchsia-600 dark:text-fuchsia-400',
      border: 'border-fuchsia-500/20 dark:border-fuchsia-500/30',
      dot: 'bg-fuchsia-500',
    },
    description:
      'Builds content calendars and writes platform-native posts for every channel and language your product ships in.',
    placeholder: 'e.g. Build a 2-week pre-launch content calendar across our organic channels',
    category: 'creative',
    systemPrompt: CONTENT_SOCIAL_PROMPT,
    orchestratorDefault: true,
    orchestratorOrder: 7,
  },
};

/** Returns the agent config for an arbitrary string, or null when the id is unknown. */
export function getAgent(id: string): AgentConfig | null {
  return Object.prototype.hasOwnProperty.call(AGENTS, id) ? AGENTS[id as AgentId] : null;
}

/** All agents in registry order. */
export function getAllAgents(): AgentConfig[] {
  return Object.values(AGENTS);
}

/** Agents included in orchestrator runs by default, sorted by execution order. */
export function getOrchestratorAgents(): AgentConfig[] {
  return getAllAgents()
    .filter((agent) => agent.orchestratorDefault)
    .sort((a, b) => a.orchestratorOrder - b.orchestratorOrder);
}

/** Type guard for narrowing a raw route param to an AgentId. */
export function isAgentId(id: string): id is AgentId {
  return Object.prototype.hasOwnProperty.call(AGENTS, id);
}
