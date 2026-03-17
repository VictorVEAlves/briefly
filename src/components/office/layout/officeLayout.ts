import type { CoreOfficeAgentId, OfficeEntityId } from '../agents/agentConfig';
import { GRID_HEIGHT, GRID_WIDTH, TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from './tiles';

export type GridPoint = { x: number; y: number };
export type WorldRect = { x: number; y: number; w: number; h: number };

export type OfficeStationLayout = {
  id: CoreOfficeAgentId;
  area: WorldRect;
  carpet: WorldRect;
  desk: WorldRect;
  chair: WorldRect;
  monitor: WorldRect;
  seatTile: GridPoint;
  entryTile: GridPoint;
  labelPoint: { x: number; y: number };
  progressBar: WorldRect;
  bubblePoint: { x: number; y: number };
  monitorCenter: { x: number; y: number };
};

export const HUB_AREA: WorldRect = {
  x: 18 * TILE_SIZE,
  y: 2 * TILE_SIZE,
  w: 6 * TILE_SIZE,
  h: 4 * TILE_SIZE,
};

export const HUB_TILE: GridPoint = { x: 21, y: 4 };
export const HUB_CENTER = {
  x: HUB_AREA.x + HUB_AREA.w / 2,
  y: HUB_AREA.y + HUB_AREA.h / 2,
};

function createStation(
  id: CoreOfficeAgentId,
  tileX: number,
  tileY: number
): OfficeStationLayout {
  return {
    id,
    area: { x: tileX * TILE_SIZE, y: tileY * TILE_SIZE, w: 8 * TILE_SIZE, h: 7 * TILE_SIZE },
    carpet: {
      x: (tileX - 1) * TILE_SIZE,
      y: (tileY - 1) * TILE_SIZE,
      w: 10 * TILE_SIZE,
      h: 9 * TILE_SIZE,
    },
    desk: { x: (tileX + 1) * TILE_SIZE, y: (tileY + 1) * TILE_SIZE, w: 6 * TILE_SIZE, h: 2 * TILE_SIZE },
    chair: { x: (tileX + 2) * TILE_SIZE, y: (tileY + 4) * TILE_SIZE, w: 4 * TILE_SIZE, h: 2 * TILE_SIZE },
    monitor: { x: (tileX + 2) * TILE_SIZE, y: (tileY + 1) * TILE_SIZE, w: 3 * TILE_SIZE, h: 2 * TILE_SIZE },
    seatTile: { x: tileX + 4, y: tileY + 4 },
    entryTile: { x: tileX + 4, y: tileY + 6 },
    labelPoint: { x: (tileX + 4) * TILE_SIZE, y: (tileY + 7) * TILE_SIZE + 6 },
    progressBar: { x: (tileX + 1) * TILE_SIZE, y: (tileY + 6) * TILE_SIZE + 4, w: 6 * TILE_SIZE, h: 6 },
    bubblePoint: { x: (tileX + 4) * TILE_SIZE, y: (tileY + 1) * TILE_SIZE - 14 },
    monitorCenter: { x: (tileX + 3.5) * TILE_SIZE, y: (tileY + 2) * TILE_SIZE },
  };
}

export const OFFICE_STATIONS: Record<CoreOfficeAgentId, OfficeStationLayout> = {
  email: createStation('email', 5, 8),
  briefing: createStation('briefing', 17, 7),
  tasks: createStation('tasks', 29, 8),
  whatsapp: createStation('whatsapp', 9, 17),
  canva: createStation('canva', 25, 17),
};

export const OFFICE_DECOR = {
  whiteboard: { x: 2 * TILE_SIZE, y: 3 * TILE_SIZE, w: 5 * TILE_SIZE, h: 4 * TILE_SIZE },
  coffee: { x: 18 * TILE_SIZE, y: 19 * TILE_SIZE, w: 3 * TILE_SIZE, h: 3 * TILE_SIZE },
  water: { x: 22 * TILE_SIZE, y: 19 * TILE_SIZE, w: 2 * TILE_SIZE, h: 3 * TILE_SIZE },
  plants: [
    { x: 2 * TILE_SIZE, y: 20 * TILE_SIZE, w: 2 * TILE_SIZE, h: 2 * TILE_SIZE },
    { x: 38 * TILE_SIZE, y: 20 * TILE_SIZE, w: 2 * TILE_SIZE, h: 2 * TILE_SIZE },
  ],
  windows: [
    { x: 4 * TILE_SIZE, y: 1 * TILE_SIZE, w: 8 * TILE_SIZE, h: 3 * TILE_SIZE },
    { x: 17 * TILE_SIZE, y: 1 * TILE_SIZE, w: 8 * TILE_SIZE, h: 3 * TILE_SIZE },
    { x: 30 * TILE_SIZE, y: 1 * TILE_SIZE, w: 8 * TILE_SIZE, h: 3 * TILE_SIZE },
  ],
};

const BLOCKED_TILES: WorldRect[] = [
  ...Object.values(OFFICE_STATIONS).map((station) => station.desk),
  OFFICE_DECOR.coffee,
  OFFICE_DECOR.water,
  ...OFFICE_DECOR.plants,
];

export function createWalkableGrid() {
  const grid = Array.from({ length: GRID_HEIGHT }, () => Array.from({ length: GRID_WIDTH }, () => true));

  for (const obstacle of BLOCKED_TILES) {
    const startX = Math.floor(obstacle.x / TILE_SIZE);
    const startY = Math.floor(obstacle.y / TILE_SIZE);
    const endX = Math.ceil((obstacle.x + obstacle.w) / TILE_SIZE);
    const endY = Math.ceil((obstacle.y + obstacle.h) / TILE_SIZE);

    for (let y = startY; y < endY; y += 1) {
      for (let x = startX; x < endX; x += 1) {
        if (grid[y]?.[x] !== undefined) {
          grid[y][x] = false;
        }
      }
    }
  }

  Object.values(OFFICE_STATIONS).forEach((station) => {
    grid[station.seatTile.y][station.seatTile.x] = true;
    grid[station.entryTile.y][station.entryTile.x] = true;
  });
  grid[HUB_TILE.y][HUB_TILE.x] = true;

  return grid;
}

export function tileToWorldCenter(tile: GridPoint) {
  return {
    x: tile.x * TILE_SIZE + TILE_SIZE / 2,
    y: tile.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function getEntityFocusPoint(id: OfficeEntityId) {
  if (id === 'hub') return HUB_CENTER;
  if (id in OFFICE_STATIONS) return tileToWorldCenter(OFFICE_STATIONS[id as CoreOfficeAgentId].seatTile);
  return null;
}

export function getInteractiveEntityAt(worldX: number, worldY: number): OfficeEntityId | null {
  if (
    worldX >= HUB_AREA.x &&
    worldX <= HUB_AREA.x + HUB_AREA.w &&
    worldY >= HUB_AREA.y &&
    worldY <= HUB_AREA.y + HUB_AREA.h
  ) {
    return 'hub';
  }

  for (const station of Object.values(OFFICE_STATIONS)) {
    const bounds = station.carpet;
    if (
      worldX >= bounds.x &&
      worldX <= bounds.x + bounds.w &&
      worldY >= bounds.y &&
      worldY <= bounds.y + bounds.h
    ) {
      return station.id;
    }
  }

  return null;
}

export function getInteractiveBounds(id: OfficeEntityId): WorldRect | null {
  if (id === 'hub') return HUB_AREA;
  if (id in OFFICE_STATIONS) return OFFICE_STATIONS[id as CoreOfficeAgentId].carpet;
  return null;
}

export const OFFICE_WORLD = {
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
};

