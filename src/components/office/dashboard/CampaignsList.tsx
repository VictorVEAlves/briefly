'use client';

import { StatePanel } from '@/components/ui/chrome';
import type { DashboardCampaignItem } from '../hooks/useDashboardData';
import { CampaignRow } from './CampaignRow';

type CampaignsListProps = {
  campaigns: DashboardCampaignItem[];
  loading: boolean;
};

export function CampaignsList({ campaigns, loading }: CampaignsListProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Campaigns list
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
            Campanhas recentes
          </h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-300">
          {campaigns.length} recentes
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[82px] animate-pulse rounded-[22px] border border-white/8 bg-white/5"
            />
          ))
        ) : campaigns.length === 0 ? (
          <StatePanel
            tone="neutral"
            icon="--"
            title="Nenhuma campanha carregada"
            description="Assim que o Briefly receber novos briefings, eles vao aparecer aqui."
            className="border-white/10 bg-[rgba(8,8,15,0.5)]"
          />
        ) : (
          campaigns.map((campaign) => <CampaignRow key={campaign.campanha.id} item={campaign} />)
        )}
      </div>
    </section>
  );
}
