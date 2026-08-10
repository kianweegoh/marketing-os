'use client';

import { useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';
import { DEMO_COMPANY_CONTEXT } from '@/lib/contexts/demo';
import { errorMessage } from '@/lib/utils';

interface CompanyContextEditorProps {
  initialContent: string;
}

/** Persists a company context string to `/api/company-context`. Shared by Save and Reset. */
async function persist(content: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch('/api/company-context', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    const data = (await response.json()) as { success?: boolean; error?: string };
    if (!response.ok || !data.success) {
      throw new Error(data.error ?? `Save failed (${response.status}).`);
    }
    return { ok: true };
  } catch (caught) {
    return { ok: false, error: errorMessage(caught) };
  }
}

export function CompanyContextEditor({ initialContent }: CompanyContextEditorProps) {
  const { showToast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  const hasChanges = content !== savedContent;

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    const result = await persist(content);
    if (result.ok) {
      setSavedContent(content);
      showToast('Company context saved. Changes take effect on the next run.');
    } else {
      showToast(result.error, { variant: 'error' });
    }
    setIsSaving(false);
  }

  async function handleReset(): Promise<void> {
    setIsResetting(true);
    const result = await persist(DEMO_COMPANY_CONTEXT);
    if (result.ok) {
      setContent(DEMO_COMPANY_CONTEXT);
      setSavedContent(DEMO_COMPANY_CONTEXT);
      showToast('Reset to the demo company context.');
      setIsConfirmingReset(false);
    } else {
      showToast(result.error, { variant: 'error' });
    }
    setIsResetting(false);
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Company Context</h2>
      <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-ink-muted">
        This context is injected into every agent&rsquo;s system prompt on every run. Replace it to
        re-point the entire agent team at a different product. Changes take effect on the next run.
      </p>

      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        disabled={isSaving || isResetting}
        rows={20}
        spellCheck={false}
        className="mt-4 w-full resize-y rounded-lg border border-line bg-field px-3 py-2.5 font-mono text-xs leading-relaxed text-ink disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {isConfirmingReset ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink">Discard your edits and restore the demo context?</span>
            <button
              type="button"
              onClick={() => void handleReset()}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-60 dark:text-red-400"
            >
              {isResetting && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
              {isResetting ? 'Resetting…' : 'Yes, reset'}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingReset(false)}
              disabled={isResetting}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingReset(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset to demo context
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !hasChanges}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
          {isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  );
}
