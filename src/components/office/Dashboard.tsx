'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Agente, AgenteLog } from '@/types/campanha';
import { StatePanel, cn } from '@/components/ui/chrome';
import { getCanvaAuthorizeHref } from '@/lib/canva/authorizeHref';
import type {
  OfficeAgentStatus,
  OfficeConnectionState,
  OfficeEntityId,
  OfficeMetrics,
} from './agents/agentConfig';
import { useDashboardData } from './hooks/useDashboardData';
import { MetricsBar } from './dashboard/MetricsBar';
import { AgentsGrid } from './dashboard/AgentsGrid';
import { QuickActions } from './dashboard/QuickActions';
import { ActivityFeed } from './dashboard/ActivityFeed';
import { CampaignsList } from './dashboard/CampaignsList';
import { CampaignAnalytics } from './dashboard/CampaignAnalytics';
import { IntegrationsStatus } from './dashboard/IntegrationsStatus';

type DashboardProps = {
  coreAgents: OfficeAgentStatus[];
  extraAgents: Agente[];
  metrics: OfficeMetrics;
  logs: AgenteLog[];
  connectionState: OfficeConnectionState;
  onAgentSelect: (id: OfficeEntityId) => void;
  onNewCampaign: () => void;
  onNewAgent: () => void;
};

export default function Dashboard({
  coreAgents,
  extraAgents,
  metrics,
  logs,
  connectionState,
  onAgentSelect,
  onNewCampaign,
  onNewAgent,
}: DashboardProps) {
  const router = useRouter();
  const analyticsRef = useRef<HTMLDivElement | null>(null);
  const {
    recentCampaigns,
    analytics,
    pendingApprovalCampaignId,
    integrations,
    loading,
    refreshing,
    error,
    refresh,
  } = useDashboardData();
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [rerunMessage, setRerunMessage] = useState<string | null>(null);

  const handleExport = () => {
    if (recentCampaigns.length === 0) return;

    const header = ['id', 'nome', 'status', 'outputs_gerados', 'aprovacoes', 'ultima_atividade'];
    const rows = recentCampaigns.map((item) => [
      item.campanha.id,
      safeCsv(item.campanha.nome),
      item.derivedStatus,
      String(item.outputCount),
      String(item.pendingApprovals),
      item.latestActivityAt,
    ]);
    const content = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `briefly-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleRerun = async (campanhaId: string) => {
    setRerunError(null);
    setRerunMessage(null);

    const response = await fetch('/api/campanha/rerun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campanhaId }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      triggered?: string[];
      error?: string;
    };

    if (!response.ok) {
      const message = payload.error ?? 'Nao foi possivel rodar o pipeline.';
      setRerunError(message);
      throw new Error(message);
    }

    const message =
      payload.triggered && payload.triggered.length > 0
        ? `Pipeline relancado: ${payload.triggered.join(', ')}`
        : 'Nenhuma etapa precisou ser reprocessada.';
    setRerunMessage(message);
    await refresh();
  };

  return (
    <div className="mx-auto flex h-full max-w-[1600px] flex-col gap-5 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
      <MetricsBar
        metrics={metrics}
        analytics={analytics}
        loading={loading}
        refreshing={refreshing}
      />

      {error ? (
        <StatePanel
          tone="danger"
          icon="ER"
          title="Falha ao atualizar o dashboard"
          description={error}
          className="border-white/10 bg-rose-500/8"
        />
      ) : null}

      {rerunError ? (
        <StatePanel
          tone="danger"
          icon="RT"
          title="Nao foi possivel rodar o pipeline"
          description={rerunError}
          className="border-white/10 bg-rose-500/8"
        />
      ) : null}

      {rerunMessage ? (
        <StatePanel
          tone="success"
          icon="OK"
          title="Pipeline acionado"
          description={rerunMessage}
          className="border-white/10 bg-emerald-500/8"
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_390px]">
        <div className="space-y-5">
          <AgentsGrid
            agents={coreAgents}
            extraAgents={extraAgents}
            onSelect={onAgentSelect}
            onNewAgent={onNewAgent}
          />
          <QuickActions
            campaigns={recentCampaigns}
            pendingApprovalCampaignId={pendingApprovalCampaignId}
            onNewBriefing={onNewCampaign}
            onReconnectCanva={() => {
              window.location.href = getCanvaAuthorizeHref();
            }}
            onAnalytics={() => {
              analyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            onApprovePending={() => {
              if (pendingApprovalCampaignId) {
                router.push(`/aprovacao/${pendingApprovalCampaignId}`);
              }
            }}
            onExport={handleExport}
            onRerun={handleRerun}
          />
        </div>

        <ActivityFeed logs={logs} connectionState={connectionState} />
      </div>

      <CampaignsList campaigns={recentCampaigns} loading={loading} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_390px]">
        <div ref={analyticsRef} className={cn('scroll-mt-28')}>
          <CampaignAnalytics analytics={analytics} loading={loading} />
        </div>
        <IntegrationsStatus integrations={integrations} loading={loading} />
      </div>
    </div>
  );
}

function safeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
