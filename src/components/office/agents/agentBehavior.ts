import type { OfficeAgentStatus } from './agentConfig';
import { CORE_AGENT_IDS } from './agentConfig';
import type { GridPoint } from '../layout/officeLayout';
import { OFFICE_STATIONS } from '../layout/officeLayout';
import { findPath } from '../engine/pathfinding';
import {
  gridToAgentPixel,
  resetMachineVisual,
  type AgentMachineMap,
  type OfficeAgentMachine,
} from './agentState';

const MOVE_SPEED = 72;

type SyncArgs = {
  machines: AgentMachineMap;
  agents: OfficeAgentStatus[];
  deltaMs: number;
  nowMs: number;
  walkableGrid: boolean[][];
  restartNonceByAgent?: Partial<Record<string, number>>;
};

export function syncAgentMachines({
  machines,
  agents,
  deltaMs,
  nowMs,
  walkableGrid,
  restartNonceByAgent,
}: SyncArgs) {
  const statusMap = new Map(agents.map((agent) => [agent.id, agent]));

  for (const id of CORE_AGENT_IDS) {
    const machine = machines[id];
    const agent = statusMap.get(id) ?? null;
    const station = OFFICE_STATIONS[id];
    const restartNonce = restartNonceByAgent?.[id] ?? 0;

    if (restartNonce !== machine.lastRestartNonce) {
      machine.lastRestartNonce = restartNonce;
      resetMachineVisual(machine, station.seatTile);
    }

    const desiredStatus = agent?.status ?? 'idle';

    if (desiredStatus !== machine.lastStatus) {
      handleStatusTransition(machine, desiredStatus, nowMs, station.seatTile, walkableGrid);
      machine.lastStatus = desiredStatus;
    }

    updateMovement(machine, deltaMs);
    updatePosture(machine, agent, nowMs);
  }
}

function handleStatusTransition(
  machine: OfficeAgentMachine,
  nextStatus: OfficeAgentStatus['status'],
  nowMs: number,
  targetGrid: GridPoint,
  walkableGrid: boolean[][]
) {
  if (!sameGrid(machine.grid, targetGrid)) {
    const path = findPath(walkableGrid, machine.grid, targetGrid);
    if (path.length > 1) {
      machine.path = path.slice(1);
      machine.animation = 'walk';
    }
  }

  if (nextStatus === 'done') {
    machine.celebrationUntil = nowMs + 2500;
  }

  if (nextStatus === 'error') {
    machine.errorUntil = nowMs + 3200;
  }
}

function updateMovement(machine: OfficeAgentMachine, deltaMs: number) {
  if (machine.path.length === 0) return;

  const nextGrid = machine.path[0];
  const nextPixel = gridToAgentPixel(nextGrid);
  const dx = nextPixel.x - machine.pixel.x;
  const dy = nextPixel.y - machine.pixel.y;
  const distance = Math.hypot(dx, dy);

  if (distance <= 0.001) {
    machine.grid = { ...nextGrid };
    machine.pixel.x = nextPixel.x;
    machine.pixel.y = nextPixel.y;
    machine.path.shift();
    return;
  }

  const step = (MOVE_SPEED * deltaMs) / 1000;
  machine.facing = dx < 0 ? 'left' : 'right';
  machine.animation = 'walk';

  if (distance <= step) {
    machine.grid = { ...nextGrid };
    machine.pixel.x = nextPixel.x;
    machine.pixel.y = nextPixel.y;
    machine.path.shift();
    return;
  }

  machine.pixel.x += (dx / distance) * step;
  machine.pixel.y += (dy / distance) * step;
}

function updatePosture(
  machine: OfficeAgentMachine,
  agent: OfficeAgentStatus | null,
  nowMs: number
) {
  if (machine.path.length > 0) {
    machine.bubbleText = null;
    machine.indicatorText = null;
    return;
  }

  const status = agent?.status ?? 'idle';

  switch (status) {
    case 'working': {
      machine.animation = machine.preferred;
      machine.bubbleText = agent?.lastAction ?? defaultActionForAgent(agent?.displayName);
      machine.indicatorText = `${agent?.tasksCompleted ?? 0}/${agent?.tasksTotal ?? 0}`;
      break;
    }
    case 'waiting': {
      machine.animation = 'wait';
      machine.bubbleText = agent?.lastAction ?? 'Aguardando aprovacao';
      machine.indicatorText = '...';
      break;
    }
    case 'error': {
      machine.animation = nowMs <= machine.errorUntil ? 'error' : 'sit';
      machine.bubbleText = agent?.errorMessage ?? agent?.lastAction ?? 'Atencao necessaria';
      machine.indicatorText = '!';
      break;
    }
    case 'done': {
      machine.animation = nowMs <= machine.celebrationUntil ? 'celebrate' : 'idle';
      machine.bubbleText =
        nowMs <= machine.celebrationUntil ? 'Entrega concluida' : agent?.lastAction ?? null;
      machine.indicatorText = 'OK';
      break;
    }
    case 'idle':
    default: {
      machine.animation = machine.idleTimer > 4.2 ? 'read' : 'idle';
      machine.bubbleText = agent?.currentCampaign ? `Monitorando ${agent.currentCampaign}` : null;
      machine.indicatorText = agent?.tasksTotal ? `${agent.tasksCompleted}/${agent.tasksTotal}` : null;
      break;
    }
  }

  machine.idleTimer += 0.016;
  if (machine.idleTimer > 8) {
    machine.idleTimer = 0;
  }
}

function sameGrid(a: GridPoint, b: GridPoint) {
  return a.x === b.x && a.y === b.y;
}

function defaultActionForAgent(displayName?: string) {
  if (!displayName) return 'Processando entrega';
  if (displayName.includes('Briefing')) return 'Estruturando briefing';
  if (displayName.includes('Email')) return 'Montando HTML e CTA';
  if (displayName.includes('WhatsApp')) return 'Lapidando a mensagem';
  if (displayName.includes('Tasks')) return 'Organizando operacao';
  return 'Renderizando criativos';
}
