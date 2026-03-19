'use client';

import type { Agente } from '@/types/campanha';
import type { OfficeAgentStatus, OfficeEntityId } from '../agents/agentConfig';
import { AgentCard } from './AgentCard';

type AgentsGridProps = {
  agents: OfficeAgentStatus[];
  extraAgents: Agente[];
  onSelect: (id: OfficeEntityId) => void;
  onNewAgent: () => void;
};

export function AgentsGrid({
  agents,
  extraAgents,
  onSelect,
  onNewAgent,
}: AgentsGridProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Agents grid
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-[-0.04em] text-white">
            Agentes do Briefly
          </h2>
        </div>
        {extraAgents.length > 0 && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
            +{extraAgents.length} extras
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-2 grid-cols-2 md:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
        ))}

        <button
          type="button"
          onClick={onNewAgent}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-transparent p-3 text-left transition duration-200 hover:border-violet-300/30 hover:bg-[rgba(26,26,46,0.5)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-mono text-base text-slate-500">
            +
          </div>
          <span className="font-mono text-[13px] text-slate-500">Novo agente</span>
        </button>
      </div>
    </section>
  );
}
