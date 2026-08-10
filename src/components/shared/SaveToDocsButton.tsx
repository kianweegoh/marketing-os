'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';
import { errorMessage } from '@/lib/utils';

interface SaveToDocsButtonProps {
  agentName: string;
  /** The run's goal — becomes the middle segment of the created doc's title. */
  goal: string;
  content: string;
  className?: string;
}

/** Exports agent output to a new Google Doc and opens it in a new tab on success. */
export function SaveToDocsButton({ agentName, goal, content, className }: SaveToDocsButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  async function handleClick(): Promise<void> {
    setIsSaving(true);
    try {
      const response = await fetch('/api/google/save-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: goal, content, agentName }),
      });

      const data = (await response.json()) as { success?: boolean; docUrl?: string; error?: string };

      if (!response.ok || !data.success || !data.docUrl) {
        throw new Error(data.error ?? `Save failed (${response.status}).`);
      }

      window.open(data.docUrl, '_blank', 'noopener,noreferrer');
      showToast('Saved to Google Docs.', { variant: 'success', actionLabel: 'Open document', actionHref: data.docUrl });
    } catch (caught) {
      showToast(errorMessage(caught), { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isSaving}
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-muted transition-colors hover:bg-field hover:text-ink disabled:cursor-not-allowed disabled:opacity-60'
      }
    >
      {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <FileText className="h-3.5 w-3.5" aria-hidden="true" />}
      {isSaving ? 'Saving…' : 'Save to Docs'}
    </button>
  );
}
