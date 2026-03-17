import type { GridPoint } from '../layout/officeLayout';
import { OFFICE_STATIONS, tileToWorldCenter } from '../layout/officeLayout';
import type { CoreOfficeAgentId, OfficeDerivedStatus } from './agentConfig';
import { CORE_AGENT_IDS } from './agentConfig';

export type AgentAnimationState =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'type'
  | 'read'
  | 'wait'
  | 'celebrate'
  | 'error';

export type AgentFacing = 'left' | 'right';

export type AgentPixelPoint = {
  x: number;
  y: number;
};

export interface OfficeAgentMachine {
  id: CoreOfficeAgentId;
  grid: GridPoint;
  pixel: AgentPixelPoint;
  facing: AgentFacing;
  animation: AgentAnimationState;
  preferred: 'type' | 'read';
  bubbleText: string | null;
  indicatorText: string | null;
  path: GridPoint[];
  walkAccumulator: number;
  blinkSeed: number;
  idleTimer: number;
  celebrationUntil: number;
  errorUntil: number;
  lastStatus: OfficeDerivedStatus;
  lastRestartNonce: number;
}

export type AgentMachineMap = Record<CoreOfficeAgentId, OfficeAgentMachine>;

export function gridToAgentPixel(grid: GridPoint): AgentPixelPoint {
  const center = tileToWorldCenter(grid);
  return {
    x: center.x - 8,
    y: center.y - 18,
  };
}

function createMachine(id: CoreOfficeAgentId): OfficeAgentMachine {
  const station = OFFICE_STATIONS[id];
  const pixel = gridToAgentPixel(station.seatTile);

  return {
    id,
    grid: { ...station.seatTile },
    pixel,
    facing: id === 'tasks' ? 'left' : 'right',
    animation: 'idle',
    preferred: id === 'briefing' || id === 'tasks' ? 'read' : 'type',
    bubbleText: null,
    indicatorText: null,
    path: [],
    walkAccumulator: 0,
    blinkSeed: Math.floor(Math.random() * 9000),
    idleTimer: 0,
    celebrationUntil: 0,
    errorUntil: 0,
    lastStatus: 'idle',
    lastRestartNonce: 0,
  };
}

export function createAgentMachines(): AgentMachineMap {
  return CORE_AGENT_IDS.reduce((accumulator, id) => {
    accumulator[id] = createMachine(id);
    return accumulator;
  }, {} as AgentMachineMap);
}

export function ensureAgentMachines(
  current?: Partial<Record<CoreOfficeAgentId, OfficeAgentMachine>>
): AgentMachineMap {
  const base = createAgentMachines();
  if (!current) return base;

  for (const id of CORE_AGENT_IDS) {
    if (current[id]) {
      base[id] = current[id] as OfficeAgentMachine;
    }
  }

  return base;
}

export function resetMachineVisual(
  machine: OfficeAgentMachine,
  targetGrid?: GridPoint
) {
  const nextGrid = targetGrid ?? OFFICE_STATIONS[machine.id].seatTile;
  const pixel = gridToAgentPixel(nextGrid);

  machine.grid = { ...nextGrid };
  machine.pixel.x = pixel.x;
  machine.pixel.y = pixel.y;
  machine.animation = 'idle';
  machine.path = [];
  machine.walkAccumulator = 0;
  machine.bubbleText = null;
  machine.indicatorText = null;
  machine.celebrationUntil = 0;
  machine.errorUntil = 0;
}
