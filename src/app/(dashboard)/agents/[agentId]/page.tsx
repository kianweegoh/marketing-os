import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AgentWorkspace } from '@/components/agents/AgentWorkspace';
import { getAgent, getAllAgents } from '@/lib/agents/registry';

interface AgentPageProps {
  params: { agentId: string };
}

/** Pre-renders the seven known agent routes; anything else falls through to notFound(). */
export function generateStaticParams(): Array<{ agentId: string }> {
  return getAllAgents().map((agent) => ({ agentId: agent.id }));
}

export function generateMetadata({ params }: AgentPageProps): Metadata {
  const agent = getAgent(params.agentId);

  if (!agent) return { title: 'Agent not found · Marketing OS' };

  return {
    title: `${agent.name} · Marketing OS`,
    description: agent.description,
  };
}

export default function AgentPage({ params }: AgentPageProps) {
  const agent = getAgent(params.agentId);

  if (!agent) notFound();

  return <AgentWorkspace agent={agent} />;
}
