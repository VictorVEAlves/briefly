'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { marked } from 'marked';
import {
  AppShell,
  MetricCard,
  PageHero,
  PrimaryButton,
  SectionCard,
  Spinner,
  StatePanel,
  StatusBadge,
  cn,
} from '@/components/ui/chrome';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { AgenteLog, Campanha, CampanhaOutput, WhatsAppMessage } from '@/types/campanha';

const TIPO_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  email: 'Email marketing',
  whatsapp: 'WhatsApp',
  arte_feed: 'Arte feed',
  arte_story: 'Arte story',
};

const AGENTE_LABELS: Record<string, string> = {
  orchestrator: 'Orquestracao da campanha',
  briefing: 'Geracao de briefing',
  tasks: 'Tarefas no ClickUp',
  email: 'Email marketing',
  whatsapp: 'Mensagens WhatsApp',
  artes: 'Artes e criativos',
};

const CANAL_LABELS: Record<string, string> = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  instagram_feed: 'Instagram feed',
  instagram_stories: 'Instagram stories',
};

type Props = {
  campanhaId: string;
  initialCampanha: Campanha;
  initialOutputs: CampanhaOutput[];
  initialLogs: AgenteLog[];
  supabaseUrl: string;
  supabaseAnonKey: string;
};

function parseEmailContent(conteudo: string) {
  const linhas = conteudo.split('\n');
  const assunto = linhas[0]?.replace(/^ASSUNTO:\s*/i, '').trim() ?? '';
  const preview = linhas[1]?.replace(/^PREVIEW:\s*/i, '').trim() ?? '';
  const html = linhas.slice(3).join('\n').trim();
  return { assunto, preview, html };
}

function formatTime(value?: string) {
  if (!value) return '--:--';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '--:--'
    : new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-white/72 px-4 py-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
        {label}
      </span>
      <span className="max-w-[65%] text-right text-sm font-medium leading-6 text-[var(--color-text)]">
        {value}
      </span>
    </div>
  );
}

function AgentTimeline({ logs }: { logs: AgenteLog[] }) {
  const agentes = ['orchestrator', 'briefing', 'tasks', 'email', 'whatsapp', 'artes'];
  const latestByAgent: Record<string, AgenteLog> = {};

  for (const log of logs) {
    latestByAgent[log.agente] = log;
  }

  const activeAgents = agentes.filter((agente) => latestByAgent[agente]);

  if (activeAgents.length === 0) {
    return (
      <StatePanel
        title="Timeline ainda vazia"
        description="Os agentes aparecem aqui assim que a campanha comeca a processar briefing, outputs e tarefas."
        icon="TL"
      />
    );
  }

  return (
    <div className="space-y-4">
      {activeAgents.map((agente, index) => {
        const log = latestByAgent[agente];
        const isRunning = log.status === 'iniciado';
        const toneClass =
          log.status === 'erro'
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : log.status === 'concluido'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700';

        return (
          <div key={agente} className="relative pl-10">
            {index < activeAgents.length - 1 ? (
              <span className="absolute left-[15px] top-8 h-[calc(100%+0.75rem)] w-px bg-[var(--color-border)]" />
            ) : null}

            <span
              className={cn(
                'absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold',
                toneClass
              )}
            >
              {isRunning ? <Spinner className="h-3.5 w-3.5" /> : 'OK'}
            </span>

            <div className="rounded-[22px] border border-[var(--color-border)] bg-white/72 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)]">
                    {AGENTE_LABELS[agente] ?? agente}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                    {log.mensagem || 'Sem detalhe adicional no log mais recente.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={log.status} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    {formatTime(log.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OutputFrame({
  title,
  status,
  subtitle,
  children,
  footer,
}: {
  title: string;
  status: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article className="panel-surface overflow-hidden rounded-[28px] border border-white/70">
      <div className="border-b border-[var(--color-border)] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[var(--color-text-muted)]">
              Output
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">{subtitle}</p>
            ) : null}
          </div>

          <StatusBadge status={status} />
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer ? <div className="border-t border-[var(--color-border)] px-5 py-4 sm:px-6">{footer}</div> : null}
    </article>
  );
}

function OutputFooter({
  output,
  isApproving,
  onApprove,
}: {
  output: CampanhaOutput;
  isApproving: boolean;
  onApprove: () => void;
}) {
  const canApprove = output.status === 'pronto';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-h-[1.25rem]">
        {output.clickup_doc_id ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            ClickUp doc: {output.clickup_doc_id}
          </span>
        ) : output.status === 'aprovado' ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-700">
            Revisao concluida
          </span>
        ) : null}
      </div>

      {canApprove ? (
        <PrimaryButton onClick={onApprove} busy={isApproving} className="w-full sm:w-auto sm:px-4 sm:py-3 sm:text-xs">
          {isApproving ? 'Aprovando...' : 'Aprovar output'}
        </PrimaryButton>
      ) : null}
    </div>
  );
}

function PendingOutputCard({ output }: { output: CampanhaOutput }) {
  return (
    <OutputFrame
      title={TIPO_LABELS[output.tipo] ?? output.tipo}
      status={output.status}
      subtitle="O agente ainda esta preparando esse bloco."
    >
      <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(224,38,31,0.08)] text-[var(--color-primary)]">
            <Spinner className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {output.status === 'gerando' ? 'Gerando conteudo' : 'Na fila de processamento'}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
              Assim que o output ficar pronto, o preview aparece automaticamente nesta tela.
            </p>
          </div>
        </div>
      </div>
    </OutputFrame>
  );
}

function ErrorOutputCard({ output }: { output: CampanhaOutput }) {
  return (
    <OutputFrame
      title={TIPO_LABELS[output.tipo] ?? output.tipo}
      status={output.status}
      subtitle="Esse bloco falhou durante a geracao."
    >
      <StatePanel
        tone="danger"
        icon="ER"
        title="Falha ao preparar o output"
        description="Verifique os logs do servidor ou rode a campanha novamente depois de corrigir a integracao responsavel."
      />
    </OutputFrame>
  );
}

function BriefingCard({
  output,
  isApproving,
  onApprove,
}: {
  output: CampanhaOutput;
  isApproving: boolean;
  onApprove: () => void;
}) {
  const html = output.conteudo ? (marked.parse(output.conteudo) as string) : '';

  return (
    <OutputFrame
      title={TIPO_LABELS.briefing}
      status={output.status}
      subtitle="Documento base usado como referencia editorial e operacional da campanha."
      footer={<OutputFooter output={output} isApproving={isApproving} onApprove={onApprove} />}
    >
      <div className="rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,243,237,0.96))] p-5 shadow-[0_24px_60px_-36px_rgba(17,20,27,0.22)]">
        <div className="mb-5 flex items-center justify-between border-b border-dashed border-[var(--color-border)] pb-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
            Campaign brief
          </span>
          <span className="rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
            Markdown render
          </span>
        </div>

        <div className="editorial-prose max-h-[560px] overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </OutputFrame>
  );
}

function EmailCard({
  output,
  isApproving,
  onApprove,
}: {
  output: CampanhaOutput;
  isApproving: boolean;
  onApprove: () => void;
}) {
  const { assunto, preview, html } = output.conteudo
    ? parseEmailContent(output.conteudo)
    : { assunto: '', preview: '', html: '' };

  return (
    <OutputFrame
      title={TIPO_LABELS.email}
      status={output.status}
      subtitle="Preview visual do email com cabecalho e corpo ja estruturados para revisao."
      footer={<OutputFooter output={output} isApproving={isApproving} onApprove={onApprove} />}
    >
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <DetailRow label="Assunto" value={assunto || 'Sem assunto detectado'} />
          <DetailRow label="Preview" value={preview || 'Sem preview detectado'} />
          <StatePanel
            title="Revisao sugerida"
            description="Valide hierarquia visual, CTA principal e consistencia com a oferta antes da aprovacao final."
            icon="EM"
          />
        </div>

        <div className="overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-[0_24px_60px_-36px_rgba(17,20,27,0.22)]">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-white/90 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-rose-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="ml-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Email preview
            </span>
          </div>
          <iframe
            srcDoc={html}
            title="Preview do email"
            className="h-[560px] w-full bg-white"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </OutputFrame>
  );
}

function WhatsAppCard({
  output,
  isApproving,
  onApprove,
}: {
  output: CampanhaOutput;
  isApproving: boolean;
  onApprove: () => void;
}) {
  let messages: WhatsAppMessage[] = [];

  try {
    if (output.conteudo) {
      messages = JSON.parse(output.conteudo) as WhatsAppMessage[];
    }
  } catch {
    messages = [];
  }

  return (
    <OutputFrame
      title={TIPO_LABELS.whatsapp}
      status={output.status}
      subtitle="Mensagens organizadas por lista, com leitura proxima de uma conversa real."
      footer={<OutputFooter output={output} isApproving={isApproving} onApprove={onApprove} />}
    >
      {messages.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {messages.map((message, index) => (
            <div
              key={`${message.lista}-${index}`}
              className="overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(180deg,#0f1720,#15202b)] p-4 text-white shadow-[0_24px_60px_-36px_rgba(17,20,27,0.32)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/60">
                  Lista
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium">
                  {message.lista}
                </span>
              </div>

              <div className="mt-4 flex justify-end">
                <div className="max-w-[92%] rounded-[22px] rounded-tr-md bg-[linear-gradient(135deg,#d4f7dd,#b9efca)] px-4 py-4 text-sm leading-7 text-slate-900 shadow-[0_16px_35px_-24px_rgba(6,78,59,0.55)]">
                  {message.mensagem}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <StatePanel
          tone="warning"
          icon="WA"
          title="Nao foi possivel ler o payload de WhatsApp"
          description="O output foi salvo, mas o conteudo nao parece estar em um formato JSON valido para o preview."
        />
      )}
    </OutputFrame>
  );
}

function ArteCard({
  output,
  isApproving,
  onApprove,
}: {
  output: CampanhaOutput;
  isApproving: boolean;
  onApprove: () => void;
}) {
  const label = TIPO_LABELS[output.tipo] ?? output.tipo;

  return (
    <OutputFrame
      title={label}
      status={output.status}
      subtitle="Aprovacao de asset pronto para abrir no Canva e seguir para iteracao final."
      footer={<OutputFooter output={output} isApproving={isApproving} onApprove={onApprove} />}
    >
      <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex aspect-[4/5] items-end rounded-[26px] border border-[rgba(224,38,31,0.14)] bg-[radial-gradient(circle_at_top,rgba(244,81,67,0.3),transparent_45%),linear-gradient(180deg,rgba(17,20,27,0.98),rgba(28,33,44,0.94))] p-5 text-white shadow-[0_24px_60px_-34px_rgba(17,20,27,0.45)]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/55">Asset preview</p>
            <p className="mt-3 text-2xl font-semibold tracking-[-0.04em]">{label}</p>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Abrir no Canva para revisar layout, copy e adaptacao final.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <StatePanel
            title="Fluxo recomendado"
            description="Abra o asset, valide composicao visual, ajuste pequenas variacoes se necessario e aprove aqui no painel."
            icon="AR"
          />

          {output.url_canva ? (
            <a
              href={output.url_canva}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[var(--color-border-strong)] bg-white px-5 py-4 text-sm font-semibold text-[var(--color-text)] shadow-[0_20px_50px_-32px_rgba(17,20,27,0.28)] transition hover:-translate-y-0.5"
            >
              Abrir no Canva
            </a>
          ) : null}

          <DetailRow label="URL" value={output.url_canva || 'Link nao disponivel'} />
        </div>
      </div>
    </OutputFrame>
  );
}

export default function AprovacaoClient({
  campanhaId,
  initialCampanha,
  initialOutputs,
  initialLogs,
  supabaseUrl,
  supabaseAnonKey,
}: Props) {
  const [campanha, setCampanha] = useState<Campanha>(initialCampanha);
  const [outputs, setOutputs] = useState<CampanhaOutput[]>(initialOutputs);
  const [logs, setLogs] = useState<AgenteLog[]>(initialLogs);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase client config ausente no cliente de aprovacao.');
      return;
    }

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

    const outputsSub = supabase
      .channel(`outputs-${campanhaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campanha_outputs',
          filter: `campanha_id=eq.${campanhaId}`,
        },
        (payload) => {
          const row = payload.new as CampanhaOutput;

          setOutputs((current) => {
            const existingIndex = current.findIndex((output) => output.id === row.id);
            if (existingIndex >= 0) {
              const next = [...current];
              next[existingIndex] = row;
              return next;
            }
            return [...current, row];
          });
        }
      )
      .subscribe();

    const logsSub = supabase
      .channel(`logs-${campanhaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agente_logs',
          filter: `campanha_id=eq.${campanhaId}`,
        },
        (payload) => {
          setLogs((current) => [...current, payload.new as AgenteLog]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(outputsSub);
      supabase.removeChannel(logsSub);
    };
  }, [campanhaId, supabaseAnonKey, supabaseUrl]);

  const handleApprove = async (outputId: string) => {
    setApprovingId(outputId);
    setApprovalError(null);

    try {
      const response = await fetch('/api/campanha/aprovar-output', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputId }),
      });

      if (!response.ok) {
        throw new Error('Falha ao aprovar o output');
      }

      setOutputs((current) =>
        current.map((output) =>
          output.id === outputId ? { ...output, status: 'aprovado' } : output
        )
      );
    } catch (error) {
      setApprovalError(
        error instanceof Error ? error.message : 'Erro ao aprovar o output'
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmarAprovacao = async () => {
    setConfirmando(true);
    setConfirmError(null);

    try {
      const response = await fetch('/api/campanha/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campanhaId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(error.error ?? 'Falha ao confirmar');
      }

      setCampanha((current) => ({ ...current, status: 'aprovada' }));
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : 'Erro ao confirmar');
    } finally {
      setConfirmando(false);
    }
  };

  const allOutputsApproved =
    outputs.length > 0 && outputs.every((o) => o.status === 'aprovado');
  const isApproved = campanha.status === 'aprovada';

  function renderOutput(output: CampanhaOutput) {
    const isApproving = approvingId === output.id;
    const onApprove = () => handleApprove(output.id);

    if (output.status === 'gerando' || output.status === 'pendente') {
      return <PendingOutputCard key={output.id} output={output} />;
    }
    if (output.status === 'erro') {
      return <ErrorOutputCard key={output.id} output={output} />;
    }
    if (output.tipo === 'briefing') {
      return <BriefingCard key={output.id} output={output} isApproving={isApproving} onApprove={onApprove} />;
    }
    if (output.tipo === 'email') {
      return <EmailCard key={output.id} output={output} isApproving={isApproving} onApprove={onApprove} />;
    }
    if (output.tipo === 'whatsapp') {
      return <WhatsAppCard key={output.id} output={output} isApproving={isApproving} onApprove={onApprove} />;
    }
    if (output.tipo === 'arte_feed' || output.tipo === 'arte_story') {
      return <ArteCard key={output.id} output={output} isApproving={isApproving} onApprove={onApprove} />;
    }
    return null;
  }

  return (
    <AppShell
      action={
        <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/70 sm:inline-flex">
          {isApproved ? 'Aprovada' : 'Em revisão'}
        </span>
      }
    >
      <PageHero
        eyebrow="Painel de aprovação"
        title={campanha.nome}
        description={`Revise os outputs gerados pelos agentes e aprove cada bloco antes de confirmar a campanha.`}
        badges={[
          ...(campanha.canais as string[]).map((c) => CANAL_LABELS[c] ?? c),
          campanha.produto_destaque,
        ].filter(Boolean)}
        aside={
          <>
            <MetricCard
              label="Outputs prontos"
              value={`${outputs.filter((o) => o.status !== 'gerando').length}/${outputs.length || '?'}`}
              detail="Cada bloco precisa ser revisado individualmente."
            />
            <MetricCard
              label="Status"
              value={isApproved ? 'Aprovada' : allOutputsApproved ? 'Pronta' : 'Em revisão'}
              detail={isApproved ? 'Campanha confirmada com sucesso.' : 'Aguardando aprovação dos outputs.'}
            />
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Coluna principal: outputs */}
          <div className="space-y-6">
            {outputs.length === 0 ? (
              <StatePanel
                tone="neutral"
                icon="AG"
                title="Aguardando geração"
                description="Os outputs aparecem aqui assim que os agentes terminam de processar."
              />
            ) : (
              outputs.map(renderOutput)
            )}

            {approvalError ? (
              <StatePanel tone="danger" icon="ER" title="Erro ao aprovar" description={approvalError} />
            ) : null}
          </div>

          {/* Sidebar: timeline + confirmar */}
          <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <SectionCard eyebrow="Pipeline" title="Agentes" description="Progresso de cada etapa da automação.">
              <AgentTimeline logs={logs} />
            </SectionCard>

            <SectionCard eyebrow="Dados" title="Campanha">
              <div className="space-y-3">
                <DetailRow label="Inicio" value={`${campanha.periodo_inicio.split('T')[0]}`} />
                <DetailRow label="Fim" value={`${campanha.periodo_fim.split('T')[0]}`} />
                <DetailRow label="Produto" value={campanha.produto_destaque} />
                {campanha.desconto_pix ? (
                  <DetailRow label="PIX" value={`${campanha.desconto_pix}%`} />
                ) : null}
                {campanha.parcelamento ? (
                  <DetailRow label="Parcelamento" value={campanha.parcelamento} />
                ) : null}
              </div>
            </SectionCard>

            {!isApproved ? (
              <div className="rounded-[28px] border border-[var(--color-border)] bg-[rgba(17,20,27,0.96)] p-6 text-[var(--color-text-inverse)]">
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-white/50">
                  Confirmação final
                </p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em]">
                  {allOutputsApproved ? 'Tudo aprovado — pronto para confirmar' : 'Aprove todos os outputs primeiro'}
                </p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Confirmar marca as tasks de revisão no ClickUp como concluídas.
                </p>

                {confirmError ? (
                  <p className="mt-3 text-sm text-rose-400">{confirmError}</p>
                ) : null}

                <PrimaryButton
                  onClick={handleConfirmarAprovacao}
                  busy={confirmando}
                  disabled={!allOutputsApproved}
                  className="mt-5 w-full"
                >
                  {confirmando ? 'Confirmando...' : 'Confirmar campanha'}
                </PrimaryButton>
              </div>
            ) : (
              <StatePanel
                tone="neutral"
                icon="OK"
                title="Campanha aprovada"
                description="Tasks de revisão marcadas como concluídas no ClickUp. O time pode prosseguir com os disparos."
              />
            )}

            <div className="text-center">
              <Link
                href="/briefing"
                className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
              >
                ← Nova campanha
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
