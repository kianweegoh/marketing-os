import { prisma } from '@/lib/db';
import type { AgentId } from '@/lib/agents/types';

/** Marker the model appends its durable learnings under. */
export const MEMORY_HEADING = '## MEMORY_UPDATE';

/** How many recent memories are injected into the system prompt. */
export const MEMORY_CONTEXT_WINDOW = 20;

/** Hard cap per agent. Memories grow ~4–5 per run, so this needs trimming or it grows unbounded. */
export const MEMORY_CAP = 200;

/** Minimum length for a parsed memory line — shorter lines are formatting noise, not learnings. */
const MIN_MEMORY_LENGTH = 10;

export interface LoadedMemory {
  id: string;
  content: string;
  createdAt: Date;
}

/** Loads the most recent memories for an agent, newest first. */
export async function loadMemories(
  agentId: AgentId,
  take: number = MEMORY_CONTEXT_WINDOW,
): Promise<LoadedMemory[]> {
  return prisma.agentMemory.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, content: true, createdAt: true },
  });
}

/**
 * Splits a raw model response on the memory heading.
 *
 * Everything before it is the clean output shown to the user and saved to the run; everything
 * after is the memory block. If the model never emitted the heading, the whole response is output
 * and no memories are recorded.
 */
export function splitMemoryBlock(raw: string): { output: string; memoryBlock: string } {
  const index = raw.indexOf(MEMORY_HEADING);

  if (index === -1) {
    return { output: raw.trim(), memoryBlock: '' };
  }

  return {
    output: raw.slice(0, index).trim(),
    memoryBlock: raw.slice(index + MEMORY_HEADING.length).trim(),
  };
}

/**
 * Parses the memory block into individual entries: strips list markers and bold wrappers, drops
 * anything too short to be a real learning, and de-duplicates within the block.
 */
export function parseMemoryBlock(memoryBlock: string): string[] {
  if (!memoryBlock) return [];

  const seen = new Set<string>();
  const memories: string[] = [];

  for (const line of memoryBlock.split('\n')) {
    const cleaned = line
      .trim()
      .replace(/^[-*•]\s*/, '') // list markers
      .replace(/^\d+[.)]\s*/, '') // numbered lists
      .replace(/^#+\s*/, '') // stray headings
      .trim();

    if (cleaned.length < MIN_MEMORY_LENGTH) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    memories.push(cleaned);
  }

  return memories;
}

/**
 * Persists parsed memories against a run, then trims the agent back to MEMORY_CAP rows.
 * Returns how many were saved.
 */
export async function saveMemories(
  agentId: AgentId,
  runId: string,
  memories: string[],
): Promise<number> {
  if (memories.length === 0) return 0;

  await prisma.agentMemory.createMany({
    data: memories.map((content) => ({ agentId, runId, content })),
  });

  await trimMemories(agentId);

  return memories.length;
}

/** Deletes the oldest memories beyond the cap. Logs when it fires so the trimming is visible. */
async function trimMemories(agentId: AgentId): Promise<void> {
  const total = await prisma.agentMemory.count({ where: { agentId } });

  if (total <= MEMORY_CAP) return;

  const excess = total - MEMORY_CAP;

  const oldest = await prisma.agentMemory.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
    take: excess,
    select: { id: true },
  });

  await prisma.agentMemory.deleteMany({
    where: { id: { in: oldest.map((memory) => memory.id) } },
  });

  console.info(`[memory] Trimmed ${excess} oldest memories for "${agentId}" (cap ${MEMORY_CAP}).`);
}
