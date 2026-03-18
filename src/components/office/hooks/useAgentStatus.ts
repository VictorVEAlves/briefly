'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase-browser';
import type {
  Agente,
  AgenteLog,
  Campanha,
  CampanhaOutput,
  OutputTipo,
} from '@/types/campanha';
import {
  CORE_AGENT_CONFIGS,
  type OfficeAgentStatus,
  type OfficeConnectionState,
  type OfficeMetrics,
  type OfficeStatusStore,
  isActiveCampaign,
  isCampaignReady,
  isOutputCompleted,
} from '../agents/agentConfig';

type OfficeSnapshot = {
  campanhas: Campanha[];
  outputs: CampanhaOutput[];
  logs: AgenteLog[];
  extraAgents: Agente[];
};

const EMPTY_SNAPSHOT: OfficeSnapshot = {
  campanhas: [],
  outputs: [],
  logs: [],
  extraAgents: [],
};

const DONE_WINDOW_MS = 2500;
const SNAPSHOT_POLL_MS = 1500;
type RealtimeChannelStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | 'JOINING'
  | 'LEAVING';

const OUTPUT_LABELS: Record<OutputTipo, string> = {
  briefing: 'briefing',
  email: 'email',
  whatsapp: 'mensagem',
  arte_feed: 'arte feed',
  arte_story: 'arte story',
  relatorio: 'relatorio',
};

export function useAgentStatus(): OfficeStatusStore {
  const supabaseRef = useRef(
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  );
  const refreshTimerRef = useRef<number | null>(null);
  const completionSignatureRef = useRef<Record<string, string>>({});
  const doneUntilRef = useRef<Record<string, number>>({});
  const initializedRef = useRef(false);

  const [snapshot, setSnapshot] = useState<OfficeSnapshot>(EMPTY_SNAPSHOT);
  const [connectionState, setConnectionState] =
    useState<OfficeConnectionState>('connecting');
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refreshSnapshot = useCallback(async () => {
    const supabase = supabaseRef.current;

    const [campanhasResult, outputsResult, logsResult, agentesResult] =
      await Promise.all([
        supabase
          .from('campanhas')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(80),
        supabase
          .from('campanha_outputs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('agente_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('agentes')
          .select('*')
          .eq('ativo', true)
          .order('updated_at', { ascending: false }),
      ]);

    setSnapshot({
      campanhas: (campanhasResult.data ?? []) as Campanha[],
      outputs: (outputsResult.data ?? []) as CampanhaOutput[],
      logs: (logsResult.data ?? []) as AgenteLog[],
      extraAgents: (agentesResult.data ?? []) as Agente[],
    });
  }, []);

  useEffect(() => {
    void refreshSnapshot();
  }, [refreshSnapshot]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshSnapshot();
    }, SNAPSHOT_POLL_MS);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshSnapshot();
      }
    };

    const handleFocus = () => {
      void refreshSnapshot();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const nextSignatures = buildCompletionSignatures(snapshot);

    if (initializedRef.current) {
      for (const config of CORE_AGENT_CONFIGS) {
        const previous = completionSignatureRef.current[config.id];
        const next = nextSignatures[config.id];

        if (previous && next && previous !== next) {
          doneUntilRef.current[config.id] = Date.now() + DONE_WINDOW_MS;
        }
      }
    }

    completionSignatureRef.current = nextSignatures;
    initializedRef.current = true;
  }, [snapshot]);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = window.setTimeout(() => {
        void refreshSnapshot();
      }, 120);
    };

    const channel = supabase
      .channel('pixel-office-realtime')
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agente_logs' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agentes' },
        scheduleRefresh
      )
      .subscribe((status: RealtimeChannelStatus) => {
        setConnectionState(mapRealtimeStatus(status));
        if (status === 'SUBSCRIBED') {
          void refreshSnapshot();
        }
      });

    return () => {
      if (refreshTimerRef.current) {
        window.clearTimeout(refreshTimerRef.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [refreshSnapshot]);

  return useMemo(() => {
    return deriveOfficeStore({
      snapshot,
      nowMs,
      connectionState,
      doneUntilByAgent: doneUntilRef.current,
    });
  }, [connectionState, nowMs, snapshot]);
}

function deriveOfficeStore({
  snapshot,
  nowMs,
  connectionState,
  doneUntilByAgent,
}: {
  snapshot: OfficeSnapshot;
  nowMs: number;
  connectionState: OfficeConnectionState;
  doneUntilByAgent: Record<string, number>;
}): OfficeStatusStore {
  const coreAgents = deriveCoreAgents({
    snapshot,
    nowMs,
    doneUntilByAgent,
  });

  return {
    coreAgents,
    extraAgents: snapshot.extraAgents,
    globalMetrics: computeMetrics(snapshot, coreAgents),
    recentLogs: [...snapshot.logs]
      .sort(sortByCreatedAtDesc)
      .slice(0, 28),
    connectionState,
  };
}

function deriveCoreAgents({
  snapshot,
  nowMs,
  doneUntilByAgent,
}: {
  snapshot: OfficeSnapshot;
  nowMs: number;
  doneUntilByAgent: Record<string, number>;
}): OfficeAgentStatus[] {
  const campanhasAtivas = snapshot.campanhas.filter(isActiveCampaign);

  return CORE_AGENT_CONFIGS.map((config) => {
    const relevantCampaigns = campanhasAtivas.filter((campanha) =>
      isCampaignRelevant(campanha, config.channels)
    );
    const relevantCampaignIds = new Set(relevantCampaigns.map((item) => item.id));
    const relevantOutputs = snapshot.outputs.filter(
      (output) =>
        relevantCampaignIds.has(output.campanha_id) &&
        config.outputTypes.includes(output.tipo as OutputTipo)
    );
    const relevantLogs = snapshot.logs.filter(
      (log) =>
        relevantCampaignIds.has(log.campanha_id) &&
        log.agente === config.backendAgent
    );
    const visibleLogs = relevantLogs.filter(
      (log) => !isIgnoredOfficeErrorLog(config.id, log)
    );

    const latestLog = getLatestByCreatedAt(visibleLogs);
    const latestOutput = getLatestByCreatedAt(relevantOutputs);
    const latestEvent = pickLatestEvent(latestLog, latestOutput);

    const latestCompletedLog = getLatestByCreatedAt(
      visibleLogs.filter((log) => log.status === 'concluido')
    );
    const latestErrorLog = getLatestByCreatedAt(
      visibleLogs.filter((log) => log.status === 'erro')
    );
    const latestCompletedOutput = getLatestByCreatedAt(
      relevantOutputs.filter(isOutputCompleted)
    );
    const latestErrorOutput = getLatestByCreatedAt(
      relevantOutputs.filter((output) => output.status === 'erro')
    );

    const latestWorkingByCampaign = new Map<string, AgenteLog>();
    for (const log of relevantLogs) {
      const existing = latestWorkingByCampaign.get(log.campanha_id);
      if (!existing || toTimestamp(log.created_at) > toTimestamp(existing.created_at)) {
        latestWorkingByCampaign.set(log.campanha_id, log);
      }
    }

    const hasWorking = Array.from(latestWorkingByCampaign.values()).some(
      (log) => log.status === 'iniciado'
    );
    const hasDone = hasCompletedWork(
      config.id,
      relevantCampaigns,
      relevantOutputs,
      relevantLogs
    );

    const latestErrorTs = Math.max(
      toTimestamp(latestErrorLog?.created_at),
      toTimestamp(latestErrorOutput?.created_at)
    );
    const latestSuccessTs = Math.max(
      toTimestamp(latestCompletedLog?.created_at),
      toTimestamp(latestCompletedOutput?.created_at)
    );
    const hasError = latestErrorTs > latestSuccessTs && latestErrorTs > 0;
    const hasWaiting =
      relevantCampaigns.length > 0 &&
      !hasWorking &&
      !hasDone &&
      !hasError;

    let status: OfficeAgentStatus['status'] = 'idle';
    if (hasError) {
      status = 'error';
    } else if (hasWorking) {
      status = 'working';
    } else if (hasDone || (doneUntilByAgent[config.id] ?? 0) > nowMs) {
      status = 'done';
    } else if (hasWaiting) {
      status = 'waiting';
    }

    const currentCampaign = resolveCurrentCampaign({
      relevantCampaigns,
      relevantLogs: visibleLogs,
      latestOutput,
    });

    return {
      id: config.id,
      displayName: config.displayName,
      role: config.role,
      status,
      currentCampaign: currentCampaign?.nome,
      lastAction:
        latestLog?.mensagem ??
        buildOutputAction(latestOutput) ??
        (currentCampaign ? `Monitorando ${currentCampaign.nome}` : undefined),
      lastActionAt: latestEvent?.created_at,
      tasksTotal: relevantCampaigns.length,
      tasksCompleted: computeTasksCompleted(
        config.id,
        relevantCampaigns,
        relevantOutputs,
        relevantLogs
      ),
      errorMessage:
        status === 'error'
          ? latestErrorLog?.mensagem ?? buildOutputAction(latestErrorOutput)
          : undefined,
      color: config.color,
      accent: config.accent,
      hairColor: config.hairColor,
      clothingColor: config.clothingColor,
      isCore: true as const,
      workMode: config.workMode,
    };
  });
}

function buildCompletionSignatures(snapshot: OfficeSnapshot) {
  const campanhasAtivas = snapshot.campanhas.filter(isActiveCampaign);
  const signatures: Record<string, string> = {};

  for (const config of CORE_AGENT_CONFIGS) {
    const relevantCampaignIds = new Set(
      campanhasAtivas
        .filter((campanha) => isCampaignRelevant(campanha, config.channels))
        .map((campanha) => campanha.id)
    );

    const completedOutputs = snapshot.outputs.filter(
      (output) =>
        relevantCampaignIds.has(output.campanha_id) &&
        config.outputTypes.includes(output.tipo as OutputTipo) &&
        isOutputCompleted(output)
    );
    const completedLogs = snapshot.logs.filter(
      (log) =>
        relevantCampaignIds.has(log.campanha_id) &&
        log.agente === config.backendAgent &&
        log.status === 'concluido'
    );

    const latestSignal = pickLatestEvent(
      getLatestByCreatedAt(completedLogs),
      getLatestByCreatedAt(completedOutputs)
    );

    signatures[config.id] = latestSignal
      ? `${latestSignal.campanha_id}:${latestSignal.created_at}`
      : '';
  }

  return signatures;
}

function computeTasksCompleted(
  agentId: OfficeAgentStatus['id'],
  campaigns: Campanha[],
  outputs: CampanhaOutput[],
  logs: AgenteLog[]
) {
  if (agentId === 'tasks') {
    const latestByCampaign = new Map<string, AgenteLog>();
    for (const log of logs) {
      const existing = latestByCampaign.get(log.campanha_id);
      if (!existing || toTimestamp(log.created_at) > toTimestamp(existing.created_at)) {
        latestByCampaign.set(log.campanha_id, log);
      }
    }

    return Array.from(latestByCampaign.values()).filter(
      (log) => log.status === 'concluido'
    ).length;
  }

  if (agentId === 'canva') {
    return campaigns.filter((campanha) => {
      const expectedTypes: OutputTipo[] = [];
      const canais = Array.isArray(campanha.canais) ? campanha.canais : [];
      if (canais.includes('instagram_feed')) expectedTypes.push('arte_feed');
      if (canais.includes('instagram_stories')) expectedTypes.push('arte_story');
      if (expectedTypes.length === 0) return false;

      return expectedTypes.every((tipo) =>
        outputs.some(
          (output) =>
            output.campanha_id === campanha.id &&
            output.tipo === tipo &&
            isOutputCompleted(output)
        )
      );
    }).length;
  }

  return campaigns.filter((campanha) =>
    outputs.some(
      (output) =>
        output.campanha_id === campanha.id &&
        isOutputCompleted(output)
    )
  ).length;
}

function computeMetrics(
  snapshot: OfficeSnapshot,
  coreAgents: OfficeAgentStatus[]
): OfficeMetrics {
  const campanhasAtivas = snapshot.campanhas.filter(isActiveCampaign);
  const activeCampaignIds = new Set(campanhasAtivas.map((campanha) => campanha.id));
  const activeOutputs = snapshot.outputs.filter((output) =>
    activeCampaignIds.has(output.campanha_id)
  );

  const activeCampaigns = campanhasAtivas.length;
  const readyCampaigns = campanhasAtivas.filter((campanha) =>
    isCampaignReady(campanha, activeOutputs)
  ).length;
  const pendingTasks = activeOutputs.filter(
    (output) => output.status === 'pendente' || output.status === 'gerando'
  ).length;
  const outputsGenerated = activeOutputs.filter(isOutputCompleted).length;
  const approvals = activeOutputs.filter((output) => output.status === 'pronto').length;
  const errors = coreAgents.filter((agent) => agent.status === 'error').length;

  return {
    activeCampaigns,
    readyCampaigns,
    pendingTasks,
    outputsGenerated,
    approvals,
    errors,
  };
}

function hasCompletedWork(
  agentId: OfficeAgentStatus['id'],
  campaigns: Campanha[],
  outputs: CampanhaOutput[],
  logs: AgenteLog[]
) {
  if (campaigns.length === 0) return false;

  if (agentId === 'tasks') {
    return computeTasksCompleted(agentId, campaigns, outputs, logs) > 0;
  }

  return outputs.some(isOutputCompleted);
}

function isIgnoredOfficeErrorLog(
  agentId: OfficeAgentStatus['id'],
  log: Pick<AgenteLog, 'mensagem'>
) {
  return (
    agentId === 'tasks' &&
    typeof log.mensagem === 'string' &&
    log.mensagem.startsWith('Falha ao disparar agentes apos criar tasks')
  );
}

function resolveCurrentCampaign({
  relevantCampaigns,
  relevantLogs,
  latestOutput,
}: {
  relevantCampaigns: Campanha[];
  relevantLogs: AgenteLog[];
  latestOutput?: CampanhaOutput | null;
}) {
  const latestWorkingLog = getLatestByCreatedAt(
    relevantLogs.filter((log) => log.status === 'iniciado')
  );

  if (latestWorkingLog) {
    return relevantCampaigns.find(
      (campanha) => campanha.id === latestWorkingLog.campanha_id
    );
  }

  if (latestOutput) {
    return relevantCampaigns.find(
      (campanha) => campanha.id === latestOutput.campanha_id
    );
  }

  return getLatestByCreatedAt(relevantCampaigns);
}

function buildOutputAction(output?: CampanhaOutput | null) {
  if (!output) return undefined;

  if (output.status === 'erro') {
    return `Falha ao gerar ${OUTPUT_LABELS[output.tipo as OutputTipo] ?? output.tipo}`;
  }

  if (output.status === 'aprovado') {
    return `${capitalize(OUTPUT_LABELS[output.tipo as OutputTipo] ?? output.tipo)} aprovado`;
  }

  if (output.status === 'pronto') {
    return `${capitalize(OUTPUT_LABELS[output.tipo as OutputTipo] ?? output.tipo)} pronto`;
  }

  return undefined;
}

function pickLatestEvent<
  T extends { created_at: string; campanha_id: string },
  U extends { created_at: string; campanha_id: string }
>(
  a?: T | null,
  b?: U | null
) {
  if (!a) return b ?? null;
  if (!b) return a;
  return toTimestamp(a.created_at) >= toTimestamp(b.created_at) ? a : b;
}

function getLatestByCreatedAt<T extends { created_at: string }>(items: T[]) {
  if (items.length === 0) return null;
  return [...items].sort(sortByCreatedAtDesc)[0] ?? null;
}

function sortByCreatedAtDesc<T extends { created_at: string }>(a: T, b: T) {
  return toTimestamp(b.created_at) - toTimestamp(a.created_at);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isCampaignRelevant(campanha: Campanha, channels: string[]) {
  if (channels.length === 0) return true;
  const campaignChannels = Array.isArray(campanha.canais) ? campanha.canais : [];
  return channels.some((channel) => campaignChannels.includes(channel));
}

function mapRealtimeStatus(status: RealtimeChannelStatus): OfficeConnectionState {
  if (status === 'SUBSCRIBED') return 'live';
  if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
    return 'offline';
  }
  return 'connecting';
}
