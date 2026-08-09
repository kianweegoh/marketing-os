'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Loader2, Play } from 'lucide-react';
import type { AgentConfig } from '@/lib/agents/types';
import { cn } from '@/lib/utils';

interface AgentInputProps {
  agent: AgentConfig;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
}

export function AgentInput({ agent, value, onChange, onSubmit, isRunning }: AgentInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !isRunning;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canSubmit) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <label htmlFor="objective" className="block text-sm font-medium text-ink">
        Objective
      </label>

      <textarea
        id="objective"
        ref={textareaRef}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isRunning}
        placeholder={agent.placeholder}
        className="mt-2 w-full resize-y rounded-lg border border-line bg-field px-3 py-2.5 text-sm leading-relaxed text-ink placeholder:text-ink-muted disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          Press <kbd className="rounded border border-line bg-field px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>
          <span className="mx-1">/</span>
          <kbd className="rounded border border-line bg-field px-1.5 py-0.5 font-mono text-[11px]">Ctrl</kbd>
          <span className="mx-1">+</span>
          <kbd className="rounded border border-line bg-field px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> to run
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-opacity',
            agent.accent.bg,
            agent.accent.border,
            agent.accent.text,
            'hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Play className="h-4 w-4" aria-hidden="true" />
          )}
          {isRunning ? 'Running…' : 'Run agent'}
        </button>
      </div>
    </section>
  );
}
