'use client';

import { cn } from '@/components/ui/chrome';
import {
  OFFICE_STATUS_META,
  type OfficeAgentStatus,
  type OfficeEntityId,
} from '../agents/agentConfig';

type AgentCardProps = {
  agent: OfficeAgentStatus;
  onSelect: (id: OfficeEntityId) => void;
};

const AGENT_ICONS: Record<OfficeAgentStatus['id'], string> = {
  briefing: '📋',
  email: '✉️',
  whatsapp: '💬',
  tasks: '⚡',
  canva: '🎨',
};

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const meta = OFFICE_STATUS_META[agent.status];
  const total = Math.max(agent.tasksTotal, 1);
  const progress = Math.round((agent.tasksCompleted / total) * 100);
  const lastAction = agent.errorMessage ?? agent.lastAction ?? 'Sem atividade recente.';

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className="group flex h-full flex-col rounded-[26px] border border-white/10 bg-[rgba(18,18,31,0.82)] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-[rgba(26,26,46,0.94)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg">{AGENT_ICONS[agent.id]}</p>
          <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-white">
            {agent.displayName}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{agent.role}</p>
        </div>

        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-sm font-semibold text-white shadow-[0_0_30px_rgba(0,0,0,0.25)]"
          style={{ background: `linear-gradient(135deg, ${agent.color}55, rgba(15,23,42,0.88))` }}
        >
          {agent.displayName.slice(0, 1)}
        </span>
      </div>

      <div
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{
          borderColor: `${meta.color}55`,
          backgroundColor: `${meta.color}14`,
          color: meta.color,
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
        {meta.label}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <span>Progresso</span>
          <span>
            {agent.tasksCompleted}/{agent.tasksTotal}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className={cn('h-full rounded-full transition-all duration-300', agent.status === 'error' ? 'bg-rose-500' : '')}
            style={{
              width: `${Number.isFinite(progress) ? progress : 0}%`,
              ...(agent.status === 'error' ? {} : { backgroundColor: agent.color }),
            }}
          />
        </div>
      </div>

      <div className="mt-5 space-y-2 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
          Ultima acao
        </p>
        <p className="text-slate-300">{formatLastActionAt(agent.lastActionAt)}</p>
        <p className="line-clamp-2 leading-6 text-slate-400">{lastAction}</p>
      </div>

      {agent.status === 'error' && agent.id === 'canva' ? (
        <span className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl border border-orange-400/40 bg-orange-500/12 px-4 font-mono text-[10px] uppercase tracking-[0.22em] text-orange-100 group-hover:bg-orange-500/18">
          Reconectar Canva
        </span>
      ) : null}
    </button>
  );
}

function formatLastActionAt(value?: string) {
  if (!value) return 'Sem evento recente';
  const date = new Date(value);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
