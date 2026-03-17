'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/components/ui/chrome';
import type { Agente, AgenteLog } from '@/types/campanha';
import {
  OFFICE_STATUS_META,
  getCoreAgentConfig,
  type CoreOfficeAgentId,
  type OfficeAgentStatus,
  type OfficeEntityId,
  type OfficeMetrics,
} from '../agents/agentConfig';

type AgentPanelProps = {
  selectedId: OfficeEntityId | null;
  coreAgents: OfficeAgentStatus[];
  extraAgents: Agente[];
  logs: AgenteLog[];
  metrics: OfficeMetrics;
  onClose: () => void;
  onRestart: (id: CoreOfficeAgentId) => void;
  onSelect: (id: OfficeEntityId) => void;
  onNewCampaign: () => void;
  onHire: () => void;
};

export function AgentPanel({
  selectedId,
  coreAgents,
  extraAgents,
  logs,
  metrics,
  onClose,
  onRestart,
  onSelect,
  onNewCampaign,
  onHire,
}: AgentPanelProps) {
  const [showLogs, setShowLogs] = useState(true);

  useEffect(() => {
    setShowLogs(true);
  }, [selectedId]);

  const selectedCore = useMemo(
    () => coreAgents.find((agent) => agent.id === selectedId),
    [coreAgents, selectedId]
  );
  const selectedExtra = useMemo(
    () => extraAgents.find((agent) => agent.id === selectedId),
    [extraAgents, selectedId]
  );

  if (!selectedId) return null;

  return (
    <aside className="pointer-events-auto absolute inset-y-0 right-0 z-40 flex w-full justify-end bg-[linear-gradient(270deg,rgba(8,8,15,0.2),rgba(8,8,15,0))] pl-6">
      <div className="flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[rgba(8,8,15,0.94)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Pixel Office
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {selectedId === 'hub'
                ? 'Hub BRIEFLY'
                : selectedCore?.displayName ?? selectedExtra?.nome ?? 'Agent'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {selectedId === 'hub' ? (
            <HubPanel
              metrics={metrics}
              logs={logs}
              extraAgents={extraAgents}
              onSelect={onSelect}
              onNewCampaign={onNewCampaign}
              onHire={onHire}
            />
          ) : selectedCore ? (
            <CoreAgentPanel
              agent={selectedCore}
              logs={logs}
              showLogs={showLogs}
              onToggleLogs={() => setShowLogs((value) => !value)}
              onRestart={() => onRestart(selectedCore.id)}
            />
          ) : selectedExtra ? (
            <ExtraAgentPanel agent={selectedExtra} />
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function HubPanel({
  metrics,
  logs,
  extraAgents,
  onSelect,
  onNewCampaign,
  onHire,
}: {
  metrics: OfficeMetrics;
  logs: AgenteLog[];
  extraAgents: Agente[];
  onSelect: (id: OfficeEntityId) => void;
  onNewCampaign: () => void;
  onHire: () => void;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-violet-400/18 bg-[linear-gradient(180deg,rgba(88,28,135,0.28),rgba(15,23,42,0.72))] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
              Orquestrador
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
              Centro de operacao das campanhas
            </h2>
            <p className="mt-3 text-sm leading-6 text-violet-100/75">
              O hub acompanha o realtime do Supabase, centraliza o roster contratado e
              mostra a esteira viva dos agentes core do Briefly.
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-300/20 bg-violet-400/10 font-mono text-xs uppercase tracking-[0.24em] text-white">
            HUB
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionButton onClick={onNewCampaign}>+ Campanha</ActionButton>
          <ActionButton onClick={onHire} tone="secondary">
            + Agente
          </ActionButton>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <PanelMetric label="Campanhas ativas" value={metrics.activeCampaigns} />
        <PanelMetric label="Outputs gerados" value={metrics.outputsGenerated} />
        <PanelMetric label="Tasks pendentes" value={metrics.pendingTasks} />
        <PanelMetric label="Erros" value={metrics.errors} tone="danger" />
      </section>

      <section className="rounded-[26px] border border-white/8 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">
              Roster secundario
            </p>
            <h3 className="mt-2 text-sm font-semibold text-white">Agentes contratados</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300">
            {extraAgents.length}
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {extraAgents.length === 0 ? (
            <p className="text-sm leading-6 text-slate-400">
              Nenhum agente adicional contratado ainda.
            </p>
          ) : (
            extraAgents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelect(agent.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-black/10 px-3 py-3 text-left transition hover:border-white/16 hover:bg-white/5"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{agent.nome}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    {agent.especialidade}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em]',
                    agent.status === 'error'
                      ? 'bg-rose-500/10 text-rose-200'
                      : agent.status === 'working'
                        ? 'bg-amber-500/10 text-amber-200'
                        : 'bg-white/5 text-slate-300'
                  )}
                >
                  {agent.status}
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <LogsSection title="Atividade recente" logs={logs.slice(0, 12)} />
    </div>
  );
}

function CoreAgentPanel({
  agent,
  logs,
  showLogs,
  onToggleLogs,
  onRestart,
}: {
  agent: OfficeAgentStatus;
  logs: AgenteLog[];
  showLogs: boolean;
  onToggleLogs: () => void;
  onRestart: () => void;
}) {
  const config = getCoreAgentConfig(agent.id);
  const filteredLogs = logs.filter((log) => log.agente === config.backendAgent).slice(0, 18);
  const meta = OFFICE_STATUS_META[agent.status];
  const progressLabel =
    agent.tasksTotal > 0 ? `${agent.tasksCompleted}/${agent.tasksTotal}` : 'sem carga';

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(8,8,15,0.82))] p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 text-2xl font-semibold text-white shadow-[0_0_40px_rgba(0,0,0,0.28)]"
            style={{
              background: `linear-gradient(135deg, ${agent.color}55, rgba(15,23,42,0.92))`,
            }}
          >
            {config.shortLabel.slice(0, 1)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Core agent
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
              {agent.displayName}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{agent.role}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{
                  borderColor: `${meta.color}55`,
                  backgroundColor: `${meta.color}18`,
                  color: meta.color,
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
                {meta.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                {progressLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PanelMetric label="Status" value={meta.label} compact />
          <PanelMetric
            label="Ultima acao"
            value={agent.lastAction ? 'registrada' : 'sem evento'}
            detail={agent.lastAction ?? 'Sem atividade recente.'}
            compact
          />
          <PanelMetric
            label="Campanha"
            value={agent.currentCampaign ?? 'livre'}
            compact
          />
          <PanelMetric
            label="Work mode"
            value={agent.workMode === 'type' ? 'typing' : 'reading'}
            compact
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ActionButton onClick={onRestart}>Reiniciar</ActionButton>
          <ActionButton onClick={onToggleLogs} tone="secondary">
            {showLogs ? 'Ocultar logs' : 'Ver logs'}
          </ActionButton>
        </div>
      </section>

      {showLogs ? <LogsSection title="Logs do agente" logs={filteredLogs} /> : null}
    </div>
  );
}

function ExtraAgentPanel({ agent }: { agent: Agente }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(8,8,15,0.82))] p-5">
        <div className="flex items-start gap-4">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 text-2xl"
            style={{ background: `linear-gradient(135deg, ${agent.cor}44, rgba(15,23,42,0.92))` }}
          >
            {agent.emoji}
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
              Extra agent
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">
              {agent.nome}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{agent.especialidade}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <PanelMetric label="Status" value={agent.status} compact />
          <PanelMetric
            label="Campanha"
            value={agent.campanha_id ? 'atribuido' : 'livre'}
            detail={agent.campanha_id ?? 'Sem campanha no momento.'}
            compact
          />
          <PanelMetric
            label="Tarefa atual"
            value={agent.tarefa_atual ? 'ativa' : 'ocioso'}
            detail={agent.tarefa_atual ?? 'Sem tarefa em execucao.'}
            compact
          />
          <PanelMetric label="Atualizado" value={formatRelative(agent.updated_at)} compact />
        </div>
      </section>
    </div>
  );
}

function LogsSection({
  title,
  logs,
}: {
  title: string;
  logs: AgenteLog[];
}) {
  return (
    <section className="rounded-[26px] border border-white/8 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-slate-500">
            Logs
          </p>
          <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300">
          {logs.length}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {logs.length === 0 ? (
          <p className="text-sm leading-6 text-slate-400">Nenhum log disponivel.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl border border-white/8 bg-black/10 px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {log.agente}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {formatRelative(log.created_at)}
                </p>
              </div>
              <p className="mt-2 text-sm font-medium text-white">{log.status}</p>
              {log.mensagem ? (
                <p className="mt-2 text-sm leading-6 text-slate-400">{log.mensagem}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PanelMetric({
  label,
  value,
  detail,
  tone = 'neutral',
  compact = false,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'danger';
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        tone === 'danger'
          ? 'border-rose-400/16 bg-rose-500/8'
          : 'border-white/8 bg-white/5'
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className={cn('mt-2 font-semibold text-white', compact ? 'text-sm' : 'text-2xl')}>
        {value}
      </p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p> : null}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  tone = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-2xl border px-4 font-mono text-[11px] uppercase tracking-[0.24em] transition duration-150 focus:outline-none focus:ring-2 focus:ring-white/40',
        tone === 'primary'
          ? 'border-violet-400/40 bg-violet-500/20 text-white hover:bg-violet-500/28'
          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}
