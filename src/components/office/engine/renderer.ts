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
  drawStatusTransitionFlash(ctx, agents, machines, timeMs, reducedMotion);
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
    // more stars — mix of 1px and 2px
    for (let starIndex = 0; starIndex < 18; starIndex += 1) {
      const localX = 6 + ((starIndex * 13 + windowIndex * 11) % (windowRect.w - 14));
      const localY = 6 + ((starIndex * 17 + windowIndex * 7)  % (windowRect.h - 14));
      const pulse  = reducedMotion
        ? 0.32
        : 0.12 + ((Math.sin(timeMs / 480 + starIndex * 1.7 + windowIndex * 2.1) + 1) / 2) * 0.52;
      const bright = starIndex % 5 === 0; // occasional bright star

      ctx.fillStyle = bright
        ? `rgba(200,220,255,${pulse * 1.4})`
        : `rgba(255,255,255,${pulse})`;
      const size = bright ? 2 : 1;
      ctx.fillRect(windowRect.x + localX, windowRect.y + localY, size, size);
    }

    // occasional shooting star / sparkle
    const sparkCycle = Math.floor(timeMs / 3800 + windowIndex * 1.7) % 4;
    if (sparkCycle === 0 && !reducedMotion) {
      const sparkProgress = ((timeMs % 3800) / 3800);
      if (sparkProgress < 0.15) {
        const sx = windowRect.x + 8 + sparkProgress * (windowRect.w - 16) * 3;
        const sy = windowRect.y + 10 + sparkProgress * 8;
        ctx.globalAlpha = (0.15 - sparkProgress) / 0.15;
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(Math.floor(sx) % (windowRect.x + windowRect.w - 8), Math.floor(sy), 3, 1);
        ctx.globalAlpha = 1;
      }
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

  // Denser steam: 6 particles with sinusoidal drift
  const steamCount = reducedMotion ? 2 : 6;
  for (let index = 0; index < steamCount; index += 1) {
    const cyclePeriod = 38 + index * 4;
    const offset      = (timeMs / cyclePeriod + index * (32 / steamCount)) % 32;
    const drift       = Math.sin(timeMs / 380 + index * 0.8) * 3;
    const fadeAlpha   = Math.max(0, 1 - offset / 32);
    const x           = OFFICE_DECOR.coffee.x + 10 + (index % 3) * 4 + drift;
    const y           = OFFICE_DECOR.coffee.y + 4 - offset;
    const opacity     = fadeAlpha * (0.22 + (index % 2) * 0.12);

    ctx.fillStyle = `rgba(226,232,240,${opacity})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), 2, 3);
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

function drawStatusTransitionFlash(
  ctx: CanvasRenderingContext2D,
  agents: OfficeAgentStatus[],
  machines: AgentMachineMap,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  for (const agent of agents) {
    const machine = machines[agent.id];
    const station = OFFICE_STATIONS[agent.id];
    const carpet  = station.carpet;

    // celebrate flash: bright pulse over entire station area
    if (machine.animation === 'celebrate') {
      const age      = machine.celebrationUntil - timeMs;
      const ratio    = Math.max(0, Math.min(1, age / 2500));
      const flicker  = Math.sin(timeMs / 80) * 0.5 + 0.5;
      const opacity  = ratio * 0.22 * flicker;
      ctx.fillStyle  = `rgba(34,197,94,${opacity})`;
      ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);

      // star burst pixels
      ctx.fillStyle = `rgba(134,239,172,${ratio * 0.6})`;
      const spread = 18 - Math.floor(ratio * 12);
      for (let i = 0; i < 5; i++) {
        const sx = station.monitorCenter.x + Math.sin(timeMs / 120 + i * 1.26) * spread;
        const sy = station.monitorCenter.y + Math.cos(timeMs / 110 + i * 1.26) * spread;
        ctx.fillRect(Math.floor(sx), Math.floor(sy), 3, 3);
      }
    }

    // error flash: red flicker
    if (machine.animation === 'error') {
      const age      = machine.errorUntil - timeMs;
      const ratio    = Math.max(0, Math.min(1, age / 3200));
      const flicker  = Math.sin(timeMs / 110) * 0.5 + 0.5;
      const opacity  = ratio * 0.18 * flicker;
      ctx.fillStyle  = `rgba(239,68,68,${opacity})`;
      ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);

      // "!" indicator above character
      ctx.fillStyle = `rgba(239,68,68,${0.9 * flicker})`;
      ctx.font = 'bold 10px "Geist Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', machine.pixel.x + 8, machine.pixel.y - 6);
    }

    // working pulse: very subtle ambient glow around station
    if (agent.status === 'working') {
      const pulse   = Math.sin(timeMs / 600) * 0.5 + 0.5;
      const opacity = 0.06 + pulse * 0.04;
      ctx.fillStyle = `${agent.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
      ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
    }
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

    // 3 staggered particles per active agent
    for (let particleIdx = 0; particleIdx < 3; particleIdx++) {
      const speed    = 700 + particleIdx * 180;
      const offset   = particleIdx * 0.33;
      const progress = ((timeMs / speed + offset + station.monitorCenter.x / 80) % 1 + 1) % 1;
      const x        = station.monitorCenter.x + (HUB_CENTER.x - station.monitorCenter.x) * progress;
      const y        = station.monitorCenter.y + (HUB_CENTER.y - station.monitorCenter.y) * progress;
      const size     = particleIdx === 0 ? 4 : particleIdx === 1 ? 3 : 2;
      const alpha    = particleIdx === 0 ? 0.9 : particleIdx === 1 ? 0.65 : 0.4;

      // main particle
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = agent.accent;
      ctx.fillRect(Math.floor(x), Math.floor(y), size, size);

      // trail pixel behind
      if (particleIdx === 0) {
        const trailProgress = Math.max(0, progress - 0.04);
        const tx = station.monitorCenter.x + (HUB_CENTER.x - station.monitorCenter.x) * trailProgress;
        const ty = station.monitorCenter.y + (HUB_CENTER.y - station.monitorCenter.y) * trailProgress;
        ctx.globalAlpha = 0.28;
        ctx.fillStyle   = agent.color;
        ctx.fillRect(Math.floor(tx), Math.floor(ty), 2, 2);
      }
    }

    ctx.globalAlpha = 1;
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
    drawStatusDot(ctx, machine.pixel.x + 10, machine.pixel.y - 2, agent.status, timeMs);
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
  status: OfficeAgentStatus['status'],
  timeMs?: number
) {
  const meta  = OFFICE_STATUS_META[status];
  const pulse = (status === 'working' || status === 'error') && timeMs !== undefined
    ? 0.5 + Math.sin(timeMs / (status === 'error' ? 220 : 450)) * 0.5
    : 1;

  // outer glow ring (bigger + pulsing)
  ctx.globalAlpha = 0.22 + pulse * 0.16;
  ctx.fillStyle   = meta.color;
  ctx.fillRect(x - 5, y - 5, 14, 14);

  // mid glow
  ctx.globalAlpha = 0.38 + pulse * 0.22;
  ctx.fillRect(x - 2, y - 2, 8, 8);

  // core dot
  ctx.globalAlpha = 1;
  ctx.fillStyle   = meta.color;
  ctx.fillRect(x, y, 4, 4);

  // bright center pixel
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.55 * pulse;
  ctx.fillRect(x + 1, y + 1, 2, 2);
  ctx.globalAlpha = 1;
}

function drawScanline(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeMs: number,
  reducedMotion: boolean
) {
  if (reducedMotion) return;

  const period = height + 60;
  const y      = (timeMs / 14) % period - 30;

  // main beam
  const gradient = ctx.createLinearGradient(0, y, 0, y + 24);
  gradient.addColorStop(0,   'rgba(255,255,255,0)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.07)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.13)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.07)');
  gradient.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, width, 24);

  // crisp pixel line at center
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, y + 12, width, 1);
}

function resolveMonitorColor(agent: OfficeAgentStatus) {
  if (agent.status === 'error') return OFFICE_COLORS.monitorError;
  if (agent.status === 'working') return OFFICE_COLORS.monitorOn;
  if (agent.status === 'done') return '#22c55e';
  if (agent.status === 'waiting') return '#64748b';
  return OFFICE_COLORS.monitorIdle;
}
