import { prisma } from '@/lib/db';
import { DEMO_COMPANY_CONTEXT } from '@/lib/contexts/demo';

/** The row id for the single company-context record. */
export const COMPANY_CONTEXT_ID = 'singleton';

/**
 * Fallback used when the database has no context row yet. The public repo ships the fictional
 * Verda company so a fresh clone is immediately usable; the real context is pasted in through
 * Settings and never committed.
 */
export const DEFAULT_COMPANY_CONTEXT = DEMO_COMPANY_CONTEXT;

/**
 * Loads the company context injected into every agent's system prompt.
 * Falls back to the demo context if the table is empty or unreachable.
 */
export async function getCompanyContext(): Promise<string> {
  try {
    const row = await prisma.companyContext.findUnique({ where: { id: COMPANY_CONTEXT_ID } });
    return row?.content?.trim() ? row.content : DEFAULT_COMPANY_CONTEXT;
  } catch (error) {
    console.error('[companyContext] Failed to load from database, using default:', error);
    return DEFAULT_COMPANY_CONTEXT;
  }
}
