import Link from 'next/link';
import { getAllAgents } from '@/lib/agents/registry';
import { CATEGORY_LABELS, type AgentConfig } from '@/lib/agents/types';
import { getCompanyContext } from '@/lib/companyContext';
import { cn } from '@/lib/utils';

// The company context is edited at runtime through Settings, so this page must never be baked
// into a static prerender at build time.
export const dynamic = 'force-dynamic';

const CATEGORY_ORDER: Array<AgentConfig['category']> = ['intelligence', 'creative', 'growth'];

/**
 * Orchestrator home. The multi-agent run UI (Section 8) arrives in a later batch — for now this
 * confirms the loaded context and provides navigation until the Sidebar lands.
 */
export default async function OrchestratorPage() {
  const context = await getCompanyContext();
  const productLine = context
    .split('\n')
    .find((line) => line.startsWith('**Product:**'))
    ?.replace('**Product:**', '')
    .trim();

  const agents = getAllAgents();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Orchestrator</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Run the full agent team toward a single goal. Multi-agent orchestration ships in the next
        batch — for now, open any agent below to run it on its own.
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

      {CATEGORY_ORDER.map((category) => {
        const inCategory = agents.filter((agent) => agent.category === category);

        return (
          <section key={category} className="mt-8">
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {CATEGORY_LABELS[category]}
            </h2>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {inCategory.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-field"
                >
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                      agent.accent.bg,
                      agent.accent.border,
                    )}
                    aria-hidden="true"
                  >
                    {agent.icon}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{agent.name}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-muted">
                      {agent.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
