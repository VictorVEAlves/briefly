import type { OfficeDerivedStatus } from '../agents/agentConfig';
import type { AgentAnimationState } from '../agents/agentState';

const FRAME_SPEED: Record<AgentAnimationState, number> = {
  idle: 0.22,
  walk: 0.12,
  sit: 0.2,
  type: 0.09,
  read: 0.18,
  wait: 0.24,
  celebrate: 0.11,
  error: 0.18,
};

const FRAME_COUNT: Record<AgentAnimationState, number> = {
  idle: 4,
  walk: 4,
  sit: 2,
  type: 4,
  read: 3,
  wait: 2,
  celebrate: 4,
  error: 2,
};

export function getAnimationFrame(state: AgentAnimationState, timeMs: number, seed = 0) {
  const speed = FRAME_SPEED[state];
  const count = FRAME_COUNT[state];
  return Math.floor((timeMs / 1000 + seed) / speed) % count;
}

export function statusToAnimation(status: OfficeDerivedStatus, preferred: 'type' | 'read'): AgentAnimationState {
  if (status === 'working') return preferred;
  if (status === 'waiting') return 'wait';
  if (status === 'error') return 'error';
  if (status === 'done') return 'celebrate';
  return 'idle';
}
