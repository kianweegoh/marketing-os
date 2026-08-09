import type { Metadata } from 'next';
import { LibraryWorkspace } from '@/components/library/LibraryWorkspace';

export const metadata: Metadata = { title: 'Output Library · Kalo AI Marketing OS' };

export default function LibraryPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Output Library</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Every run across every agent, in one searchable place.
      </p>

      <div className="mt-8">
        <LibraryWorkspace />
      </div>
    </div>
  );
}
