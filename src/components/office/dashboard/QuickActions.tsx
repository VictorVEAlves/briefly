'use client';

import { useMemo, useState } from 'react';
import { Spinner, cn } from '@/components/ui/chrome';
import type { DashboardCampaignItem } from '../hooks/useDashboardData';

type QuickActionsProps = {
  campaigns: DashboardCampaignItem[];
  pendingApprovalCampaignId: string | null;
  onNewBriefing: () => void;
  onReconnectCanva: () => void;
  onAnalytics: () => void;
  onApprovePending: () => void;
  onExport: () => void;
  onRerun: (campaignId: string) => Promise<void>;
};

export function QuickActions({
  campaigns,
  pendingApprovalCampaignId,
  onNewBriefing,
  onReconnectCanva,
  onAnalytics,
  onApprovePending,
  onExport,
  onRerun,
}: QuickActionsProps) {
  const [rerunOpen, setRerunOpen] = useState(false);
  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const actionItems = useMemo(
    () => [
      { label: 'Novo Briefing', onClick: onNewBriefing, tone: 'primary' as const },
      { label: 'Reconectar Canva', onClick: onReconnectCanva, tone: 'secondary' as const },
      { label: 'Analytics', onClick: onAnalytics, tone: 'secondary' as const },
      { label: 'Rodar Pipeline', onClick: () => setRerunOpen(true), tone: 'secondary' as const },
      {
        label: 'Aprovar Pendentes',
        onClick: onApprovePending,
        tone: pendingApprovalCampaignId ? ('secondary' as const) : ('disabled' as const),
      },
      {
        label: 'Exportar CSV',
        onClick: onExport,
        tone: campaigns.length > 0 ? ('secondary' as const) : ('disabled' as const),
      },
    ],
    [
      campaigns.length,
      onAnalytics,
      onApprovePending,
      onExport,
      onNewBriefing,
      onReconnectCanva,
      pendingApprovalCampaignId,
    ]
  );

  const handleRerunCampaign = async (campaignId: string) => {
    setRunningCampaignId(campaignId);
    setError(null);
    try {
      await onRerun(campaignId);
      setRerunOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao rodar o pipeline');
    } finally {
      setRunningCampaignId(null);
    }
  };

  return (
    <>
      <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Quick actions
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Acoes rapidas
          </h2>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {actionItems.map((item) => {
            const disabled = item.tone === 'disabled';

            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                disabled={disabled}
                className={cn(
                  'inline-flex h-12 items-center justify-center rounded-2xl border px-4 font-mono text-[11px] uppercase tracking-[0.22em] transition',
                  item.tone === 'primary'
                    ? 'border-violet-400/35 bg-violet-500/18 text-white hover:bg-violet-500/28'
                    : item.tone === 'disabled'
                      ? 'cursor-not-allowed border-white/8 bg-white/5 text-slate-600'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {rerunOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[rgba(8,8,15,0.98)] p-5 shadow-[0_40px_120px_-36px_rgba(0,0,0,0.88)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  Pipeline
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
                  Reprocessar campanha
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  O Briefly vai rerodar apenas as etapas ausentes ou em erro, sem duplicar a campanha.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRerunOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.campanha.id}
                  type="button"
                  onClick={() => handleRerunCampaign(campaign.campanha.id)}
                  disabled={runningCampaignId !== null}
                  className="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-[rgba(18,18,31,0.86)] px-4 py-4 text-left transition hover:border-white/20 hover:bg-[rgba(26,26,46,0.92)] disabled:cursor-wait disabled:opacity-70"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{campaign.campanha.nome}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {campaign.outputCount} outputs gerados • status {campaign.derivedStatus}
                    </p>
                  </div>

                  {runningCampaignId === campaign.campanha.id ? (
                    <Spinner className="h-4 w-4 text-white" />
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-300">
                      Rodar
                    </span>
                  )}
                </button>
              ))}
            </div>

            {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
