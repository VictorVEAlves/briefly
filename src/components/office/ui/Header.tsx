'use client';

import { cn } from '@/components/ui/chrome';
import type { OfficeConnectionState } from '../agents/agentConfig';
import type { OfficeTabId } from '../OfficeTabs';

type HeaderProps = {
  agentCount: number;
  errors: number;
  readyCampaigns: number;
  connectionState: OfficeConnectionState;
  canvaConnected?: boolean;
  activeTab: OfficeTabId;
  onTabChange: (tab: OfficeTabId) => void;
  onNewCampaign: () => void;
  onHire: () => void;
};

export function Header({
  agentCount,
  errors,
  readyCampaigns,
  connectionState,
  canvaConnected,
  activeTab,
  onTabChange,
  onNewCampaign,
  onHire,
}: HeaderProps) {
  const live = connectionState === 'live';
  const title =
    activeTab === 'office' ? 'Pixel Office' : 'Operations Dashboard';

  return (
    <header className="pointer-events-auto absolute inset-x-0 top-0 z-30 border-b border-white/10 bg-[rgba(8,8,15,0.86)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(168,85,247,0.24),rgba(30,41,59,0.72))] shadow-[0_0_40px_rgba(168,85,247,0.22)]">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-white">
              BR
            </span>
          </div>

          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-slate-400">
              Briefly / Office
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold tracking-[-0.04em] text-white sm:text-xl">
                {title}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.24em]',
                  live
                    ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                    : 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                )}
              >
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    live ? 'animate-pulse bg-emerald-300' : 'bg-amber-300'
                  )}
                />
                {live ? 'Live' : 'Syncing'}
              </span>
            </div>

            <div className="mt-3">
              <OfficeTabSwitch activeTab={activeTab} onChange={onTabChange} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="hidden items-center gap-3 md:flex">
            <HeaderPill label={`${agentCount} agentes`} />
            <HeaderPill
              label={`${readyCampaigns} prontas`}
              tone={readyCampaigns > 0 ? 'success' : 'neutral'}
            />
            <HeaderPill
              label={`${errors} erros`}
              tone={errors > 0 ? 'danger' : 'neutral'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canvaConnected === false && (
              <span className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                1 alerta
              </span>
            )}
            <HeaderButton onClick={onNewCampaign}>+ Campanha</HeaderButton>
            <HeaderButton onClick={onHire} tone="secondary">
              + Agente
            </HeaderButton>
          </div>
        </div>
      </div>
    </header>
  );
}

function OfficeTabSwitch({
  activeTab,
  onChange,
}: {
  activeTab: OfficeTabId;
  onChange: (tab: OfficeTabId) => void;
}) {
  const tabs: Array<{ id: OfficeTabId; label: string; icon: string }> = [
    { id: 'office', label: 'Pixel Office', icon: '🏢' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  ];

  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'inline-flex h-10 items-center justify-center rounded-xl px-4 font-mono text-[11px] uppercase tracking-[0.22em] transition',
            activeTab === tab.id
              ? 'bg-violet-500/18 text-violet-100'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          )}
        >
          <span className="mr-2">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function HeaderPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'danger' | 'success';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.24em]',
        tone === 'danger'
          ? 'border-rose-400/30 bg-rose-500/10 text-rose-200'
          : tone === 'success'
            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
          : 'border-white/10 bg-white/5 text-slate-300'
      )}
    >
      {label}
    </span>
  );
}

function HeaderButton({
  children,
  onClick,
  tone = 'primary',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-2xl border px-4 font-mono text-[11px] uppercase tracking-[0.24em] transition duration-150 focus:outline-none focus:ring-2 focus:ring-white/40',
        tone === 'primary'
          ? 'border-violet-400/40 bg-violet-500/20 text-white hover:bg-violet-500/28'
          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
      )}
    >
      {children}
    </button>
  );
}
