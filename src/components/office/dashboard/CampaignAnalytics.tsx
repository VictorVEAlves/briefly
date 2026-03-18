'use client';

import type { DashboardAnalytics } from '../hooks/useDashboardData';

type CampaignAnalyticsProps = {
  analytics: DashboardAnalytics;
  loading: boolean;
};

export function CampaignAnalytics({ analytics, loading }: CampaignAnalyticsProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Campaign analytics
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
          Analise de campanhas
        </h2>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel
          title="Campanhas por status"
          items={[
            { label: 'Prontas', value: analytics.campaignsByStatus.pronta, color: '#22c55e' },
            { label: 'Ativas', value: analytics.campaignsByStatus.ativa, color: '#eab308' },
            { label: 'Erros', value: analytics.campaignsByStatus.erro, color: '#ef4444' },
            { label: 'Rascunho', value: analytics.campaignsByStatus.rascunho, color: '#64748b' },
            { label: 'Confirmadas', value: analytics.campaignsByStatus.aprovada, color: '#3b82f6' },
          ]}
          loading={loading}
        />
        <AnalyticsPanel
          title="Outputs por tipo"
          items={[
            { label: 'Briefings', value: analytics.outputsByType.briefing, color: '#a855f7' },
            { label: 'Emails', value: analytics.outputsByType.email, color: '#3b82f6' },
            { label: 'WhatsApp', value: analytics.outputsByType.whatsapp, color: '#22c55e' },
            { label: 'Arte Feed', value: analytics.outputsByType.arte_feed, color: '#f97316' },
            { label: 'Arte Story', value: analytics.outputsByType.arte_story, color: '#fb923c' },
            { label: 'Relatorios', value: analytics.outputsByType.relatorio, color: '#14b8a6' },
          ]}
          loading={loading}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/8 bg-[rgba(8,8,15,0.5)] p-4">
        <p className="text-base font-semibold text-white">Metricas pos-campanha</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Em breve: taxa de abertura, cliques, conversoes, engajamento no WhatsApp
          e performance por canal consolidada no mesmo painel.
        </p>
        <a
          href="#"
          className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300"
        >
          Configurar tracking de metricas
        </a>
      </div>
    </section>
  );
}

function AnalyticsPanel({
  title,
  items,
  loading,
}: {
  title: string;
  items: Array<{ label: string; value: number; color: string }>;
  loading: boolean;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-[24px] border border-white/8 bg-[rgba(8,8,15,0.5)] p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-400">{item.label}</p>
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {loading ? '--' : item.value}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${loading ? 24 : Math.max(8, (item.value / maxValue) * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
