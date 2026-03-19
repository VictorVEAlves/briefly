'use client';

import { cn } from '@/components/ui/chrome';
import type { AgenteLog } from '@/types/campanha';
import type { OfficeConnectionState } from '../agents/agentConfig';

type ActivityFeedProps = {
  logs: AgenteLog[];
  connectionState: OfficeConnectionState;
};

const AGENT_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  tasks: 'Tarefas',
  artes: 'Artes',
  orchestrator: 'Orquestrador',
  analytics: 'Analytics',
};

const AGENT_COLORS: Record<string, string> = {
  briefing: '#a78bfa',
  email: '#60a5fa',
  whatsapp: '#34d399',
  tasks: '#fbbf24',
  artes: '#f472b6',
  orchestrator: '#818cf8',
  analytics: '#38bdf8',
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

      <div className="mt-4 max-h-[480px] overflow-y-auto">
        {logs.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">Sem atividade recente registrada.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {logs.slice(0, 10).map((log) => {
              const isError = log.status === 'erro';
              const agentColor = AGENT_COLORS[log.agente] ?? '#94a3b8';
              const cleanMsg = sanitizeMensagem(log.mensagem);
              return (
                <div key={log.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  {/* Color dot */}
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: isError ? '#f87171' : agentColor }}
                  />

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.2em]"
                        style={{ color: agentColor }}
                      >
                        {AGENT_LABELS[log.agente] ?? log.agente}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-slate-600">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 text-[13px] font-medium',
                        isError ? 'text-rose-300' : 'text-slate-200'
                      )}
                    >
                      {humanizeStatus(log.status)}
                    </p>
                    {cleanMsg && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-slate-500">
                        {cleanMsg}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {logs.length >= 10 && (
          <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-700">
            mostrando últimas 10 atividades
          </p>
        )}
      </div>
    </section>
  );
}

function sanitizeMensagem(mensagem: string | null): string | null {
  if (!mensagem) return null;
  const s = mensagem.trim();
  if (!s) return null;

  // Pure JSON blob — try to extract a human-readable field
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      const msg =
        (parsed.message as string | undefined) ??
        (parsed.error as string | undefined) ??
        (parsed.detail as string | undefined);
      if (typeof msg === 'string' && msg.length > 0) return truncate(msg, 120);
    } catch {
      // not valid JSON
    }
    return null; // raw JSON with no extractable message — hide it
  }

  // Text that contains an embedded JSON blob — keep only the text before the blob
  const jsonIndex = s.search(/ \{["{\[]/);
  if (jsonIndex > 20) {
    return truncate(s.slice(0, jsonIndex).trim(), 120);
  }

  // Very long single-line dump (e.g. HTTP error body) — truncate
  return truncate(s, 120);
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max).trimEnd() + '…' : s;
}

function humanizeStatus(status: string) {
  if (status === 'iniciado') return 'Etapa iniciada';
  if (status === 'concluido') return 'Etapa concluída';
  if (status === 'erro') return 'Erro na execução';
  return status;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
