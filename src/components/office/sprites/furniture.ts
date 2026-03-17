import type { OfficeDerivedStatus } from '../agents/agentConfig';
import type { OfficeStationLayout, WorldRect } from '../layout/officeLayout';
import { OFFICE_COLORS } from '../layout/tiles';

function fill(ctx: CanvasRenderingContext2D, rect: WorldRect, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect
) {
  fill(ctx, rect, OFFICE_COLORS.windowFrame);
  fill(ctx, { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: rect.h - 6 }, OFFICE_COLORS.windowGlass);

  ctx.fillStyle = '#273449';
  ctx.fillRect(rect.x + rect.w / 2 - 2, rect.y + 3, 4, rect.h - 6);
}

export function drawHub(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  fill(ctx, rect, '#24113c');
  fill(ctx, { x: rect.x + 6, y: rect.y + 6, w: rect.w - 12, h: rect.h - 12 }, '#3b1c68');
  fill(ctx, { x: rect.x + 14, y: rect.y + 10, w: rect.w - 28, h: rect.h - 20 }, OFFICE_COLORS.hubCore);
}

export function drawDeskStation(
  ctx: CanvasRenderingContext2D,
  station: OfficeStationLayout,
  monitorColor: string
) {
  fill(ctx, station.carpet, OFFICE_COLORS.carpetA);
  fill(ctx, { x: station.carpet.x + 4, y: station.carpet.y + 4, w: station.carpet.w - 8, h: station.carpet.h - 8 }, OFFICE_COLORS.carpetB);

  fill(ctx, station.desk, OFFICE_COLORS.deskDark);
  fill(ctx, { x: station.desk.x, y: station.desk.y, w: station.desk.w, h: 6 }, OFFICE_COLORS.deskTop);
  fill(ctx, { x: station.desk.x, y: station.desk.y + station.desk.h - 4, w: station.desk.w, h: 4 }, OFFICE_COLORS.deskEdge);

  fill(ctx, station.chair, OFFICE_COLORS.chairDark);
  fill(ctx, { x: station.chair.x + 3, y: station.chair.y - 4, w: station.chair.w - 6, h: 6 }, OFFICE_COLORS.chairLight);

  fill(ctx, station.monitor, OFFICE_COLORS.monitorBody);
  fill(ctx, { x: station.monitor.x + 3, y: station.monitor.y + 3, w: station.monitor.w - 6, h: station.monitor.h - 6 }, monitorColor);
  fill(ctx, { x: station.monitor.x + 10, y: station.monitor.y + station.monitor.h, w: 6, h: 5 }, OFFICE_COLORS.monitorBody);
}

export function drawMonitorActivity(
  ctx: CanvasRenderingContext2D,
  station: OfficeStationLayout,
  status: OfficeDerivedStatus,
  timeMs: number
) {
  if (status !== 'working' && status !== 'error') return;

  const screenX = station.monitor.x + 4;
  const screenY = station.monitor.y + 4;
  const width = station.monitor.w - 8;

  if (status === 'error') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(screenX + 4, screenY + 3, width - 8, 2);
    ctx.fillRect(screenX + 8, screenY + 7, width - 16, 2);
    return;
  }

  const phase = Math.floor(timeMs / 140) % 6;
  ctx.fillStyle = 'rgba(255,255,255,0.24)';
  for (let index = 0; index < 4; index += 1) {
    const y = screenY + 2 + ((index + phase) % 4) * 3;
    ctx.fillRect(screenX + 3, y, width - 6 - index * 2, 1);
  }
}

export function drawPlant(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  sway: number
) {
  fill(ctx, { x: rect.x + 4, y: rect.y + rect.h - 6, w: rect.w - 8, h: 6 }, OFFICE_COLORS.plantPot);

  ctx.fillStyle = OFFICE_COLORS.plantLeaf;
  ctx.fillRect(rect.x + 7 + sway, rect.y + 2, 3, rect.h - 8);
  ctx.fillRect(rect.x + 4 - sway, rect.y + 5, 3, rect.h - 12);
  ctx.fillRect(rect.x + rect.w - 7 + sway, rect.y + 5, 3, rect.h - 12);

  ctx.fillStyle = OFFICE_COLORS.plantLeafLight;
  ctx.fillRect(rect.x + 3, rect.y + 4, rect.w - 6, 3);
}

export function drawCoffeeMachine(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  fill(ctx, rect, OFFICE_COLORS.coffeeBody);
  fill(ctx, { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: 5 }, OFFICE_COLORS.coffeeAccent);
  fill(ctx, { x: rect.x + 8, y: rect.y + rect.h - 7, w: rect.w - 16, h: 4 }, '#b45309');
}

export function drawWaterCooler(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  fill(ctx, rect, OFFICE_COLORS.waterBody);
  fill(ctx, { x: rect.x + 2, y: rect.y + 3, w: rect.w - 4, h: 10 }, OFFICE_COLORS.waterFill);
  fill(ctx, { x: rect.x + 3, y: rect.y + rect.h - 6, w: rect.w - 6, h: 4 }, '#64748b');
}

export function drawWhiteboard(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  fill(ctx, rect, OFFICE_COLORS.whiteboardFrame);
  fill(ctx, { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: rect.h - 6 }, OFFICE_COLORS.whiteboard);

  ctx.fillStyle = '#ef4444';
  ctx.fillRect(rect.x + 8, rect.y + 9, 12, 10);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(rect.x + 25, rect.y + 14, 14, 9);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(rect.x + 44, rect.y + 8, 12, 11);

  ctx.fillStyle = '#475569';
  ctx.fillRect(rect.x + 10, rect.y + 27, rect.w - 20, 2);
}

export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  completed: number,
  total: number
) {
  fill(ctx, rect, OFFICE_COLORS.progressTrack);
  if (total <= 0) return;

  const ratio = Math.max(0, Math.min(1, completed / total));
  fill(ctx, { x: rect.x + 1, y: rect.y + 1, w: Math.max(0, Math.floor((rect.w - 2) * ratio)), h: rect.h - 2 }, OFFICE_COLORS.progressFill);
}

export function drawDashedConnection(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  timeMs: number,
  active: boolean
) {
  const dash = 6;
  const gap = 4;
  const phase = active ? Math.floor(timeMs / 80) % (dash + gap) : 0;
  ctx.fillStyle = color;
  ctx.globalAlpha = active ? 0.65 : 0.24;

  const horizontalEnd = { x: to.x, y: from.y };
  drawDashedLineSegment(ctx, from, horizontalEnd, dash, gap, phase);
  drawDashedLineSegment(ctx, horizontalEnd, to, dash, gap, phase);
  ctx.globalAlpha = 1;
}

function drawDashedLineSegment(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  dash: number,
  gap: number,
  phase: number
) {
  const horizontal = from.y === to.y;
  const distance = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
  const direction = horizontal ? Math.sign(to.x - from.x) : Math.sign(to.y - from.y);

  for (let offset = -phase; offset < distance; offset += dash + gap) {
    const segment = Math.max(0, Math.min(dash, distance - Math.max(offset, 0)));
    if (segment <= 0) continue;

    if (horizontal) {
      const startX = from.x + Math.max(offset, 0) * direction;
      const x = Math.min(startX, startX + segment * direction);
      ctx.fillRect(Math.floor(x), Math.floor(from.y), segment, 2);
    } else {
      const startY = from.y + Math.max(offset, 0) * direction;
      const y = Math.min(startY, startY + segment * direction);
      ctx.fillRect(Math.floor(from.x), Math.floor(y), 2, segment);
    }
  }
}
