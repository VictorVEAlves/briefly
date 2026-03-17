import type { CoreAgentConfig } from '../agents/agentConfig';
import type { AgentAnimationState, OfficeAgentMachine } from '../agents/agentState';
import { getAnimationFrame } from './animations';

const SKIN = '#f2c299';
const SHADOW = 'rgba(8,8,15,0.3)';
const OUTLINE = '#0f172a';

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
}

function getArms(state: AgentAnimationState, frame: number) {
  if (state === 'type') {
    return frame % 2 === 0
      ? { leftY: 8, rightY: 10, leftX: -6, rightX: 4 }
      : { leftY: 10, rightY: 8, leftX: -6, rightX: 4 };
  }

  if (state === 'read') {
    return { leftY: 9, rightY: 9, leftX: -6, rightX: 4 };
  }

  if (state === 'celebrate') {
    return frame % 2 === 0
      ? { leftY: 2, rightY: 2, leftX: -7, rightX: 5 }
      : { leftY: 1, rightY: 3, leftX: -7, rightX: 5 };
  }

  if (state === 'error') {
    return { leftY: 3, rightY: 3, leftX: -7, rightX: 5 };
  }

  return { leftY: 9, rightY: 9, leftX: -6, rightX: 4 };
}

function getLegs(state: AgentAnimationState, frame: number) {
  if (state === 'walk') {
    const swing = frame % 2 === 0 ? 1 : -1;
    return { leftX: -2 + swing, rightX: 1 - swing };
  }

  if (state === 'celebrate') {
    return { leftX: -3, rightX: 2 };
  }

  return { leftX: -2, rightX: 1 };
}

function getBounce(state: AgentAnimationState, frame: number) {
  if (state === 'walk') return frame % 2 === 0 ? 0 : -1;
  if (state === 'type') return frame % 2 === 0 ? 0 : 1;
  if (state === 'read') return frame === 1 ? -1 : 0;
  if (state === 'wait') return frame === 1 ? -1 : 0;
  if (state === 'celebrate') return -2;
  return frame === 2 ? -1 : 0;
}

export function drawAgentCharacter(
  ctx: CanvasRenderingContext2D,
  machine: OfficeAgentMachine,
  config: CoreAgentConfig,
  timeMs: number
) {
  const frame = getAnimationFrame(machine.animation, timeMs, machine.blinkSeed);
  const bounce = getBounce(machine.animation, frame);
  const arms = getArms(machine.animation, frame);
  const legs = getLegs(machine.animation, frame);

  const originX = machine.pixel.x + 2;
  const originY = machine.pixel.y + 5 + bounce;

  px(ctx, originX - 1, originY + 18, 14, 3, SHADOW);
  px(ctx, originX + 1, originY + 18, 10, 2, 'rgba(8,8,15,0.22)');

  px(ctx, originX + 1, originY, 10, 3, config.hairColor);
  px(ctx, originX, originY + 2, 12, 2, config.hairColor);
  px(ctx, originX + 2, originY + 3, 8, 5, SKIN);
  px(ctx, originX + 3, originY + 8, 6, 2, SKIN);

  px(ctx, originX + 2, originY + 9, 8, 6, config.clothingColor);
  px(ctx, originX + 1, originY + arms.leftY, 3, 5, config.clothingColor);
  px(ctx, originX + arms.rightX + 2, originY + arms.rightY, 3, 5, config.clothingColor);
  px(ctx, originX + 1 + legs.leftX, originY + 14, 3, 5, config.color);
  px(ctx, originX + 6 + legs.rightX, originY + 14, 3, 5, config.color);

  px(ctx, originX + 4, originY + 5, 1, 1, OUTLINE);
  px(ctx, originX + 7, originY + 5, 1, 1, OUTLINE);

  if (frame === 3 && machine.animation === 'idle') {
    px(ctx, originX + 4, originY + 5, 1, 1, SKIN);
    px(ctx, originX + 7, originY + 5, 1, 1, SKIN);
  }

  if (machine.animation === 'error') {
    px(ctx, originX + 4, originY + 4, 1, 2, OUTLINE);
    px(ctx, originX + 7, originY + 4, 1, 2, OUTLINE);
  }
}
