import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runAgent } from '@/lib/ai/runAgent';
import { computeCpi } from '@/lib/metrics';
import { errorMessage } from '@/lib/utils';
import type { CampaignMetricsRecord } from '@/types';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 30;

interface SaveMetricsBody {
  weekStart: string;
  weekEnd: string;
  platform: string;
  totalSpend: number;
  installs: number;
  cpi?: number;
  ctr: number;
  trialConversionRate: number;
  day7Retention: number;
  day30Retention: number;
}

interface ReanalyseBody {
  metricId: string;
}

function serialize(row: {
  id: string;
  weekStart: Date;
  weekEnd: Date;
  platform: string;
  totalSpend: number;
  installs: number;
  cpi: number;
  ctr: number;
  trialConversionRate: number;
  day7Retention: number;
  day30Retention: number;
  analysisRunId: string | null;
  createdAt: Date;
}): CampaignMetricsRecord {
  return {
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
  };
}

function buildAnalysisPrompt(metric: CampaignMetricsRecord): string {
  return `Analyse this week's campaign performance:

Platform: ${metric.platform}
Period: ${metric.weekStart.slice(0, 10)} to ${metric.weekEnd.slice(0, 10)}
Total Spend: ${metric.totalSpend}
Installs: ${metric.installs}
CPI: ${metric.cpi.toFixed(2)}
CTR: ${metric.ctr}%
Trial-to-Paid Conversion: ${metric.trialConversionRate}%
Day 7 Retention: ${metric.day7Retention}%
Day 30 Retention: ${metric.day30Retention}%

Compare against our targets, identify the true funnel bottleneck, and give me a ranked action list.`;
}

function isSaveBody(body: unknown): body is SaveMetricsBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.weekStart === 'string' &&
    typeof b.weekEnd === 'string' &&
    typeof b.platform === 'string' &&
    typeof b.totalSpend === 'number' &&
    typeof b.installs === 'number' &&
    typeof b.ctr === 'number' &&
    typeof b.trialConversionRate === 'number' &&
    typeof b.day7Retention === 'number' &&
    typeof b.day30Retention === 'number'
  );
}

function isReanalyseBody(body: unknown): body is ReanalyseBody {
  if (!body || typeof body !== 'object') return false;
  return typeof (body as Record<string, unknown>).metricId === 'string';
}

/**
 * POST /api/metrics — two shapes:
 *   - Full form fields (no `metricId`): persists a new CampaignMetrics row, then analyses it
 *     ("Save & Analyse").
 *   - `{ metricId }` only: re-runs the analysis for an existing row ("Re-analyse").
 *
 * Either way the response is newline-delimited JSON: one `{"type":"metric_saved",...}` event with
 * the persisted row, then streamed `{"type":"analysis_delta",...}` chunks, then
 * `{"type":"analysis_done",...}`. The row's `analysisRunId` is updated once the run completes.
 */
export async function POST(request: Request) {
  let metric: CampaignMetricsRecord;

  try {
    const body: unknown = await request.json();

    if (isReanalyseBody(body)) {
      const existing = await prisma.campaignMetrics.findUnique({ where: { id: body.metricId } });
      if (!existing) {
        return NextResponse.json({ error: 'That metrics entry no longer exists.' }, { status: 404 });
      }
      metric = serialize(existing);
    } else if (isSaveBody(body)) {
      const weekStart = new Date(body.weekStart);
      const weekEnd = new Date(body.weekEnd);

      if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
        return NextResponse.json({ error: 'Week start and end must be valid dates.' }, { status: 400 });
      }
      if (body.totalSpend < 0 || body.installs < 0) {
        return NextResponse.json({ error: 'Spend and installs cannot be negative.' }, { status: 400 });
      }

      const cpi =
        typeof body.cpi === 'number' && body.cpi > 0 ? body.cpi : computeCpi(body.totalSpend, body.installs);

      const created = await prisma.campaignMetrics.create({
        data: {
          weekStart,
          weekEnd,
          platform: body.platform,
          totalSpend: body.totalSpend,
          installs: body.installs,
          cpi,
          ctr: body.ctr,
          trialConversionRate: body.trialConversionRate,
          day7Retention: body.day7Retention,
          day30Retention: body.day30Retention,
        },
      });

      metric = serialize(created);
    } else {
      return NextResponse.json({ error: 'Request body is missing required fields.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[api/metrics] Failed to save:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>): void => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          // Client disconnected mid-run; the analysis still completes and is persisted.
        }
      };

      emit({ type: 'metric_saved', metric });

      try {
        const result = await runAgent({
          agentId: 'performance-analyst',
          goal: buildAnalysisPrompt(metric),
          onTextChunk: (chunk) => emit({ type: 'analysis_delta', chunk }),
          onSearchStart: (query) => emit({ type: 'analysis_search', query }),
        });

        await prisma.campaignMetrics.update({
          where: { id: metric.id },
          data: { analysisRunId: result.runId },
        });

        // Telegram notification for Performance Analyst runs lands with the integrations batch —
        // runAgent does not fire it yet.

        emit({ type: 'analysis_done', runId: result.runId, output: result.output });
      } catch (error) {
        console.error('[api/metrics] Analysis failed:', error);
        emit({ type: 'analysis_error', error: errorMessage(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** GET /api/metrics — most recent entries, newest first. */
export async function GET(): Promise<NextResponse<{ metrics: CampaignMetricsRecord[] } | { error: string }>> {
  try {
    const rows = await prisma.campaignMetrics.findMany({
      orderBy: { weekStart: 'desc' },
      take: HISTORY_LIMIT,
    });

    return NextResponse.json({ metrics: rows.map(serialize) });
  } catch (error) {
    console.error('[api/metrics] Failed to load history:', error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
