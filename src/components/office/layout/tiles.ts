export const TILE_SIZE = 16;
export const GRID_WIDTH = 42;
export const GRID_HEIGHT = 26;
export const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;
export const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;

export const OFFICE_COLORS = {
  background: '#08080f',
  wallDark: '#12122a',
  wallLight: '#1a1a2e',
  floorA: '#2a2a3e',
  floorB: '#252538',
  grout: '#202033',
  windowFrame: '#3b3b55',
  windowGlass: '#0f172a',
  star: '#f8fafc',
  hubCore: '#a855f7',
  hubRing: '#7c3aed',
  hubText: '#f5d0fe',
  deskTop: '#a07818',
  deskDark: '#6b4f10',
  deskEdge: '#8b6914',
  chairDark: '#374151',
  chairLight: '#4b5563',
  monitorBody: '#1e293b',
  monitorOn: '#3b82f6',
  monitorError: '#ef4444',
  monitorIdle: '#475569',
  plantPot: '#5b3b1f',
  plantLeaf: '#16a34a',
  plantLeafLight: '#22c55e',
  whiteboard: '#f8fafc',
  whiteboardFrame: '#475569',
  coffeeBody: '#3f2d1d',
  coffeeAccent: '#d97706',
  waterBody: '#94a3b8',
  waterFill: '#38bdf8',
  carpetA: '#1e1b4b',
  carpetB: '#312e81',
  outline: '#0f172a',
  progressTrack: '#1f2937',
  progressFill: '#f59e0b',
  tooltipBg: 'rgba(8,8,15,0.92)',
};

export function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tone: 'a' | 'b'
) {
  const color = tone === 'a' ? OFFICE_COLORS.floorA : OFFICE_COLORS.floorB;
  const x = tileX * TILE_SIZE;
  const y = tileY * TILE_SIZE;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = OFFICE_COLORS.grout;
  ctx.fillRect(x, y, TILE_SIZE, 1);
  ctx.fillRect(x, y, 1, TILE_SIZE);
}

