'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Genericised versions of the spec's example goals — the originals named a specific product and
 * market, which would look broken against whatever company context is actually loaded.
 */
const EXAMPLE_GOALS = [
  'Plan our pre-launch marketing campaign',
  'Analyse our competitors and build a differentiation strategy',
  'Optimise our app store presence and create launch creative',
  'Build a full-funnel launch strategy for our primary market',
];

interface OrchestratorInputProps {
  goal: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
}

export function OrchestratorInput({ goal, onChange, onSubmit, isRunning }: OrchestratorInputProps) {
  const canSubmit = goal.trim().length > 0 && !isRunning;

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <label htmlFor="orchestrator-goal" className="block text-sm font-medium text-ink">
        Goal
      </label>

      <textarea
        id="orchestrator-goal"
        rows={3}
        value={goal}
        onChange={(event) => onChange(event.target.value)}
        disabled={isRunning}
        placeholder="e.g. Build a full-funnel launch strategy for our primary market"
        className="mt-2 w-full resize-y rounded-lg border border-line bg-field px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-muted disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_GOALS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChange(example)}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            {example}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity',
            'hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isRunning ? 'Running…' : 'Run team'}
        </button>
      </div>
    </section>
  );
}
