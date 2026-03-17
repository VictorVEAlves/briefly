'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Agente, AgenteLog } from '@/types/campanha';
import {
  type CoreOfficeAgentId,
  type OfficeAgentStatus,
  type OfficeEntityId,
  type OfficeMetrics,
} from './agents/agentConfig';
import { createAgentMachines, ensureAgentMachines } from './agents/agentState';
import { syncAgentMachines } from './agents/agentBehavior';
import { createWalkableGrid } from './layout/officeLayout';
import { createStaticOfficeLayer, renderOfficeFrame } from './engine/renderer';
import { useGameLoop } from './hooks/useGameLoop';
import { useOfficeInteraction } from './hooks/useOfficeInteraction';
import { Tooltip } from './ui/Tooltip';

type PixelOfficeProps = {
  agents: OfficeAgentStatus[];
  extraAgents: Agente[];
  logs: AgenteLog[];
  metrics: OfficeMetrics;
  onAgentSelect: (id: OfficeEntityId) => void;
  selectedAgentId: OfficeEntityId | null;
  restartNonceByAgent?: Partial<Record<CoreOfficeAgentId, number>>;
};

type Size = {
  width: number;
  height: number;
};

export default function PixelOffice({
  agents,
  extraAgents,
  logs,
  metrics,
  onAgentSelect,
  selectedAgentId,
  restartNonceByAgent,
}: PixelOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticLayerRef = useRef<HTMLCanvasElement | null>(null);
  const machinesRef = useRef(createAgentMachines());
  const walkableGridRef = useRef(createWalkableGrid());
  const [viewport, setViewport] = useState<Size>({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const {
    camera,
    hoveredId,
    tooltip,
    focusEntity,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handleWheel,
  } = useOfficeInteraction({
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    isCompact,
    onSelect: onAgentSelect,
  });

  useEffect(() => {
    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mediaCompact = window.matchMedia('(max-width: 960px)');

    const syncPreferences = () => {
      setReducedMotion(mediaReduced.matches);
      setIsCompact(mediaCompact.matches);
    };

    syncPreferences();
    mediaReduced.addEventListener('change', syncPreferences);
    mediaCompact.addEventListener('change', syncPreferences);

    return () => {
      mediaReduced.removeEventListener('change', syncPreferences);
      mediaCompact.removeEventListener('change', syncPreferences);
    };
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0];
      if (!next) return;

      setViewport({
        width: Math.floor(next.contentRect.width),
        height: Math.floor(next.contentRect.height),
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      focusEntity(selectedAgentId);
    }
  }, [focusEntity, selectedAgentId]);

  const tooltipData = useMemo(() => {
    if (!hoveredId) return null;
    if (hoveredId === 'hub') {
      return {
        title: 'BRIEFLY Hub',
        subtitle: `${metrics.activeCampaigns} campanhas ativas · ${metrics.readyCampaigns} prontas · ${extraAgents.length} agentes extras · ${logs.length} logs`,
        status: metrics.errors > 0 ? 'working' : 'idle',
        progressLabel: `${metrics.outputsGenerated} outputs`,
      } as const;
    }

    const hoveredAgent = agents.find((agent) => agent.id === hoveredId);
    if (!hoveredAgent) return null;

    return {
      title: hoveredAgent.displayName,
      subtitle: hoveredAgent.role,
      status: hoveredAgent.status,
      progressLabel:
        hoveredAgent.tasksTotal > 0
          ? `${hoveredAgent.tasksCompleted}/${hoveredAgent.tasksTotal}`
          : 'sem carga',
    } as const;
  }, [
    agents,
    extraAgents.length,
    hoveredId,
    logs.length,
    metrics.activeCampaigns,
    metrics.errors,
    metrics.outputsGenerated,
    metrics.readyCampaigns,
  ]);

  useGameLoop(({ delta, time }) => {
    const canvas = canvasRef.current;
    if (!canvas || viewport.width === 0 || viewport.height === 0) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetWidth = Math.floor(viewport.width * dpr);
    const targetHeight = Math.floor(viewport.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    if (!staticLayerRef.current) {
      staticLayerRef.current = createStaticOfficeLayer();
    }

    machinesRef.current = ensureAgentMachines(machinesRef.current);
    syncAgentMachines({
      machines: machinesRef.current,
      agents,
      deltaMs: delta * 1000,
      nowMs: time,
      walkableGrid: walkableGridRef.current,
      restartNonceByAgent,
    });

    renderOfficeFrame({
      ctx: context,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      dpr,
      camera,
      staticLayer: staticLayerRef.current,
      agents,
      machines: machinesRef.current,
      hoveredId,
      selectedId: selectedAgentId,
      metrics,
      reducedMotion,
      timeMs: time,
    });
  });

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-pointer touch-none [image-rendering:pixelated]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onWheel={handleWheel}
      />

      <Tooltip
        open={Boolean(tooltip && tooltipData)}
        x={tooltip?.x ?? 0}
        y={tooltip?.y ?? 0}
        title={tooltipData?.title ?? ''}
        subtitle={tooltipData?.subtitle ?? ''}
        status={tooltipData?.status ?? 'idle'}
        progressLabel={tooltipData?.progressLabel ?? ''}
      />
    </div>
  );
}
