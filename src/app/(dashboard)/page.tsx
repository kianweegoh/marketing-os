import { getCompanyContext } from '@/lib/companyContext';

// The company context is edited at runtime through Settings, so this page must never be baked
// into a static prerender at build time.
export const dynamic = 'force-dynamic';

/**
 * Orchestrator home. The multi-agent run UI (Section 8) arrives in a later batch — for now this
 * confirms the authenticated shell renders and that the company context loads from the database.
 */
export default async function OrchestratorPage() {
  const context = await getCompanyContext();
  const productLine = context
    .split('\n')
    .find((line) => line.startsWith('**Product:**'))
    ?.replace('**Product:**', '')
    .trim();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Orchestrator</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Run the full agent team toward a single goal. Multi-agent orchestration ships in the next
        batch.
      </p>

      <section className="mt-8 rounded-xl border border-line bg-surface p-6">
        <h2 className="text-sm font-medium text-ink">Loaded company context</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {productLine ?? 'No product line found in the current context.'}
        </p>
        <p className="mt-4 text-xs text-ink-muted">
          {context.length.toLocaleString()} characters, injected into every agent&rsquo;s system
          prompt on every run.
        </p>
      </section>
    </div>
  );
}
