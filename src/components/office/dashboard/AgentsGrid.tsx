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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Agents grid
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Agentes do Briefly
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Status, progresso e ultima acao dos 5 agentes core. Clique para abrir os
            detalhes completos no painel lateral.
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300">
          +{extraAgents.length} extras
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} onSelect={onSelect} />
        ))}

        <button
          type="button"
          onClick={onNewAgent}
          className="flex min-h-[312px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/15 bg-[rgba(8,8,15,0.44)] p-6 text-center transition duration-200 hover:border-violet-300/35 hover:bg-[rgba(26,26,46,0.75)]"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 font-mono text-2xl text-white">
            +
          </span>
          <p className="mt-5 text-base font-semibold text-white">Novo agente</p>
          <p className="mt-2 max-w-[16rem] text-sm leading-6 text-slate-400">
            Crie um agente customizado com especialidade, cor e instrucoes proprias.
          </p>
        </button>
      </div>
    </section>
  );
}
