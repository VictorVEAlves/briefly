'use client';

import {
  OFFICE_STATUS_META,
  type OfficeAgentStatus,
  type OfficeEntityId,
} from '../agents/agentConfig';

type AgentCardProps = {
  agent: OfficeAgentStatus;
  onSelect: (id: OfficeEntityId) => void;
};

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const meta = OFFICE_STATUS_META[agent.status];
  const total = Math.max(agent.tasksTotal, 1);
  const progress = Math.round((agent.tasksCompleted / total) * 100);
  const initial = agent.displayName.slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={() => onSelect(agent.id)}
      className="group relative flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-[rgba(18,18,31,0.82)] p-3 text-left transition duration-200 hover:border-white/16 hover:bg-[rgba(26,26,46,0.94)]"
    >
      {/* Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
        style={{
          background: `${agent.color}22`,
          border: `1.5px solid ${agent.color}44`,
          color: agent.color,
        }}
      >
        {initial}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[13px] font-semibold text-slate-100">
            {agent.displayName}
          </span>
          {/* Status dot */}
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
            title={meta.label}
          />
        </div>
        {/* Progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Number.isFinite(progress) ? progress : 0}%`,
                backgroundColor: agent.status === 'error' ? '#ef4444' : agent.color,
              }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] text-slate-500">
            {agent.tasksCompleted}/{agent.tasksTotal}
          </span>
        </div>
      </div>
    </button>
  );
}
