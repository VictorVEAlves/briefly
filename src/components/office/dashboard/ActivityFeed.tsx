'use client';

import { cn } from '@/components/ui/chrome';
import type { AgenteLog } from '@/types/campanha';
import type { OfficeConnectionState } from '../agents/agentConfig';

type ActivityFeedProps = {
  logs: AgenteLog[];
  connectionState: OfficeConnectionState;
};

const AGENT_ICONS: Record<string, string> = {
  briefing: '📋',
  email: '✉️',
  whatsapp: '💬',
  tasks: '⚡',
  artes: '🎨',
  orchestrator: '🛰️',
};

export function ActivityFeed({ logs, connectionState }: ActivityFeedProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Activity feed
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Atividade em tempo real
          </h2>
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em]',
            connectionState === 'live'
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connectionState === 'live' ? 'animate-pulse bg-emerald-300' : 'bg-amber-300'
            )}
          />
          {connectionState === 'live' ? 'live' : 'syncing'}
        </span>
      </div>

      <div className="mt-5 max-h-[610px] space-y-2 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="rounded-[22px] border border-white/8 bg-[rgba(8,8,15,0.5)] px-4 py-4 text-sm text-slate-400">
            Sem atividade recente registrada.
          </div>
        ) : (
          logs.slice(0, 16).map((log) => (
            <div
              key={log.id}
              className={cn(
                'motion-safe:animate-fade-up rounded-[22px] border px-4 py-4',
                log.status === 'erro'
                  ? 'border-rose-400/20 bg-rose-500/8'
                  : 'border-white/8 bg-[rgba(8,8,15,0.5)]'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{AGENT_ICONS[log.agente] ?? '•'}</span>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    {log.agente}
                  </p>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  {formatTime(log.created_at)}
                </p>
              </div>
              <p className="mt-3 text-sm font-medium text-white">{humanizeStatus(log.status)}</p>
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

function humanizeStatus(status: string) {
  if (status === 'iniciado') return 'Agente iniciou a etapa';
  if (status === 'concluido') return 'Agente concluiu a etapa';
  if (status === 'erro') return 'Agente registrou um erro';
  return status;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
