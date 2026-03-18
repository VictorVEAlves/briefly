'use client';

import { cn } from '@/components/ui/chrome';
import type { OfficeMetrics } from '../agents/agentConfig';
import type { DashboardAnalytics } from '../hooks/useDashboardData';

type MetricsBarProps = {
  metrics: OfficeMetrics;
  analytics: DashboardAnalytics;
  loading: boolean;
  refreshing?: boolean;
};

export function MetricsBar({
  metrics,
  analytics,
  loading,
  refreshing = false,
}: MetricsBarProps) {
  const items = [
    {
      label: 'Campanhas ativas',
      value: metrics.activeCampaigns,
      detail:
        analytics.campaignsToday > 0 ? `+${analytics.campaignsToday} hoje` : 'sem novas hoje',
    },
    {
      label: 'Campanhas prontas',
      value: metrics.readyCampaigns,
      detail: metrics.readyCampaigns > 0 ? 'prontas para revisao' : 'aguardando conclusoes',
    },
    {
      label: 'Tasks pendentes',
      value: metrics.pendingTasks,
      detail: metrics.pendingTasks === 0 ? 'pipeline ok' : 'etapas em fila',
    },
    {
      label: 'Outputs gerados',
      value: metrics.outputsGenerated,
      detail:
        analytics.outputsToday > 0 ? `+${analytics.outputsToday} hoje` : 'sem outputs hoje',
    },
    {
      label: 'Aprovacoes pendentes',
      value: metrics.approvals,
      detail: metrics.approvals > 0 ? 'aguardando decisao' : 'sem pendencias',
    },
  ];

  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-4 backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Metrics bar
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Operacao em tempo real
          </h2>
        </div>

        <span
          className={cn(
            'rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em]',
            refreshing
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          )}
        >
          {refreshing ? 'syncing' : 'live'}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[22px] border border-white/8 bg-[rgba(8,8,15,0.64)] px-4 py-4"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-500">
              {item.label}
            </p>
            {loading ? (
              <div className="mt-3 space-y-3">
                <div className="h-8 w-20 animate-pulse rounded-xl bg-white/10" />
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/5" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                  {item.value}
                </p>
                <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
