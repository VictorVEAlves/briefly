'use client';

import type { Agente } from '@/types/campanha';

interface LogEntry {
  id: string;
  agente: string;
  mensagem: string | null;
  status: string;
  created_at: string;
}

interface Props {
  agentId: string | null;
  agents: Record<string, Agente>;
  logs: LogEntry[];
  onClose: () => void;
  onNewCampaign: () => void;
}

const AGENT_TASKS: Record<string, Array<{ icon: string; name: string; sub: string }>> = {
  email: [
    { icon: '✉️', name: 'Gerar email de campanha', sub: 'HTML + assunto + preview' },
    { icon: '🔁', name: 'Criar sequência de automação', sub: 'Fluxo RD Station' },
  ],
  whatsapp: [
    { icon: '📲', name: 'Gerar mensagem de campanha', sub: 'Grupo VIP, Tallos, base geral' },
    { icon: '🎯', name: 'Criar follow-up', sub: 'Pós-compra ou abandono' },
  ],
  canva: [
    { icon: '🖼️', name: 'Post feed Instagram', sub: '1080×1080 com produto' },
    { icon: '📱', name: 'Stories Instagram', sub: '1080×1920 com CTA' },
  ],
  tasks: [
    { icon: '✅', name: 'Criar tasks de campanha', sub: 'Lista no ClickUp com prazos' },
  ],
  briefing: [
    { icon: '📋', name: 'Gerar briefing completo', sub: 'Markdown estruturado' },
  ],
};

const STATUS_COLOR: Record<string, string> = {
  idle: '#2ed769',
  working: '#f0a060',
  done: '#2ed769',
  error: '#f06060',
};

const STATUS_LABEL: Record<string, string> = {
  idle: 'Disponível',
  working: 'Trabalhando',
  done: 'Concluído',
  error: 'Erro',
};

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h`;
}

export default function AgentSidebar({ agentId, agents, logs, onClose, onNewCampaign }: Props) {
  if (!agentId) return null;

  const isBrieflyManager = agentId === 'briefly';
  const agent = agents[agentId];

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'transparent',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 52,
          right: 0,
          bottom: 0,
          width: 340,
          zIndex: 45,
          background: 'rgba(12,10,7,0.96)',
          backdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            {isBrieflyManager ? (
              <>
                <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 6 }}>
                  Gerenciador
                </p>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f0ece4', margin: 0, letterSpacing: '-0.03em' }}>
                  ✦ Briefly
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  Automação de campanhas de marketing
                </p>
              </>
            ) : agent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{agent.emoji}</span>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLOR[agent.status] ?? '#888',
                      animation: agent.status === 'working' ? 'pulse 1.4s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: STATUS_COLOR[agent.status] ?? '#888', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                    {STATUS_LABEL[agent.status] ?? agent.status}
                  </span>
                </div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: '#f0ece4', margin: 0, letterSpacing: '-0.03em' }}>
                  {agent.nome}
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {agent.especialidade}
                </p>
              </>
            ) : (
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0ece4', margin: 0 }}>Agente</h2>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Briefly manager view */}
          {isBrieflyManager && (
            <>
              <button
                onClick={onNewCampaign}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'linear-gradient(135deg,rgba(224,38,31,0.9),rgba(160,16,16,0.9))',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  textAlign: 'center',
                  letterSpacing: '-0.01em',
                }}
              >
                + Nova campanha
              </button>

              {/* Agent status list */}
              <Section title="Status dos agentes">
                {Object.values(agents).filter(a => a.ativo).map((a) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{a.emoji}</span>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{a.nome}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: STATUS_COLOR[a.status] ?? '#888', textTransform: 'uppercase' }}>
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </div>
                ))}
                {Object.values(agents).filter(a => a.ativo).length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Nenhum agente ativo.</p>
                )}
              </Section>

              {/* Activity feed */}
              <Section title="Atividade recente">
                {logs.slice(0, 12).map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
                {logs.length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sem atividade ainda.</p>
                )}
              </Section>
            </>
          )}

          {/* Agent-specific view */}
          {!isBrieflyManager && agent && (
            <>
              {/* Current task */}
              {agent.status === 'working' && agent.tarefa_atual && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(232,82,26,0.12)', border: '1px solid rgba(232,82,26,0.25)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#f0a060', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 5 }}>Em execução</p>
                  <p style={{ fontSize: 13, color: '#f0ece4', margin: 0 }}>{agent.tarefa_atual}</p>
                </div>
              )}

              {/* Error state */}
              {agent.status === 'error' && (
                <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(180,30,30,0.12)', border: '1px solid rgba(180,30,30,0.3)' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: 9, color: '#f06060', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 5 }}>Erro</p>
                  <p style={{ fontSize: 12, color: 'rgba(240,96,96,0.8)', margin: 0 }}>{agent.tarefa_atual ?? 'Falha desconhecida'}</p>
                </div>
              )}

              {/* Available tasks */}
              {AGENT_TASKS[agentId] && (
                <Section title="Tarefas disponíveis">
                  {AGENT_TASKS[agentId].map((task) => (
                    <div key={task.name} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{task.icon}</span>
                      <div>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '0 0 3px' }}>{task.name}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{task.sub}</p>
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {/* Recent logs for this agent */}
              <Section title="Histórico">
                {logs.filter((l) => l.agente === agentId).slice(0, 8).map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
                {logs.filter((l) => l.agente === agentId).length === 0 && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Sem histórico ainda.</p>
                )}
              </Section>
            </>
          )}

          {/* Unknown agent */}
          {!isBrieflyManager && !agent && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Agente não encontrado.</p>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 10 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const dotColor = log.status === 'erro' ? '#f06060' : log.status === 'concluido' ? '#2ed769' : '#f0a060';
  return (
    <div style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, marginTop: 5, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.mensagem ?? log.status}
        </p>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
          {log.agente} · {formatTime(log.created_at)}
        </span>
      </div>
    </div>
  );
}
