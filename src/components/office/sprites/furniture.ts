import type { OfficeDerivedStatus } from '../agents/agentConfig';
import type { OfficeStationLayout, WorldRect } from '../layout/officeLayout';
import { OFFICE_COLORS } from '../layout/tiles';

function fill(ctx: CanvasRenderingContext2D, rect: WorldRect, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// ── Window ────────────────────────────────────────────────────────────────────
export function drawWindow(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  // outer frame
  fill(ctx, rect, OFFICE_COLORS.windowFrame);
  // inner glass
  fill(ctx, { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: rect.h - 6 }, OFFICE_COLORS.windowGlass);

  // center divider
  fillRect(ctx, rect.x + rect.w / 2 - 1, rect.y + 3, 2, rect.h - 6, '#273449');
  // horizontal divider
  fillRect(ctx, rect.x + 3, rect.y + rect.h / 2 - 1, rect.w - 6, 2, '#273449');

  // window frame bevel (lighter top-left, darker bottom-right)
  fillRect(ctx, rect.x, rect.y, rect.w, 2, '#4b4b6a');  // top bevel
  fillRect(ctx, rect.x, rect.y, 2, rect.h, '#4b4b6a');  // left bevel
  fillRect(ctx, rect.x, rect.y + rect.h - 2, rect.w, 2, '#1a1a2e'); // bottom
  fillRect(ctx, rect.x + rect.w - 2, rect.y, 2, rect.h, '#1a1a2e'); // right

  // glass gleam (top-left corner reflection)
  ctx.globalAlpha = 0.18;
  fillRect(ctx, rect.x + 4, rect.y + 4, Math.floor(rect.w * 0.35), 3, '#ffffff');
  ctx.globalAlpha = 1;

  // window sill
  fillRect(ctx, rect.x - 2, rect.y + rect.h, rect.w + 4, 4, '#252540');
}

// ── Hub sign ──────────────────────────────────────────────────────────────────
export function drawHub(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  // outer glow ring
  ctx.fillStyle = 'rgba(168,85,247,0.14)';
  ctx.fillRect(rect.x - 4, rect.y - 4, rect.w + 8, rect.h + 8);

  fill(ctx, rect, '#1a0933');

  // inner frame with gradient-like bevel
  fillRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, '#27104a');
  fillRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, 2, '#4a1e7e'); // top bevel
  fillRect(ctx, rect.x + 2, rect.y + 2, 2, rect.h - 4, '#4a1e7e'); // left bevel

  // core panel
  fill(ctx, { x: rect.x + 8, y: rect.y + 8, w: rect.w - 16, h: rect.h - 16 }, OFFICE_COLORS.hubCore);

  // scanline effect on hub
  ctx.globalAlpha = 0.10;
  for (let row = rect.y + 9; row < rect.y + rect.h - 9; row += 3) {
    fillRect(ctx, rect.x + 8, row, rect.w - 16, 1, '#000000');
  }
  ctx.globalAlpha = 1;

  // corner pixels (decoration)
  const corners = [
    [rect.x + 4, rect.y + 4], [rect.x + rect.w - 8, rect.y + 4],
    [rect.x + 4, rect.y + rect.h - 8], [rect.x + rect.w - 8, rect.y + rect.h - 8],
  ];
  ctx.fillStyle = '#a855f7';
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, 3, 3);
  }
}

// ── Desk station ──────────────────────────────────────────────────────────────
export function drawDeskStation(
  ctx: CanvasRenderingContext2D,
  station: OfficeStationLayout,
  monitorColor: string
) {
  // carpet with border
  fill(ctx, station.carpet, OFFICE_COLORS.carpetA);
  fill(ctx, {
    x: station.carpet.x + 3,
    y: station.carpet.y + 3,
    w: station.carpet.w - 6,
    h: station.carpet.h - 6,
  }, OFFICE_COLORS.carpetB);
  // carpet inner detail lines
  ctx.globalAlpha = 0.12;
  for (let row = station.carpet.y + 6; row < station.carpet.y + station.carpet.h - 6; row += 8) {
    fillRect(ctx, station.carpet.x + 6, row, station.carpet.w - 12, 1, '#ffffff');
  }
  ctx.globalAlpha = 1;

  // ── Desk body ──────────────────────────────────────────────
  const desk = station.desk;
  // desk legs
  fillRect(ctx, desk.x + 2, desk.y + desk.h, 4, 6, OFFICE_COLORS.deskDark);
  fillRect(ctx, desk.x + desk.w - 6, desk.y + desk.h, 4, 6, OFFICE_COLORS.deskDark);

  // desk body
  fill(ctx, desk, OFFICE_COLORS.deskDark);
  // desk top surface (lighter)
  fillRect(ctx, desk.x, desk.y, desk.w, 5, OFFICE_COLORS.deskTop);
  // desk top highlight
  fillRect(ctx, desk.x + 1, desk.y + 1, desk.w - 2, 2, '#b8881e');
  // desk edge bottom
  fillRect(ctx, desk.x, desk.y + desk.h - 4, desk.w, 4, OFFICE_COLORS.deskEdge);
  // desk side shadow (left)
  fillRect(ctx, desk.x, desk.y + 5, 3, desk.h - 9, '#4a3508');
  // desk side right
  fillRect(ctx, desk.x + desk.w - 3, desk.y + 5, 3, desk.h - 9, '#7a5e14');

  // ── Items on desk ──────────────────────────────────────────
  drawDeskItems(ctx, station);

  // ── Chair ──────────────────────────────────────────────────
  const chair = station.chair;
  // chair base / wheels
  fillRect(ctx, chair.x + chair.w / 2 - 2, chair.y + chair.h + 2, 4, 3, '#252538');
  fillRect(ctx, chair.x + 2, chair.y + chair.h + 2, 3, 2, '#252538');
  fillRect(ctx, chair.x + chair.w - 5, chair.y + chair.h + 2, 3, 2, '#252538');

  // chair back
  fill(ctx, chair, OFFICE_COLORS.chairDark);
  // chair cushion
  fillRect(ctx, chair.x + 3, chair.y - 5, chair.w - 6, 6, OFFICE_COLORS.chairLight);
  // chair cushion highlight
  fillRect(ctx, chair.x + 4, chair.y - 4, chair.w - 8, 2, '#5a6677');
  // armrests
  fillRect(ctx, chair.x - 3, chair.y, 4, 3, OFFICE_COLORS.chairDark);
  fillRect(ctx, chair.x + chair.w - 1, chair.y, 4, 3, OFFICE_COLORS.chairDark);

  // ── Monitor ────────────────────────────────────────────────
  drawMonitor(ctx, station, monitorColor);
}

function drawDeskItems(ctx: CanvasRenderingContext2D, station: OfficeStationLayout) {
  const desk = station.desk;

  // ── Keyboard ─────────────────────────────────────────────
  const kbX = desk.x + desk.w - 26;
  const kbY = desk.y + 3;
  // keyboard body
  fillRect(ctx, kbX, kbY, 22, 7, '#0f172a');
  // keyboard top bevel
  fillRect(ctx, kbX, kbY, 22, 2, '#1e293b');
  // key rows
  ctx.fillStyle = '#334155';
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 8; col++) {
      ctx.fillRect(kbX + 2 + col * 2.5, kbY + 2 + row * 2.5, 1, 1);
    }
  }

  // ── Mouse ────────────────────────────────────────────────
  fillRect(ctx, desk.x + desk.w - 6, desk.y + 6, 5, 7, '#1e293b');
  fillRect(ctx, desk.x + desk.w - 6, desk.y + 6, 5, 3, '#334155');
  fillRect(ctx, desk.x + desk.w - 4, desk.y + 6, 1, 7, '#0f172a'); // mouse split

  // ── Mug / cup ────────────────────────────────────────────
  fillRect(ctx, desk.x + 4, desk.y + 2, 5, 7, '#334155');
  fillRect(ctx, desk.x + 4, desk.y + 2, 5, 2, '#475569'); // rim
  fillRect(ctx, desk.x + 4, desk.y + 7, 5, 2, '#1e293b'); // bottom
  // handle
  fillRect(ctx, desk.x + 9, desk.y + 3, 2, 4, '#334155');
}

function drawMonitor(
  ctx: CanvasRenderingContext2D,
  station: OfficeStationLayout,
  screenColor: string
) {
  const mon = station.monitor;

  // monitor stand arm
  fillRect(ctx, mon.x + mon.w / 2 - 2, mon.y + mon.h, 4, 6, '#1e293b');
  // stand base
  fillRect(ctx, mon.x + mon.w / 2 - 6, mon.y + mon.h + 5, 12, 3, '#1e293b');
  fillRect(ctx, mon.x + mon.w / 2 - 5, mon.y + mon.h + 6, 10, 1, '#334155'); // base highlight

  // outer bezel (dark frame)
  fill(ctx, mon, OFFICE_COLORS.monitorBody);
  // bezel bevel top/left
  fillRect(ctx, mon.x, mon.y, mon.w, 2, '#2d3f55');
  fillRect(ctx, mon.x, mon.y, 2, mon.h, '#2d3f55');
  // bezel bevel bottom/right
  fillRect(ctx, mon.x, mon.y + mon.h - 2, mon.w, 2, '#0f1a27');
  fillRect(ctx, mon.x + mon.w - 2, mon.y, 2, mon.h, '#0f1a27');

  // screen area
  const sx = mon.x + 3;
  const sy = mon.y + 3;
  const sw = mon.w - 6;
  const sh = mon.h - 8;
  fillRect(ctx, sx, sy, sw, sh, screenColor);

  // screen scanlines
  ctx.globalAlpha = 0.06;
  for (let scanY = sy + 1; scanY < sy + sh; scanY += 2) {
    fillRect(ctx, sx, scanY, sw, 1, '#000000');
  }
  ctx.globalAlpha = 1;

  // glass glare/reflection
  ctx.globalAlpha = 0.22;
  fillRect(ctx, sx + 2, sy + 2, Math.floor(sw * 0.4), 2, '#ffffff');
  ctx.globalAlpha = 0.10;
  fillRect(ctx, sx + 2, sy + 4, Math.floor(sw * 0.28), 1, '#ffffff');
  ctx.globalAlpha = 1;

  // bottom bezel (chin) with power LED
  fillRect(ctx, mon.x, mon.y + mon.h - 5, mon.w, 5, OFFICE_COLORS.monitorBody);
  // power LED dot
  ctx.fillStyle = screenColor === OFFICE_COLORS.monitorIdle ? '#374151' : '#22c55e';
  ctx.fillRect(mon.x + mon.w - 8, mon.y + mon.h - 3, 2, 2);
}

// ── Monitor activity (code lines) ────────────────────────────────────────────
export function drawMonitorActivity(
  ctx: CanvasRenderingContext2D,
  station: OfficeStationLayout,
  status: OfficeDerivedStatus,
  timeMs: number
) {
  if (status !== 'working' && status !== 'error') return;

  const mon   = station.monitor;
  const sx    = mon.x + 4;
  const sy    = mon.y + 4;
  const sw    = mon.w - 8;
  const sh    = mon.h - 12;

  if (status === 'error') {
    // X icon in red screen
    ctx.fillStyle = 'rgba(255,255,255,0.20)';
    ctx.fillRect(sx + 4, sy + 3, sw - 8, 2);
    ctx.fillRect(sx + 8, sy + 7, sw - 16, 2);
    return;
  }

  // Scrolling code lines
  const phase = Math.floor(timeMs / 120) % 8;
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  for (let lineIdx = 0; lineIdx < 5; lineIdx++) {
    const lineY = sy + 1 + ((lineIdx + phase) % 5) * Math.floor(sh / 5);
    const lineW = sw - 4 - (lineIdx % 3) * 4;
    ctx.fillRect(sx + 2, lineY, lineW, 1);
  }

  // cursor blink
  const cursorOn = Math.floor(timeMs / 350) % 2 === 0;
  if (cursorOn) {
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    const cursorLine = sy + 1 + (phase % 5) * Math.floor(sh / 5);
    ctx.fillRect(sx + (sw - 8), cursorLine, 2, 2);
  }
}

// ── Plant ─────────────────────────────────────────────────────────────────────
export function drawPlant(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  sway: number
) {
  // pot body
  fillRect(ctx, rect.x + 3, rect.y + rect.h - 8, rect.w - 6, 8, OFFICE_COLORS.plantPot);
  // pot rim
  fillRect(ctx, rect.x + 2, rect.y + rect.h - 8, rect.w - 4, 2, '#7a5230');
  // pot highlight
  fillRect(ctx, rect.x + 3, rect.y + rect.h - 7, 3, 4, '#6b4520');
  // soil
  fillRect(ctx, rect.x + 4, rect.y + rect.h - 6, rect.w - 8, 2, '#3d2510');

  // stem
  ctx.fillStyle = '#15803d';
  ctx.fillRect(rect.x + 7 + sway, rect.y + 4, 2, rect.h - 12);

  // leaves
  const leafDark  = OFFICE_COLORS.plantLeaf;
  const leafLight = OFFICE_COLORS.plantLeafLight;

  // back leaf
  fillRect(ctx, rect.x + 3 - sway, rect.y + 3, 4, rect.h - 14, leafDark);
  // right leaf
  fillRect(ctx, rect.x + rect.w - 7 + sway, rect.y + 4, 4, rect.h - 14, leafDark);
  // front center leaf
  fillRect(ctx, rect.x + 5 + sway, rect.y + 2, 4, rect.h - 10, leafLight);
  // leaf tips (brighter)
  fillRect(ctx, rect.x + 5 + sway, rect.y + 2, 3, 3, leafLight);
  // leaf vein
  ctx.fillStyle = '#14532d';
  ctx.fillRect(rect.x + 8 + sway, rect.y + 4, 1, rect.h - 16);
}

// ── Coffee machine ────────────────────────────────────────────────────────────
export function drawCoffeeMachine(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  // body
  fill(ctx, rect, OFFICE_COLORS.coffeeBody);
  // bevel top
  fillRect(ctx, rect.x, rect.y, rect.w, 2, '#5a4030');
  fillRect(ctx, rect.x, rect.y, 2, rect.h, '#5a4030');
  // accent panel
  fillRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, 6, OFFICE_COLORS.coffeeAccent);
  // orange indicator light
  fillRect(ctx, rect.x + rect.w - 5, rect.y + 4, 2, 2, '#f97316');
  // cup slot
  fillRect(ctx, rect.x + 4, rect.y + rect.h - 10, rect.w - 8, 3, '#2a1c10');
  fillRect(ctx, rect.x + 4, rect.y + rect.h - 7,  rect.w - 8, 2, '#b45309');
  // drip tray
  fillRect(ctx, rect.x + 2, rect.y + rect.h - 4, rect.w - 4, 4, '#4a3020');
  fillRect(ctx, rect.x + 3, rect.y + rect.h - 3, rect.w - 6, 2, '#6a4530');
  // small cup outline
  fillRect(ctx, rect.x + 7, rect.y + rect.h - 9, 10, 6, '#1e1410');
  fillRect(ctx, rect.x + 8, rect.y + rect.h - 8,  8, 4, '#3f2d1d');
}

// ── Water cooler ──────────────────────────────────────────────────────────────
export function drawWaterCooler(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  // body
  fill(ctx, rect, OFFICE_COLORS.waterBody);
  // bevel
  fillRect(ctx, rect.x, rect.y, rect.w, 2, '#b0bac4');
  fillRect(ctx, rect.x, rect.y, 2, rect.h, '#b0bac4');
  // water bottle (blue translucent)
  fillRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, 12, OFFICE_COLORS.waterFill);
  // water highlight
  fillRect(ctx, rect.x + 3, rect.y + 3, 3, 8, '#7dd3fc');
  // bottle cap
  fillRect(ctx, rect.x + 4, rect.y, rect.w - 8, 3, '#0284c7');
  // dispenser area
  fillRect(ctx, rect.x + 3, rect.y + rect.h - 8, rect.w - 6, 5, '#64748b');
  // spigots
  fillRect(ctx, rect.x + 4, rect.y + rect.h - 6, 4, 3, '#0ea5e9');
  fillRect(ctx, rect.x + rect.w - 8, rect.y + rect.h - 6, 4, 3, '#f43f5e');
  // base
  fillRect(ctx, rect.x + 2, rect.y + rect.h - 3, rect.w - 4, 3, '#475569');
}

// ── Whiteboard ────────────────────────────────────────────────────────────────
export function drawWhiteboard(ctx: CanvasRenderingContext2D, rect: WorldRect) {
  // frame
  fill(ctx, rect, OFFICE_COLORS.whiteboardFrame);
  // bevel
  fillRect(ctx, rect.x, rect.y, rect.w, 2, '#5a6677');
  fillRect(ctx, rect.x, rect.y, 2, rect.h, '#5a6677');
  // surface
  fill(ctx, { x: rect.x + 3, y: rect.y + 3, w: rect.w - 6, h: rect.h - 6 }, OFFICE_COLORS.whiteboard);

  // sticky notes with slight variation
  const notes = [
    { x: rect.x + 6,  y: rect.y + 7,  w: 13, h: 11, color: '#fca5a5' },  // red note
    { x: rect.x + 22, y: rect.y + 12, w: 15, h: 10, color: '#86efac' },  // green note
    { x: rect.x + 40, y: rect.y + 6,  w: 13, h: 12, color: '#fde68a' },  // yellow note
  ];

  for (const note of notes) {
    fillRect(ctx, note.x, note.y, note.w, note.h, note.color);
    // note shadow
    fillRect(ctx, note.x + 1, note.y + note.h, note.w - 1, 1, 'rgba(0,0,0,0.14)');
    // note lines
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let lineOffset = 3; lineOffset < note.h - 2; lineOffset += 3) {
      ctx.fillRect(note.x + 2, note.y + lineOffset, note.w - 4, 1);
    }
  }

  // divider line at bottom
  fillRect(ctx, rect.x + 6, rect.y + rect.h - 8, rect.w - 12, 2, '#cbd5e1');
  // tray
  fillRect(ctx, rect.x + 3, rect.y + rect.h - 5, rect.w - 6, 3, '#64748b');
  // marker
  fillRect(ctx, rect.x + 6, rect.y + rect.h - 5, 8, 3, '#0f172a');
  fillRect(ctx, rect.x + 6, rect.y + rect.h - 5, 8, 1, '#1e293b');
}

// ── Progress bar ─────────────────────────────────────────────────────────────
export function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  rect: WorldRect,
  completed: number,
  total: number
) {
  // track with rounded look
  fill(ctx, rect, OFFICE_COLORS.progressTrack);
  fillRect(ctx, rect.x, rect.y, rect.w, 1, '#374151'); // top shadow
  if (total <= 0) return;

  const ratio = Math.max(0, Math.min(1, completed / total));
  const fillW = Math.max(0, Math.floor((rect.w - 2) * ratio));
  if (fillW <= 0) return;

  fill(ctx, { x: rect.x + 1, y: rect.y + 1, w: fillW, h: rect.h - 2 }, OFFICE_COLORS.progressFill);
  // shine
  fillRect(ctx, rect.x + 1, rect.y + 1, fillW, 1, '#fbbf24');
}

// ── Dashed connection line ────────────────────────────────────────────────────
export function drawDashedConnection(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  timeMs: number,
  active: boolean
) {
  const dash  = 6;
  const gap   = 5;
  const phase = active ? Math.floor(timeMs / 70) % (dash + gap) : 0;
  ctx.fillStyle  = color;
  ctx.globalAlpha = active ? 0.72 : 0.22;

  const mid = { x: to.x, y: from.y };
  drawDashedLineSegment(ctx, from, mid, dash, gap, phase);
  drawDashedLineSegment(ctx, mid, to,   dash, gap, phase);

  // junction dot
  if (active) {
    ctx.globalAlpha = 0.88;
    ctx.fillRect(mid.x - 2, mid.y - 2, 4, 4);
  }

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
  const distance   = horizontal ? Math.abs(to.x - from.x) : Math.abs(to.y - from.y);
  const direction  = horizontal ? Math.sign(to.x - from.x) : Math.sign(to.y - from.y);

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
