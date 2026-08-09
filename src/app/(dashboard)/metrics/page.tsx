import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { MetricsWorkspace } from '@/components/metrics/MetricsWorkspace';
import type { CampaignMetricsRecord } from '@/types';

export const metadata: Metadata = { title: 'Campaign Metrics · Kalo AI Marketing OS' };

// Metrics are written at runtime — never bake this into a static prerender.
export const dynamic = 'force-dynamic';

async function loadMetrics(): Promise<CampaignMetricsRecord[]> {
  const rows = await prisma.campaignMetrics.findMany({
    orderBy: { weekStart: 'desc' },
    take: 30,
  });

  return rows.map((row) => ({
    id: row.id,
    weekStart: row.weekStart.toISOString(),
    weekEnd: row.weekEnd.toISOString(),
    platform: row.platform,
    totalSpend: row.totalSpend,
    installs: row.installs,
    cpi: row.cpi,
    ctr: row.ctr,
    trialConversionRate: row.trialConversionRate,
    day7Retention: row.day7Retention,
    day30Retention: row.day30Retention,
    analysisRunId: row.analysisRunId,
    createdAt: row.createdAt.toISOString(),
  }));
}

export default async function MetricsPage() {
  const metrics = await loadMetrics();

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Campaign Metrics</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-muted">
        Log weekly numbers and get an instant Performance Analyst read against your targets.
      </p>

      <div className="mt-8">
        <MetricsWorkspace initialMetrics={metrics} />
      </div>
    </div>
  );
}
