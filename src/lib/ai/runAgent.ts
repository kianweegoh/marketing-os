import type Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { getAgent } from '@/lib/agents/registry';
import type { AgentId } from '@/lib/agents/types';
import { getCompanyContext } from '@/lib/companyContext';
import {
  AGENT_MODEL,
  MAX_OUTPUT_TOKENS,
  WEB_SEARCH_TOOL,
  getAnthropicClient,
} from '@/lib/ai/client';
import {
  MEMORY_HEADING,
  loadMemories,
  parseMemoryBlock,
  saveMemories,
  splitMemoryBlock,
  type LoadedMemory,
} from '@/lib/ai/memory';
import { AIProviderError, AgentNotFoundError, errorMessage } from '@/lib/utils';

export interface RunAgentOptions {
  agentId: AgentId;
  goal: string;
  orchestratorId?: string;
  onTextChunk?: (chunk: string) => void;
  onSearchStart?: (query: string) => void;
}

export interface RunAgentResult {
  runId: string;
  output: string;
  memoriesLoaded: number;
  memoriesSaved: number;
  searchesUsed: number;
  durationMs: number;
}

/**
 * Guards against an unbounded resume loop. A turn that uses server-side tools can stop with
 * `pause_turn` when the server-side tool loop hits its iteration limit; we re-send to continue,
 * but never more than this many times.
 */
const MAX_CONTINUATIONS = 5;

/** Builds the system prompt in the exact order the spec defines: context, agent, memories, rules. */
function composeSystemPrompt(
  companyContext: string,
  agentPrompt: string,
  memories: LoadedMemory[],
): string {
  const memoryList =
    memories.length > 0
      ? memories.map((memory, index) => `${index + 1}. ${memory.content}`).join('\n')
      : '(none yet — this is an early run for this agent)';

  return `${companyContext}

---

${agentPrompt}

## LOADED MEMORIES (${memories.length} entries)
${memoryList}

## MEMORY INSTRUCTIONS
After completing your response, append a "${MEMORY_HEADING}" section containing 2–4 bullet points of durable learnings from this run that will be useful in future runs. Record facts, patterns, and decisions — not restatements of your own output. Never record anything already present in the loaded memories above.`;
}

/**
 * The single agent execution path. Individual agent pages, the orchestrator, and the metrics
 * dashboard all call this — the logic is never duplicated elsewhere.
 */
export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const { agentId, goal, orchestratorId, onTextChunk, onSearchStart } = options;
  const startedAt = Date.now();

  // 1. Resolve the agent.
  const agent = getAgent(agentId);
  if (!agent) throw new AgentNotFoundError(agentId);

  // 2 & 3. Load the company context and this agent's recent memories.
  const [companyContext, memories] = await Promise.all([
    getCompanyContext(),
    loadMemories(agentId),
  ]);

  // 4. Compose the system prompt.
  const system = composeSystemPrompt(companyContext, agent.systemPrompt, memories);

  const client = getAnthropicClient();
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: goal }];

  let accumulated = '';
  let searchesUsed = 0;

  // 5 & 6. Stream, resuming across `pause_turn` boundaries.
  try {
    for (let attempt = 0; attempt <= MAX_CONTINUATIONS; attempt += 1) {
      const stream = client.messages.stream({
        model: AGENT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages,
        tools: [WEB_SEARCH_TOOL],
      });

      // A web search's query arrives as partial JSON across several deltas, so it is accumulated
      // per content-block index and only reported once the block closes.
      const pendingSearches = new Map<number, string>();

      for await (const event of stream) {
        switch (event.type) {
          case 'content_block_start': {
            const block = event.content_block;
            if (block.type === 'server_tool_use' && block.name === 'web_search') {
              searchesUsed += 1;
              pendingSearches.set(event.index, '');
            }
            break;
          }

          case 'content_block_delta': {
            if (event.delta.type === 'text_delta') {
              accumulated += event.delta.text;
              onTextChunk?.(event.delta.text);
            } else if (
              event.delta.type === 'input_json_delta' &&
              pendingSearches.has(event.index)
            ) {
              pendingSearches.set(
                event.index,
                (pendingSearches.get(event.index) ?? '') + event.delta.partial_json,
              );
            }
            break;
          }

          case 'content_block_stop': {
            const rawInput = pendingSearches.get(event.index);
            if (rawInput !== undefined) {
              pendingSearches.delete(event.index);
              onSearchStart?.(extractSearchQuery(rawInput));
            }
            break;
          }

          default:
            break;
        }
      }

      const finalMessage = await stream.finalMessage();

      // The server-side tool loop paused; re-send with the assistant turn appended to resume.
      // Do NOT add a "continue" user message — the API resumes from the trailing tool block.
      if (finalMessage.stop_reason === 'pause_turn') {
        messages.push({ role: 'assistant', content: finalMessage.content });
        continue;
      }

      if (finalMessage.stop_reason === 'refusal') {
        throw new AIProviderError(
          'The model declined this request. Rephrase the objective and try again.',
        );
      }

      break;
    }
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    console.error(`[runAgent] "${agentId}" failed:`, error);
    throw new AIProviderError(errorMessage(error), error);
  }

  // 7. Split the clean output from the memory block.
  const { output, memoryBlock } = splitMemoryBlock(accumulated);
  const durationMs = Date.now() - startedAt;

  // 8. Persist the run.
  const run = await prisma.agentRun.create({
    data: {
      agentId,
      goal,
      output,
      memoriesUsed: memories.length,
      searchesUsed,
      durationMs,
      orchestratorId: orchestratorId ?? null,
    },
    select: { id: true },
  });

  // 9. Parse and persist the memories.
  const memoriesSaved = await saveMemories(agentId, run.id, parseMemoryBlock(memoryBlock));

  // 10. Telegram notification for Performance Analyst runs lands with the integrations batch.
  //     It must be wrapped so a Telegram failure can never fail the run.

  return {
    runId: run.id,
    output,
    memoriesLoaded: memories.length,
    memoriesSaved,
    searchesUsed,
    durationMs,
  };
}

/**
 * Pulls the `query` field out of a streamed tool input. The JSON can be truncated if the block
 * ended early, so a parse failure falls back to a regex rather than throwing.
 */
function extractSearchQuery(rawInput: string): string {
  try {
    const parsed: unknown = JSON.parse(rawInput);
    if (parsed && typeof parsed === 'object' && 'query' in parsed) {
      const { query } = parsed as { query?: unknown };
      if (typeof query === 'string' && query.length > 0) return query;
    }
  } catch {
    const match = /"query"\s*:\s*"([^"]*)/.exec(rawInput);
    if (match?.[1]) return match[1];
  }

  return 'Searching the web';
}
