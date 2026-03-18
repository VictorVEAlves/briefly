'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';
import type { Campanha, CampanhaOutput, OutputTipo } from '@/types/campanha';
import {
  isActiveCampaign,
  isCampaignReady,
  isOutputAwaitingApproval,
  isOutputCompleted,
} from '../agents/agentConfig';

export type DashboardCampaignStatus =
  | 'rascunho'
  | 'ativa'
  | 'pronta'
  | 'erro'
  | 'aprovada';

export type DashboardCampaignItem = {
  campanha: Campanha;
  outputCount: number;
  pendingApprovals: number;
  latestActivityAt: string;
  derivedStatus: DashboardCampaignStatus;
};

export type DashboardAnalytics = {
  campaignsByStatus: Record<DashboardCampaignStatus, number>;
  outputsByType: Record<OutputTipo, number>;
  campaignsToday: number;
  outputsToday: number;
};

export type OfficeIntegrationStatus = {
  key: 'supabase' | 'clickup' | 'claude' | 'canva' | 'vercel';
  label: string;
  connected: boolean;
  summary: string;
  detail: string;
  latencyMs?: number | null;
  actionHref?: string;
  actionLabel?: string;
};

type DashboardState = {
  recentCampaigns: DashboardCampaignItem[];
  analytics: DashboardAnalytics;
  pendingApprovalCampaignId: string | null;
  integrations: OfficeIntegrationStatus[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

const EMPTY_ANALYTICS: DashboardAnalytics = {
  campaignsByStatus: {
    pronta: 0,
    ativa: 0,
    erro: 0,
    rascunho: 0,
    aprovada: 0,
  },
  outputsByType: {
    briefing: 0,
    email: 0,
    whatsapp: 0,
    arte_feed: 0,
    arte_story: 0,
    relatorio: 0,
  },
  campaignsToday: 0,
  outputsToday: 0,
};

const EMPTY_STATE: DashboardState = {
  recentCampaigns: [],
  analytics: EMPTY_ANALYTICS,
  pendingApprovalCampaignId: null,
  integrations: [],
  loading: true,
  refreshing: false,
  error: null,
};

const REFRESH_INTERVAL_MS = 8000;

export function useDashboardData() {
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const refreshTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);

  const refresh = useCallback(async () => {
    const supabase = supabaseRef.current;
    setState((current) => ({
      ...current,
      loading: !initializedRef.current,
      refreshing: initializedRef.current,
      error: null,
    }));

    try {
      const campaignsPromise = supabase
        .from('campanhas')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(40);

      const pendingOutputsPromise = supabase
        .from('campanha_outputs')
        .select('campanha_id, created_at')
        .eq('status', 'pronto')
        .order('created_at', { ascending: false })
        .limit(24);

      const integrationsPromise = fetch('/api/office/integrations', {
        cache: 'no-store',
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('Nao foi possivel verificar integracoes');
        }

        return (await response.json()) as {
          integrations: OfficeIntegrationStatus[];
        };
      });

      const [campaignsResult, pendingOutputsResult, integrationsResult] =
        await Promise.allSettled([campaignsPromise, pendingOutputsPromise, integrationsPromise]);

      if (campaignsResult.status !== 'fulfilled') {
        throw campaignsResult.reason;
      }

      if (campaignsResult.value.error) {
        throw new Error(campaignsResult.value.error.message);
      }

      const campaigns = (campaignsResult.value.data ?? []) as Campanha[];
      const campaignIds = campaigns.map((campaign) => campaign.id);
      const outputs =
        campaignIds.length > 0
          ? await fetchOutputs(supabase, campaignIds)
          : [];

      const pendingApprovalCampaignId = await resolvePendingApprovalCampaignId({
        supabase,
        campaigns,
        pendingRows:
          pendingOutputsResult.status === 'fulfilled'
            ? ((pendingOutputsResult.value.data ?? []) as Array<{
                campanha_id: string;
                created_at: string;
              }>)
            : [],
      });

      const recentCampaigns = campaigns
        .slice(0, 10)
        .map((campaign) => buildDashboardCampaign(campaign, outputs));

      setState({
        recentCampaigns,
        analytics: buildAnalytics(campaigns, outputs),
        pendingApprovalCampaignId,
        integrations:
          integrationsResult.status === 'fulfilled'
            ? integrationsResult.value.integrations
            : [],
        loading: false,
        refreshing: false,
        error: null,
      });
      initializedRef.current = true;
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error:
          error instanceof Error
            ? error.message
            : 'Nao foi possivel carregar o dashboard.',
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    const handleFocus = () => {
      void refresh();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, 140);
    };

    const channel = supabase
      .channel('office-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campanhas' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campanha_outputs' },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [refresh, state]
  );
}

async function fetchOutputs(
  supabase: ReturnType<typeof createBrowserClient>,
  campaignIds: string[]
) {
  const { data, error } = await supabase
    .from('campanha_outputs')
    .select('*')
    .in('campanha_id', campaignIds)
    .order('created_at', { ascending: false })
    .limit(400);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CampanhaOutput[];
}

async function resolvePendingApprovalCampaignId({
  supabase,
  campaigns,
  pendingRows,
}: {
  supabase: ReturnType<typeof createBrowserClient>;
  campaigns: Campanha[];
  pendingRows: Array<{ campanha_id: string; created_at: string }>;
}) {
  if (pendingRows.length === 0) return null;

  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const unknownIds = Array.from(
    new Set(
      pendingRows
        .map((row) => row.campanha_id)
        .filter((id) => !campaignById.has(id))
    )
  );

  if (unknownIds.length > 0) {
    const { data } = await supabase
      .from('campanhas')
      .select('*')
      .in('id', unknownIds)
      .limit(unknownIds.length);

    for (const campaign of (data ?? []) as Campanha[]) {
      campaignById.set(campaign.id, campaign);
    }
  }

  const sortedRows = [...pendingRows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const row of sortedRows) {
    const campaign = campaignById.get(row.campanha_id);
    if (campaign && !campaign.archived_at) {
      return campaign.id;
    }
  }

  return null;
}

function buildDashboardCampaign(
  campaign: Campanha,
  allOutputs: CampanhaOutput[]
): DashboardCampaignItem {
  const outputs = allOutputs.filter((output) => output.campanha_id === campaign.id);
  const latestOutputAt = outputs
    .map((output) => output.created_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return {
    campanha: campaign,
    outputCount: outputs.filter(isOutputCompleted).length,
    pendingApprovals: outputs.filter(isOutputAwaitingApproval).length,
    latestActivityAt: latestOutputAt ?? campaign.created_at,
    derivedStatus: deriveCampaignStatus(campaign, outputs),
  };
}

function buildAnalytics(
  campaigns: Campanha[],
  outputs: CampanhaOutput[]
): DashboardAnalytics {
  const campaignsByStatus: Record<DashboardCampaignStatus, number> = {
    pronta: 0,
    ativa: 0,
    erro: 0,
    rascunho: 0,
    aprovada: 0,
  };

  for (const campaign of campaigns) {
    const relatedOutputs = outputs.filter((output) => output.campanha_id === campaign.id);
    campaignsByStatus[deriveCampaignStatus(campaign, relatedOutputs)] += 1;
  }

  const outputsByType: Record<OutputTipo, number> = {
    briefing: 0,
    email: 0,
    whatsapp: 0,
    arte_feed: 0,
    arte_story: 0,
    relatorio: 0,
  };

  for (const output of outputs) {
    if (isOutputCompleted(output)) {
      outputsByType[output.tipo as OutputTipo] += 1;
    }
  }

  const today = new Date();

  return {
    campaignsByStatus,
    outputsByType,
    campaignsToday: campaigns.filter((campaign) => isSameLocalDay(campaign.created_at, today)).length,
    outputsToday: outputs.filter(
      (output) => isOutputCompleted(output) && isSameLocalDay(output.created_at, today)
    ).length,
  };
}

function deriveCampaignStatus(
  campaign: Campanha,
  outputs: CampanhaOutput[]
): DashboardCampaignStatus {
  if (campaign.status === 'erro') return 'erro';
  if (campaign.status === 'aprovada') return 'aprovada';
  if (isCampaignReady(campaign, outputs)) return 'pronta';
  if (isActiveCampaign(campaign)) return 'ativa';
  return 'rascunho';
}

function isSameLocalDay(value: string, now: Date) {
  const date = new Date(value);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
