'use client';

import type { OfficeMetrics } from '../agents/agentConfig';

type StatusBarProps = {
  metrics: OfficeMetrics;
};

export function StatusBar({ metrics }: StatusBarProps) {
  const items = [
    { label: 'Campanhas ativas', value: metrics.activeCampaigns },
    { label: 'Campanhas prontas', value: metrics.readyCampaigns },
    { label: 'Tasks pendentes', value: metrics.pendingTasks },
    { label: 'Outputs gerados', value: metrics.outputsGenerated },
    { label: 'Aprovacoes', value: metrics.approvals },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-6 sm:pb-6">
      <div className="mx-auto grid max-w-[1600px] gap-2 rounded-[24px] border border-white/10 bg-[rgba(8,8,15,0.86)] p-3 backdrop-blur-xl sm:grid-cols-5 sm:p-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
