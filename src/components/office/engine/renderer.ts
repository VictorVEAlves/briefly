import {
  type CoreOfficeAgentId,
  type OfficeAgentStatus,
  type OfficeEntityId,
  type OfficeMetrics,
  OFFICE_STATUS_META,
  getCoreAgentConfig,
} from '../agents/agentConfig';
import type { AgentMachineMap } from '../agents/agentState';
import type { CameraState } from './camera';
import {
  HUB_AREA,
  HUB_CENTER,
  OFFICE_DECOR,
  OFFICE_STATIONS,
  getInteractiveBounds,
} from '../layout/officeLayout';
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  OFFICE_COLORS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  drawFloorTile,
} from '../layout/tiles';
import { drawAgentCharacter } from '../sprites/characters';
import {
  drawCoffeeMachine,
  drawDashedConnection,
  drawDeskStation,
  drawHub,
  drawMonitorActivity,
  drawPlant,
  drawProgressBar,
  drawWaterCooler,
  drawWhiteboard,
  drawWindow,
} from '../sprites/furniture';

type StaticOfficeLayer = HTMLCanvasElement;

type RenderArgs = {
  ctx: CanvasRenderingContext2D;
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  camera: CameraState;
  staticLayer: StaticOfficeLayer;
  agents: OfficeAgentStatus[];
  machines: AgentMachineMap;
  hoveredId: OfficeEntityId | null;
  selectedId: OfficeEntityId | null;
  metrics: OfficeMetrics;
  reducedMotion: boolean;
  timeMs: number;
};

export function createStaticOfficeLayer() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Nao foi possivel criar a camada estaticado office.');
  }

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      drawFloorTile(ctx, x, y, (x + y) % 2 === 0 ? 'a' : 'b');
    }
  }

  ctx.fillStyle = OFFICE_COLORS.wallLight;
  ctx.fillRect(0, 0, WORLD_WIDTH, 5 * TILE_SIZE);
  ctx.fillStyle = OFFICE_COLORS.wallDark;
  ctx.fillRect(0, 0, WORLD_WIDTH, TILE_SIZE);
  ctx.fillRect(0, 5 * TILE_SIZE - 2, WORLD_WIDTH, 2);

  for (const windowRect of OFFICE_DECOR.windows) {
    drawWindow(ctx, windowRect);
  }

  for (const station of Object.values(OFFICE_STATIONS)) {
    drawDeskStation(ctx, station, OFFICE_COLORS.monitorIdle);
  }

  drawHub(ctx, HUB_AREA);
  drawWhiteboard(ctx, OFFICE_DECOR.whiteboard);
  drawCoffeeMachine(ctx, OFFICE_DECOR.coffee);
  drawWaterCooler(ctx, OFFICE_DECOR.water);

  ctx.fillStyle = '#151728';
  ctx.fillRect(0, WORLD_HEIGHT - 8 * TILE_SIZE, WORLD_WIDTH, 8 * TILE_SIZE);

  return canvas;
}

export function renderOfficeFrame({
  ctx,
  viewportWidth,
  viewportHeight,
  dpr,
  camera,
  staticLayer,
  agents,
  machines,
  hoveredId,
  selectedId,
  metrics,
  reducedMotion,
  timeMs,
}: RenderArgs) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);
  ctx.fillStyle = OFFICE_COLORS.background;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
  drawBackdropGrid(ctx, viewportWidth, viewportHeight, reducedMotion, timeMs);

  ctx.save();
  ctx.translate(Math.floor(camera.offsetX), Math.floor(camera.offsetY));
  ctx.scale(camera.zoom, camera.zoom);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(staticLayer, 0, 0);

  drawWindowStars(ctx, timeMs, reducedMotion);
  drawHubPulse(ctx, timeMs, metrics);
  drawStationConnections(ctx, agents, timeMs);
  drawPlantsAndSteam(ctx, timeMs, reducedMotion);
  drawMonitorStates(ctx, agents, timeMs);
  drawDataParticles(ctx, agents, timeMs, reducedMotion);
  drawAgents(ctx, agents, machines, timeMs, hoveredId, selectedId);
  drawStationBadges(ctx, agents);
  drawInteractionHighlight(ctx, hoveredId, selectedId);

  ctx.restore();

  drawScanline(ctx, viewportWidth, viewportHeight, timeMs, reducedMotion);
  ctx.restore();
}

function drawBackdropGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  reducedMotion: boolean,
  timeMs: number
) {
  const opacity = reducedMotion ? 0.06 : 0.08 + Math.sin(timeMs / 1200) * 0.015;
  ctx.strokeStyle = `rgba(148,163,184,${Math.max(0.03, opacity)})`;
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }

  for (let y = 0; y < height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }
}

function drawWindowStars(
  ctx: CanvasRenderingContext2D,
  timeMs: number,
  reducedMotion: boolean
) {
  OFFICE_DECOR.windows.forEach((windowRect, windowIndex) => {
    for (let starIndex = 0; starIndex < 11; starIndex += 1) {
      const localX = 8 + ((starIndex * 13 + windowIndex * 7) % (windowRect.w - 16));
      const localY = 8 + ((starIndex * 17 + windowIndex * 5) % (windowRect.h - 16));
      const pulse = reducedMotion
        ? 0.28
        : 0.18 + ((Math.sin(timeMs / 500 + starIndex * 1.7 + windowIndex) + 1) / 2) * 0.4;

      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      ctx.fillRect(windowRect.x + localX, windowRect.y + localY, 2, 2);
    }
  });
}

function drawHubPulse(
  ctx: CanvasRenderingContext2D,
  timeMs: number,
  metrics: OfficeMetrics
) {
  const glow = 0.18 + Math.sin(timeMs / 700) * 0.05 + Math.min(metrics.outputsGenerated, 10) * 0.01;
  const gradient = ctx.createRadialGradient(
    HUB_CENTER.x,
    HUB_CENTER.y,
    12,
    HUB_CENTER.x,
    HUB_CENTER.y,
    72
  );
  gradient.addColorStop(0, `rgba(168,85,247,${glow + 0.1})`);
  gradient.addColorStop(1, 'rgba(168,85,247,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(HUB_CENTER.x - 72, HUB_CENTER.y - 72, 144, 144);

  ctx.fillStyle = '#f4e9ff';
  ctx.font = 'bold 11px "Geist Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BRIEFLY', HUB_CENTER.x, HUB_CENTER.y + 6);

  ctx.fillStyle = 'rgba(244,233,255,0.72)';
  ctx.font = '7px "Geist Mono", monospace';
  const subtitle =
    metrics.readyCampaigns > 0
      ? `${metrics.readyCampaigns} pronta${metrics.readyCampaigns > 1 ? 's' : ''} para revisao`
      : `${metrics.activeCampaigns} campanhas ao vivo`;
  ctx.fillText(subtitle, HUB_CENTER.x, HUB_CENTER.y + 18);
}

function drawStationConnections(
  ctx: CanvasRenderingContext2D,
  agents: OfficeAgentStatus[],
  timeMs: number
) {
  for (const agent of agents) {
    const station = OFFICE_STATIONS[agent.id];
    drawDashedConnection(
      ctx,
      station.monitorCenter,
      { x: HUB_CENTER.x, y: HUB_AREA.y + HUB_AREA.h },
      agent.color,
      timeMs,
      agent.status === 'working' || agent.status === 'done'
    );
  }
}

function drawPlantsAndSteam(
  ctx: CanvasRenderingContext2D,
  timeMs: number,
  reducedMotion: boolean
) {
  const sway = reducedMotion ? 0 : Math.round(Math.sin(timeMs / 900) * 2);
  OFFICE_DECOR.plants.forEach((plant, index) => {
    drawPlant(ctx, plant, index === 0 ? sway : -sway);
  });

  const steamCount = reducedMotion ? 2 : 4;
  for (let index = 0; index < steamCount; index += 1) {
    const offset = (timeMs / 40 + index * 12) % 28;
    const x = OFFICE_DECOR.coffee.x + 12 + (index % 2) * 6;
    const y = OFFICE_DECOR.coffee.y + 8 - offset;
    ctx.fillStyle = `rgba(226,232,240,${0.16 + index * 0.05})`;
    ctx.fillRect(x + Math.sin(timeMs / 420 + index) * 2, y, 2, 4);
  }
}

function drawMonitorStates(
  ctx: CanvasRenderingContext2D,
  agents: OfficeAgentStatus[],
  timeMs: number
) {
  for (const agent of agents) {
    const station = OFFICE_STATIONS[agent.id];
    const screen = {
      x: station.monitor.x + 3,
      y: station.monitor.y + 3,
      w: station.monitor.w - 6,
      h: station.monitor.h - 6,
    };

    ctx.fillStyle = resolveMonitorColor(agent);
    ctx.fillRect(screen.x, screen.y, screen.w, screen.h);
    drawMonitorActivity(ctx, station, agent.status, timeMs);
  }
}

function drawDataParticles(
  ctx: CanvasRenderingContext2D,
  agents: OfficeAgentStatus[],
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  for (const agent of agents) {
    if (agent.status !== 'working' && agent.status !== 'done') continue;

    const station = OFFICE_STATIONS[agent.id];
    const progress = ((timeMs / 900 + station.monitorCenter.x / 60) % 1 + 1) % 1;
    const x = station.monitorCenter.x + (HUB_CENTER.x - station.monitorCenter.x) * progress;
    const y = station.monitorCenter.y + (HUB_CENTER.y - station.monitorCenter.y) * progress;

    ctx.fillStyle = agent.accent;
    ctx.fillRect(Math.floor(x), Math.floor(y), 3, 3);
    ctx.fillStyle = agent.color;
    ctx.fillRect(Math.floor(x) + 4, Math.floor(y) - 1, 2, 2);
  }
}

function drawAgents(
  ctx: CanvasRenderingContext2D,
  agents: OfficeAgentStatus[],
  machines: AgentMachineMap,
  timeMs: number,
  hoveredId: OfficeEntityId | null,
  selectedId: OfficeEntityId | null
) {
  for (const agent of agents) {
    const machine = machines[agent.id];
    drawAgentCharacter(ctx, machine, getCoreAgentConfig(agent.id), timeMs);
    const showBubble = hoveredId === agent.id || selectedId === agent.id;
    if (showBubble) {
      drawSpeechBubble(ctx, OFFICE_STATIONS[agent.id], machine.bubbleText, agent.color);
    }
    drawStatusDot(ctx, machine.pixel.x + 10, machine.pixel.y - 2, agent.status);
  }
}

function drawStationBadges(ctx: CanvasRenderingContext2D, agents: OfficeAgentStatus[]) {
  for (const agent of agents) {
    const station = OFFICE_STATIONS[agent.id];
    const meta = OFFICE_STATUS_META[agent.status];

    drawProgressBar(
      ctx,
      station.progressBar,
      agent.tasksCompleted,
      Math.max(agent.tasksTotal, 1)
    );

    ctx.font = '8px "Geist Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(agent.displayName.toUpperCase(), station.labelPoint.x, station.labelPoint.y);

    ctx.fillStyle = meta.color;
    ctx.fillText(meta.label.toUpperCase(), station.labelPoint.x, station.labelPoint.y + 10);
  }
}

function drawInteractionHighlight(
  ctx: CanvasRenderingContext2D,
  hoveredId: OfficeEntityId | null,
  selectedId: OfficeEntityId | null
) {
  const highlight = selectedId ?? hoveredId;
  if (!highlight) return;

  const bounds = getInteractiveBounds(highlight);
  if (!bounds) return;

  ctx.strokeStyle = selectedId === highlight ? '#f8fafc' : '#94a3b8';
  ctx.lineWidth = selectedId === highlight ? 3 : 2;
  ctx.strokeRect(bounds.x + 1, bounds.y + 1, bounds.w - 2, bounds.h - 2);

  ctx.strokeStyle = 'rgba(248,250,252,0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bounds.x - 2, bounds.y - 2, bounds.w + 4, bounds.h + 4);
}

function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  station: (typeof OFFICE_STATIONS)[CoreOfficeAgentId],
  text: string | null,
  color: string
) {
  if (!text) return;

  const content = text.length > 30 ? `${text.slice(0, 29)}...` : text;
  const width = Math.max(60, content.length * 4 + 16);
  const x = station.bubblePoint.x - width / 2;
  const y = station.bubblePoint.y;

  ctx.fillStyle = 'rgba(8,8,15,0.92)';
  ctx.fillRect(x, y, width, 16);
  ctx.fillRect(station.bubblePoint.x - 2, y + 16, 4, 4);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, 15);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '7px "Geist Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(content, station.bubblePoint.x, y + 10.5);
}

function drawStatusDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: OfficeAgentStatus['status']
) {
  const meta = OFFICE_STATUS_META[status];
  ctx.fillStyle = meta.glow;
  ctx.fillRect(x - 4, y - 4, 12, 12);
  ctx.fillStyle = meta.color;
  ctx.fillRect(x, y, 4, 4);
}

function drawScanline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  const y = (timeMs / 18) % (height + 20) - 10;
  const gradient = ctx.createLinearGradient(0, y, 0, y + 18);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.08)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, 18);
}

function resolveMonitorColor(agent: OfficeAgentStatus) {
  if (agent.status === 'error') return OFFICE_COLORS.monitorError;
  if (agent.status === 'working') return OFFICE_COLORS.monitorOn;
  if (agent.status === 'done') return '#22c55e';
  if (agent.status === 'waiting') return '#64748b';
  return OFFICE_COLORS.monitorIdle;
}
