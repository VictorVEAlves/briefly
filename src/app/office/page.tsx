'use client';

import { useMemo, useState } from 'react';
import PixelOffice from '@/components/office/PixelOffice';
import CampaignModal from '@/components/office/CampaignModal';
import HireModal from '@/components/office/HireModal';
import { useAgentStatus } from '@/components/office/hooks/useAgentStatus';
import { AgentPanel } from '@/components/office/ui/AgentPanel';
import { Header } from '@/components/office/ui/Header';
import { StatusBar } from '@/components/office/ui/StatusBar';
import type {
  CoreOfficeAgentId,
  OfficeEntityId,
} from '@/components/office/agents/agentConfig';

export default function OfficePage() {
  const {
    coreAgents,
    extraAgents,
    globalMetrics,
    recentLogs,
    connectionState,
  } = useAgentStatus();

  const [selectedId, setSelectedId] = useState<OfficeEntityId | null>(null);
  const [hireOpen, setHireOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [restartNonceByAgent, setRestartNonceByAgent] = useState<
    Partial<Record<CoreOfficeAgentId, number>>
  >({});

  const totalAgents = useMemo(
    () => coreAgents.length + extraAgents.length,
    [coreAgents.length, extraAgents.length]
  );

  return (
    <div className="relative h-screen overflow-hidden bg-[#08080f] font-mono text-white">
      <Header
        agentCount={totalAgents}
        errors={globalMetrics.errors}
        connectionState={connectionState}
        onNewCampaign={() => setCampaignOpen(true)}
        onHire={() => setHireOpen(true)}
      />

      <div className="absolute inset-0 pt-[76px] pb-[108px]">
        <PixelOffice
          agents={coreAgents}
          extraAgents={extraAgents}
          logs={recentLogs}
          metrics={globalMetrics}
          onAgentSelect={setSelectedId}
          selectedAgentId={selectedId}
          restartNonceByAgent={restartNonceByAgent}
        />
      </div>

      <AgentPanel
        selectedId={selectedId}
        coreAgents={coreAgents}
        extraAgents={extraAgents}
        logs={recentLogs}
        metrics={globalMetrics}
        onClose={() => setSelectedId(null)}
        onRestart={(id) => {
          setRestartNonceByAgent((current) => ({
            ...current,
            [id]: (current[id] ?? 0) + 1,
          }));
          setSelectedId(id);
        }}
        onSelect={setSelectedId}
        onNewCampaign={() => setCampaignOpen(true)}
        onHire={() => setHireOpen(true)}
      />

      <StatusBar metrics={globalMetrics} />

      <HireModal open={hireOpen} onClose={() => setHireOpen(false)} />
      <CampaignModal open={campaignOpen} onClose={() => setCampaignOpen(false)} />
    </div>
  );
}
