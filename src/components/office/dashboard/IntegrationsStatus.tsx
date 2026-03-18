'use client';

import { cn } from '@/components/ui/chrome';
import { getCanvaAuthorizeHref } from '@/lib/canva/authorizeHref';
import type { OfficeIntegrationStatus } from '../hooks/useDashboardData';

type IntegrationsStatusProps = {
  integrations: OfficeIntegrationStatus[];
  loading: boolean;
};

export function IntegrationsStatus({
  integrations,
  loading,
}: IntegrationsStatusProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[rgba(18,18,31,0.86)] p-5 backdrop-blur-xl">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-500">
          Integrations
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-white">
          Status das integracoes
        </h2>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-[82px] animate-pulse rounded-[22px] border border-white/8 bg-white/5"
            />
          ))
        ) : (
          integrations.map((integration) => (
            <div
              key={integration.key}
              className="rounded-[22px] border border-white/8 bg-[rgba(8,8,15,0.5)] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        integration.connected ? 'bg-emerald-400' : 'bg-rose-400'
                      )}
                    />
                    <p className="text-sm font-semibold text-white">{integration.label}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{integration.summary}</p>
                  <p className="mt-1 text-sm text-slate-500">{integration.detail}</p>
                </div>

                {integration.actionHref && integration.actionLabel ? (
                  <a
                    href={integration.key === 'canva' ? getCanvaAuthorizeHref() : integration.actionHref}
                    className="inline-flex h-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-200 transition hover:bg-white/10"
                  >
                    {integration.actionLabel}
                  </a>
                ) : integration.latencyMs != null ? (
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    {integration.latencyMs}ms
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
