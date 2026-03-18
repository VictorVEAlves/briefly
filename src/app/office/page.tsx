'use client';

import { useMemo, useState, useEffect } from 'react';
import PixelOffice from '@/components/office/PixelOffice';
import Dashboard from '@/components/office/Dashboard';
import CampaignModal from '@/components/office/CampaignModal';
import { OfficeTabs } from '@/components/office/OfficeTabs';
import { useAgentStatus } from '@/components/office/hooks/useAgentStatus';
import { AgentPanel } from '@/components/office/ui/AgentPanel';
import { Header } from '@/components/office/ui/Header';
import { StatusBar } from '@/components/office/ui/StatusBar';
import { NewAgentModal } from '@/components/office/dashboard/NewAgentModal';
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
  const [newAgentOpen, setNewAgentOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [canvaConnected, setCanvaConnected] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    fetch('/api/canva/status')
      .then((r) => r.json())
      .then((d) => setCanvaConnected(d.connected ?? false))
      .catch(() => setCanvaConnected(false));
  }, []);
  const [restartNonceByAgent, setRestartNonceByAgent] = useState<
    Partial<Record<CoreOfficeAgentId, number>>
  >({});

  const totalAgents = useMemo(
    () => coreAgents.length + extraAgents.length,
    [coreAgents.length, extraAgents.length]
  );

  return (
    <div className="relative h-screen overflow-hidden bg-[#08080f] font-mono text-white">
      <OfficeTabs>
        {(activeTab, setActiveTab) => (
          <>
            <Header
              agentCount={totalAgents}
              errors={globalMetrics.errors}
              readyCampaigns={globalMetrics.readyCampaigns}
              connectionState={connectionState}
              canvaConnected={canvaConnected}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setSelectedId(null);
                setActiveTab(tab);
              }}
              onNewCampaign={() => setCampaignOpen(true)}
              onHire={() => setNewAgentOpen(true)}
            />

            {activeTab === 'office' ? (
              <>
                <div className="absolute inset-0 pb-[108px] pt-[142px] sm:pt-[134px] lg:pt-[108px]">
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
                <StatusBar metrics={globalMetrics} />
              </>
            ) : (
              <div className="absolute inset-0 pt-[142px] sm:pt-[134px] lg:pt-[108px]">
                <Dashboard
                  coreAgents={coreAgents}
                  extraAgents={extraAgents}
                  metrics={globalMetrics}
                  logs={recentLogs}
                  connectionState={connectionState}
                  onAgentSelect={setSelectedId}
                  onNewCampaign={() => setCampaignOpen(true)}
                  onNewAgent={() => setNewAgentOpen(true)}
                />
              </div>
            )}

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
              onHire={() => setNewAgentOpen(true)}
            />

            <NewAgentModal open={newAgentOpen} onClose={() => setNewAgentOpen(false)} />
            <CampaignModal open={campaignOpen} onClose={() => setCampaignOpen(false)} />
          </>
        )}
      </OfficeTabs>
    </div>
  );
}
